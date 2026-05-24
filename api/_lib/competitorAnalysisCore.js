import callGemini, { geminiLogExtras } from './geminiClient.js'
import { jsonrepair } from 'jsonrepair'
import { createSupabaseAdmin } from '../../src/lib/supabaseAdmin.js'
import { buildCompetitorAnalysisPrompt } from '../../src/lib/competitorPrompt.js'
import {
  getCompetitorsForDomain,
  GENPACT_PROFILE,
  COMPETITOR_DIMENSIONS,
  primaryLogoUrl,
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
 * @returns {{ value: Record<string, unknown>, repaired: boolean }}
 */
function parseCompetitorJson(responseText) {
  const jsonText = extractJsonText(responseText)
  if (!jsonText) {
    throw new Error('Empty model response')
  }
  try {
    const value = JSON.parse(jsonText)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Parsed JSON is not an object')
    }
    return { value: /** @type {Record<string, unknown>} */ (value), repaired: false }
  } catch (firstErr) {
    try {
      const repaired = jsonrepair(jsonText)
      const value = JSON.parse(repaired)
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Repaired JSON is not an object')
      }
      console.warn(
        '[competitor-analysis] jsonrepair recovered model output:',
        firstErr instanceof Error ? firstErr.message : firstErr,
      )
      return { value: /** @type {Record<string, unknown>} */ (value), repaired: true }
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
 * @param {string} scoredName
 * @param {Array<{ name: string }>} profiles
 * @returns {{ name: string, logo?: string, short?: string } | undefined}
 */
function matchProfile(scoredName, profiles) {
  const name = String(scoredName ?? '').trim()
  if (!name) return undefined
  const exact = profiles.find((p) => p.name === name)
  if (exact) return exact
  const lower = name.toLowerCase()
  return profiles.find((p) => {
    const pl = p.name.toLowerCase()
    return pl === lower || lower.includes(pl) || pl.includes(lower)
  })
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ name: string, logo?: string, short?: string }} profile
 * @returns {Record<string, unknown>}
 */
function normalizeCompetitorRow(row, profile) {
  const scores = row.scores && typeof row.scores === 'object' && !Array.isArray(row.scores)
    ? /** @type {Record<string, unknown>} */ (row.scores)
    : {}
  const rationales =
    row.rationales && typeof row.rationales === 'object' && !Array.isArray(row.rationales)
      ? /** @type {Record<string, unknown>} */ (row.rationales)
      : {}

  /** @type {Record<string, number>} */
  const normalizedScores = {}
  /** @type {Record<string, string>} */
  const normalizedRationales = {}
  for (const id of DIMENSION_IDS) {
    normalizedScores[id] = clampScore(scores[id])
    const rationale = String(rationales[id] ?? '').trim()
    normalizedRationales[id] =
      rationale || 'Illustrative score based on publicly known market positioning.'
  }

  const domain = profile.domain ?? null
  return {
    name: profile.name,
    domain,
    scores: normalizedScores,
    rationales: normalizedRationales,
    strengths: Array.isArray(row.strengths)
      ? row.strengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [],
    weaknesses: Array.isArray(row.weaknesses)
      ? row.weaknesses.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
      : [],
    logo: domain ? primaryLogoUrl(domain) : profile.logo ?? null,
    short: profile.short ?? profile.name.slice(0, 3).toUpperCase(),
    is_genpact: profile.name === 'Genpact',
  }
}

/**
 * @param {Record<string, unknown>} parsed
 * @param {Array<{ name: string, logo?: string, short?: string }>} allProfiles
 * @returns {Array<Record<string, unknown>>}
 */
function buildEnrichedCompetitors(parsed, allProfiles) {
  const scoredList = Array.isArray(parsed.competitors) ? parsed.competitors : []
  /** @type {Map<string, Record<string, unknown>>} */
  const byProfileName = new Map()

  for (const row of scoredList) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const profile = matchProfile(/** @type {Record<string, unknown>} */ (row).name, allProfiles)
    if (!profile) continue
    byProfileName.set(profile.name, normalizeCompetitorRow(/** @type {Record<string, unknown>} */ (row), profile))
  }

  return allProfiles.map((profile) => {
    if (byProfileName.has(profile.name)) return byProfileName.get(profile.name)
    return normalizeCompetitorRow({}, profile)
  })
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
 * @returns {string | null}
 */
function validateCompetitorPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'payload must be an object'
  }
  const competitors = parsed.competitors
  if (competitors != null && !Array.isArray(competitors)) {
    return 'competitors must be an array when present'
  }
  return null
}

/**
 * @param {Record<string, unknown>} parsed
 * @returns {Record<string, unknown>}
 */
function normalizeCompetitorPayload(parsed) {
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
    const competitors = getCompetitorsForDomain(domain)
    const allProfiles = [GENPACT_PROFILE, ...competitors]

    promptText = buildCompetitorAnalysisPrompt(
      /** @type {Record<string, unknown>} */ (engagement),
      competitors,
    )

    geminiMeta = await callGemini(promptText, {
      feature: FEATURE,
      temperature: 0.2,
      response_mime_type: 'application/json',
      max_output_tokens: 8192,
    })
    responseText = geminiMeta.response_text

    let parsed
    let jsonRepaired = false
    try {
      const parseResult = parseCompetitorJson(responseText)
      parsed = normalizeCompetitorPayload(parseResult.value)
      jsonRepaired = parseResult.repaired
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

    const validationError = validateCompetitorPayload(parsed)
    if (validationError) {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, { errorMessage: validationError, durationFallbackMs: durationMs() }),
      })
      res.status(500).json({ error: 'Invalid competitor payload from model', details: validationError })
      return
    }

    const enrichedCompetitors = buildEnrichedCompetitors(parsed, allProfiles)

    const finalData = {
      competitors: enrichedCompetitors,
      dimensions: COMPETITOR_DIMENSIONS,
      summary: parsed.summary,
      key_differentiators: parsed.key_differentiators,
      key_risks: parsed.key_risks,
      json_repaired: jsonRepaired,
      generated_at: new Date().toISOString(),
      model_used: geminiMeta.model_used,
      domain_used: domain || 'default',
      north_star_dimension: 'ai_automation',
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
