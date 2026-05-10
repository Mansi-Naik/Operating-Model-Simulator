import { GoogleGenerativeAI } from '@google/generative-ai'
import { matchCapabilities } from '../src/lib/capabilityLibrary.js'
import { buildAllocationPrompt } from '../src/lib/promptTemplates.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'
import { calibrateConfidence } from '../src/lib/confidenceCalibration.js'

const MODEL_ID = 'gemini-2.5-flash'
const FEATURE = 'f2_allocation'

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isUuid(value) {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

/**
 * @param {string | undefined} origin
 * @returns {string | null}
 */
function resolveAllowedCorsOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null
  const whitelist = process.env.ALLOWED_ORIGINS
  if (whitelist?.trim()) {
    const ok = whitelist
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(origin)
    return ok ? origin : null
  }
  try {
    const u = new URL(origin)
    const hostOk = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    const schemeOk = u.protocol === 'http:' || u.protocol === 'https:'
    return hostOk && schemeOk ? origin : null
  } catch {
    return null
  }
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string | undefined} origin
 */
function applyCorsHeaders(res, origin) {
  const allow = resolveAllowedCorsOrigin(origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow)
    res.setHeader('Vary', 'Origin')
  }
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, error: string }}
 */
function parseJsonResponse(raw) {
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
 * @returns {string | null} Error message or null if valid.
 */
function validateAllocationPayload(obj) {
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
 * @returns {Promise<{ error: Error | null }>}
 */
async function insertLlmCallLog(supabase, row) {
  const { error } = await supabase.from('llm_call_logs').insert(row)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

/**
 * Build engagement context for `buildAllocationPrompt` from an engagements row.
 *
 * @param {Record<string, unknown> | null | undefined} engagementRow
 */
function engagementRowToContext(engagementRow) {
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
 * F2 allocation: load task + engagement, match capabilities, call Gemini, validate, log, persist.
 *
 * **Request:** `POST` JSON `{ engagementId: uuid, taskId: uuid }`
 *
 * **Response:** `{ taskId, taskName, allocation, confidenceRaw, confidenceCalibrated, confidenceBreakdown, primaryCapability, rationale, riskFactors, prerequisites }`
 *
 * **Env:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` or `VITE_SUPABASE_URL`
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  const startTime = Date.now()
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (origin && !resolveAllowedCorsOrigin(origin)) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }

  const durationMs = () => Date.now() - startTime

  /** @type {string | undefined} */
  let engagementId
  /** @type {string | undefined} */
  let taskId
  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let supabase = null
  let promptText = ''
  let responseText = ''
  /** @type {string | null} */
  let logStatus = 'error'
  /** @type {string | null} */
  let logErrorMessage = null
  /** @type {number | null} */
  let promptTokens = null
  /** @type {number | null} */
  let completionTokens = null
  /** @type {number | null} */
  let totalTokens = null

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
      return
    }

    supabase = createSupabaseAdmin()
    console.log('[predict-allocation] Supabase admin client initialized (service role):', {
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    })

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    engagementId = /** @type {{ engagementId?: unknown }} */ (body).engagementId
    taskId = /** @type {{ taskId?: unknown }} */ (body).taskId

    if (!isUuid(engagementId) || !isUuid(taskId)) {
      res.status(400).json({ error: 'engagementId and taskId must be valid UUIDs' })
      return
    }

    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .select(
        'id, engagement_id, task_id, task_name, role_performing, task_type, input_data_type, consequence_of_error, volume_per_day, avg_time_minutes, regulatory_constraint, data_logged, source',
      )
      .eq('id', taskId)
      .maybeSingle()

    if (taskErr) {
      throw new Error(`Failed to load task: ${taskErr.message}`)
    }
    if (!taskRow) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    if (String(taskRow.engagement_id) !== engagementId) {
      res.status(403).json({ error: 'Task does not belong to the given engagement' })
      return
    }

    const { data: engagementRow, error: engErr } = await supabase
      .from('engagements')
      .select('id, domain, readiness_band, intake_data')
      .eq('id', engagementId)
      .maybeSingle()

    if (engErr) {
      throw new Error(`Failed to load engagement: ${engErr.message}`)
    }
    if (!engagementRow) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const candidates = matchCapabilities({
      task_name: taskRow.task_name,
      input_data_type: taskRow.input_data_type,
      task_type: taskRow.task_type,
      consequence_of_error: taskRow.consequence_of_error,
    })

    const engagementContext = engagementRowToContext(
      /** @type {Record<string, unknown>} */ (engagementRow),
    )
    promptText = buildAllocationPrompt(taskRow, candidates, engagementContext)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const geminiResult = await model.generateContent(promptText)
    const response = geminiResult.response
    responseText = typeof response?.text === 'function' ? response.text() : ''

    const usage = response?.usageMetadata
    if (usage) {
      promptTokens = typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null
      completionTokens =
        typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null
      totalTokens = typeof usage.totalTokenCount === 'number' ? usage.totalTokenCount : null
    }

    const parsed = parseJsonResponse(responseText)
    if (!parsed.ok) {
      console.error('[predict-allocation] JSON parse failed. Raw:', responseText)
      logErrorMessage = parsed.error
      {
        const { error: logErr } = await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          model: MODEL_ID,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          error_message: logErrorMessage,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          duration_ms: durationMs(),
        })
        if (logErr) console.error('[predict-allocation] llm_call_logs (parse error):', logErr)
      }
      res.status(500).json({ error: 'Model returned invalid JSON', details: parsed.error })
      return
    }

    const validationError = validateAllocationPayload(parsed.value)
    if (validationError) {
      logErrorMessage = validationError
      {
        const { error: logErr } = await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          model: MODEL_ID,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          error_message: validationError,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          duration_ms: durationMs(),
        })
        if (logErr) console.error('[predict-allocation] llm_call_logs (validation error):', logErr)
      }
      res.status(500).json({ error: 'Invalid allocation payload from model', details: validationError })
      return
    }

    const p = parsed.value
    const allocation = /** @type {string} */ (p.allocation)
    const confidence = /** @type {number} */ (p.confidence)
    const primary_capability = /** @type {string | null} */ (p.primary_capability)
    const rationale = /** @type {string} */ (p.rationale)
    const risk_factors = /** @type {unknown[]} */ (p.risk_factors)
    const prerequisites = /** @type {unknown[]} */ (p.prerequisites)
    console.log('[predict-allocation] JSONB field type checks:', {
      riskFactorsIsArray: Array.isArray(risk_factors),
      prerequisitesIsArray: Array.isArray(prerequisites),
    })
    const confidenceResult = calibrateConfidence(confidence, {
      ...taskRow,
      primary_capability,
    }, engagementRow)

    logStatus = 'success'
    logErrorMessage = null

    const { error: logInsertErr } = await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      model: MODEL_ID,
      prompt_text: promptText,
      response_text: responseText,
      status: logStatus,
      error_message: logErrorMessage,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      duration_ms: durationMs(),
    })
    if (logInsertErr) {
      console.error('[predict-allocation] llm_call_logs insert failed:', logInsertErr)
      throw new Error(`Failed to write llm_call_logs: ${logInsertErr.message}`)
    }

    const updates = {
      ai_allocation: allocation,
      ai_confidence_raw: confidence,
      ai_confidence_calibrated: confidenceResult.calibrated,
      ai_primary_capability: primary_capability,
      ai_rationale: rationale,
      ai_risk_factors: risk_factors,
      ai_prerequisites: prerequisites,
    }
    console.log('[predict-allocation] Updating task:', taskId, 'with:', updates)

    const { data: updateData, error: updateErr } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, ai_allocation, ai_confidence_raw, ai_confidence_calibrated, ai_primary_capability')
    console.log('[predict-allocation] Update response:', { data: updateData, error: updateErr })

    if (updateErr) {
      logErrorMessage = updateErr.message
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        model: MODEL_ID,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        error_message: `Task update failed: ${updateErr.message}`,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        duration_ms: durationMs(),
      })
      res.status(500).json({ error: 'Failed to save prediction to task', details: updateErr.message })
      return
    }

    res.status(200).json({
      taskId,
      taskName: taskRow.task_name ?? '',
      allocation,
      confidenceRaw: confidence,
      confidenceCalibrated: confidenceResult.calibrated,
      confidenceBreakdown: confidenceResult.breakdown,
      primaryCapability: primary_capability,
      rationale,
      riskFactors: risk_factors,
      prerequisites: prerequisites,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[predict-allocation]', err)

    if (supabase && engagementId && isUuid(engagementId)) {
      try {
        await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          model: MODEL_ID,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          error_message: message,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          duration_ms: durationMs(),
        })
      } catch (logErr) {
        console.error('[predict-allocation] Failed to log error row:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
