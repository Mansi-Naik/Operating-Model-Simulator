import { GoogleGenerativeAI } from '@google/generative-ai'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { aggregateByRole } from '../src/lib/roleAggregation.js'
import { buildRoleRedesignPrompt } from '../src/lib/rolePromptTemplates.js'
import { f3RolesToJsonb, normalizeF3Roles } from '../src/lib/f3RolesStorage.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FEATURE = 'f3_role'

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
 * @param {Record<string, unknown> | null | undefined} engagementRow
 */
function engagementRowToRedesignContext(engagementRow) {
  if (!engagementRow || typeof engagementRow !== 'object') {
    return {
      domain: null,
      primary_priority: null,
      automation_appetite: null,
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
  const goals =
    engagementBlock.goals && typeof engagementBlock.goals === 'object'
      ? /** @type {Record<string, unknown>} */ (engagementBlock.goals)
      : {}

  const primary_priority =
    (typeof goals.primary_priority === 'string' ? goals.primary_priority : null) ??
    (typeof intake.primary_priority === 'string' ? intake.primary_priority : null) ??
    (typeof engagementBlock.primary_goal === 'string' ? engagementBlock.primary_goal : null)

  return {
    domain: typeof engagementRow.domain === 'string' ? engagementRow.domain : null,
    primary_priority,
    automation_appetite:
      (typeof preferences.automation_appetite === 'string' ? preferences.automation_appetite : null) ??
      (typeof intake.automation_appetite === 'string' ? intake.automation_appetite : null),
  }
}

/**
 * @param {unknown} hierarchy
 * @param {string} roleName
 * @returns {number | null} Annualized attrition % if present on the hierarchy row
 */
function findHierarchyAttrition(hierarchy, roleName) {
  const target = String(roleName).trim()
  const list = Array.isArray(hierarchy) ? hierarchy : []
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const r = /** @type {Record<string, unknown>} */ (row)
    const n = r.role ?? r.name ?? r.role_name
    if (typeof n !== 'string' || n.trim() !== target) continue
    const a = r.attrition
    const num = typeof a === 'number' ? a : Number(a)
    if (Number.isFinite(num)) return num
    return null
  }
  return null
}

/**
 * @param {Record<string, unknown>} task
 */
function taskLabel(task) {
  if (!task || typeof task !== 'object') return 'Task'
  const tn = task.task_name
  const tid = task.task_id
  if (typeof tn === 'string' && tn.trim()) return tn.trim()
  if (typeof tid === 'string' && tid.trim()) return tid.trim()
  return 'Task'
}

/**
 * Maps a role aggregate from {@link aggregateByRole} into the shape expected by {@link buildRoleRedesignPrompt}.
 *
 * @param {Record<string, unknown>} agg
 */
function aggregateToPromptInput(agg) {
  const retainedObjs = Array.isArray(agg.retained_tasks) ? agg.retained_tasks : []
  const lostObjs = Array.isArray(agg.lost_tasks) ? agg.lost_tasks : []
  const retained = retainedObjs.map((t) => taskLabel(/** @type {Record<string, unknown>} */ (t)))
  const lost = lostObjs.map((t) => taskLabel(/** @type {Record<string, unknown>} */ (t)))
  const top = [...retainedObjs, ...lostObjs].filter((x) => x && typeof x === 'object')

  return {
    name: agg.role_name,
    role_name: agg.role_name,
    level: agg.level,
    current_time_split: agg.current_time_split,
    top_tasks_today: top,
    time_freed_pct: agg.time_freed_pct,
    pattern: agg.pattern,
    retained_tasks: retained,
    lost_tasks: lost,
  }
}

/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
function isStringArray(v, minLen, maxLen) {
  if (!Array.isArray(v)) return false
  if (v.length < minLen || v.length > maxLen) return false
  return v.every((x) => typeof x === 'string')
}

/**
 * @param {unknown} v
 */
function isRecordOfNumbers(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const o = /** @type {Record<string, unknown>} */ (v)
  const vals = Object.values(o)
  if (vals.length < 4 || vals.length > 6) return false
  return vals.every((n) => typeof n === 'number' && Number.isFinite(n))
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string | null}
 */
function validateRoleRedesignPayload(obj) {
  if (typeof obj.future_role_name !== 'string' || !obj.future_role_name.trim()) {
    return 'future_role_name must be a non-empty string'
  }
  if (!isStringArray(obj.future_responsibilities, 3, 6)) {
    return 'future_responsibilities must be an array of 3-6 strings'
  }
  if (!Array.isArray(obj.new_tasks_added) || !obj.new_tasks_added.every((x) => typeof x === 'string')) {
    return 'new_tasks_added must be an array of strings'
  }
  if (!Array.isArray(obj.skills_retained) || !obj.skills_retained.every((x) => typeof x === 'string')) {
    return 'skills_retained must be an array of strings'
  }
  if (!isStringArray(obj.skills_added, 2, 4)) {
    return 'skills_added must be an array of 2-4 strings'
  }
  if (!Array.isArray(obj.skills_removed) || !obj.skills_removed.every((x) => typeof x === 'string')) {
    return 'skills_removed must be an array of strings'
  }
  if (!isRecordOfNumbers(obj.future_time_split)) {
    return 'future_time_split must be an object with 4-6 numeric percentage values'
  }
  const sum = Object.values(/** @type {Record<string, number>} */ (obj.future_time_split)).reduce((a, b) => a + b, 0)
  if (Math.abs(sum - 100) > 1.5) {
    return `future_time_split percentages must sum to 100 (got ${sum})`
  }
  if (typeof obj.transition_narrative !== 'string' || !obj.transition_narrative.trim()) {
    return 'transition_narrative must be a non-empty string'
  }
  if (typeof obj.day_in_the_life !== 'string' || !obj.day_in_the_life.trim()) {
    return 'day_in_the_life must be a non-empty string'
  }
  if (!Array.isArray(obj.key_transition_risks)) {
    return 'key_transition_risks must be an array'
  }
  if (obj.key_transition_risks.length < 1 || obj.key_transition_risks.length > 3) {
    return 'key_transition_risks must have 1-3 items'
  }
  if (!obj.key_transition_risks.every((x) => typeof x === 'string')) {
    return 'key_transition_risks must be strings'
  }
  return null
}

/**
 * @param {string} pattern
 * @param {number | null} currentAttritionRate
 * @param {string[]} skillsAdded
 */
function computeFeasibility(pattern, currentAttritionRate, skillsAdded) {
  let feasibility = 100
  const n = Array.isArray(skillsAdded) ? skillsAdded.length : 0
  feasibility -= n * 8
  const p = String(pattern || '').toLowerCase()
  if (p === 'transformation') feasibility -= 15
  else if (p === 'redefinition') feasibility -= 30
  if (currentAttritionRate != null && Number.isFinite(currentAttritionRate) && currentAttritionRate < 10) {
    feasibility -= 10
  }
  feasibility = Math.max(0, Math.min(100, feasibility))
  let feasibility_status = 'low'
  if (feasibility >= 80) feasibility_status = 'high'
  else if (feasibility >= 50) feasibility_status = 'mixed'
  return { feasibility_score: feasibility, feasibility_status }
}

/**
 * F3 role redesign: POST JSON `{ engagementId, roleName }` → Gemini JSON + feasibility + `pipeline_runs.f3_roles`.
 *
 * **Env:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` or `VITE_SUPABASE_URL`
 *
 * **DB:** Requires `pipeline_runs` with `engagement_id` and JSONB `f3_roles` (`{ redesigns, emergent_roles }` or legacy array of redesigns). Example:
 * `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS f3_roles jsonb DEFAULT '{}'::jsonb;`
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
    console.log('[redesign-role] Supabase admin client initialized:', {
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    })

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    engagementId = /** @type {{ engagementId?: unknown }} */ (body).engagementId
    const roleNameRaw = /** @type {{ roleName?: unknown }} */ (body).roleName

    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
      return
    }
    if (typeof roleNameRaw !== 'string' || !roleNameRaw.trim()) {
      res.status(400).json({ error: 'roleName must be a non-empty string' })
      return
    }
    const roleName = roleNameRaw.trim()

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

    const intake =
      engagementRow.intake_data && typeof engagementRow.intake_data === 'object'
        ? /** @type {Record<string, unknown>} */ (engagementRow.intake_data)
        : {}
    const hierarchy = intake.hierarchy

    const { data: taskRows, error: tasksErr } = await supabase
      .from('tasks')
      .select(
        'id, engagement_id, task_id, task_name, role_performing, task_type, volume_per_day, avg_time_minutes, ai_allocation, user_allocation',
      )
      .eq('engagement_id', engagementId)

    if (tasksErr) {
      throw new Error(`Failed to load tasks: ${tasksErr.message}`)
    }

    const tasks = Array.isArray(taskRows) ? taskRows.map((t) => /** @type {Record<string, unknown>} */ (t)) : []
    const aggregates = aggregateByRole(tasks, Array.isArray(hierarchy) ? hierarchy : [])

    let aggregate = aggregates.find((a) => a.role_name === roleName)
    if (!aggregate) {
      aggregate = aggregates.find(
        (a) => String(a.role_name).trim().toLowerCase() === roleName.toLowerCase(),
      )
    }
    if (!aggregate) {
      res.status(400).json({
        error: `Role "${roleName}" was not found in this engagement's hierarchy.`,
      })
      return
    }

    if (aggregate.total_tasks_today === 0) {
      res.status(400).json({
        error: `Role "${roleName}" has no tasks assigned. Run allocation (F2) or add tasks before redesign.`,
      })
      return
    }

    const engagementContext = engagementRowToRedesignContext(
      /** @type {Record<string, unknown>} */ (engagementRow),
    )
    const promptInput = aggregateToPromptInput(/** @type {Record<string, unknown>} */ (aggregate))
    promptText = buildRoleRedesignPrompt(promptInput, engagementContext)

    const currentAttritionRate = findHierarchyAttrition(hierarchy, String(aggregate.role_name).trim())

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
      console.error('[redesign-role] JSON parse failed. Raw:', responseText?.slice(0, 2000))
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
        if (logErr) console.error('[redesign-role] llm_call_logs (parse error):', logErr)
      }
      res.status(500).json({ error: 'Model returned invalid JSON', details: parsed.error })
      return
    }

    const validationError = validateRoleRedesignPayload(parsed.value)
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
        if (logErr) console.error('[redesign-role] llm_call_logs (validation error):', logErr)
      }
      res.status(500).json({ error: 'Invalid role redesign payload from model', details: validationError })
      return
    }

    const p = parsed.value
    const pattern = String(aggregate.pattern ?? '')
    const skills_added = /** @type {string[]} */ (p.skills_added)
    const { feasibility_score, feasibility_status } = computeFeasibility(
      pattern,
      currentAttritionRate,
      skills_added,
    )

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
      console.error('[redesign-role] llm_call_logs insert failed:', logInsertErr)
      throw new Error(`Failed to write llm_call_logs: ${logInsertErr.message}`)
    }

    const generated_at = new Date().toISOString()
    const pipelineEntry = {
      role_name: aggregate.role_name,
      future_role_name: p.future_role_name,
      pattern,
      time_freed_pct: aggregate.time_freed_pct,
      feasibility_score,
      feasibility_status,
      future_responsibilities: p.future_responsibilities,
      new_tasks_added: p.new_tasks_added,
      skills_retained: p.skills_retained,
      skills_added: p.skills_added,
      skills_removed: p.skills_removed,
      future_time_split: p.future_time_split,
      transition_narrative: p.transition_narrative,
      day_in_the_life: p.day_in_the_life,
      key_transition_risks: p.key_transition_risks,
      generated_at,
      acceptance_status: 'pending',
      accepted_at: null,
      rejected_at: null,
    }

    const { data: prRow, error: prSelErr } = await supabase
      .from('pipeline_runs')
      .select('id, f3_roles')
      .eq('engagement_id', engagementId)
      .maybeSingle()

    if (prSelErr) {
      console.error('[redesign-role] pipeline_runs select:', prSelErr)
      throw new Error(`pipeline_runs read failed: ${prSelErr.message}`)
    }

    const bundle = normalizeF3Roles(prRow?.f3_roles)
    const nextF3 = f3RolesToJsonb({
      ...bundle,
      redesigns: [...bundle.redesigns, pipelineEntry],
    })

    if (prRow?.id) {
      const { error: upErr } = await supabase
        .from('pipeline_runs')
        .update({ f3_roles: nextF3 })
        .eq('id', prRow.id)
      if (upErr) {
        console.error('[redesign-role] pipeline_runs update:', upErr)
        throw new Error(`pipeline_runs update failed: ${upErr.message}`)
      }
    } else {
      const { error: insErr } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementId,
        f3_roles: nextF3,
      })
      if (insErr) {
        console.error('[redesign-role] pipeline_runs insert:', insErr)
        throw new Error(`pipeline_runs insert failed: ${insErr.message}`)
      }
    }

    res.status(200).json({
      engagementId,
      roleName: aggregate.role_name,
      feasibility_score,
      feasibility_status,
      future_role_name: p.future_role_name,
      future_responsibilities: p.future_responsibilities,
      new_tasks_added: p.new_tasks_added,
      skills_retained: p.skills_retained,
      skills_added: p.skills_added,
      skills_removed: p.skills_removed,
      future_time_split: p.future_time_split,
      transition_narrative: p.transition_narrative,
      day_in_the_life: p.day_in_the_life,
      key_transition_risks: p.key_transition_risks,
      pattern,
      time_freed_pct: aggregate.time_freed_pct,
      generated_at,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[redesign-role]', err)

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
        console.error('[redesign-role] Failed to log error row:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
