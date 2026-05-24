import callGemini, { geminiLogExtras } from './geminiClient.js'
import { createSupabaseAdmin } from '../../src/lib/supabaseAdmin.js'
import { buildCompetitorAnalysisPrompt } from '../../src/lib/competitorPrompt.js'
import {
  getCompetitorsForDomain,
  GENPACT_PROFILE,
  COMPETITOR_DIMENSIONS,
} from '../../src/lib/competitorLibrary.js'

const FEATURE = 'competitor_analysis'

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
 * @returns {Record<string, unknown>}
 */
function parseJsonFromModel(raw) {
  const trimmed = raw.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed
  const parsed = JSON.parse(jsonText)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Parsed JSON is not an object')
  }
  return /** @type {Record<string, unknown>} */ (parsed)
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
  const competitors = parsed.competitors
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return 'competitors must be a non-empty array'
  }
  for (let i = 0; i < competitors.length; i += 1) {
    const row = competitors[i]
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return `competitors[${i}] must be an object`
    }
    const c = /** @type {Record<string, unknown>} */ (row)
    if (typeof c.name !== 'string' || !c.name.trim()) {
      return `competitors[${i}].name must be a non-empty string`
    }
    const scores = c.scores
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
      return `competitors[${i}].scores must be an object`
    }
  }
  if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    return 'summary must be a non-empty string'
  }
  return null
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
      temperature: 0.3,
      response_mime_type: 'application/json',
      max_output_tokens: 4096,
    })
    responseText = geminiMeta.response_text

    let parsed
    try {
      parsed = parseJsonFromModel(responseText)
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
        raw: responseText.substring(0, 500),
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

    const scoredList = /** @type {Array<Record<string, unknown>>} */ (parsed.competitors)
    const enrichedCompetitors = scoredList.map((scored) => {
      const meta = allProfiles.find((c) => c.name === scored.name)
      return {
        ...scored,
        logo: meta?.logo ?? null,
        short: meta?.short ?? String(scored.name ?? '').slice(0, 3).toUpperCase(),
        is_genpact: scored.name === 'Genpact',
      }
    })

    const finalData = {
      competitors: enrichedCompetitors,
      dimensions: COMPETITOR_DIMENSIONS,
      summary: parsed.summary,
      key_differentiators: Array.isArray(parsed.key_differentiators) ? parsed.key_differentiators : [],
      key_risks: Array.isArray(parsed.key_risks) ? parsed.key_risks : [],
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
