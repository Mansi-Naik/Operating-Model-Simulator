import callGemini, { geminiLogExtras } from './_lib/geminiClient.js'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const FEATURE = 'f4_variant_narrative'

const VARIANT_NAMES = new Set(['conservative', 'balanced', 'aggressive'])

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
 * @param {unknown} v
 * @returns {number}
 */
function toNum(v) {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {unknown} variantData
 * @returns {Record<string, unknown>}
 */
function asVariantObject(variantData) {
  return variantData && typeof variantData === 'object' && !Array.isArray(variantData)
    ? /** @type {Record<string, unknown>} */ (variantData)
    : {}
}

/**
 * Pulls headline stats from `generateThreeVariants` output for the prompt.
 *
 * @param {Record<string, unknown>} variantData
 */
function extractVariantStats(variantData) {
  const constraints =
    variantData.constraints_used && typeof variantData.constraints_used === 'object'
      ? /** @type {Record<string, unknown>} */ (variantData.constraints_used)
      : {}
  const pod =
    variantData.pod_composition && typeof variantData.pod_composition === 'object'
      ? /** @type {Record<string, unknown>} */ (variantData.pod_composition)
      : {}
  const rollup =
    variantData.org_rollup && typeof variantData.org_rollup === 'object'
      ? /** @type {Record<string, unknown>} */ (variantData.org_rollup)
      : {}
  return {
    span: toNum(constraints.target_span),
    capacity_per_day: toNum(pod.pod_capacity_per_day),
    cost_index: toNum(variantData.cost_index),
    total_headcount: toNum(rollup.total_headcount),
    headcount_delta_pct: toNum(rollup.headcount_delta_pct),
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} engagementRow
 * @returns {{ domain: string, risk_tolerance: string, readiness_band: string | null }}
 */
function readEngagementContext(engagementRow) {
  if (!engagementRow || typeof engagementRow !== 'object') {
    return { domain: 'unknown', risk_tolerance: 'medium', readiness_band: null }
  }
  const domain =
    typeof engagementRow.domain === 'string' && engagementRow.domain.trim()
      ? engagementRow.domain.trim()
      : 'unknown'
  const intake =
    engagementRow.intake_data && typeof engagementRow.intake_data === 'object' && !Array.isArray(engagementRow.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagementRow.intake_data)
      : {}
  const preferences =
    intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
      ? /** @type {Record<string, unknown>} */ (intake.preferences)
      : {}
  const rawTol = preferences.risk_tolerance ?? intake.risk_tolerance
  const tol = typeof rawTol === 'string' ? rawTol.trim().toLowerCase() : ''
  const risk_tolerance =
    tol === 'low' || tol === 'medium' || tol === 'high' ? tol : 'medium'
  const readiness =
    typeof engagementRow.readiness_band === 'string' && engagementRow.readiness_band.trim()
      ? engagementRow.readiness_band.trim()
      : null
  return { domain, risk_tolerance, readiness_band: readiness }
}

/**
 * @param {object} params
 * @returns {string}
 */
function buildNarrativePrompt(params) {
  const {
    variantName,
    displayName,
    domain,
    risk_tolerance,
    readiness_band,
    span,
    capacity_per_day,
    cost_index,
    total_headcount,
    headcount_delta_pct,
  } = params

  const readinessLine =
    readiness_band != null && readiness_band !== ''
      ? `\n- Readiness band: ${readiness_band}`
      : ''

  return `You are assisting with operating-model design. Write copy for an internal sponsor readout (not marketing).

Engagement context:
- Domain: ${domain}
- Risk tolerance (intake preference): ${risk_tolerance}${readinessLine}

Variant: ${displayName} (key: ${variantName})
Key sizing stats:
- Target span (agents per team lead): ${span}
- Pod capacity (items handled per day for one pod): ${Math.round(capacity_per_day * 100) / 100}
- Cost index vs balanced baseline (1.0 = balanced): ${Math.round(cost_index * 1000) / 1000}
- Total modeled headcount: ${Math.round(total_headcount * 1000) / 1000}
- Headcount change vs today (%): ${Math.round(headcount_delta_pct * 100) / 100}

Write a 2-sentence narrative explaining when this variant might be chosen.
First sentence: what kind of engagement this fits.
Second sentence: the tradeoff.
Keep it crisp — no marketing language, no superlatives. Treat it as a consultant explaining tradeoffs to a sponsor.

Return JSON only in this exact shape:
{"narrative":"<two sentences max>"}`
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {string | null}
 */
function validateNarrativePayload(obj) {
  const n = obj.narrative
  if (typeof n !== 'string' || !n.trim()) {
    return 'narrative must be a non-empty string'
  }
  if (n.length > 4000) {
    return 'narrative exceeds maximum length'
  }
  return null
}

/**
 * F4 variant narrative: POST JSON `{ engagementId, variantName, variantData }` → Gemini JSON → `{ narrative }`.
 * Logs to `llm_call_logs` with feature `f4_variant_narrative`. Does not persist to `pipeline_runs`.
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
    const variantNameRaw = /** @type {{ variantName?: unknown }} */ (body).variantName
    const variantDataRaw = /** @type {{ variantData?: unknown }} */ (body).variantData

    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
      return
    }

    const variantName =
      typeof variantNameRaw === 'string' ? variantNameRaw.trim().toLowerCase() : ''
    if (!VARIANT_NAMES.has(variantName)) {
      res.status(400).json({
        error: 'variantName must be conservative, balanced, or aggressive',
      })
      return
    }

    const variantData = asVariantObject(variantDataRaw)
    if (Object.keys(variantData).length === 0) {
      res.status(400).json({ error: 'variantData must be a non-empty object' })
      return
    }

    const hasRollup =
      variantData.org_rollup &&
      typeof variantData.org_rollup === 'object' &&
      !Array.isArray(variantData.org_rollup)
    const hasPod =
      variantData.pod_composition &&
      typeof variantData.pod_composition === 'object' &&
      !Array.isArray(variantData.pod_composition)
    const hasConstraints =
      variantData.constraints_used &&
      typeof variantData.constraints_used === 'object' &&
      !Array.isArray(variantData.constraints_used)
    if (!hasRollup || !hasPod || !hasConstraints) {
      res.status(400).json({
        error:
          'variantData must include org_rollup, pod_composition, and constraints_used objects (full generateThreeVariants row)',
      })
      return
    }

    const embeddedName = variantData.variant_name
    if (typeof embeddedName === 'string' && embeddedName.trim().toLowerCase() !== variantName) {
      res.status(400).json({ error: 'variantName does not match variantData.variant_name' })
      return
    }

    supabase = createSupabaseAdmin()

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

    const eng = readEngagementContext(/** @type {Record<string, unknown>} */ (engagementRow))
    const stats = extractVariantStats(variantData)
    const displayName =
      typeof variantData.display_name === 'string' && variantData.display_name.trim()
        ? variantData.display_name.trim()
        : variantName.charAt(0).toUpperCase() + variantName.slice(1)

    promptText = buildNarrativePrompt({
      variantName,
      displayName,
      domain: eng.domain,
      risk_tolerance: eng.risk_tolerance,
      readiness_band: eng.readiness_band,
      span: stats.span,
      capacity_per_day: stats.capacity_per_day,
      cost_index: stats.cost_index,
      total_headcount: stats.total_headcount,
      headcount_delta_pct: stats.headcount_delta_pct,
    })

    geminiMeta = await callGemini(promptText, {
      feature: 'f4_variant_narrative',
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
      console.error('[generate-variant-narrative] JSON parse failed. Raw:', responseText)
      {
        const { error: logErr } = await insertLlmCallLog(supabase, {
          engagement_id: engagementId,
          feature: FEATURE,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          ...geminiLogExtras(geminiMeta, { errorMessage: logErrorMessage, durationFallbackMs: durationMs() }),
        })
        if (logErr) console.error('[generate-variant-narrative] llm_call_logs (parse error):', logErr)
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
        if (logErr) console.error('[generate-variant-narrative] llm_call_logs (validation error):', logErr)
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
      console.error('[generate-variant-narrative] llm_call_logs insert failed:', logInsertErr)
      throw new Error(`Failed to write llm_call_logs: ${logInsertErr.message}`)
    }

    res.status(200).json({ narrative })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[generate-variant-narrative]', err)

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
        console.error('[generate-variant-narrative] Failed to log error row:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
