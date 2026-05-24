import callGemini, { geminiLogExtras } from './_lib/geminiClient.js'
import { handleCompetitorAnalysis } from './_lib/competitorAnalysisCore.js'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const FEATURE = 'f5_sensitivity'

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
 * @param {unknown} sensitivityData
 * @returns {Record<string, unknown>}
 */
function asSensitivityObject(sensitivityData) {
  return sensitivityData && typeof sensitivityData === 'object' && !Array.isArray(sensitivityData)
    ? /** @type {Record<string, unknown>} */ (sensitivityData)
    : {}
}

/**
 * @param {Record<string, unknown>} sensitivityData
 * @returns {string | null}
 */
function validateSensitivityData(sensitivityData) {
  const drivers = sensitivityData.drivers
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return 'sensitivityData must include a non-empty drivers array'
  }

  for (let i = 0; i < drivers.length; i += 1) {
    const driver = drivers[i]
    if (!driver || typeof driver !== 'object' || Array.isArray(driver)) {
      return `sensitivityData.drivers[${i}] must be an object`
    }
    const d = /** @type {Record<string, unknown>} */ (driver)
    if (typeof d.name !== 'string' || !d.name.trim()) {
      return `sensitivityData.drivers[${i}].name must be a non-empty string`
    }
  }

  return null
}

/**
 * @param {Record<string, unknown>} sensitivityData
 * @returns {string}
 */
function buildPrompt(sensitivityData) {
  const compactSensitivity = JSON.stringify(sensitivityData, null, 2)
  return `You are a consultant explaining sensitivity analysis to a senior sponsor. Given these three drivers and their impact ranges, write a single paragraph (3-4 sentences) explaining which assumption moves the needle most and what the implications are. Be specific with numbers. No marketing language.

Sensitivity data:
${compactSensitivity}

Return JSON only in this exact shape:
{
  "narrative": "<3-4 sentences, plain language>"
}`
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string | null}
 */
function validateNarrativePayload(obj) {
  const narrative = obj.narrative
  if (typeof narrative !== 'string' || !narrative.trim()) {
    return 'narrative must be a non-empty string'
  }
  if (narrative.length > 4000) {
    return 'narrative exceeds maximum length'
  }
  return null
}

/**
 * F5 economics AI routes (single serverless function for Vercel Hobby limit):
 *
 * - `{ engagementId, sensitivityData }` → sensitivity narrative `{ narrative }`
 * - `{ action: 'competitor_analysis', engagement_id }` → competitor analysis JSON
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

  const body = req.body
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    if (action === 'competitor_analysis') {
      await handleCompetitorAnalysis(req, res)
      return
    }
  }

  await handleSensitivityNarrative(req, res, startTime)
}

/**
 * @param {*} req
 * @param {*} res
 * @param {number} startTime
 * @returns {Promise<void>}
 */
async function handleSensitivityNarrative(req, res, startTime) {
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
  /** @type {any} */
  let geminiMeta = null

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
    const sensitivityDataRaw = /** @type {{ sensitivityData?: unknown }} */ (body).sensitivityData

    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
      return
    }

    const sensitivityData = asSensitivityObject(sensitivityDataRaw)
    if (Object.keys(sensitivityData).length === 0) {
      res.status(400).json({ error: 'sensitivityData must be a non-empty object' })
      return
    }

    const sensitivityError = validateSensitivityData(sensitivityData)
    if (sensitivityError) {
      res.status(400).json({ error: sensitivityError })
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

    promptText = buildPrompt(sensitivityData)

    geminiMeta = await callGemini(promptText, {
      feature: 'f5_sensitivity',
      temperature: 0.2,
      response_mime_type: 'application/json',
    })
    responseText = geminiMeta.response_text
    promptTokens = geminiMeta.prompt_tokens
    completionTokens = geminiMeta.completion_tokens
    totalTokens = geminiMeta.total_tokens

    const parsed = parseJsonResponse(responseText)
    if (!parsed.ok) {
      logErrorMessage = parsed.error
      console.error('[generate-sensitivity-narrative] JSON parse failed. Raw:', responseText)
      {
        const { error: logErr } = await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          ...geminiLogExtras(geminiMeta, { errorMessage: logErrorMessage, durationFallbackMs: durationMs() }),
        })
        if (logErr) console.error('[generate-sensitivity-narrative] llm_call_logs (parse error):', logErr)
      }
      res.status(500).json({ error: 'Model returned invalid JSON', details: parsed.error })
      return
    }

    const validationError = validateNarrativePayload(parsed.value)
    if (validationError) {
      logErrorMessage = validationError
      {
        const { error: logErr } = await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          ...geminiLogExtras(geminiMeta, { errorMessage: validationError, durationFallbackMs: durationMs() }),
        })
        if (logErr) console.error('[generate-sensitivity-narrative] llm_call_logs (validation error):', logErr)
      }
      res.status(500).json({ error: 'Invalid narrative payload from model', details: validationError })
      return
    }

    const narrative = /** @type {string} */ (parsed.value.narrative).trim()

    const { error: logInsertErr } = await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      ...geminiLogExtras(geminiMeta, { errorMessage: null, durationFallbackMs: durationMs() }),
    })
    if (logInsertErr) {
      console.error('[generate-sensitivity-narrative] llm_call_logs insert failed:', logInsertErr)
      throw new Error(`Failed to write llm_call_logs: ${logInsertErr.message}`)
    }

    res.status(200).json({ narrative })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[generate-sensitivity-narrative]', err)

    if (supabase && engagementId && isUuid(engagementId)) {
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
        console.error('[generate-sensitivity-narrative] Failed to log error row:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
