import { GoogleGenerativeAI } from '@google/generative-ai'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const MODEL_ID = 'gemini-2.5-flash'
const FEATURE = 'f6_phase_narratives'

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
 * @param {unknown} phasesData
 * @returns {Record<string, unknown>[]}
 */
function asPhaseArray(phasesData) {
  return Array.isArray(phasesData)
    ? phasesData
        .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
        .map((p) => /** @type {Record<string, unknown>} */ (p))
    : []
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNum(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {Record<string, unknown>[]} phases
 * @returns {string | null}
 */
function validatePhasesData(phases) {
  if (!Array.isArray(phases) || phases.length !== 4) {
    return 'phasesData must contain exactly 4 phase objects'
  }

  const seen = new Set()
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i]
    const phaseId = Math.round(toNum(phase.phase_id))
    if (phaseId < 1 || phaseId > 4) {
      return `phasesData[${i}].phase_id must be 1, 2, 3, or 4`
    }
    if (seen.has(phaseId)) {
      return `phasesData contains duplicate phase_id ${phaseId}`
    }
    seen.add(phaseId)
    if (typeof phase.phase_name !== 'string' || !phase.phase_name.trim()) {
      return `phasesData[${i}].phase_name must be a non-empty string`
    }
    if (!Array.isArray(phase.nodes)) {
      return `phasesData[${i}].nodes must be an array`
    }
    if (!Array.isArray(phase.deliverables)) {
      return `phasesData[${i}].deliverables must be an array`
    }
  }
  return null
}

/**
 * @param {Record<string, unknown>[]} phases
 * @returns {string}
 */
function buildPrompt(phases) {
  const compact = phases
    .map((phase) => ({
      phase_id: Math.round(toNum(phase.phase_id)),
      phase_name: phase.phase_name,
      timing: `weeks ${Math.round(toNum(phase.start_week))}-${Math.round(toNum(phase.end_week))}`,
      nodes: Array.isArray(phase.nodes) ? phase.nodes : [],
      deliverables: Array.isArray(phase.deliverables) ? phase.deliverables : [],
      risks: Array.isArray(phase.risks) ? phase.risks : [],
    }))
    .sort((a, b) => a.phase_id - b.phase_id)

  return `You are a consultant writing executive-facing phase descriptions for an AI rollout plan. For each phase below, write a 2-sentence summary explaining the focus and expected outcome. Be specific — reference the actual capabilities and tasks. Avoid generic phrases like "foundational work" — say what the work IS.

Use the provided nodes as capability/deployment identifiers and deliverables as concrete work items. Keep each narrative exactly 2 sentences.

Phases:
${JSON.stringify(compact, null, 2)}

Return JSON only in this exact shape:
{
  "phase_narratives": [
    { "phase_id": 1, "narrative": "2-sentence string" },
    { "phase_id": 2, "narrative": "..." },
    { "phase_id": 3, "narrative": "..." },
    { "phase_id": 4, "narrative": "..." }
  ]
}`
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {{ ok: true, narratives: Array<{ phase_id: number, narrative: string }> } | { ok: false, error: string }}
 */
function validateNarrativePayload(obj) {
  const rows = obj.phase_narratives
  if (!Array.isArray(rows) || rows.length !== 4) {
    return { ok: false, error: 'phase_narratives must be an array of 4 items' }
  }

  const seen = new Set()
  /** @type {Array<{ phase_id: number, narrative: string }>} */
  const narratives = []
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, error: `phase_narratives[${i}] must be an object` }
    }
    const r = /** @type {Record<string, unknown>} */ (row)
    const phaseId = Math.round(toNum(r.phase_id))
    if (phaseId < 1 || phaseId > 4) {
      return { ok: false, error: `phase_narratives[${i}].phase_id must be 1, 2, 3, or 4` }
    }
    if (seen.has(phaseId)) {
      return { ok: false, error: `phase_narratives contains duplicate phase_id ${phaseId}` }
    }
    seen.add(phaseId)
    if (typeof r.narrative !== 'string' || !r.narrative.trim()) {
      return { ok: false, error: `phase_narratives[${i}].narrative must be a non-empty string` }
    }
    if (r.narrative.length > 2000) {
      return { ok: false, error: `phase_narratives[${i}].narrative exceeds maximum length` }
    }
    narratives.push({ phase_id: phaseId, narrative: r.narrative.trim() })
  }

  narratives.sort((a, b) => a.phase_id - b.phase_id)
  return { ok: true, narratives }
}

/**
 * F6 phase narratives: POST JSON `{ engagementId, phasesData }` → Gemini JSON → `{ phase_narratives }`.
 * Logs to `llm_call_logs` with feature `f6_phase_narratives`. Does not persist to `pipeline_runs`.
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

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    engagementId = /** @type {{ engagementId?: unknown }} */ (body).engagementId
    const phasesDataRaw = /** @type {{ phasesData?: unknown }} */ (body).phasesData

    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
      return
    }

    const phases = asPhaseArray(phasesDataRaw)
    const phasesError = validatePhasesData(phases)
    if (phasesError) {
      res.status(400).json({ error: phasesError })
      return
    }

    supabase = createSupabaseAdmin()

    const { data: engagementRow, error: engErr } = await supabase
      .from('engagements')
      .select('id')
      .eq('id', engagementId)
      .maybeSingle()

    if (engErr) {
      throw new Error(`Failed to load engagement: ${engErr.message}`)
    }
    if (!engagementRow) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    promptText = buildPrompt(phases)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
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
      logErrorMessage = parsed.error
      console.error('[generate-phase-narratives] JSON parse failed. Raw:', responseText)
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
        if (logErr) console.error('[generate-phase-narratives] llm_call_logs (parse error):', logErr)
      }
      res.status(500).json({ error: 'Model returned invalid JSON', details: parsed.error })
      return
    }

    const validation = validateNarrativePayload(parsed.value)
    if (!validation.ok) {
      logErrorMessage = validation.error
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
        if (logErr) console.error('[generate-phase-narratives] llm_call_logs (validation error):', logErr)
      }
      res.status(500).json({ error: 'Invalid phase narrative payload from model', details: validation.error })
      return
    }

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
      console.error('[generate-phase-narratives] llm_call_logs insert failed:', logInsertErr)
    }

    res.status(200).json({
      phase_narratives: validation.narratives,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-phase-narratives]', err)
    if (supabase && engagementId) {
      const { error: logErr } = await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        model: MODEL_ID,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        error_message: logErrorMessage ?? message,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        duration_ms: durationMs(),
      })
      if (logErr) console.error('[generate-phase-narratives] Failed to log error row:', logErr)
    }
    res.status(500).json({ error: message })
  }
}
