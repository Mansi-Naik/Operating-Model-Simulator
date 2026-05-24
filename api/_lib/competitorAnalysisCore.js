import callGemini, { geminiLogExtras } from './geminiClient.js'
import { jsonrepair } from 'jsonrepair'
import { createSupabaseAdmin } from '../../src/lib/supabaseAdmin.js'
import { buildCompetitorNarrativePrompt } from '../../src/lib/competitorNarrativePrompt.js'
import {
  getCuratedCompetitorsForDomain,
  COMPETITOR_DIMENSIONS,
  resolveDomainKey,
} from '../../src/lib/competitorLibrary.js'

const FEATURE = 'competitor_analysis'

const DIMENSION_IDS = [
  'ai_automation',
  'industry_expertise',
  'cost_competitive',
  'implementation_speed',
  'risk_compliance',
  'client_outcomes',
]

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isUuid(value) {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

/**
 * @param {string} raw
 * @returns {string}
 */
function extractJsonText(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '')
    const fence = s.lastIndexOf('```')
    if (fence >= 0) s = s.slice(0, fence)
    s = s.trim()
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) return s.slice(start, end + 1)
  return s
}

/**
 * @param {string} responseText
 * @returns {Record<string, unknown>}
 */
function parseNarrativeJson(responseText) {
  const jsonText = extractJsonText(responseText)
  if (!jsonText) throw new Error('Empty model response')
  try {
    const value = JSON.parse(jsonText)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Parsed JSON is not an object')
    }
    return /** @type {Record<string, unknown>} */ (value)
  } catch (firstErr) {
    try {
      const repaired = jsonrepair(jsonText)
      const value = JSON.parse(repaired)
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Repaired JSON is not an object')
      }
      console.warn(
        '[competitor-analysis] jsonrepair recovered narrative output:',
        firstErr instanceof Error ? firstErr.message : firstErr,
      )
      return /** @type {Record<string, unknown>} */ (value)
    } catch {
      throw firstErr
    }
  }
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function clampScore(value) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(5, Math.round(n)))
}

/**
 * @param {Record<string, unknown>} provider
 * @returns {Record<string, unknown>}
 */
function formatCuratedCompetitor(provider) {
  const scores =
    provider.scores && typeof provider.scores === 'object' && !Array.isArray(provider.scores)
      ? /** @type {Record<string, unknown>} */ (provider.scores)
      : {}
  const rationales =
    provider.rationales && typeof provider.rationales === 'object' && !Array.isArray(provider.rationales)
      ? /** @type {Record<string, unknown>} */ (provider.rationales)
      : {}

  /** @type {Record<string, number>} */
  const normalizedScores = {}
  /** @type {Record<string, string>} */
  const normalizedRationales = {}
  for (const id of DIMENSION_IDS) {
    normalizedScores[id] = clampScore(scores[id])
    normalizedRationales[id] = String(rationales[id] ?? '').trim() || 'Curated benchmark score.'
  }

  return {
    name: String(provider.name ?? ''),
    domain: typeof provider.domain === 'string' ? provider.domain : null,
    logo: typeof provider.logo === 'string' ? provider.logo : null,
    short:
      typeof provider.short === 'string'
        ? provider.short
        : String(provider.name ?? '')
            .slice(0, 3)
            .toUpperCase(),
    is_genpact: Boolean(provider.is_genpact),
    scores: normalizedScores,
    rationales: normalizedRationales,
    strengths: Array.isArray(provider.strengths)
      ? provider.strengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [],
    weaknesses: Array.isArray(provider.weaknesses)
      ? provider.weaknesses.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
      : [],
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 */
async function insertLlmCallLog(supabase, row) {
  const { error } = await supabase.from('llm_call_logs').insert(row)
  if (error) console.error('[competitor-analysis] llm_call_logs:', error.message)
}

/**
 * @param {Record<string, unknown>} parsed
 * @returns {Record<string, unknown>}
 */
function normalizeNarrativePayload(parsed) {
  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : 'Illustrative competitive positioning for this engagement profile.'
  const key_differentiators = Array.isArray(parsed.key_differentiators)
    ? parsed.key_differentiators.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
    : []
  const key_risks = Array.isArray(parsed.key_risks)
    ? parsed.key_risks.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
    : []

  return {
    ...parsed,
    summary,
    key_differentiators:
      key_differentiators.length > 0
        ? key_differentiators
        : ['Emphasize domain expertise and measurable outcomes in proposals.'],
    key_risks:
      key_risks.length > 0 ? key_risks : ['Validate assumptions against latest public competitor moves.'],
  }
}

/**
 * @param {Record<string, unknown>} body
 * @returns {string | undefined}
 */
function engagementIdFromBody(body) {
  if (typeof body.engagement_id === 'string') return body.engagement_id
  if (typeof body.engagementId === 'string') return body.engagementId
  return undefined
}

/**
 * POST body `{ action: 'competitor_analysis', engagement_id }` → competitor scores JSON.
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
export async function handleCompetitorAnalysis(req, res) {
  const startTime = Date.now()
  const durationMs = () => Date.now() - startTime

  /** @type {string | undefined} */
  let engagementId
  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let supabase = null
  let promptText = ''
  let responseText = ''
  /** @type {Awaited<ReturnType<typeof callGemini>> | null} */
  let geminiMeta = null

  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
      return
    }

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    engagementId = engagementIdFromBody(/** @type {Record<string, unknown>} */ (body))
    if (!isUuid(engagementId)) {
      res.status(400).json({ error: 'engagement_id must be a valid UUID' })
      return
    }

    supabase = createSupabaseAdmin()

    const { data: engagement, error: engErr } = await supabase
      .from('engagements')
      .select('*')
      .eq('id', engagementId)
      .single()

    if (engErr || !engagement) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const domain =
      typeof engagement.domain === 'string' && engagement.domain.trim()
        ? engagement.domain.trim()
        : null
    const libraryKey = resolveDomainKey(domain)
    const curatedProviders = getCuratedCompetitorsForDomain(domain)
    const competitors = curatedProviders.map((p) =>
      formatCuratedCompetitor(/** @type {Record<string, unknown>} */ (p)),
    )

    promptText = buildCompetitorNarrativePrompt(
      /** @type {Record<string, unknown>} */ (engagement),
      curatedProviders,
    )

    geminiMeta = await callGemini(promptText, {
      feature: FEATURE,
      temperature: 0.3,
      response_mime_type: 'application/json',
      max_output_tokens: 1024,
    })
    responseText = geminiMeta.response_text

    let narrative
    try {
      narrative = normalizeNarrativePayload(parseNarrativeJson(responseText))
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : 'Failed to parse Gemini response'
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, { errorMessage: message, durationFallbackMs: durationMs() }),
      })
      res.status(500).json({
        error: 'Failed to parse Gemini response',
        details: message,
        raw: responseText.substring(0, 800),
      })
      return
    }

    const finalData = {
      competitors,
      dimensions: COMPETITOR_DIMENSIONS,
      summary: narrative.summary,
      key_differentiators: narrative.key_differentiators,
      key_risks: narrative.key_risks,
      generated_at: new Date().toISOString(),
      model_used: geminiMeta.model_used,
      domain_used: libraryKey,
      north_star_dimension: 'ai_automation',
      scores_source: 'curated_benchmarks',
      data_source:
        'Curated from 2025 analyst reports (Gartner MQ F&A BPO, ISG Provider Lens, HFS, IDC MarketScape) and public company filings',
    }

    const { data: existing } = await supabase
      .from('pipeline_runs')
      .select('id')
      .eq('engagement_id', engagementId)
      .maybeSingle()

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('pipeline_runs')
        .update({ competitor_analysis: finalData })
        .eq('engagement_id', engagementId)
      if (updateErr) throw new Error(updateErr.message)
    } else {
      const { error: insertErr } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementId,
        competitor_analysis: finalData,
      })
      if (insertErr) throw new Error(insertErr.message)
    }

    await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      ...geminiLogExtras(geminiMeta, { errorMessage: null, durationFallbackMs: durationMs() }),
    })

    res.status(200).json(finalData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[competitor-analysis]', err)

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
        console.error('[competitor-analysis] Failed to log error:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
