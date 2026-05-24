/**
 * @fileoverview Prepares render-ready data for the F7 summary PDF export.
 */

import { COMPETITOR_DIMENSIONS } from './competitorLibrary.js'
import { normalizeF3Roles } from './f3RolesStorage.js'
import { computeDailyTimeBreakdown } from './roleAggregation.js'
import { recommendTechStackForTask } from './techStackLibrary.js'
import { resolveCompetitorDomain, primaryLogoUrl } from './competitorLibrary.js'

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {}
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v, fallback = '') {
  if (v == null) return fallback
  const s = String(v).trim()
  return s || fallback
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
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(text, maxLen) {
  const s = str(text)
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen).trim()}…`
}

/**
 * @param {number} value
 * @param {number} [digits]
 * @returns {number}
 */
function round(value, digits = 0) {
  if (!Number.isFinite(value)) return 0
  const m = 10 ** digits
  return Math.round(value * m) / m
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {string[]}
 */
function buildContextChips(engagement) {
  const intake = asObj(engagement?.intake_data)
  const eng = asObj(intake.engagement)
  const pref = asObj(intake.preferences)
  const chips = []

  const dom = str(eng.domain)
  const sub = str(eng.sub_function)
  if (dom || sub) chips.push([dom, sub].filter(Boolean).join(' · '))

  const end = str(eng.contract_end_date)
  if (end) {
    const endDate = new Date(end)
    if (!Number.isNaN(endDate.getTime())) {
      const months = Math.max(
        0,
        Math.round((endDate.getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000)),
      )
      if (months > 0) chips.push(`${months}mo remaining`)
    }
  }

  const mp = str(pref.margin_profile)
  if (mp && mp !== 'not_disclosed') {
    chips.push(`${mp.charAt(0).toUpperCase()}${mp.slice(1)} margin`)
  }

  const exp = pref.expected_implementation_months
  if (typeof exp === 'number' && Number.isFinite(exp) && exp >= 1) {
    chips.push(`${exp} months expected`)
  }

  return chips
}

/**
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {Array<{ taskName: string, tools: Array<{ name: string, category: string, logo: string }> }>}
 */
function buildTechRecommendations(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  /** @type {Array<{ taskName: string, tools: Array<{ name: string, category: string, logo: string }> }>} */
  const out = []

  for (const task of list.slice(0, 12)) {
    const recs = recommendTechStackForTask(task)
    if (!recs.length) continue
    const taskName = str(task.task_name, 'Task')
    out.push({
      taskName,
      tools: recs.slice(0, 3).map((r) => ({
        name: str(r.name),
        category: str(r.category),
        logo: str(r.logo) || str(r.logo_alt),
      })),
    })
  }

  return out.slice(0, 10)
}

/**
 * @param {Record<string, unknown> | null | undefined} pipelineRuns
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {Array<{ roleName: string, activities: Array<{ name: string, minutes: number }> }>}
 */
function buildRoleBreakdowns(pipelineRuns, tasks) {
  const f3 = normalizeF3Roles(asObj(pipelineRuns).f3_roles)
  const taskList = Array.isArray(tasks) ? tasks : []
  /** @type {Array<{ roleName: string, activities: Array<{ name: string, minutes: number }> }>} */
  const out = []

  for (const role of f3.redesigns.slice(0, 3)) {
    const roleName = str(role.role_name ?? role.name, 'Role')
    const breakdown = computeDailyTimeBreakdown(role, taskList, false)
    const activities = (Array.isArray(breakdown.activities) ? breakdown.activities : [])
      .slice(0, 8)
      .map((a) => ({
        name: str(a.name ?? a.activity),
        minutes: toNum(a.minutes),
      }))
    if (activities.length) out.push({ roleName, activities })
  }

  return out
}

/**
 * @param {Record<string, unknown> | null | undefined} competitor
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeCompetitorRows(competitor) {
  const list = Array.isArray(competitor?.competitors) ? competitor.competitors : []
  return list
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const r = asObj(row)
      const name = str(r.name, 'Provider')
      const domain = resolveCompetitorDomain(name, r.logo, r.domain)
      const logo = str(r.logo) || primaryLogoUrl(domain)
      const scores = asObj(r.scores)
      return {
        name,
        short: str(r.short, name.slice(0, 3).toUpperCase()),
        logo,
        is_genpact: r.is_genpact === true,
        scores: COMPETITOR_DIMENSIONS.reduce(
          (acc, dim) => {
            acc[dim.id] = toNum(scores[dim.id])
            return acc
          },
          /** @type {Record<string, number>} */ ({}),
        ),
      }
    })
}

/**
 * @param {Record<string, unknown> | null | undefined} pipelineRuns
 * @returns {Array<Record<string, unknown>>}
 */
function buildSensitivityDrivers(pipelineRuns) {
  const f5 = asObj(asObj(pipelineRuns).f5_economics)
  const economics = asObj(f5.economics_result)
  const sensitivity = asObj(economics.sensitivity)
  const drivers = Array.isArray(sensitivity.drivers) ? sensitivity.drivers : []

  return drivers
    .map((row) => {
      const d = asObj(row)
      const low = toNum(d.low_pct)
      const high = toNum(d.high_pct)
      const base = toNum(d.base_pct)
      return {
        name: str(d.name, 'Driver'),
        low,
        base,
        high,
        range: Math.abs(high - low),
      }
    })
    .sort((a, b) => b.range - a.range)
}

/**
 * @param {{
 *   summary: Record<string, unknown> | null | undefined,
 *   engagement: Record<string, unknown> | null | undefined,
 *   tasks: Record<string, unknown>[] | null | undefined,
 *   pipelineRuns: Record<string, unknown> | null | undefined,
 *   clientName: string,
 * }} input
 * @returns {Record<string, unknown>}
 */
export function buildPdfExportContext(input) {
  const summary = asObj(input.summary)
  const engagement = asObj(input.engagement)
  const pipelineRuns = asObj(input.pipelineRuns)
  const headline = asObj(summary.headline)
  const extended = asObj(summary.extended_blocks)

  const f5Wrap = asObj(pipelineRuns.f5_economics)
  const economics = asObj(f5Wrap.economics_result)
  const genpactView = asObj(economics.genpact_view)
  const savings = asObj(economics.savings)

  const hasGenpactMargin =
    genpactView.gross_margin_pct_current != null || genpactView.gross_margin_pct_future != null
  const marginCurrent = toNum(genpactView.gross_margin_pct_current)
  const marginFuture = toNum(genpactView.gross_margin_pct_future)
  const clientSavingsPct = Math.round(toNum(savings.monthly_savings_pct))

  const intake = asObj(engagement.intake_data)
  const engBlock = asObj(intake.engagement)
  const domain = str(engBlock.domain)
  const subFunction = str(engBlock.sub_function)

  const competitorRaw = asObj(pipelineRuns.competitor_analysis)
  const reinvestRaw = asObj(pipelineRuns.reinvestment_opportunities)
  const opportunities = Array.isArray(reinvestRaw.opportunities) ? reinvestRaw.opportunities : []

  const sensitivityNarrative =
    typeof f5Wrap.sensitivity_narrative === 'string'
      ? f5Wrap.sensitivity_narrative.trim()
      : typeof economics.sensitivity_narrative === 'string'
        ? economics.sensitivity_narrative.trim()
        : ''

  const billingExtended = asObj(extended.billing_model)
  const billingRationale =
    str(billingExtended.rationale_short) ||
    truncate(asObj(economics.billing_model_recommendation).rationale, 300)

  const competitorList = normalizeCompetitorRows(competitorRaw)
  const hasCompetitor = competitorList.length > 0 || Boolean(str(competitorRaw.summary))
  const reinvestOpps = opportunities.length > 0

  return {
    clientName: str(input.clientName, 'Engagement'),
    generatedAt: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    engagementId: str(engagement.id),
    toolVersion: 'V2.4.1',
    cover: {
      title: 'Operating Model Recommendation',
      subtitle: [str(input.clientName), domain, subFunction].filter(Boolean).join(' · '),
      scenarioName: str(headline.scenario_name, 'Operating model summary'),
      recommendation: str(headline.recommendation, 'NEEDS_REVIEW').replace(/_/g, ' '),
      headlinePrimary: hasGenpactMargin
        ? `Projected Genpact margin uplift: ${marginCurrent.toFixed(0)}% → ${marginFuture.toFixed(0)}%`
        : str(headline.one_line_summary),
      headlineSecondary:
        hasGenpactMargin && Number.isFinite(clientSavingsPct)
          ? `Client cost reduction: ${clientSavingsPct}%`
          : '',
      chips: buildContextChips(engagement),
      statTiles: Array.isArray(summary.stat_tiles) ? summary.stat_tiles : [],
      illustrative: asObj(summary.caveats).illustrative_flag !== false,
    },
    journey: Array.isArray(summary.journey) ? summary.journey : [],
    allocation: asObj(summary.allocation_summary),
    genpactUplift:
      extended.genpact_uplift ??
      (hasGenpactMargin
        ? {
            revenue_monthly: toNum(genpactView.revenue_future),
            cost_current_monthly: toNum(genpactView.cost_to_deliver_current),
            cost_future_monthly: toNum(genpactView.cost_to_deliver_future),
            margin_current_pct: marginCurrent,
            margin_future_pct: marginFuture,
            margin_delta_pp: toNum(genpactView.gross_margin_delta_pp) || marginFuture - marginCurrent,
            annual_margin_uplift: round(
              ((marginFuture - marginCurrent) / 100) * (toNum(genpactView.revenue_future) * 12),
              0,
            ),
          }
        : null),
    billingModel:
      extended.billing_model || asObj(economics.billing_model_recommendation).recommended_type
        ? {
            ...(extended.billing_model ? asObj(extended.billing_model) : {}),
            current: str(asObj(extended.billing_model).current) || str(genpactView.billing_model_display),
            recommended:
              str(asObj(extended.billing_model).recommended) ||
              `${str(asObj(economics.billing_model_recommendation).recommended_label)} (${str(asObj(economics.billing_model_recommendation).recommended_display)})`,
            rationale: billingRationale,
          }
        : null,
    competitive: hasCompetitor
      ? {
          ...(extended.competitive_position ? asObj(extended.competitive_position) : {}),
          competitors: competitorList,
          key_differentiators: Array.isArray(competitorRaw.key_differentiators)
            ? competitorRaw.key_differentiators.filter((x) => typeof x === 'string').slice(0, 3)
            : [],
          key_risks: Array.isArray(competitorRaw.key_risks)
            ? competitorRaw.key_risks.filter((x) => typeof x === 'string').slice(0, 2)
            : [],
          fullSummary: truncate(competitorRaw.summary, 600),
        }
      : null,
    reinvestment:
      reinvestOpps || extended.top_reinvestment
        ? {
            headline: str(reinvestRaw.headline) || str(asObj(extended.top_reinvestment).headline),
            total_annual_uplift: str(reinvestRaw.total_potential_annual_uplift),
            opportunities: opportunities.slice(0, 5).map((row) => asObj(row)),
          }
        : null,
    sensitivity: {
      drivers: buildSensitivityDrivers(pipelineRuns),
      headline: extended.sensitivity_headline ?? null,
      narrative: sensitivityNarrative,
    },
    techRecommendations: buildTechRecommendations(input.tasks),
    roleBreakdowns: buildRoleBreakdowns(pipelineRuns, input.tasks),
    risk: asObj(summary.risk_evidence),
    caveats: asObj(summary.caveats),
    limitations: Array.isArray(summary.limitations) ? summary.limitations : [],
  }
}

/**
 * @param {Record<string, unknown>} ctx Output of buildPdfExportContext()
 * @returns {string[]}
 */
export function collectLogoUrls(ctx) {
  /** @type {string[]} */
  const urls = ['https://logo.clearbit.com/genpact.com']

  const competitive = asObj(ctx.competitive)
  const competitors = Array.isArray(competitive.competitors) ? competitive.competitors : []
  for (const row of competitors) {
    const logo = str(asObj(row).logo)
    if (logo) urls.push(logo)
  }

  const tech = Array.isArray(ctx.techRecommendations) ? ctx.techRecommendations : []
  for (const item of tech) {
    const tools = Array.isArray(asObj(item).tools) ? asObj(item).tools : []
    for (const tool of tools) {
      const logo = str(asObj(tool).logo)
      if (logo) urls.push(logo)
    }
  }

  return urls
}

/**
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFileBase(name) {
  const trimmed = name.trim() || 'summary'
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'summary'
}
