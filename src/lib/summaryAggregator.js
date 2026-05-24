/**
 * @fileoverview Deterministic F7 summary aggregation — merges F1–F6 pipeline outputs
 * into a single render-ready object. Pure functions only (no I/O).
 */

import { normalizeF3Roles } from './f3RolesStorage.js'
import { getFinalAllocation } from './roleAggregation.js'

const HEADCOUNT_TOLERANCE_PCT = 10
const PAYBACK_POSITIVE_MONTHS = 12
const PAYBACK_NEGATIVE_MONTHS = 18
const NPV_PROCEED_THRESHOLD = 500_000

/** @typedef {'PROCEED' | 'MARGINAL' | 'DO_NOT_PROCEED' | 'NEEDS_REVIEW'} Recommendation */

/** @typedef {'positive' | 'negative' | 'neutral'} Direction */

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asObj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : {}
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
 * @param {number} value
 * @param {number} [digits]
 * @returns {number}
 */
function round(value, digits = 1) {
  if (!Number.isFinite(value)) return 0
  const m = 10 ** digits
  return Math.round(value * m) / m
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>}
 */
function readIntake(engagement) {
  return asObj(engagement?.intake_data)
}

/**
 * @param {number} monthlyUsd
 * @returns {string}
 */
function formatMonthlyCost(monthlyUsd) {
  const n = toNum(monthlyUsd)
  if (!Number.isFinite(n) || n <= 0) return '$0/mo'
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000).toLocaleString('en-US')}k/mo`
  return `$${Math.round(n).toLocaleString('en-US')}/mo`
}

/**
 * @param {unknown} pattern
 * @returns {string}
 */
function normalizePattern(pattern) {
  return String(pattern ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {number}
 */
function taskHourWeight(task) {
  if (!task) return 0
  return toNum(task.volume_per_day) * toNum(task.avg_time_minutes)
}

/**
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {number}
 */
function totalTaskHourWeight(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  return list.reduce((sum, t) => sum + taskHourWeight(t), 0)
}

/**
 * @param {Record<string, unknown> | null | undefined} f4Pods
 * @returns {Record<string, unknown> | null}
 */
function selectedVariantFromF4Pods(f4Pods) {
  const pods = asObj(f4Pods)
  const selected =
    typeof pods.selected_variant_name === 'string' ? pods.selected_variant_name.trim().toLowerCase() : ''
  const all = Array.isArray(pods.all_variants) ? pods.all_variants : []
  if (!selected) return null
  const found = all.find((row) => String(asObj(row).variant_name ?? '').trim().toLowerCase() === selected)
  return found ? asObj(found) : null
}

/**
 * @param {string} key
 * @returns {string}
 */
function formatVariantLabel(key) {
  const raw = String(key ?? '').trim()
  if (!raw) return 'Selected variant'
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {number | null}
 */
function readScaleTarget(engagement) {
  const intake = readIntake(engagement)
  const prefs = asObj(intake.preferences)
  const eng = asObj(intake.engagement)
  const goals = asObj(eng.goals)

  for (const candidate of [prefs.scale_target, intake.scale_target, goals.scale_target, eng.scale_target]) {
    const n = toNum(candidate)
    if (n > 0) return n
  }
  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>[]}
 */
function readAiInUse(engagement) {
  const tech = asObj(readIntake(engagement).tech_stack)
  const ai = tech.ai_in_use
  return Array.isArray(ai) ? ai.filter((x) => x && typeof x === 'object').map((x) => asObj(x)) : []
}

/**
 * @param {Record<string, unknown>} entry
 * @returns {number}
 */
function aiEntryCoveragePct(entry) {
  return Math.min(100, Math.max(0, toNum(entry.coverage_pct)))
}

/**
 * Crude current-state AI coverage: platform coverage from `ai_in_use`, weighted by task-hours.
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {number}
 */
function computeCurrentAiCoveragePct(engagement, tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  const totalWeight = totalTaskHourWeight(list)
  const aiEntries = readAiInUse(engagement)
  if (!aiEntries.length) return 0

  // Average coverage across all in-use AI systems. Different systems
  // typically cover different tasks, so summing percentages would
  // overstate. Averaging gives a balanced view of current AI
  // penetration across the operation.
  const totalCoverage = aiEntries.reduce((sum, entry) => sum + aiEntryCoveragePct(entry), 0)
  const platformCoverage =
    aiEntries.length > 0 ? Math.min(100, totalCoverage / aiEntries.length) : 0

  if (totalWeight <= 0) return round(platformCoverage, 1)

  let covered = 0
  for (const task of list) {
    const w = taskHourWeight(task)
    if (w <= 0) continue
    covered += w * (platformCoverage / 100)
  }
  return round((covered / totalWeight) * 100, 1)
}

/**
 * Future-state AI coverage from F2 allocations (tech-assisted + tech-automated task-hours).
 *
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {number}
 */
function computeFutureAiCoveragePct(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  const totalWeight = totalTaskHourWeight(list)
  if (totalWeight <= 0) return 0

  let aiWeight = 0
  for (const task of list) {
    const alloc = getFinalAllocation(task)
    if (alloc === 'tech-assisted' || alloc === 'tech-automated') {
      aiWeight += taskHourWeight(task)
    }
  }
  return round((aiWeight / totalWeight) * 100, 1)
}

/**
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {{ automated: number, assisted: number, human: number, total: number, byVolume: { automated: number, assisted: number, human: number } }}
 */
function computeAllocationCounts(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  let automated = 0
  let assisted = 0
  let human = 0
  let volAuto = 0
  let volAssist = 0
  let volHuman = 0

  for (const task of list) {
    const alloc = getFinalAllocation(task) || 'human-only'
    if (alloc === 'tech-automated') {
      automated += 1
      volAuto += taskHourWeight(task)
    } else if (alloc === 'tech-assisted') {
      assisted += 1
      volAssist += taskHourWeight(task)
    } else {
      human += 1
      volHuman += taskHourWeight(task)
    }
  }

  const total = list.length
  const volTotal = volAuto + volAssist + volHuman

  return {
    automated,
    assisted,
    human,
    total,
    byVolume: { automated: volAuto, assisted: volAssist, human: volHuman, total: volTotal },
  }
}

/**
 * @param {number} count
 * @param {number} total
 * @returns {number}
 */
function pctOf(count, total) {
  if (total <= 0) return 0
  return round((count / total) * 100, 1)
}

/**
 * @param {unknown} f3Roles
 * @returns {string}
 */
function derivePatternLabel(f3Roles) {
  const { redesigns } = normalizeF3Roles(f3Roles)
  let redefinition = 0
  let transformation = 0

  for (const row of redesigns) {
    const p = normalizePattern(row.pattern)
    if (p === 'redefinition') redefinition += 1
    if (p === 'transformation') transformation += 1
  }

  if (redefinition > 0 || transformation >= 2) return 'Significant transformation'
  if (transformation === 1) return 'Targeted transformation'
  return 'Operational tuning'
}

/**
 * @param {Record<string, unknown> | null | undefined} economicsResult
 * @param {boolean} hasF2
 * @param {boolean} hasF5
 * @returns {Recommendation}
 */
function deriveRecommendation(economicsResult, hasF2, hasF5) {
  if (!hasF2 || !hasF5) return 'NEEDS_REVIEW'

  const savings = asObj(economicsResult?.savings)
  const savingsPct = toNum(savings.monthly_savings_pct)
  const payback = toNum(economicsResult?.payback_month)
  const npv = toNum(economicsResult?.npv_36mo)
  const headcountAbs = Math.abs(toNum(savings.headcount_delta_pct))

  if (payback > PAYBACK_NEGATIVE_MONTHS || savingsPct < 0) return 'DO_NOT_PROCEED'
  if (npv > NPV_PROCEED_THRESHOLD && payback > 0 && payback < PAYBACK_POSITIVE_MONTHS && headcountAbs < HEADCOUNT_TOLERANCE_PCT) {
    return 'PROCEED'
  }
  return 'MARGINAL'
}

/**
 * @param {number | null} paybackMonth
 * @returns {Direction}
 */
function paybackDirection(paybackMonth) {
  if (paybackMonth == null || paybackMonth <= 0) return 'neutral'
  if (paybackMonth < PAYBACK_POSITIVE_MONTHS) return 'positive'
  if (paybackMonth > PAYBACK_NEGATIVE_MONTHS) return 'negative'
  return 'neutral'
}

/**
 * @param {number} savingsPct
 * @returns {Direction}
 */
function costDirection(savingsPct) {
  if (savingsPct > 0) return 'positive'
  if (savingsPct < 0) return 'negative'
  return 'neutral'
}

/**
 * @param {number} headcountDeltaPct
 * @returns {Direction}
 */
function headcountDirection(headcountDeltaPct) {
  const delta = toNum(headcountDeltaPct)
  if (delta > 0) return 'negative'
  const reduction = Math.abs(delta)
  if (reduction === 0) return 'neutral'
  if (reduction <= HEADCOUNT_TOLERANCE_PCT) return 'positive'
  return 'negative'
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @param {Record<string, unknown> | null | undefined} economicsResult
 * @param {Record<string, unknown> | null | undefined} f4Pods
 * @param {boolean} hasF5
 * @returns {Array<Record<string, unknown>>}
 */
function buildStatTiles(engagement, tasks, economicsResult, f4Pods, hasF5) {
  /** @type {Array<Record<string, unknown>>} */
  const tiles = []

  if (hasF5 && economicsResult) {
    const current = asObj(economicsResult.current_state)
    const future = asObj(economicsResult.future_state)
    const savings = asObj(economicsResult.savings)
    const savingsPct = round(toNum(savings.monthly_savings_pct), 1)
    const payback = toNum(economicsResult.payback_month)

    tiles.push({
      label: 'COST REDUCTION',
      current: formatMonthlyCost(current.monthly_cost_usd),
      future: formatMonthlyCost(future.monthly_cost_usd),
      delta_pct: round(-savingsPct, 1),
      direction: costDirection(savingsPct),
    })

    tiles.push({
      label: 'PAYBACK',
      current: null,
      future: payback > 0 ? `M${Math.round(payback)}` : '—',
      delta_pct: null,
      direction: paybackDirection(payback > 0 ? payback : null),
    })

    const currentHc = toNum(current.headcount_total)
    const futureHc = toNum(future.headcount_total)
    const hcDeltaPct = round(toNum(savings.headcount_delta_pct), 1)

    tiles.push({
      label: 'HEADCOUNT IMPACT',
      current: `${Math.round(currentHc)} FTE`,
      future: `${Math.round(futureHc)} FTE`,
      delta_pct: hcDeltaPct,
      direction: headcountDirection(hcDeltaPct),
    })
  }

  const currentAi = computeCurrentAiCoveragePct(engagement, tasks)
  const futureAi = computeFutureAiCoveragePct(tasks)
  const aiDelta = round(futureAi - currentAi, 1)

  tiles.push({
    label: 'AI COVERAGE',
    current: currentAi,
    future: futureAi,
    delta_pct: aiDelta,
    direction: aiDelta >= 0 ? 'positive' : 'negative',
  })

  return tiles
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @param {Record<string, unknown> | null | undefined} pipelineRuns
 * @param {boolean} hasF2
 * @param {boolean} hasF5
 * @returns {Array<Record<string, unknown>>}
 */
function buildJourney(engagement, tasks, pipelineRuns, hasF2, hasF5) {
  const runs = asObj(pipelineRuns)
  const f3 = normalizeF3Roles(runs.f3_roles)
  const f4 = asObj(runs.f4_pods)
  const f5 = asObj(runs.f5_economics)
  const f6 = asObj(runs.f6_timeline)
  const economics = asObj(f5.economics_result)
  const savings = asObj(economics.savings)
  const summary = asObj(f6.summary)

  const readinessBand =
    typeof engagement?.readiness_band === 'string' && engagement.readiness_band.trim()
      ? engagement.readiness_band.trim()
      : '—'
  const taskCount = Array.isArray(tasks) ? tasks.length : 0

  const allocCounts = computeAllocationCounts(tasks)
  const transformationCount = f3.redesigns.filter((r) => {
    const p = normalizePattern(r.pattern)
    return p === 'transformation' || p === 'redefinition'
  }).length

  const selectedVariant = selectedVariantFromF4Pods(f4)
  const variantLabel =
    typeof selectedVariant?.display_name === 'string' && selectedVariant.display_name.trim()
      ? selectedVariant.display_name.trim()
      : formatVariantLabel(f4.selected_variant_name)

  const orgRollup = asObj(selectedVariant?.org_rollup)
  const podCount = toNum(orgRollup.total_pods) || toNum(orgRollup.pod_count)

  const payback = toNum(economics.payback_month)
  const savingsPct = round(toNum(savings.monthly_savings_pct), 0)

  return [
    {
      feature: 'F1',
      label: 'Intake',
      status: engagement ? 'complete' : 'pending',
      summary: `${readinessBand}, ${taskCount} tasks`,
    },
    {
      feature: 'F2',
      label: 'Allocation',
      status: hasF2 ? 'complete' : 'pending',
      summary: `${allocCounts.automated} auto · ${allocCounts.assisted} assist · ${allocCounts.human} human`,
    },
    {
      feature: 'F3',
      label: 'Roles',
      status: f3.redesigns.length > 0 ? 'complete' : 'pending',
      summary: `${transformationCount} transformations, ${f3.emergent_roles.length} emergent`,
    },
    {
      feature: 'F4',
      label: 'Pods',
      status: selectedVariant ? 'complete' : 'pending',
      summary: `${podCount || '—'} pods · ${variantLabel || '—'}`,
    },
    {
      feature: 'F5',
      label: 'Economics',
      status: hasF5 ? 'complete' : 'pending',
      summary: hasF5 ? `${savingsPct}% savings · M${payback > 0 ? Math.round(payback) : '—'}` : 'Not computed',
    },
    {
      feature: 'F6',
      label: 'Timeline',
      status: Object.keys(summary).length > 0 ? 'complete' : 'pending',
      summary: Object.keys(summary).length
        ? `${summary.total_duration_months ?? '—'}mo · ${summary.phases_count ?? 4} phases · ${summary.deployments_count ?? 0} deployments`
        : 'Not generated',
    },
  ]
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {Record<string, unknown>}
 */
function buildRiskEvidence(engagement, tasks) {
  const intake = readIntake(engagement)
  const governance = asObj(intake.governance)
  const list = Array.isArray(tasks) ? tasks : []

  const criticalHumanOnly =
    list.filter((t) => String(t.consequence_of_error ?? '').trim().toLowerCase() === 'critical').length === 0 ||
    list
      .filter((t) => String(t.consequence_of_error ?? '').trim().toLowerCase() === 'critical')
      .every((t) => getFinalAllocation(t) === 'human-only')

  const riskCategories = Array.isArray(governance.risk_categories)
    ? governance.risk_categories
        .filter((x) => x && typeof x === 'object')
        .map((row) => {
          const r = asObj(row)
          const name =
            typeof r.name === 'string' && r.name.trim()
              ? r.name.trim()
              : typeof row === 'string'
                ? String(row).trim()
                : 'Unnamed risk'
          const severity = String(r.severity ?? 'medium')
            .trim()
            .toLowerCase()
          const isHigh = severity === 'high' || severity === 'critical'
          return {
            name,
            severity,
            kept_human: !isHigh || criticalHumanOnly,
          }
        })
    : []

  const controlsInPlace = Array.isArray(governance.controls_in_place)
    ? governance.controls_in_place.map((x) => String(x))
    : []

  const lockedTasks = list
    .filter((t) => t.regulatory_constraint === true)
    .map((t) => (typeof t.task_name === 'string' && t.task_name.trim() ? t.task_name.trim() : '(unnamed task)'))

  const highConsequenceKeptHuman = list
    .filter((t) => {
      const c = String(t.consequence_of_error ?? '')
        .trim()
        .toLowerCase()
      const isHigh = c === 'high' || c === 'critical'
      const alloc = getFinalAllocation(t)
      return isHigh && alloc === 'human-only'
    })
    .map((t) => (typeof t.task_name === 'string' && t.task_name.trim() ? t.task_name.trim() : '(unnamed task)'))

  let todayHumanVol = 0
  let futureHumanVol = 0
  for (const task of list) {
    const vol = toNum(task.volume_per_day)
    todayHumanVol += vol
    const alloc = getFinalAllocation(task)
    if (alloc !== 'tech-automated') futureHumanVol += vol
  }

  const reductionPct =
    todayHumanVol > 0 ? round(((todayHumanVol - futureHumanVol) / todayHumanVol) * 100, 1) : 0

  const sufficientSafetyReview = criticalHumanOnly

  return {
    risk_categories: riskCategories,
    locked_tasks: lockedTasks,
    high_consequence_kept_human: highConsequenceKeptHuman,
    controls_in_place: controlsInPlace,
    wellness_support: governance.wellness_support === true,
    coverage_check: {
      total_volume_handled_by_humans_today: round(todayHumanVol, 0),
      total_volume_handled_by_humans_future: round(futureHumanVol, 0),
      reduction_pct: reductionPct,
      sufficient_safety_review: sufficientSafetyReview,
    },
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {Record<string, unknown>}
 */
function buildCaveats(engagement, tasks) {
  const eng = asObj(engagement)
  const intake = readIntake(engagement)
  const engagementBlock = asObj(intake.engagement)
  const list = Array.isArray(tasks) ? tasks : []

  /** @type {string[]} */
  const extractionWarnings = []
  if (eng.intake_mode === 'upload') {
    const meta = asObj(eng.extraction_metadata)
    if (Array.isArray(meta.warnings)) {
      for (const w of meta.warnings) {
        if (typeof w === 'string' && w.trim()) extractionWarnings.push(w.trim())
      }
    }
  }

  /** @type {string[]} */
  const dataGaps = []
  if (engagementBlock.volume_per_day == null) {
    dataGaps.push('Volume per day not captured')
  }

  const missingTime = list.filter((t) => t.avg_time_minutes == null).length
  if (missingTime > 0) {
    dataGaps.push(`Task time estimates missing for ${missingTime} tasks`)
  }

  const loggingGaps = list.filter(
    (t) => getFinalAllocation(t) === 'tech-automated' && t.data_logged !== true,
  ).length
  if (loggingGaps > 0) {
    dataGaps.push(`Logging not in place for ${loggingGaps} tasks recommended for automation`)
  }

  const readiness = toNum(eng.readiness_score)
  if (readiness > 0 && readiness < 75) {
    dataGaps.push(`Readiness score is below 75 (${Math.round(readiness)})`)
  }

  return {
    extraction_warnings: extractionWarnings,
    data_gaps: dataGaps,
    illustrative_flag: eng.values_are_illustrative !== false,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} f4Pods
 * @returns {string}
 */
function deriveScenarioName(f4Pods) {
  const f4 = asObj(f4Pods)
  const variant = selectedVariantFromF4Pods(f4)
  const base =
    typeof variant?.display_name === 'string' && variant.display_name.trim()
      ? variant.display_name.trim()
      : formatVariantLabel(f4.selected_variant_name)
  if (variant?.is_recommended === true) return `${base} — Recommended`
  return base || 'Operating model scenario'
}

/**
 * @param {Record<string, unknown> | null | undefined} economicsResult
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {string}
 */
function deriveOneLineSummary(economicsResult, engagement) {
  const savings = asObj(economicsResult?.savings)
  const savingsPct = Math.round(toNum(savings.monthly_savings_pct))
  const payback = toNum(economicsResult?.payback_month)
  const scale = readScaleTarget(engagement) ?? 1
  const scaleLabel = Number.isInteger(scale) ? scale : round(scale, 1)
  const paybackLabel = payback > 0 ? Math.round(payback) : '—'
  return `${savingsPct}% cost reduction, payback M${paybackLabel}, handles ${scaleLabel}x current volume`
}

/**
 * Whether tasks have usable F2 allocation outputs.
 *
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @param {Record<string, unknown> | null | undefined} pipelineRuns
 * @returns {boolean}
 */
function hasF2Data(tasks, pipelineRuns) {
  const runs = asObj(pipelineRuns)
  if (runs.f2_matrix != null) return true
  const list = Array.isArray(tasks) ? tasks : []
  return list.some((t) => {
    const a = getFinalAllocation(t)
    return a === 'tech-automated' || a === 'tech-assisted' || a === 'human-only'
  })
}

/**
 * @param {Record<string, unknown> | null | undefined} pipelineRuns
 * @returns {boolean}
 */
function hasF5Data(pipelineRuns) {
  const f5 = asObj(asObj(pipelineRuns).f5_economics)
  return Boolean(f5.economics_result)
}

/**
 * Aggregates engagement, task, and pipeline-run outputs into the F7 summary object.
 *
 * @param {Record<string, unknown> | null | undefined} engagement Engagement row (intake_data, scores, metadata).
 * @param {Record<string, unknown>[] | null | undefined} tasks Task rows with F2 allocations.
 * @param {{
 *   f2_matrix?: unknown,
 *   f3_roles?: unknown,
 *   f4_pods?: unknown,
 *   f5_economics?: unknown,
 *   f6_timeline?: unknown
 * } | null | undefined} pipelineRuns Saved `pipeline_runs` feature payloads.
 * @returns {Record<string, unknown>} Structured summary for F7 rendering.
 */
export function aggregateSummary(engagement, tasks, pipelineRuns) {
  const runs = asObj(pipelineRuns)
  const taskList = Array.isArray(tasks) ? tasks : []
  const hasF2 = hasF2Data(taskList, runs)
  const hasF5 = hasF5Data(runs)
  const f5 = asObj(runs.f5_economics)
  const economicsResult = hasF5 ? asObj(f5.economics_result) : null

  const recommendation = deriveRecommendation(economicsResult, hasF2, hasF5)
  const alloc = computeAllocationCounts(taskList)
  const vol = alloc.byVolume

  const allocation_summary = {
    automated_pct: pctOf(alloc.automated, alloc.total),
    assisted_pct: pctOf(alloc.assisted, alloc.total),
    human_only_pct: pctOf(alloc.human, alloc.total),
    total_tasks: alloc.total,
    coverage_by_volume: {
      automated_pct: pctOf(vol.automated, vol.total),
      assisted_pct: pctOf(vol.assisted, vol.total),
      human_only_pct: pctOf(vol.human, vol.total),
    },
  }

  return {
    headline: {
      recommendation,
      scenario_name: deriveScenarioName(runs.f4_pods),
      one_line_summary: hasF5 && economicsResult ? deriveOneLineSummary(economicsResult, engagement) : 'Economics not yet computed',
      pattern_label: derivePatternLabel(runs.f3_roles),
    },
    stat_tiles: buildStatTiles(engagement, taskList, economicsResult, runs.f4_pods, hasF5),
    journey: buildJourney(engagement, taskList, runs, hasF2, hasF5),
    allocation_summary,
    risk_evidence: buildRiskEvidence(engagement, taskList),
    caveats: buildCaveats(engagement, taskList),
    limitations: [
      'This is a directional model based on standard BPO assumptions.',
      'Costs are illustrative ranges, not Genpact-specific commercial terms.',
      'Vendor pricing for AI capabilities reflects industry-typical ranges.',
      'Implementation timeline assumes typical change-management velocity.',
    ],
  }
}
