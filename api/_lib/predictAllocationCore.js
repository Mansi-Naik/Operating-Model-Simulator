import callGemini, { classifyError, geminiLogExtras } from './geminiClient.js'
import { inferMissingFields, matchCapabilities } from '../../src/lib/capabilityLibrary.js'
import { buildAllocationPrompt } from '../../src/lib/promptTemplates.js'
import { calibrateConfidence } from '../../src/lib/confidenceCalibration.js'

export const FEATURE = 'f2_allocation'
const QUALITY_ALERT_FEATURE = 'f2_allocation_quality_alert'

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isAllocationUuid(value) {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, error: string }}
 */
export function parseAllocationJsonResponse(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Empty model response' }
  }
  try {
    const value = JSON.parse(raw.trim())
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: 'Parsed JSON is not an object' }
    }
    return { ok: true, value: /** @type {Record<string, unknown>} */ (value) }
  } catch {
    return { ok: false, error: 'Invalid JSON in model response' }
  }
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string | null}
 */
export function validateAllocationPayload(obj) {
  const alloc = obj.allocation
  if (alloc !== 'human-only' && alloc !== 'tech-assisted' && alloc !== 'tech-automated') {
    return 'allocation must be human-only, tech-assisted, or tech-automated'
  }
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    return 'confidence must be a number from 0.0 to 1.0'
  }
  const pc = obj.primary_capability
  if (pc !== null && typeof pc !== 'string') {
    return 'primary_capability must be a string or null'
  }
  if (typeof obj.rationale !== 'string') {
    return 'rationale must be a string'
  }
  if (!Array.isArray(obj.risk_factors)) {
    return 'risk_factors must be an array'
  }
  if (!Array.isArray(obj.prerequisites)) {
    return 'prerequisites must be an array'
  }
  return null
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 */
async function insertLlmCallLog(supabase, row) {
  const { error } = await supabase.from('llm_call_logs').insert(row)
  if (error) throw new Error(error.message)
}

/**
 * @param {Record<string, unknown> | null | undefined} engagementRow
 */
export function engagementRowToContext(engagementRow) {
  if (!engagementRow || typeof engagementRow !== 'object') {
    return {
      domain: null,
      primary_priority: null,
      automation_appetite: null,
      readiness_band: null,
    }
  }
  const intake =
    engagementRow.intake_data && typeof engagementRow.intake_data === 'object'
      ? /** @type {Record<string, unknown>} */ (engagementRow.intake_data)
      : {}
  const preferences =
    intake.preferences && typeof intake.preferences === 'object'
      ? /** @type {Record<string, unknown>} */ (intake.preferences)
      : {}
  const engagementBlock =
    intake.engagement && typeof intake.engagement === 'object'
      ? /** @type {Record<string, unknown>} */ (intake.engagement)
      : {}
  return {
    domain: typeof engagementRow.domain === 'string' ? engagementRow.domain : null,
    primary_priority:
      (typeof intake.primary_priority === 'string' ? intake.primary_priority : null) ??
      (typeof engagementBlock.primary_goal === 'string' ? engagementBlock.primary_goal : null),
    automation_appetite:
      (typeof preferences.automation_appetite === 'string' ? preferences.automation_appetite : null) ??
      (typeof intake.automation_appetite === 'string' ? intake.automation_appetite : null),
    readiness_band:
      typeof engagementRow.readiness_band === 'string' ? engagementRow.readiness_band : null,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} engagementId
 */
export async function maybeLogF2AllocationQualityAlert(supabase, engagementId) {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('ai_allocation, regulatory_constraint')
      .eq('engagement_id', engagementId)

    if (error || !Array.isArray(tasks) || tasks.length === 0) return

    const allHaveAllocation = tasks.every(
      (t) => t.ai_allocation != null && String(t.ai_allocation).trim().length > 0,
    )
    if (!allHaveAllocation) return

    const eligible = tasks.filter((t) => t.regulatory_constraint !== true)
    if (eligible.length === 0) return

    const humanOnlyCount = eligible.filter(
      (t) => String(t.ai_allocation ?? '').trim().toLowerCase() === 'human-only',
    ).length

    const ratio = humanOnlyCount / eligible.length
    if (ratio <= 0.9) return

    const msg = [
      `Anomaly detected: ${humanOnlyCount} of ${eligible.length} tasks recommended as `,
      `human-only. This may indicate data quality issues in task fields `,
      `(null input_data_type, task_type, or consequence_of_error).`,
    ].join('')

    await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: QUALITY_ALERT_FEATURE,
      model: 'system',
      fallback_occurred: false,
      fallback_attempts: null,
      prompt_text: null,
      response_text: null,
      status: 'warning',
      error_message: msg,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      duration_ms: null,
    })
  } catch (e) {
    console.error('[predict-allocation] maybeLogF2AllocationQualityAlert:', e)
  }
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isRetryableAllocationError(err) {
  const kind = classifyError(err)
  return kind === 'rpm_exceeded' || kind === 'server_error' || kind === 'unknown'
}

/**
 * Run Gemini allocation for one task row and persist to Supabase.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} engagementId
 * @param {string} taskId Task row UUID (`tasks.id`)
 * @param {Record<string, unknown>} engagementRow Pre-loaded engagement row
 * @returns {Promise<
 *   | { ok: true, taskId: string, taskName: string, allocation: string }
 *   | { ok: false, taskId: string, taskName: string, error: string }
 * >}
 */
export async function predictAllocationForTask(supabase, engagementId, taskId, engagementRow) {
  const started = Date.now()
  const durationMs = () => Date.now() - started
  let promptText = ''
  let responseText = ''
  /** @type {any} */
  let geminiMeta = null

  const { data: taskRow, error: taskErr } = await supabase
    .from('tasks')
    .select(
      'id, engagement_id, task_id, task_name, role_performing, task_type, input_data_type, consequence_of_error, volume_per_day, avg_time_minutes, regulatory_constraint, data_logged, source, ai_allocation',
    )
    .eq('id', taskId)
    .maybeSingle()

  if (taskErr) {
    return { ok: false, taskId, taskName: '', error: `Failed to load task: ${taskErr.message}` }
  }
  if (!taskRow) {
    return { ok: false, taskId, taskName: '', error: 'Task not found' }
  }
  if (String(taskRow.engagement_id) !== engagementId) {
    return { ok: false, taskId, taskName: String(taskRow.task_name ?? ''), error: 'Task engagement mismatch' }
  }

  const taskName = String(taskRow.task_name ?? '').trim() || '(unnamed task)'
  const existingAi = taskRow.ai_allocation
  if (existingAi != null && String(existingAi).trim()) {
    return {
      ok: true,
      taskId,
      taskName,
      allocation: String(existingAi).trim().toLowerCase(),
      skipped: true,
    }
  }

  try {
    const enrichedTaskForMatching = inferMissingFields({
      task_name: taskRow.task_name,
      input_data_type: taskRow.input_data_type,
      task_type: taskRow.task_type,
      consequence_of_error: taskRow.consequence_of_error,
      regulatory_constraint: taskRow.regulatory_constraint,
      data_logged: taskRow.data_logged,
    })

    const candidates = matchCapabilities(enrichedTaskForMatching)
    const taskForPrompt = {
      ...taskRow,
      input_data_type: enrichedTaskForMatching.input_data_type,
      task_type: enrichedTaskForMatching.task_type,
      consequence_of_error: enrichedTaskForMatching.consequence_of_error,
      data_logged: enrichedTaskForMatching.data_logged,
    }

    const engagementContext = engagementRowToContext(engagementRow)
    promptText = buildAllocationPrompt(taskForPrompt, candidates, engagementContext)

    geminiMeta = await callGemini(promptText, {
      feature: 'f2_allocation',
      temperature: 0.2,
      response_mime_type: 'application/json',
    })
    responseText = geminiMeta.response_text

    const parsed = parseAllocationJsonResponse(responseText)
    if (!parsed.ok) {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, { errorMessage: parsed.error, durationFallbackMs: durationMs() }),
      })
      return { ok: false, taskId, taskName, error: parsed.error }
    }

    const validationError = validateAllocationPayload(parsed.value)
    if (validationError) {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, { errorMessage: validationError, durationFallbackMs: durationMs() }),
      })
      return { ok: false, taskId, taskName, error: validationError }
    }

    const p = parsed.value
    const allocation = /** @type {string} */ (p.allocation)
    const confidence = /** @type {number} */ (p.confidence)
    const primary_capability = /** @type {string | null} */ (p.primary_capability)
    const rationale = /** @type {string} */ (p.rationale)
    const risk_factors = /** @type {unknown[]} */ (p.risk_factors)
    const prerequisites = /** @type {unknown[]} */ (p.prerequisites)

    const confidenceResult = calibrateConfidence(
      confidence,
      { ...taskRow, primary_capability },
      engagementRow,
    )

    await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      ...geminiLogExtras(geminiMeta, { errorMessage: null, durationFallbackMs: durationMs() }),
    })

    const updates = {
      ai_allocation: allocation,
      ai_confidence_raw: confidence,
      ai_confidence_calibrated: confidenceResult.calibrated,
      ai_primary_capability: primary_capability,
      ai_rationale: rationale,
      ai_risk_factors: risk_factors,
      ai_prerequisites: prerequisites,
    }

    const { error: updateErr } = await supabase.from('tasks').update(updates).eq('id', taskId)
    if (updateErr) {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, {
          errorMessage: `Task update failed: ${updateErr.message}`,
          durationFallbackMs: durationMs(),
        }),
      })
      return { ok: false, taskId, taskName, error: updateErr.message }
    }

    return { ok: true, taskId, taskName, allocation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    try {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, { errorMessage: message, durationFallbackMs: durationMs() }),
      })
    } catch (logErr) {
      console.error('[predict-allocation] Failed to log error row:', logErr)
    }
    return { ok: false, taskId, taskName, error: message }
  }
}

/**
 * @param {number} ms
 */
export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
