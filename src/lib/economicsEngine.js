/**
 * @fileoverview Deterministic F5 economics calculations (pure math, no I/O).
 */

const WORKING_DAYS_PER_MONTH = 22
const DEFAULT_AI_AUDITOR_COST = 3500
const DEFAULT_SME_COST = 5500
const DEFAULT_WFM_COST = 3000
const DEFAULT_LLM_TOOLING_COST = 8000
const DEFAULT_IMAGE_CLASSIFIER_COVERAGE = 70
const DEFAULT_TECH_BUILD_COST = 180000
const DEFAULT_RETRAINING_COST_PER_FTE = 1500
const DEFAULT_CHANGE_MGMT_OVERHEAD_PCT = 15
const DEFAULT_PARALLEL_RUNNING_MONTHS = 2
const DEFAULT_MONTHS_TO_STEADY = 6
const DEFAULT_DISCOUNT_RATE_PCT = 12
const DEFAULT_NPV_HORIZON_MONTHS = 36
const DEFAULT_IRR_HORIZON_MONTHS = 36

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
 * @param {unknown} v
 * @returns {number}
 */
function nonNeg(v) {
  return Math.max(0, toNum(v))
}

/**
 * @param {number} n
 * @param {number} [digits]
 * @returns {number}
 */
function round(n, digits = 4) {
  if (!Number.isFinite(n)) return 0
  const m = 10 ** digits
  return Math.round(n * m) / m
}

/**
 * @param {unknown} maybeObj
 * @returns {Record<string, unknown>}
 */
function asObj(maybeObj) {
  return maybeObj && typeof maybeObj === 'object' && !Array.isArray(maybeObj)
    ? /** @type {Record<string, unknown>} */ (maybeObj)
    : {}
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>}
 */
function readIntake(engagement) {
  return asObj(engagement?.intake_data)
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>}
 */
function readPreferencesFromEngagement(engagement) {
  return asObj(readIntake(engagement).preferences)
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>[]}
 */
function readHierarchy(engagement) {
  const h = readIntake(engagement).hierarchy
  return Array.isArray(h) ? h.filter((x) => x && typeof x === 'object').map((x) => /** @type {Record<string, unknown>} */ (x)) : []
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {number}
 */
function readVolumePerDay(engagement) {
  const intake = readIntake(engagement)
  const eng = asObj(intake.engagement)
  return nonNeg(eng.volume_per_day ?? intake.volume_per_day)
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
function roleName(row) {
  const v = row.role ?? row.name ?? row.role_name
  return typeof v === 'string' && v.trim() ? v.trim() : 'Unknown role'
}

/**
 * @param {Record<string, unknown>} row
 * @returns {number}
 */
function roleLevel(row) {
  const n = Math.round(toNum(row.level))
  return Number.isFinite(n) && n > 0 ? n : 1
}

/**
 * @param {Record<string, unknown>} row
 * @returns {number}
 */
function roleHeadcount(row) {
  return nonNeg(row.headcount ?? row.current_headcount ?? row.fte)
}

/**
 * Reads fully loaded monthly cost per FTE from common hierarchy field names.
 *
 * @param {Record<string, unknown>} row
 * @returns {number}
 */
function roleCostPerFte(row) {
  return nonNeg(row.cost_per_fte ?? row.monthly_cost_per_fte ?? row.cost_per_fte_monthly ?? row.cost)
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @returns {Map<string, Record<string, unknown>>}
 */
function hierarchyByName(hierarchy) {
  const map = new Map()
  for (const row of hierarchy) {
    map.set(roleName(row).toLowerCase(), row)
  }
  return map
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @param {(row: Record<string, unknown>) => boolean} pred
 * @returns {Record<string, unknown> | null}
 */
function firstHierarchyMatch(hierarchy, pred) {
  for (const row of hierarchy) {
    if (pred(row)) return row
  }
  return null
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @returns {Record<string, unknown> | null}
 */
function frontlineRole(hierarchy) {
  const sorted = [...hierarchy].sort((a, b) => roleLevel(a) - roleLevel(b))
  return sorted[0] ?? null
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @returns {Record<string, unknown> | null}
 */
function teamLeadRole(hierarchy) {
  return (
    firstHierarchyMatch(hierarchy, (r) => /team\s*lead|\btl\b|supervisor/i.test(roleName(r))) ??
    firstHierarchyMatch(hierarchy, (r) => roleLevel(r) === 2)
  )
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @returns {Record<string, unknown> | null}
 */
function qaRole(hierarchy) {
  return firstHierarchyMatch(hierarchy, (r) => /\bqa\b|quality/i.test(roleName(r)))
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @returns {Record<string, unknown> | null}
 */
function unitHeadRole(hierarchy) {
  return (
    firstHierarchyMatch(hierarchy, (r) => /unit\s*head|head|director|manager/i.test(roleName(r))) ??
    [...hierarchy].sort((a, b) => roleLevel(b) - roleLevel(a))[0] ??
    null
  )
}

/**
 * @param {Record<string, unknown>[]} hierarchy
 * @param {string} name
 * @returns {Record<string, unknown> | null}
 */
function roleByName(hierarchy, name) {
  const target = name.trim().toLowerCase()
  return hierarchyByName(hierarchy).get(target) ?? null
}

/**
 * @param {Record<string, unknown>[]} f3Roles
 * @param {Record<string, unknown> | null} role
 * @returns {Record<string, unknown> | null}
 */
function f3RedesignForHierarchyRole(f3Roles, role) {
  if (!role) return null
  const name = roleName(role).toLowerCase()
  const level = roleLevel(role)
  return (
    f3Roles.find((r) => {
      const rn = String(r.role_name ?? r.name ?? '').trim().toLowerCase()
      return rn && rn === name
    }) ??
    f3Roles.find((r) => {
      const lv = Math.round(toNum(r.level))
      return lv > 0 && lv === level
    }) ??
    null
  )
}

/**
 * F4 variants can be regenerated from old task-time assumptions; if a saved rollup implies
 * more agents than the whole current org, fall back to the F3/frontline redesign signal.
 *
 * @param {number} rawAgents
 * @param {Record<string, unknown> | null} frontline
 * @param {Record<string, unknown>[]} f3Roles
 * @param {number} currentHeadcountTotal
 * @returns {{ value: number, normalized: boolean }}
 */
function normalizeFutureAgents(rawAgents, frontline, f3Roles, currentHeadcountTotal) {
  const currentFrontline = frontline ? roleHeadcount(frontline) : 0
  if (rawAgents <= 0) return { value: 0, normalized: false }
  const plausibleCeiling = Math.max(currentHeadcountTotal * 1.5, currentFrontline * 1.75, 1)
  if (rawAgents <= plausibleCeiling) return { value: rawAgents, normalized: false }

  const redesign = f3RedesignForHierarchyRole(f3Roles, frontline)
  const freedPct = Math.min(80, Math.max(0, toNum(redesign?.time_freed_pct)))
  const inferred = currentFrontline > 0 ? currentFrontline * (1 - freedPct / 100) : rawAgents
  return { value: Math.max(0, inferred), normalized: currentFrontline > 0 }
}

/**
 * @param {unknown} tasks
 * @returns {Record<string, unknown>[]}
 */
function normalizeTaskArray(tasks) {
  return Array.isArray(tasks)
    ? tasks.filter((x) => x && typeof x === 'object').map((x) => /** @type {Record<string, unknown>} */ (x))
    : []
}

/**
 * @param {Record<string, unknown>} task
 * @returns {number}
 */
function taskVolume(task) {
  return nonNeg(task.volume_per_day)
}

/**
 * Estimates the share of frontline volume removed from agent demand by F2 full automation.
 *
 * @param {Record<string, unknown>[]} tasks
 * @param {Record<string, unknown> | null} frontline
 * @returns {number}
 */
function automatedFrontlineVolumePct(tasks, frontline) {
  const frontlineName = frontline ? roleName(frontline).trim().toLowerCase() : ''
  const matching = frontlineName
    ? tasks.filter((t) => String(t.role_performing ?? '').trim().toLowerCase() === frontlineName)
    : []
  const source = matching.length > 0 ? matching : tasks
  let total = 0
  let automated = 0
  for (const task of source) {
    const vol = taskVolume(task)
    total += vol
    if (finalAllocation(task) === 'tech-automated') automated += vol
  }
  return total > 0 ? Math.min(100, Math.max(0, (automated / total) * 100)) : 0
}

/**
 * @param {number} rawAgents
 * @param {Record<string, unknown> | null} frontline
 * @param {Record<string, unknown>[]} f3Roles
 * @param {Record<string, unknown>[]} tasks
 * @param {number} currentHeadcountTotal
 * @returns {{ value: number, normalized: boolean }}
 */
function canonicalFutureAgents(rawAgents, frontline, f3Roles, tasks, currentHeadcountTotal) {
  const currentFrontline = frontline ? roleHeadcount(frontline) : 0
  const autoPct = automatedFrontlineVolumePct(tasks, frontline)
  const redesign = f3RedesignForHierarchyRole(f3Roles, frontline)
  const f3FreedPct = Math.min(80, Math.max(0, toNum(redesign?.time_freed_pct)))
  const reductionPct = Math.max(autoPct, f3FreedPct)

  if (currentFrontline > 0 && reductionPct > 0) {
    const inferred = currentFrontline * (1 - reductionPct / 100)
    if (rawAgents >= currentFrontline || rawAgents > inferred * 1.25) {
      return { value: Math.max(0, inferred), normalized: true }
    }
  }

  return normalizeFutureAgents(rawAgents, frontline, f3Roles, currentHeadcountTotal)
}

/**
 * @param {Record<string, unknown> | null | undefined} currentState
 * @returns {number}
 */
function currentMonthlyFromState(currentState) {
  return nonNeg(currentState?.monthly_cost_usd)
}

/**
 * @param {unknown} maybeTransitionCost
 * @returns {number}
 */
function transitionCostValue(maybeTransitionCost) {
  if (maybeTransitionCost && typeof maybeTransitionCost === 'object') {
    return nonNeg(/** @type {Record<string, unknown>} */ (maybeTransitionCost).total_transition_cost)
  }
  return nonNeg(maybeTransitionCost)
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {unknown} preferences
 * @returns {Record<string, unknown>}
 */
function mergePreferences(engagement, preferences) {
  return {
    ...readPreferencesFromEngagement(engagement),
    ...(preferences && typeof preferences === 'object' && !Array.isArray(preferences)
      ? /** @type {Record<string, unknown>} */ (preferences)
      : {}),
  }
}

/**
 * @param {string} billingType
 * @param {number} revDeltaPct
 * @param {number} hcReductionPct
 * @returns {string}
 */
function generateRevenueNarrative(billingType, revDeltaPct, hcReductionPct) {
  if (billingType === 'fte_based' || billingType === 'hourly') {
    return `Genpact revenue declines ${Math.abs(revDeltaPct).toFixed(1)}% as billable ${billingType === 'fte_based' ? 'headcount' : 'hours'} drops with automation. Consider negotiating gainshare or hybrid pricing to align incentives.`
  }
  if (billingType === 'transactional') {
    return `Revenue is volume-based, so unchanged. Genpact captures ${Math.abs(hcReductionPct).toFixed(0)}% of the savings as margin expansion.`
  }
  if (billingType === 'fixed') {
    return 'Fixed contract value means revenue stays flat. The cost reduction translates directly into Genpact margin uplift.'
  }
  return ''
}

/**
 * @param {Record<string, unknown> | null | undefined} currentState
 * @param {Record<string, unknown> | null | undefined} futureState
 * @param {Record<string, unknown> | null | undefined} billingModel
 * @returns {Record<string, unknown>}
 */
export function computeGenpactRevenueImpact(currentState, futureState, billingModel) {
  const bm = billingModel && typeof billingModel === 'object' && !Array.isArray(billingModel)
    ? /** @type {Record<string, unknown>} */ (billingModel)
    : null
  if (!bm || bm.type === 'not_specified') {
    return {
      applicable: false,
      message: 'Billing model not specified — Genpact revenue impact not computed.',
    }
  }

  const monthlyHeadcountCurrent = nonNeg(currentState?.headcount_total)
  const monthlyHeadcountFuture = nonNeg(futureState?.headcount_total)
  const headcountReductionPct =
    monthlyHeadcountCurrent > 0
      ? ((monthlyHeadcountCurrent - monthlyHeadcountFuture) / monthlyHeadcountCurrent) * 100
      : 0

  let monthlyRevenueCurrent = 0
  let monthlyRevenueFuture = 0
  const type = typeof bm.type === 'string' ? bm.type : ''

  if (type === 'fte_based') {
    const fallbackRate =
      monthlyHeadcountCurrent > 0 ? nonNeg(currentState?.monthly_cost_usd) / monthlyHeadcountCurrent : 0
    const ratePerFte = nonNeg(bm.monthly_per_fte) || fallbackRate
    monthlyRevenueCurrent = monthlyHeadcountCurrent * ratePerFte
    monthlyRevenueFuture = monthlyHeadcountFuture * ratePerFte
  } else if (type === 'hourly') {
    const hoursPerFteMonth = 160
    const hr = nonNeg(bm.hourly_rate)
    const totalHoursCurrent = monthlyHeadcountCurrent * hoursPerFteMonth
    const totalHoursFuture = monthlyHeadcountFuture * hoursPerFteMonth
    monthlyRevenueCurrent = totalHoursCurrent * hr
    monthlyRevenueFuture = totalHoursFuture * hr
  } else if (type === 'transactional') {
    const volume = nonNeg(currentState?.items_per_day) * WORKING_DAYS_PER_MONTH
    const unit = nonNeg(bm.unit_cost)
    monthlyRevenueCurrent = volume * unit
    monthlyRevenueFuture = volume * unit
  } else if (type === 'fixed') {
    const fixed = nonNeg(bm.fixed_monthly_value)
    monthlyRevenueCurrent = fixed
    monthlyRevenueFuture = fixed
  } else {
    return {
      applicable: false,
      message: 'Billing model not specified — Genpact revenue impact not computed.',
    }
  }

  if (!Number.isFinite(monthlyRevenueCurrent)) monthlyRevenueCurrent = 0
  if (!Number.isFinite(monthlyRevenueFuture)) monthlyRevenueFuture = 0

  const revenueDelta = monthlyRevenueFuture - monthlyRevenueCurrent
  const revenueDeltaPct =
    monthlyRevenueCurrent > 0 ? (revenueDelta / monthlyRevenueCurrent) * 100 : 0

  const costDelta = nonNeg(futureState?.monthly_cost_usd) - nonNeg(currentState?.monthly_cost_usd)
  const grossProfitCurrent = monthlyRevenueCurrent - nonNeg(currentState?.monthly_cost_usd)
  const grossProfitFuture = monthlyRevenueFuture - nonNeg(futureState?.monthly_cost_usd)
  const grossProfitDelta = grossProfitFuture - grossProfitCurrent

  return {
    applicable: true,
    billing_model_type: type,
    monthly_revenue_current: monthlyRevenueCurrent,
    monthly_revenue_future: monthlyRevenueFuture,
    revenue_delta: revenueDelta,
    revenue_delta_pct: revenueDeltaPct,
    monthly_cost_delta: costDelta,
    gross_profit_current: grossProfitCurrent,
    gross_profit_future: grossProfitFuture,
    gross_profit_delta: grossProfitDelta,
    gross_margin_pct_current:
      monthlyRevenueCurrent > 0 ? (grossProfitCurrent / monthlyRevenueCurrent) * 100 : 0,
    gross_margin_pct_future:
      monthlyRevenueFuture > 0 ? (grossProfitFuture / monthlyRevenueFuture) * 100 : 0,
    narrative: generateRevenueNarrative(type, revenueDeltaPct, headcountReductionPct),
  }
}

/**
 * Genpact-strategy view: revenue, delivery cost, margin, and headcount from client state outputs.
 *
 * @param {Record<string, unknown> | null | undefined} currentState
 * @param {Record<string, unknown> | null | undefined} futureState
 * @param {Record<string, unknown> | null | undefined} billingModel
 * @param {Record<string, unknown> | null | undefined} _engagement
 * @returns {Record<string, unknown>}
 */
export function computeGenpactView(currentState, futureState, billingModel, _engagement) {
  const costToDeliverCurrent = nonNeg(currentState?.monthly_cost_usd)
  const costToDeliverFuture = nonNeg(futureState?.monthly_cost_usd)
  const headcountCurrent = nonNeg(currentState?.headcount_total)
  const headcountFuture = nonNeg(futureState?.headcount_total)

  const bm =
    billingModel && typeof billingModel === 'object' && !Array.isArray(billingModel)
      ? /** @type {Record<string, unknown>} */ (billingModel)
      : null
  const billingType = typeof bm?.type === 'string' ? bm.type : ''

  let revenueCurrent = 0
  let revenueFuture = 0
  let billingModelDisplay = 'Not specified'

  if (!bm || billingType === 'not_specified') {
    revenueCurrent = costToDeliverCurrent * 1.3
    revenueFuture = costToDeliverFuture * 1.3
    billingModelDisplay = 'Estimated (no billing model set)'
  } else if (billingType === 'transactional') {
    const monthlyVolume = nonNeg(currentState?.items_per_day) * WORKING_DAYS_PER_MONTH
    const unitCost = nonNeg(bm.unit_cost)
    revenueCurrent = monthlyVolume * unitCost
    revenueFuture = monthlyVolume * unitCost
    billingModelDisplay = `Transactional · $${unitCost}/unit`
  } else if (billingType === 'hourly') {
    const hoursPerFteMonth = 160
    const totalHoursCurrent = headcountCurrent * hoursPerFteMonth
    const totalHoursFuture = headcountFuture * hoursPerFteMonth
    const hourlyRate = nonNeg(bm.hourly_rate)
    revenueCurrent = totalHoursCurrent * hourlyRate
    revenueFuture = totalHoursFuture * hourlyRate
    billingModelDisplay = `Hourly · $${hourlyRate}/hr`
  } else if (billingType === 'fte_based') {
    const ratePerFte =
      nonNeg(bm.monthly_per_fte) ||
      (headcountCurrent > 0 ? (costToDeliverCurrent / headcountCurrent) * 1.3 : 0)
    revenueCurrent = headcountCurrent * ratePerFte
    revenueFuture = headcountFuture * ratePerFte
    billingModelDisplay = `FTE-based · $${ratePerFte}/FTE/mo`
  } else if (billingType === 'fixed') {
    const fixedValue = nonNeg(bm.fixed_monthly_value)
    revenueCurrent = fixedValue
    revenueFuture = fixedValue
    billingModelDisplay = `Fixed · $${fixedValue}/mo`
  }

  const grossProfitCurrent = revenueCurrent - costToDeliverCurrent
  const grossProfitFuture = revenueFuture - costToDeliverFuture
  const marginPctCurrent = revenueCurrent > 0 ? (grossProfitCurrent / revenueCurrent) * 100 : 0
  const marginPctFuture = revenueFuture > 0 ? (grossProfitFuture / revenueFuture) * 100 : 0

  const revenueDeltaPct =
    revenueCurrent > 0 ? ((revenueFuture - revenueCurrent) / revenueCurrent) * 100 : 0
  const costDeltaPct =
    costToDeliverCurrent > 0
      ? ((costToDeliverFuture - costToDeliverCurrent) / costToDeliverCurrent) * 100
      : 0
  const headcountDeltaPct =
    headcountCurrent > 0 ? ((headcountFuture - headcountCurrent) / headcountCurrent) * 100 : 0
  const marginDeltaPp = marginPctFuture - marginPctCurrent

  let narrative = ''
  if (billingType === 'transactional' || billingType === 'fixed') {
    narrative = `Under ${billingModelDisplay}, Genpact revenue stays constant while delivery cost drops ${Math.abs(costDeltaPct).toFixed(0)}%. Margin expands from ${marginPctCurrent.toFixed(0)}% to ${marginPctFuture.toFixed(0)}%.`
  } else if (billingType === 'hourly' || billingType === 'fte_based') {
    narrative = `Under ${billingModelDisplay}, Genpact revenue drops ${Math.abs(revenueDeltaPct).toFixed(0)}% as billable ${billingType === 'hourly' ? 'hours' : 'FTEs'} shrink with automation. Margin still improves from ${marginPctCurrent.toFixed(0)}% to ${marginPctFuture.toFixed(0)}% because cost drops faster than revenue.`
  } else {
    narrative = 'Set billing model in F1 Preferences to see Genpact revenue and margin projections.'
  }

  return {
    revenue_current: revenueCurrent,
    revenue_future: revenueFuture,
    revenue_delta_pct: revenueDeltaPct,
    cost_to_deliver_current: costToDeliverCurrent,
    cost_to_deliver_future: costToDeliverFuture,
    cost_delta_pct: costDeltaPct,
    gross_margin_pct_current: marginPctCurrent,
    gross_margin_pct_future: marginPctFuture,
    gross_margin_delta_pp: marginDeltaPp,
    headcount_current: headcountCurrent,
    headcount_future: headcountFuture,
    headcount_delta_pct: headcountDeltaPct,
    billing_model_display: billingModelDisplay,
    narrative,
    monthly_savings: costToDeliverCurrent - costToDeliverFuture,
    revenue_per_fte_current: headcountCurrent > 0 ? revenueCurrent / headcountCurrent : 0,
    revenue_per_fte_future: headcountFuture > 0 ? revenueFuture / headcountFuture : 0,
  }
}

const BILLING_MODEL_LABELS = {
  fixed: 'Fixed fee',
  transactional: 'Transactional',
  fte_based: 'FTE-based',
  hourly: 'Hourly',
}

/**
 * Compares billing models on projected future gross margin (strategy advisory).
 *
 * @param {Record<string, unknown> | null | undefined} currentState
 * @param {Record<string, unknown> | null | undefined} futureState
 * @param {Record<string, unknown> | null | undefined} billingModel
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>}
 */
export function computeBillingModelRecommendation(currentState, futureState, billingModel, engagement) {
  const bmBase =
    billingModel && typeof billingModel === 'object' && !Array.isArray(billingModel)
      ? /** @type {Record<string, unknown>} */ (billingModel)
      : {}
  const costCurrent = nonNeg(currentState?.monthly_cost_usd)
  const hcCurrent = nonNeg(currentState?.headcount_total)
  const itemsPerDay = nonNeg(currentState?.items_per_day)
  const monthlyVolume = itemsPerDay * WORKING_DAYS_PER_MONTH
  const defaultFteRate = hcCurrent > 0 ? (costCurrent / hcCurrent) * 1.3 : 0
  const unitCost = nonNeg(bmBase.unit_cost)
  const hourlyRate = nonNeg(bmBase.hourly_rate)
  const monthlyPerFte = nonNeg(bmBase.monthly_per_fte)
  const fixedMonthly = nonNeg(bmBase.fixed_monthly_value)

  const candidates = [
    {
      type: 'fixed',
      model: { type: 'fixed', fixed_monthly_value: fixedMonthly || costCurrent * 1.05 },
    },
    {
      type: 'transactional',
      model: {
        type: 'transactional',
        unit_cost: unitCost || (monthlyVolume > 0 ? (costCurrent * 1.05) / monthlyVolume : 0),
      },
    },
    { type: 'fte_based', model: { type: 'fte_based', monthly_per_fte: monthlyPerFte || defaultFteRate } },
    { type: 'hourly', model: { type: 'hourly', hourly_rate: hourlyRate || defaultFteRate / 160 } },
  ]

  /** @type {{ type: string, margin: number, display: string } | null} */
  let best = null
  for (const c of candidates) {
    const view = computeGenpactView(currentState, futureState, c.model, engagement)
    const margin = toNum(view.gross_margin_pct_future)
    if (!best || margin > best.margin) {
      best = { type: c.type, margin, display: String(view.billing_model_display ?? '') }
    }
  }

  const currentView = computeGenpactView(currentState, futureState, billingModel, engagement)
  const currentType = typeof bmBase.type === 'string' ? bmBase.type : 'not_specified'
  const currentMargin = toNum(currentView.gross_margin_pct_future)
  const bestLabel = BILLING_MODEL_LABELS[best?.type ?? ''] ?? best?.type ?? '—'

  let rationale = ''
  if (best && currentType !== best.type) {
    rationale = `${bestLabel} pricing maximizes projected future gross margin (${best.margin.toFixed(0)}% vs ${currentMargin.toFixed(0)}% under current model).`
  } else {
    rationale = `Current billing model already aligns with the strongest projected margin (${currentMargin.toFixed(0)}%).`
  }

  return {
    recommended_type: best?.type ?? null,
    recommended_label: bestLabel,
    recommended_margin_future_pct: best?.margin ?? 0,
    recommended_display: best?.display ?? '',
    current_type: currentType,
    current_margin_future_pct: currentMargin,
    rationale,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown> | null | undefined} prefs
 * @returns {number}
 */
function readImageCoveragePct(engagement, prefs) {
  const pref = nonNeg(prefs?.image_classifier_coverage_pct)
  if (pref > 0) return Math.min(100, pref)
  const techStack = readIntake(engagement).tech_stack
  if (techStack && typeof techStack === 'object') {
    const ts = /** @type {Record<string, unknown>} */ (techStack)
    const cov = nonNeg(ts.image_classifier_coverage_pct ?? ts.image_classifier_coverage)
    if (cov > 0) return Math.min(100, cov)
  }
  return DEFAULT_IMAGE_CLASSIFIER_COVERAGE
}

/**
 * @param {unknown} pattern
 * @returns {string}
 */
function normalizePattern(pattern) {
  return String(pattern ?? '').trim().toLowerCase().replace(/-/g, '_')
}

/**
 * @param {unknown} f3Roles
 * @returns {Record<string, unknown>[]}
 */
function normalizeF3RolesArray(f3Roles) {
  if (Array.isArray(f3Roles)) {
    return f3Roles.filter((x) => x && typeof x === 'object').map((x) => /** @type {Record<string, unknown>} */ (x))
  }
  const bundle = asObj(f3Roles)
  const redesigns = bundle.redesigns
  if (Array.isArray(redesigns)) {
    return redesigns.filter((x) => x && typeof x === 'object').map((x) => /** @type {Record<string, unknown>} */ (x))
  }
  return []
}

/**
 * @param {unknown} f4SelectedVariant
 * @returns {Record<string, unknown>}
 */
function resolveSelectedVariant(f4SelectedVariant) {
  const obj = asObj(f4SelectedVariant)
  const selectedName = typeof obj.selected_variant_name === 'string' ? obj.selected_variant_name.trim().toLowerCase() : ''
  const all = Array.isArray(obj.all_variants) ? obj.all_variants : []
  if (selectedName && all.length > 0) {
    const found = all.find((x) => {
      const row = asObj(x)
      return String(row.variant_name ?? '').trim().toLowerCase() === selectedName
    })
    if (found) return asObj(found)
  }
  return obj
}

/**
 * @param {Record<string, unknown>} variant
 * @returns {Record<string, unknown>}
 */
function orgRollupFromVariant(variant) {
  return asObj(variant.org_rollup)
}

/**
 * @param {Record<string, unknown>} variant
 * @returns {Record<string, unknown>}
 */
function podCompositionFromVariant(variant) {
  return asObj(variant.pod_composition)
}

/**
 * @param {string} role
 * @param {number} headcount
 * @param {number} costPerFte
 * @param {number} todayHeadcount
 * @returns {{ role: string, headcount: number, cost_per_fte: number, total_cost: number, change_vs_today: number }}
 */
function futureBreakdownRow(role, headcount, costPerFte, todayHeadcount) {
  const hc = nonNeg(headcount)
  const c = nonNeg(costPerFte)
  return {
    role,
    headcount: hc,
    cost_per_fte: c,
    total_cost: hc * c,
    change_vs_today: hc - nonNeg(todayHeadcount),
  }
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {Set<string>} supervisorRoles
 * @returns {number}
 */
function sumSupervisorCost(rows, supervisorRoles) {
  let sum = 0
  for (const row of rows) {
    if (supervisorRoles.has(String(row.role).toLowerCase())) {
      sum += nonNeg(row.total_cost)
    }
  }
  return sum
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {string}
 */
function finalAllocation(task) {
  if (!task || typeof task !== 'object') return ''
  const t = /** @type {Record<string, unknown>} */ (task)
  const u = typeof t.user_allocation === 'string' ? t.user_allocation.trim().toLowerCase() : ''
  if (u) return u
  return typeof t.ai_allocation === 'string' ? t.ai_allocation.trim().toLowerCase() : ''
}

/**
 * @param {unknown} tasks
 * @returns {number}
 */
function derivedAutomationPct(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  let total = 0
  let automatedOrAssisted = 0
  for (const item of list) {
    const t = asObj(item)
    const vol = nonNeg(t.volume_per_day) || 1
    const alloc = finalAllocation(t)
    total += vol
    if (alloc === 'tech-assisted' || alloc === 'tech-automated') {
      automatedOrAssisted += vol
    }
  }
  return total > 0 ? Math.min(100, Math.max(0, (automatedOrAssisted / total) * 100)) : 0
}

/**
 * @param {Record<string, unknown>} variant
 * @param {number} basePct
 * @param {number} nextPct
 * @returns {Record<string, unknown>}
 */
function variantWithAutomationAdjustedAgents(variant, basePct, nextPct) {
  const out = { ...variant }
  const rollup = { ...orgRollupFromVariant(variant) }
  const safeBase = Math.max(1, basePct)
  const safeNext = Math.max(1, nextPct)
  const factor = safeBase / safeNext
  const originalAgents = nonNeg(rollup.total_agents)
  const adjustedAgents = originalAgents > 0 ? originalAgents * factor : originalAgents
  const deltaAgents = adjustedAgents - originalAgents
  rollup.total_agents = adjustedAgents
  rollup.total_headcount = nonNeg(rollup.total_headcount) + deltaAgents
  rollup.headcount_delta = nonNeg(rollup.headcount_delta) + deltaAgents
  const today = nonNeg(rollup.today_headcount)
  rollup.headcount_delta_pct = today > 0 ? (toNum(rollup.headcount_delta) / today) * 100 : 0
  out.org_rollup = rollup
  return out
}

/**
 * @param {number} x
 * @returns {number}
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

/**
 * @param {number} currentMonthly
 * @param {number} futureMonthly
 * @param {number} monthsToSteady
 * @returns {number}
 */
function firstYearRealizedSavingsPct(currentMonthly, futureMonthly, monthsToSteady) {
  const curve = computeRampedSavingsCurve(currentMonthly, futureMonthly, 0, monthsToSteady)
  const realized = curve.slice(0, 12).reduce((sum, row) => sum + row.monthly_realized_savings, 0)
  const baseline = currentMonthly * 12
  return baseline > 0 ? (realized / baseline) * 100 : 0
}

/**
 * Calculates the current monthly cost baseline from F1 hierarchy inputs.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Full engagement object with `intake_data`.
 * @returns {{
 *   monthly_cost_usd: number,
 *   headcount_total: number,
 *   items_per_day: number,
 *   cost_per_item: number,
 *   supervisor_overhead_pct: number,
 *   supervisor_overhead_cost: number,
 *   role_breakdown: Array<{ role: string, headcount: number, cost_per_fte: number, total_cost: number }>
 * }}
 */
export function computeCurrentState(engagement) {
  const hierarchy = readHierarchy(engagement)
  const role_breakdown = hierarchy.map((row) => {
    const headcount = roleHeadcount(row)
    const cost_per_fte = roleCostPerFte(row)
    return {
      role: roleName(row),
      headcount,
      cost_per_fte,
      total_cost: headcount * cost_per_fte,
    }
  })

  const monthly_cost_usd = role_breakdown.reduce((sum, row) => sum + row.total_cost, 0)
  const headcount_total = role_breakdown.reduce((sum, row) => sum + row.headcount, 0)
  const items_per_day = readVolumePerDay(engagement)
  const cost_per_item = items_per_day > 0 ? monthly_cost_usd / (items_per_day * WORKING_DAYS_PER_MONTH) : 0

  let supervisor_overhead_cost = 0
  for (let i = 0; i < hierarchy.length; i += 1) {
    if (roleLevel(hierarchy[i]) >= 2) supervisor_overhead_cost += role_breakdown[i]?.total_cost ?? 0
  }
  const supervisor_overhead_pct = monthly_cost_usd > 0 ? (supervisor_overhead_cost / monthly_cost_usd) * 100 : 0

  return {
    monthly_cost_usd,
    headcount_total,
    items_per_day,
    cost_per_item,
    supervisor_overhead_pct,
    supervisor_overhead_cost,
    role_breakdown,
  }
}

/**
 * Calculates the future monthly cost using F4 org rollup, F3 redesigns, and preference assumptions.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Full engagement object with `intake_data`.
 * @param {Record<string, unknown> | null | undefined} f4SelectedVariant Selected variant row, or full `f4_pods` payload.
 * @param {unknown} f3Roles Redesign array or `{ redesigns }` bundle (accepted for API symmetry; costs come from F4).
 * @param {Record<string, unknown> | null | undefined} preferences Cost assumptions and tooling assumptions.
 * @param {unknown} [tasks] Optional task rows, used only to normalize legacy pre-fix F4 rollups.
 * @returns {{
 *   monthly_cost_usd: number,
 *   headcount_total: number,
 *   cost_per_item: number,
 *   supervisor_overhead_pct: number,
 *   monthly_tech_cost: number,
 *   role_breakdown: Array<{ role: string, headcount: number, cost_per_fte: number, total_cost: number, change_vs_today: number }>
 * }}
 */
export function computeFutureState(engagement, f4SelectedVariant, f3Roles, preferences, tasks) {
  const f3RoleRows = normalizeF3RolesArray(f3Roles)
  const taskRows = normalizeTaskArray(tasks)
  const prefs = mergePreferences(engagement, preferences)
  const hierarchy = readHierarchy(engagement)
  const variant = resolveSelectedVariant(f4SelectedVariant)
  const rollup = orgRollupFromVariant(variant)
  const podComposition = podCompositionFromVariant(variant)
  const shouldDebug = prefs.suppress_future_debug !== true

  if (shouldDebug) {
    console.log('[computeFutureState] Inputs:', {
      f4_org_rollup: rollup,
      intake_hierarchy: readIntake(engagement).hierarchy,
    })
    console.log('[computeFutureState] Future role breakdown being built:')
  }

  const frontline = frontlineRole(hierarchy)
  const tl = teamLeadRole(hierarchy)
  const qa = qaRole(hierarchy)
  const unitHead = unitHeadRole(hierarchy)
  const smeToday = roleByName(hierarchy, 'SME')
  const wfmToday = roleByName(hierarchy, 'WFM')

  const agentCost = nonNeg(prefs.agent_fully_loaded_cost) || (frontline ? roleCostPerFte(frontline) : 0)
  const tlCost = nonNeg(prefs.tl_cost_per_fte) || (tl ? roleCostPerFte(tl) : agentCost)
  const qaCost = nonNeg(prefs.qa_cost_per_fte) || (qa ? roleCostPerFte(qa) : tlCost)
  const unitHeadCost = unitHead ? roleCostPerFte(unitHead) : tlCost
  const aiAuditorCost = nonNeg(prefs.ai_auditor_cost_per_fte) || DEFAULT_AI_AUDITOR_COST
  const smeCost = nonNeg(prefs.sme_cost_per_fte) || (smeToday ? roleCostPerFte(smeToday) : DEFAULT_SME_COST)
  const wfmCost = nonNeg(prefs.wfm_cost_per_fte) || (wfmToday ? roleCostPerFte(wfmToday) : DEFAULT_WFM_COST)

  const rawPodCount = nonNeg(rollup.pod_count)
  const currentHeadcountTotal = hierarchy.reduce((sum, row) => sum + roleHeadcount(row), 0)
  const normalizedAgents = canonicalFutureAgents(
    nonNeg(rollup.total_agents),
    frontline,
    f3RoleRows,
    taskRows,
    currentHeadcountTotal,
  )
  const agentsPerPod = nonNeg(podComposition.agents_per_pod)
  const podCount =
    normalizedAgents.normalized && normalizedAgents.value > 0 && agentsPerPod > 0
      ? Math.max(1, Math.ceil(normalizedAgents.value / agentsPerPod))
      : rawPodCount
  const teamLeads = normalizedAgents.normalized ? podCount : nonNeg(rollup.total_team_leads)
  const qaPerPodRaw = podCount > 0 ? nonNeg(rollup.total_central_qa) / podCount : nonNeg(podComposition.qa_per_pod)
  const qaRatioCap = agentsPerPod > 0 ? agentsPerPod / 12 : normalizedAgents.value / 12
  const qaPerPod = qaRatioCap > 0 ? Math.min(nonNeg(qaPerPodRaw), qaRatioCap) : nonNeg(qaPerPodRaw)
  const centralQa = normalizedAgents.normalized ? qaPerPod * podCount : Math.min(nonNeg(rollup.total_central_qa), normalizedAgents.value / 12)
  const sme = normalizedAgents.normalized ? nonNeg(podComposition.sme_per_pod) * podCount : nonNeg(rollup.total_sme)
  const wfm = normalizedAgents.normalized ? nonNeg(podComposition.wfm_per_pod) * podCount : nonNeg(rollup.total_wfm)
  const aiAuditors = nonNeg(rollup.total_ai_auditors ?? rollup.total_ai_output_auditors ?? rollup.total_ai_ops)

  /** @type {Array<{ role: string, headcount: number, cost_per_fte: number, total_cost: number, change_vs_today: number }>} */
  const role_breakdown = []
  const addFutureRole = (role, headcount, cost, todayHeadcount, source) => {
    const row = futureBreakdownRow(role, headcount, cost, todayHeadcount)
    role_breakdown.push(row)
    if (shouldDebug) console.log('[computeFutureState] Future role:', { ...row, source })
  }

  addFutureRole('Agent', normalizedAgents.value, agentCost, frontline ? roleHeadcount(frontline) : 0, 'f4.org_rollup.total_agents')
  addFutureRole('Team Lead', teamLeads, tlCost, tl ? roleHeadcount(tl) : 0, 'f4.org_rollup.total_team_leads')
  addFutureRole('Central QA', centralQa, qaCost, qa ? roleHeadcount(qa) : 0, 'f4.org_rollup.total_central_qa')
  addFutureRole('AI Output Auditor', aiAuditors, aiAuditorCost, 0, 'f4.org_rollup.total_ai_ops')
  addFutureRole('SME', sme, smeCost, smeToday ? roleHeadcount(smeToday) : 0, 'f4.org_rollup.total_sme')
  addFutureRole('WFM', wfm, wfmCost, wfmToday ? roleHeadcount(wfmToday) : 0, 'f4.org_rollup.total_wfm')
  addFutureRole('Unit Head', nonNeg(rollup.total_unit_heads) || 1, unitHeadCost, unitHead ? roleHeadcount(unitHead) : 0, 'f4.org_rollup.total_unit_heads')

  const monthly_tech_cost = nonNeg(prefs.llm_tooling_monthly_cost) || DEFAULT_LLM_TOOLING_COST
  const roleCost = role_breakdown.reduce((sum, row) => sum + row.total_cost, 0)
  const monthly_cost_usd = roleCost + monthly_tech_cost
  const headcount_total = role_breakdown.reduce((sum, row) => sum + row.headcount, 0)
  const volume = readVolumePerDay(engagement)
  const cost_per_item = volume > 0 ? monthly_cost_usd / (volume * WORKING_DAYS_PER_MONTH) : 0

  const supervisorRoles = new Set(['team lead', 'central qa', 'unit head'])
  const supervisorCost = sumSupervisorCost(role_breakdown, supervisorRoles)
  const supervisor_overhead_pct = monthly_cost_usd > 0 ? (supervisorCost / monthly_cost_usd) * 100 : 0

  return {
    monthly_cost_usd,
    headcount_total,
    cost_per_item,
    supervisor_overhead_pct,
    monthly_tech_cost,
    role_breakdown,
  }
}

/**
 * Computes headline savings metrics comparing current and future states.
 *
 * @param {Record<string, unknown> | null | undefined} currentState Output of {@link computeCurrentState}.
 * @param {Record<string, unknown> | null | undefined} futureState Output of {@link computeFutureState}.
 * @returns {{
 *   monthly_savings_usd: number,
 *   monthly_savings_pct: number,
 *   annual_savings_usd: number,
 *   cost_per_item_reduction_pct: number,
 *   headcount_delta: number,
 *   headcount_delta_pct: number,
 *   supervisor_overhead_reduction_pp: number
 * }}
 */
export function computeSavings(currentState, futureState) {
  const currentMonthly = currentMonthlyFromState(currentState)
  const futureMonthly = nonNeg(futureState?.monthly_cost_usd)
  const monthly_savings_usd = currentMonthly - futureMonthly
  const monthly_savings_pct = currentMonthly > 0 ? (monthly_savings_usd / currentMonthly) * 100 : 0
  const currentCpi = nonNeg(currentState?.cost_per_item)
  const futureCpi = nonNeg(futureState?.cost_per_item)
  const currentHeadcount = nonNeg(currentState?.headcount_total)
  const futureHeadcount = nonNeg(futureState?.headcount_total)
  const headcount_delta = futureHeadcount - currentHeadcount
  const headcount_delta_pct = currentHeadcount > 0 ? (headcount_delta / currentHeadcount) * 100 : 0
  return {
    monthly_savings_usd,
    monthly_savings_pct,
    annual_savings_usd: monthly_savings_usd * 12,
    cost_per_item_reduction_pct: currentCpi > 0 ? ((currentCpi - futureCpi) / currentCpi) * 100 : 0,
    headcount_delta,
    headcount_delta_pct,
    supervisor_overhead_reduction_pp:
      toNum(currentState?.supervisor_overhead_pct) - toNum(futureState?.supervisor_overhead_pct),
  }
}

/**
 * Computes the one-time transition investment to reach the future state.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Full engagement object.
 * @param {Record<string, unknown> | null | undefined} futureState Output of {@link computeFutureState}.
 * @param {Record<string, unknown> | null | undefined} options Transition assumptions; may include `f3_roles`.
 * @returns {{
 *   tech_build_cost: number,
 *   retraining_cost: number,
 *   change_mgmt_cost: number,
 *   parallel_running_cost: number,
 *   uncapped_total: number,
 *   total_transition_cost: number,
 *   margin_cap_applied: boolean,
 *   margin_cap_pct: number,
 *   margin_profile: string
 * }}
 */
export function computeTransitionCost(engagement, futureState, options) {
  const opts = mergePreferences(engagement, options)
  const currentState = computeCurrentState(engagement)
  const f3Roles = normalizeF3RolesArray(opts.f3_roles ?? opts.f3Roles)
  const hierarchy = readHierarchy(engagement)
  const byName = hierarchyByName(hierarchy)
  const impactedPatterns = new Set(['meaningful_shift', 'transformation', 'redefinition'])
  let impactedFte = 0

  for (const role of f3Roles) {
    if (!impactedPatterns.has(normalizePattern(role.pattern))) continue
    const explicit = nonNeg(role.current_headcount ?? role.headcount)
    if (explicit > 0) {
      impactedFte += explicit
      continue
    }
    const name = typeof role.role_name === 'string' ? role.role_name : typeof role.name === 'string' ? role.name : ''
    const match = name ? byName.get(name.trim().toLowerCase()) : null
    impactedFte += match ? roleHeadcount(match) : 0
  }

  const tech_build_cost = nonNeg(opts.tech_build_cost_estimate) || DEFAULT_TECH_BUILD_COST
  const retrainingCostPerFte = nonNeg(opts.retraining_cost_per_fte) || DEFAULT_RETRAINING_COST_PER_FTE
  const retraining_cost = impactedFte * retrainingCostPerFte
  const changeMgmtPct = nonNeg(opts.change_mgmt_overhead_pct) || DEFAULT_CHANGE_MGMT_OVERHEAD_PCT
  const change_mgmt_cost = (tech_build_cost + retraining_cost) * (changeMgmtPct / 100)
  const parallelMonths = nonNeg(opts.parallel_running_months) || DEFAULT_PARALLEL_RUNNING_MONTHS
  const monthlySavings = Math.max(0, currentState.monthly_cost_usd - nonNeg(futureState?.monthly_cost_usd))
  const parallel_running_cost = monthlySavings * parallelMonths * 0.5
  const uncapped_total = tech_build_cost + retraining_cost + change_mgmt_cost + parallel_running_cost

  const prefsFromEngagement = readPreferencesFromEngagement(engagement)
  const marginRaw = prefsFromEngagement.margin_profile
  const marginProfile =
    typeof marginRaw === 'string' && marginRaw.trim() ? marginRaw.trim() : 'not_disclosed'
  const marginCapPctMap = {
    low: 8,
    medium: 15,
    high: 25,
    not_disclosed: 15,
    'Not disclosed': 15,
  }
  const marginCapPct = marginCapPctMap[/** @type {keyof typeof marginCapPctMap} */ (marginProfile)] ?? 15
  const annualRevenue = nonNeg(futureState?.monthly_cost_usd) * 12
  const transitionCostCap = annualRevenue > 0 ? (annualRevenue * marginCapPct) / 100 : Number.POSITIVE_INFINITY
  const total_transition_cost = Math.min(uncapped_total, transitionCostCap)
  const margin_cap_applied = uncapped_total > total_transition_cost && Number.isFinite(transitionCostCap)

  return {
    tech_build_cost,
    retraining_cost,
    change_mgmt_cost,
    parallel_running_cost,
    uncapped_total,
    total_transition_cost,
    margin_cap_applied,
    margin_cap_pct: marginCapPct,
    margin_profile: marginProfile,
  }
}

/**
 * Builds an 18-month ramped cumulative savings curve.
 *
 * @param {number} currentMonthly Current-state monthly cost.
 * @param {number} futureMonthly Future-state monthly cost.
 * @param {number | Record<string, unknown>} transitionCost One-time transition cost or transition-cost object.
 * @param {number} monthsToSteady Months to steady state; defaults to 6.
 * @returns {Array<{ month: number, ramp_factor: number, monthly_realized_savings: number, cumulative_savings: number, cumulative_net: number }>}
 */
export function computeRampedSavingsCurve(currentMonthly, futureMonthly, transitionCost, monthsToSteady) {
  const current = nonNeg(currentMonthly)
  const future = nonNeg(futureMonthly)
  const transition = transitionCostValue(transitionCost)
  const months = nonNeg(monthsToSteady) || DEFAULT_MONTHS_TO_STEADY
  const monthlySavings = current - future
  let cumulative = 0
  const out = []

  for (let month = 1; month <= 18; month += 1) {
    const ramp_factor = sigmoid((month / months) * 2 - 1)
    const monthly_realized_savings = monthlySavings * ramp_factor
    cumulative += monthly_realized_savings
    out.push({
      month,
      ramp_factor,
      monthly_realized_savings,
      cumulative_savings: cumulative,
      cumulative_net: cumulative - transition,
    })
  }
  return out
}

/**
 * Finds the first month where cumulative net savings are non-negative.
 *
 * @param {Array<{ cumulative_net?: number }>} savingsCurve Output of {@link computeRampedSavingsCurve}.
 * @returns {number} First payback month, or -1 if no payback in the supplied curve.
 */
export function findPaybackMonth(savingsCurve) {
  const list = Array.isArray(savingsCurve) ? savingsCurve : []
  for (let i = 0; i < list.length; i += 1) {
    if (toNum(list[i]?.cumulative_net) >= 0) return i + 1
  }
  return -1
}

/**
 * Computes 36-month NPV from a ramped savings curve, holding month-18 savings steady afterward.
 *
 * @param {Array<{ month?: number, monthly_realized_savings?: number }>} savingsCurve Output of {@link computeRampedSavingsCurve}.
 * @param {number | Record<string, unknown>} transitionCost One-time transition cost or transition-cost object.
 * @param {number} [annualDiscountRatePct=12] Annual discount rate percentage.
 * @returns {number}
 */
export function computeNPV(savingsCurve, transitionCost, annualDiscountRatePct = DEFAULT_DISCOUNT_RATE_PCT) {
  const list = Array.isArray(savingsCurve) ? savingsCurve : []
  const transition = transitionCostValue(transitionCost)
  const annual = toNum(annualDiscountRatePct)
  const monthlyRate = (1 + annual / 100) ** (1 / 12) - 1
  const steady = list.length > 0 ? toNum(list[list.length - 1]?.monthly_realized_savings) : 0
  let npv = -transition

  for (let month = 1; month <= DEFAULT_NPV_HORIZON_MONTHS; month += 1) {
    const fromCurve = list[month - 1]
    const cash = fromCurve ? toNum(fromCurve.monthly_realized_savings) : steady
    npv += cash / (1 + monthlyRate) ** month
  }
  return npv
}

/**
 * Computes annual IRR from an upfront transition investment and flat monthly savings.
 *
 * @param {number | Record<string, unknown>} transitionCost One-time transition cost or transition-cost object.
 * @param {number} monthlySteadyStateSavings Monthly steady-state savings.
 * @param {number} [horizonMonths=36] Projection horizon in months.
 * @returns {number | null} Annual IRR percentage, or null when no solution/convergence.
 */
export function computeIRR(transitionCost, monthlySteadyStateSavings, horizonMonths = DEFAULT_IRR_HORIZON_MONTHS) {
  const transition = transitionCostValue(transitionCost)
  const cash = toNum(monthlySteadyStateSavings)
  const months = Math.max(1, Math.floor(nonNeg(horizonMonths) || DEFAULT_IRR_HORIZON_MONTHS))
  if (transition <= 0 || cash <= 0) return null

  const npvAt = (monthlyRate) => {
    let npv = -transition
    for (let month = 1; month <= months; month += 1) {
      npv += cash / (1 + monthlyRate) ** month
    }
    return npv
  }

  let lo = -0.95
  let hi = 10
  let fLo = npvAt(lo)
  let fHi = npvAt(hi)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null

  let mid = 0
  let converged = false
  for (let i = 0; i < 20; i += 1) {
    mid = (lo + hi) / 2
    const fMid = npvAt(mid)
    if (!Number.isFinite(fMid)) return null
    if (Math.abs(fMid) < 1e-4 || Math.abs(hi - lo) < 1e-4) {
      converged = true
      break
    }
    if (fLo * fMid <= 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  void fHi
  if (!converged) return null

  const annualRate = (1 + mid) ** 12 - 1
  return Number.isFinite(annualRate) ? annualRate * 100 : null
}

/**
 * Computes savings sensitivity when top economics drivers vary +/-20%.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Full engagement object.
 * @param {Record<string, unknown> | null | undefined} f4SelectedVariant Selected F4 variant or full `f4_pods` payload.
 * @param {unknown} f3Roles F3 redesign array or bundle.
 * @param {Record<string, unknown> | null | undefined} baseAssumptions Preferences plus optional `tasks`.
 * @returns {{ drivers: Array<{ name: string, low_pct: number, base_pct: number, high_pct: number, low_label: string, base_label: string, high_label: string }> }}
 */
export function computeSensitivity(engagement, f4SelectedVariant, f3Roles, baseAssumptions) {
  const basePrefs = mergePreferences(engagement, baseAssumptions)
  const tasks = basePrefs.tasks
  const quietPrefs = { ...basePrefs, suppress_future_debug: true }
  const current = computeCurrentState(engagement)
  const baseVariant = resolveSelectedVariant(f4SelectedVariant)
  const baseFuture = computeFutureState(engagement, baseVariant, f3Roles, quietPrefs, tasks)
  const baseSavings = computeSavings(current, baseFuture)

  const automationBase =
    nonNeg(basePrefs.automation_feasibility_pct) ||
    derivedAutomationPct(tasks) ||
    readImageCoveragePct(engagement, basePrefs)
  const automationLow = Math.max(1, automationBase * 0.8)
  const automationHigh = Math.min(100, automationBase * 1.2)

  const autoLowFuture = computeFutureState(
    engagement,
    variantWithAutomationAdjustedAgents(baseVariant, automationBase, automationLow),
    f3Roles,
    quietPrefs,
    tasks,
  )
  const autoHighFuture = computeFutureState(
    engagement,
    variantWithAutomationAdjustedAgents(baseVariant, automationBase, automationHigh),
    f3Roles,
    quietPrefs,
    tasks,
  )

  const hierarchy = readHierarchy(engagement)
  const front = frontlineRole(hierarchy)
  const agentCostBase =
    nonNeg(basePrefs.agent_fully_loaded_cost) || (front ? roleCostPerFte(front) : 0)
  const agentCostLow = agentCostBase * 0.8
  const agentCostHigh = agentCostBase * 1.2
  const agentLowFuture = computeFutureState(
    engagement,
    baseVariant,
    f3Roles,
    {
      ...quietPrefs,
      agent_fully_loaded_cost: agentCostLow,
    },
    tasks,
  )
  const agentHighFuture = computeFutureState(
    engagement,
    baseVariant,
    f3Roles,
    {
      ...quietPrefs,
      agent_fully_loaded_cost: agentCostHigh,
    },
    tasks,
  )

  const monthsBase = nonNeg(basePrefs.months_to_steady_state) || DEFAULT_MONTHS_TO_STEADY
  const monthsLow = Math.max(1, monthsBase * 0.8)
  const monthsHigh = Math.max(1, monthsBase * 1.2)

  return {
    drivers: [
      {
        name: 'Image classifier coverage',
        low_pct: round(computeSavings(current, autoLowFuture).monthly_savings_pct, 2),
        base_pct: round(baseSavings.monthly_savings_pct, 2),
        high_pct: round(computeSavings(current, autoHighFuture).monthly_savings_pct, 2),
        low_label: `${round(automationLow, 0)}%`,
        base_label: `${round(automationBase, 0)}%`,
        high_label: `${round(automationHigh, 0)}%`,
      },
      {
        name: 'Agent fully-loaded cost',
        low_pct: round(computeSavings(current, agentLowFuture).monthly_savings_pct, 2),
        base_pct: round(baseSavings.monthly_savings_pct, 2),
        high_pct: round(computeSavings(current, agentHighFuture).monthly_savings_pct, 2),
        low_label: `$${round(agentCostLow, 0).toLocaleString('en-US')}`,
        base_label: `$${round(agentCostBase, 0).toLocaleString('en-US')}`,
        high_label: `$${round(agentCostHigh, 0).toLocaleString('en-US')}`,
      },
      {
        name: 'Ramp speed',
        low_pct: round(firstYearRealizedSavingsPct(current.monthly_cost_usd, baseFuture.monthly_cost_usd, monthsLow), 2),
        base_pct: round(firstYearRealizedSavingsPct(current.monthly_cost_usd, baseFuture.monthly_cost_usd, monthsBase), 2),
        high_pct: round(firstYearRealizedSavingsPct(current.monthly_cost_usd, baseFuture.monthly_cost_usd, monthsHigh), 2),
        low_label: `${round(monthsLow, 1)} mo`,
        base_label: `${round(monthsBase, 1)} mo`,
        high_label: `${round(monthsHigh, 1)} mo`,
      },
    ],
  }
}

/**
 * Runs the full F5 economics model in dependency order.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Full engagement object.
 * @param {Record<string, unknown>[] | null | undefined} tasks Task rows with F2 allocations.
 * @param {Record<string, unknown> | null | undefined} f4SelectedVariant Selected F4 variant or full `f4_pods` payload.
 * @param {unknown} f3Roles F3 redesign array or bundle.
 * @param {Record<string, unknown> | null | undefined} preferences Model assumptions.
 * @returns {{
 *   current_state: ReturnType<typeof computeCurrentState>,
 *   future_state: ReturnType<typeof computeFutureState>,
 *   savings: ReturnType<typeof computeSavings>,
 *   transition_cost: ReturnType<typeof computeTransitionCost>,
 *   savings_curve: ReturnType<typeof computeRampedSavingsCurve>,
 *   payback_month: number,
 *   npv_36mo: number,
 *   irr_annual_pct: number | null,
 *   sensitivity: ReturnType<typeof computeSensitivity>
 * }}
 */
export function runFullEconomics(engagement, tasks, f4SelectedVariant, f3Roles, preferences) {
  const prefs = mergePreferences(engagement, preferences)
  const current_state = computeCurrentState(engagement)
  const future_state = computeFutureState(engagement, f4SelectedVariant, f3Roles, prefs, tasks)
  const savings = computeSavings(current_state, future_state)
  const transition_cost = computeTransitionCost(engagement, future_state, {
    ...prefs,
    f3_roles: f3Roles,
  })
  const billingModelRaw = prefs.billing_model
  const billingModel =
    billingModelRaw && typeof billingModelRaw === 'object' && !Array.isArray(billingModelRaw)
      ? /** @type {Record<string, unknown>} */ (billingModelRaw)
      : null
  const genpact_revenue_impact = computeGenpactRevenueImpact(current_state, future_state, billingModel)
  const genpact_view = computeGenpactView(current_state, future_state, billingModel, engagement)
  const billing_model_recommendation = computeBillingModelRecommendation(
    current_state,
    future_state,
    billingModel,
    engagement,
  )
  const monthsToSteady = nonNeg(prefs.months_to_steady_state) || DEFAULT_MONTHS_TO_STEADY
  const savings_curve = computeRampedSavingsCurve(
    current_state.monthly_cost_usd,
    future_state.monthly_cost_usd,
    transition_cost,
    monthsToSteady,
  )
  const payback_month = findPaybackMonth(savings_curve)
  const npv_36mo = computeNPV(savings_curve, transition_cost, nonNeg(prefs.annual_discount_rate_pct) || DEFAULT_DISCOUNT_RATE_PCT)
  const monthlySteadyStateSavings = current_state.monthly_cost_usd - future_state.monthly_cost_usd
  const irr_annual_pct = computeIRR(transition_cost, monthlySteadyStateSavings, DEFAULT_IRR_HORIZON_MONTHS)
  const sensitivity = computeSensitivity(engagement, f4SelectedVariant, f3Roles, {
    ...prefs,
    tasks: Array.isArray(tasks) ? tasks : [],
  })

  return {
    current_state,
    future_state,
    savings,
    transition_cost,
    genpact_revenue_impact,
    genpact_view,
    billing_model_recommendation,
    savings_curve,
    payback_month,
    npv_36mo,
    irr_annual_pct,
    sensitivity,
  }
}
