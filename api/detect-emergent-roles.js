import { GoogleGenerativeAI } from '@google/generative-ai'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { buildEmergentRolesPrompt } from '../src/lib/emergentRolesPrompt.js'
import { generateAdvisories } from '../src/lib/advisoryGeneration.js'
import { CAPABILITY_LIBRARY } from '../src/lib/capabilityLibrary.js'
import { dedupeLatestRedesignsByRole, f3RolesToJsonb, normalizeF3Roles } from '../src/lib/f3RolesStorage.js'
import { getFinalAllocation } from '../src/lib/roleAggregation.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FEATURE = 'f3_emergent'

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
 * @param {string | null | undefined} capabilityId
 * @returns {string | null}
 */
function capabilityDisplayName(capabilityId) {
  if (typeof capabilityId !== 'string' || !capabilityId.trim()) return null
  const cap = CAPABILITY_LIBRARY.find((c) => c.id === capabilityId.trim())
  return cap?.name ?? capabilityId.trim()
}

/**
 * @param {Record<string, unknown> | null | undefined} engagementRow
 */
function engagementToEmergentContext(engagementRow) {
  if (!engagementRow || typeof engagementRow !== 'object') {
    return { domain: null, automation_appetite: null }
  }
  const intake =
    engagementRow.intake_data && typeof engagementRow.intake_data === 'object'
      ? /** @type {Record<string, unknown>} */ (engagementRow.intake_data)
      : {}
  const preferences =
    intake.preferences && typeof intake.preferences === 'object'
      ? /** @type {Record<string, unknown>} */ (intake.preferences)
      : {}
  return {
    domain: typeof engagementRow.domain === 'string' ? engagementRow.domain : null,
    automation_appetite:
      (typeof preferences.automation_appetite === 'string' ? preferences.automation_appetite : null) ??
      (typeof intake.automation_appetite === 'string' ? intake.automation_appetite : null),
  }
}

/**
 * @param {{ id: string, severity: string, title: string, body: string, affected_items?: string[] }[]} advisories
 */
function sortAdvisoriesForPrompt(advisories) {
  const isHollowing = (a) => String(a.id).startsWith('role-hollowing')
  const isCapConc = (a) => String(a.id) === 'capability-concentration'
  return [...advisories].sort((a, b) => {
    const score = (x) => (isHollowing(x) ? 2 : isCapConc(x) ? 1 : 0)
    return score(b) - score(a)
  })
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string | null}
 */
function validateEmergentRolesPayload(obj) {
  const er = obj.emergent_roles
  if (!Array.isArray(er)) {
    return 'emergent_roles must be an array'
  }
  if (er.length > 3) {
    return 'emergent_roles must have at most 3 items'
  }
  for (let i = 0; i < er.length; i++) {
    const r = er[i]
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      return `emergent_roles[${i}] must be an object`
    }
    const row = /** @type {Record<string, unknown>} */ (r)
    if (typeof row.name !== 'string' || !row.name.trim()) {
      return `emergent_roles[${i}].name must be a non-empty string`
    }
    if (typeof row.why_needed !== 'string' || !row.why_needed.trim()) {
      return `emergent_roles[${i}].why_needed must be a non-empty string`
    }
    const hc = row.headcount_estimate
    if (typeof hc !== 'number' || !Number.isFinite(hc) || hc < 0) {
      return `emergent_roles[${i}].headcount_estimate must be a non-negative finite number`
    }
    if (typeof row.sits_under !== 'string' || !row.sits_under.trim()) {
      return `emergent_roles[${i}].sits_under must be a non-empty string`
    }
    if (!Array.isArray(row.skills) || row.skills.length < 1 || !row.skills.every((x) => typeof x === 'string')) {
      return `emergent_roles[${i}].skills must be a non-empty array of strings`
    }
    if (
      !Array.isArray(row.sourcing_options) ||
      row.sourcing_options.length < 1 ||
      !row.sourcing_options.every((x) => typeof x === 'string')
    ) {
      return `emergent_roles[${i}].sourcing_options must be a non-empty array of strings`
    }
  }
  return null
}

/**
 * F3 emergent roles: POST JSON \`{ engagementId }\` → Gemini JSON → \`pipeline_runs.f3_roles.emergent_roles\`.
 *
 * **Env:** \`GEMINI_API_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\`, \`SUPABASE_URL\` or \`VITE_SUPABASE_URL\`
 *
 * **DB:** \`f3_roles\` JSONB should use object form \`{ redesigns, emergent_roles }\` (legacy array-only values are normalized on read).
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  const startTime = Date.now()
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin, { methods: 'POST, OPTIONS' })

  if (req.method === 'OPTIONS') {
    res.status(200).end()
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
  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let supabase = null
  let promptText = ''
  let responseText = ''
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
    console.log('[detect-emergent-roles] Supabase admin client initialized:', {
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    })

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    engagementId = /** @type {{ engagementId?: unknown }} */ (body).engagementId
    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
      return
    }

    const { data: engagementRow, error: engErr } = await supabase
      .from('engagements')
      .select('id, domain, intake_data')
      .eq('id', engagementId)
      .maybeSingle()

    if (engErr) {
      throw new Error(`Failed to load engagement: ${engErr.message}`)
    }
    if (!engagementRow) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const { data: taskRows, error: tasksErr } = await supabase
      .from('tasks')
      .select(
        'id, engagement_id, task_name, role_performing, ai_allocation, user_allocation, ai_primary_capability, volume_per_day, avg_time_minutes, ai_confidence_calibrated, data_logged',
      )
      .eq('engagement_id', engagementId)

    if (tasksErr) {
      throw new Error(`Failed to load tasks: ${tasksErr.message}`)
    }

    const tasks = Array.isArray(taskRows) ? taskRows.map((t) => /** @type {Record<string, unknown>} */ (t)) : []

    let automatedTaskCount = 0
    let assistedTaskCount = 0
    let humanTaskCount = 0
    for (const t of tasks) {
      const alloc = getFinalAllocation(t)
      if (alloc === 'tech-automated') automatedTaskCount += 1
      else if (alloc === 'tech-assisted') assistedTaskCount += 1
      else if (alloc === 'human-only') humanTaskCount += 1
    }
    const totalTasks = tasks.length
    const totalAutomationCoverage =
      totalTasks > 0 ? (automatedTaskCount + assistedTaskCount) / totalTasks : 0

    const { data: prRow, error: prSelErr } = await supabase
      .from('pipeline_runs')
      .select('id, f3_roles')
      .eq('engagement_id', engagementId)
      .maybeSingle()

    if (prSelErr) {
      console.error('[detect-emergent-roles] pipeline_runs select:', prSelErr)
      throw new Error(`pipeline_runs read failed: ${prSelErr.message}`)
    }

    const f3Bundle = normalizeF3Roles(prRow?.f3_roles)
    const redesigned_roles = dedupeLatestRedesignsByRole(f3Bundle.redesigns)

    if (totalAutomationCoverage < 0.1) {
      const emergent_roles_meta = {
        reason: 'no_automation_activity',
        automatedTaskCount,
        assistedTaskCount,
        humanTaskCount,
        totalAutomationCoverage,
        message: 'Insufficient AI activity to justify emergent role creation',
      }
      const nextF3 = f3RolesToJsonb({
        ...f3Bundle,
        emergent_roles: [],
        emergent_roles_meta,
      })

      if (prRow?.id) {
        const { error: upErr } = await supabase
          .from('pipeline_runs')
          .update({ f3_roles: nextF3 })
          .eq('id', prRow.id)
        if (upErr) throw new Error(`pipeline_runs update failed: ${upErr.message}`)
      } else {
        const { error: insErr } = await supabase.from('pipeline_runs').insert({
          engagement_id: engagementId,
          f3_roles: nextF3,
        })
        if (insErr) throw new Error(`pipeline_runs insert failed: ${insErr.message}`)
      }

      res.status(200).json({
        engagementId,
        emergent_roles: [],
        skipped: true,
        reason: emergent_roles_meta.message,
        automation_stats: {
          automatedTaskCount,
          assistedTaskCount,
          humanTaskCount,
          totalAutomationCoverage,
        },
      })
      return
    }

    const engagementRecord = /** @type {Record<string, unknown>} */ (engagementRow)
    const { domain, automation_appetite } = engagementToEmergentContext(engagementRecord)

    /** @type {{ task_name: string, role_performing: string, primary_capability: string | null, allocation: string }[]} */
    const automated_tasks = []
    for (const t of tasks) {
      const alloc = getFinalAllocation(t)
      if (alloc !== 'tech-assisted' && alloc !== 'tech-automated') continue
      const tn = typeof t.task_name === 'string' ? t.task_name.trim() : ''
      const role = typeof t.role_performing === 'string' ? t.role_performing.trim() : '—'
      const capId = typeof t.ai_primary_capability === 'string' ? t.ai_primary_capability : null
      automated_tasks.push({
        task_name: tn || '—',
        role_performing: role,
        primary_capability: capabilityDisplayName(capId),
        allocation: alloc,
      })
    }

    const advisoriesRaw = generateAdvisories(tasks, engagementRecord)
    const cross_task_advisories = sortAdvisoriesForPrompt(advisoriesRaw).map((a) => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      body: a.body,
      ...(Array.isArray(a.affected_items) ? { affected_items: a.affected_items } : {}),
    }))

    promptText = buildEmergentRolesPrompt({
      domain,
      automation_appetite,
      automated_tasks,
      cross_task_advisories,
      redesigned_roles,
      automation_stats: {
        automatedTaskCount,
        assistedTaskCount,
        humanTaskCount,
        totalAutomationCoverage,
      },
    })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
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
      console.error('[detect-emergent-roles] JSON parse failed. Raw:', responseText?.slice(0, 2000))
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
        if (logErr) console.error('[detect-emergent-roles] llm_call_logs (parse error):', logErr)
      }
      res.status(500).json({ error: 'Model returned invalid JSON', details: parsed.error })
      return
    }

    const validationError = validateEmergentRolesPayload(parsed.value)
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
        if (logErr) console.error('[detect-emergent-roles] llm_call_logs (validation error):', logErr)
      }
      res.status(500).json({ error: 'Invalid emergent roles payload from model', details: validationError })
      return
    }

    const emergent_roles = /** @type {Record<string, unknown>[]} */ (parsed.value.emergent_roles).map(
      (row) => ({
        ...row,
        acceptance_status: 'pending',
        accepted_at: null,
        rejected_at: null,
      }),
    )

    const { error: logInsertErr } = await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      model: MODEL_ID,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      error_message: null,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      duration_ms: durationMs(),
    })
    if (logInsertErr) {
      console.error('[detect-emergent-roles] llm_call_logs insert failed:', logInsertErr)
      throw new Error(`Failed to write llm_call_logs: ${logInsertErr.message}`)
    }

    const nextF3 = f3RolesToJsonb({
      redesigns: f3Bundle.redesigns,
      emergent_roles,
      emergent_roles_meta: null,
    })

    if (prRow?.id) {
      const { error: upErr } = await supabase
        .from('pipeline_runs')
        .update({ f3_roles: nextF3 })
        .eq('id', prRow.id)
      if (upErr) {
        console.error('[detect-emergent-roles] pipeline_runs update:', upErr)
        throw new Error(`pipeline_runs update failed: ${upErr.message}`)
      }
    } else {
      const { error: insErr } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementId,
        f3_roles: nextF3,
      })
      if (insErr) {
        console.error('[detect-emergent-roles] pipeline_runs insert:', insErr)
        throw new Error(`pipeline_runs insert failed: ${insErr.message}`)
      }
    }

    res.status(200).json({
      engagementId,
      emergent_roles,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[detect-emergent-roles]', err)

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
        console.error('[detect-emergent-roles] Failed to log error row:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
