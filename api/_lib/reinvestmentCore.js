import callGemini, { geminiLogExtras } from './geminiClient.js'
import { jsonrepair } from 'jsonrepair'
import { createSupabaseAdmin } from '../../src/lib/supabaseAdmin.js'
import { buildReinvestmentPrompt, summarizeF2FromTasks } from '../../src/lib/reinvestmentPrompt.js'
import { isUuid } from './competitorAnalysisCore.js'

const FEATURE = 'reinvestment_opportunities'

const VALID_CATEGORIES = new Set([
  'upsell',
  'cross_sell',
  'ai_deepening',
  'value_stack',
  'delivery_economics',
  'retention',
])

const VALID_RISKS = new Set(['low', 'medium', 'high'])

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
function parseReinvestmentJson(responseText) {
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
        '[reinvestment] jsonrepair recovered model output:',
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
function toNum(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {Record<string, unknown>} parsed
 * @returns {Record<string, unknown>}
 */
function normalizeReinvestmentPayload(parsed) {
  const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : []
  const normalized = opportunities
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .slice(0, 5)
    .map((row) => {
      const o = /** @type {Record<string, unknown>} */ (row)
      const category = String(o.category ?? 'upsell').trim().toLowerCase()
      const risk = String(o.risk_level ?? 'medium').trim().toLowerCase()
      return {
        title: String(o.title ?? 'Reinvestment opportunity').trim(),
        category: VALID_CATEGORIES.has(category) ? category : 'upsell',
        rationale: String(o.rationale ?? '').trim() || 'Opportunity tied to this engagement profile.',
        investment_required: String(o.investment_required ?? 'TBD').trim(),
        revenue_impact: String(o.revenue_impact ?? 'TBD').trim(),
        cost_impact: String(o.cost_impact ?? 'none').trim(),
        timeline_months: Math.max(1, Math.min(24, Math.round(toNum(o.timeline_months)) || 6)),
        risk_level: VALID_RISKS.has(risk) ? risk : 'medium',
        first_step: String(o.first_step ?? '').trim() || 'Schedule working session with client sponsor.',
      }
    })

  return {
    headline:
      typeof parsed.headline === 'string' && parsed.headline.trim()
        ? parsed.headline.trim()
        : 'Reinvest delivery savings to deepen share of wallet with this client.',
    opportunities: normalized.length > 0 ? normalized : [],
    prioritization_note:
      typeof parsed.prioritization_note === 'string' && parsed.prioritization_note.trim()
        ? parsed.prioritization_note.trim()
        : 'Start with the lowest-risk option that protects renewal, then pursue revenue upsides.',
    total_potential_annual_uplift:
      typeof parsed.total_potential_annual_uplift === 'string' && parsed.total_potential_annual_uplift.trim()
        ? parsed.total_potential_annual_uplift.trim()
        : 'Plausible uplift if sequenced over 12-18 months',
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
 * POST `{ action: 'reinvestment_opportunities', engagement_id }` → reinvestment JSON.
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
export async function handleReinvestmentOpportunities(req, res) {
  const startTime = Date.now()
  const durationMs = () => Date.now() - startTime

  /** @type {string | undefined} */
  let engagementId
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

    const supabase = createSupabaseAdmin()

    const [engagementResult, pipelineResult, tasksResult] = await Promise.all([
      supabase.from('engagements').select('*').eq('id', engagementId).single(),
      supabase.from('pipeline_runs').select('*').eq('engagement_id', engagementId).maybeSingle(),
      supabase.from('tasks').select('*').eq('engagement_id', engagementId),
    ])

    const engagement = engagementResult.data
    const pipelineData = pipelineResult.data

    if (engagementResult.error || !engagement) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const f5Raw = pipelineData?.f5_economics
    if (!f5Raw) {
      res.status(400).json({
        error: 'F5 economics must be computed first. Generate F5 before requesting reinvestment opportunities.',
      })
      return
    }

    const economicsData =
      f5Raw && typeof f5Raw === 'object' && !Array.isArray(f5Raw)
        ? /** @type {Record<string, unknown>} */ (f5Raw)
        : {}

    const economicsResult =
      economicsData.economics_result && typeof economicsData.economics_result === 'object'
        ? /** @type {Record<string, unknown>} */ (economicsData.economics_result)
        : economicsData

    const genpact =
      economicsResult?.genpact_view && typeof economicsResult.genpact_view === 'object'
        ? /** @type {Record<string, unknown>} */ (economicsResult.genpact_view)
        : {}

    const monthlySavings =
      toNum(genpact.cost_to_deliver_current) - toNum(genpact.cost_to_deliver_future)

    if (monthlySavings <= 0) {
      res.status(400).json({
        error: 'No positive monthly delivery savings modeled. Reinvestment recommendations require cost reduction in F5.',
      })
      return
    }

    const tasks = Array.isArray(tasksResult.data) ? tasksResult.data : []
    const f2Summary = summarizeF2FromTasks(tasks)

    promptText = buildReinvestmentPrompt(
      /** @type {Record<string, unknown>} */ (engagement),
      economicsData,
      pipelineData ? /** @type {Record<string, unknown>} */ (pipelineData) : {},
      f2Summary,
    )

    geminiMeta = await callGemini(promptText, {
      feature: FEATURE,
      temperature: 0.4,
      response_mime_type: 'application/json',
      max_output_tokens: 8192,
    })
    responseText = geminiMeta.response_text

    let parsed
    try {
      parsed = normalizeReinvestmentPayload(parseReinvestmentJson(responseText))
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : 'Failed to parse Gemini response'
      res.status(500).json({
        error: 'Failed to parse Gemini response',
        details: message,
        raw: responseText.substring(0, 800),
      })
      return
    }

    if (parsed.opportunities.length === 0) {
      res.status(500).json({ error: 'Model returned no reinvestment opportunities' })
      return
    }

    const finalData = {
      ...parsed,
      generated_at: new Date().toISOString(),
      model_used: geminiMeta.model_used,
      monthly_savings_basis: monthlySavings,
    }

    if (pipelineData?.id) {
      const { error: updateErr } = await supabase
        .from('pipeline_runs')
        .update({ reinvestment_opportunities: finalData })
        .eq('engagement_id', engagementId)
      if (updateErr) throw new Error(updateErr.message)
    } else {
      const { error: insertErr } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementId,
        reinvestment_opportunities: finalData,
      })
      if (insertErr) throw new Error(insertErr.message)
    }

    const { error: logErr } = await supabase.from('llm_call_logs').insert({
      engagement_id: engagementId,
      feature: FEATURE,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      ...geminiLogExtras(geminiMeta, { errorMessage: null, durationFallbackMs: durationMs() }),
    })
    if (logErr) console.error('[reinvestment] llm_call_logs:', logErr.message)

    res.status(200).json(finalData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[reinvestment]', err)

    if (engagementId && isUuid(engagementId)) {
      try {
        const supabase = createSupabaseAdmin()
        await supabase.from('llm_call_logs').insert({
          engagement_id: engagementId,
          feature: FEATURE,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          ...geminiLogExtras(geminiMeta, { errorMessage: message, durationFallbackMs: durationMs() }),
        })
      } catch (logErr) {
        console.error('[reinvestment] Failed to log error:', logErr)
      }
    }

    res.status(500).json({ error: message })
  }
}
