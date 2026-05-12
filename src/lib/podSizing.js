/**
 * @fileoverview Deterministic pod-sizing math for F4 (pure functions, no I/O).
 */

import { getFinalAllocation } from './roleAggregation.js'

const QA_CAPACITY_MINUTES = 6.5 * 60 // 390 — one QA FTE productive minutes (per spec)
const VOLUME_POD_HEURISTIC_DIVISOR = 6800 // rough items → pod count estimate

const DEFAULT_AGENT_OPTIONS = Object.freeze({
  shift_minutes_per_day: 480,
  shrinkage_pct: 22,
  utilization_pct: 78,
})

const DEFAULT_CONSTRAINTS = Object.freeze({
  max_pod_size: 15,
  sampling_rate_pct: 5,
  qa_audit_time_minutes: 6,
})

// --- small pure helpers ---

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
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {string}
 */
function finalAllocation(task) {
  const a = getFinalAllocation(task)
  return typeof a === 'string' ? a.trim().toLowerCase() : ''
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {number}
 */
function taskVolume(task) {
  if (!task || typeof task !== 'object') return 0
  return toNum(task.volume_per_day)
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {number} Daily volume that is tech-automated (for AI-auditor math).
 */
function automatedVolumePerDay(task) {
  if (!task || typeof task !== 'object') return 0
  if (finalAllocation(task) !== 'tech-automated') return 0
  return toNum(task.volume_per_day)
}

/**
 * Per-task daily minutes consumed for capacity math (allocation-based; not × volume).
 *
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {number}
 */
function taskConsumedMinutesPerSpec(task) {
  if (!task || typeof task !== 'object') return 0
  const avg = toNum(task.avg_time_minutes)
  const alloc = finalAllocation(task)
  if (alloc === 'tech-automated') return 0
  if (alloc === 'tech-assisted') return avg * 0.7
  if (alloc === 'human-only') return avg
  return 0
}

/**
 * @param {Record<string, unknown>[]} roleTasks
 */
function weightedAvgItemMinutes(roleTasks) {
  let volSum = 0
  let volTime = 0
  for (const t of roleTasks) {
    if (!t || typeof t !== 'object') continue
    const alloc = finalAllocation(t)
    if (alloc !== 'human-only' && alloc !== 'tech-assisted') continue
    const v = taskVolume(t)
    const avg = toNum(t.avg_time_minutes)
    volSum += v
    volTime += v * avg
  }
  return volSum > 0 ? volTime / volSum : 1
}

/**
 * @param {unknown} role
 * @returns {string}
 */
function roleNameFromHierarchyRow(role) {
  if (!role || typeof role !== 'object') return ''
  const r = /** @type {Record<string, unknown>} */ (role)
  const n = r.role ?? r.name ?? r.role_name
  return typeof n === 'string' ? n.trim() : ''
}

/**
 * Tasks whose `role_performing` matches the hierarchy role name (trimmed).
 *
 * @param {Record<string, unknown>} role
 * @param {Record<string, unknown>[]} tasks
 * @returns {Record<string, unknown>[]}
 */
function tasksForRole(role, tasks) {
  const name = roleNameFromHierarchyRow(role)
  if (!name) return []
  const list = Array.isArray(tasks) ? tasks : []
  return list.filter((t) => {
    if (!t || typeof t !== 'object') return false
    const rp = /** @type {Record<string, unknown>} */ (t).role_performing
    return typeof rp === 'string' && rp.trim() === name
  })
}

/**
 * Picks the frontline agent role: lowest numeric `level`, then first in list.
 *
 * @param {unknown[]} hierarchy
 * @returns {Record<string, unknown> | null}
 */
function pickPrimaryAgentRole(hierarchy) {
  const rows = Array.isArray(hierarchy) ? hierarchy.filter((x) => x && typeof x === 'object') : []
  if (rows.length === 0) return null
  /** @type {{ row: Record<string, unknown>, level: number }[]} */
  const scored = rows.map((row) => {
    const r = /** @type {Record<string, unknown>} */ (row)
    const lv = toNum(r.level)
    return { row: r, level: Number.isFinite(lv) && lv > 0 ? lv : 999 }
  })
  scored.sort((a, b) => a.level - b.level || 0)
  return scored[0]?.row ?? null
}

/**
 * Reads `intake_data.engagement.volume_per_day` (falls back to top-level intake keys).
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {number}
 */
export function readEngagementVolumePerDay(engagement) {
  if (!engagement || typeof engagement !== 'object') return 0
  const intake =
    engagement.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const eng = intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
    ? /** @type {Record<string, unknown>} */ (intake.engagement)
    : {}
  const v = eng.volume_per_day ?? intake.volume_per_day
  return Math.max(0, toNum(v))
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {'low' | 'medium' | 'high'}
 */
function readRiskTolerance(engagement) {
  if (!engagement || typeof engagement !== 'object') return 'medium'
  const intake =
    engagement.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const prefs = intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
    ? /** @type {Record<string, unknown>} */ (intake.preferences)
    : {}
  const raw = prefs.risk_tolerance ?? intake.risk_tolerance
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (s === 'low' || s === 'medium' || s === 'high') return s
  return 'medium'
}

/**
 * Maps intake `risk_tolerance` to the operational risk band used by {@link computeSpanCapacity}.
 * High tolerance → wider spans (`low` operational risk profile); low tolerance → tighter spans (`high` profile).
 *
 * @param {'low' | 'medium' | 'high'} tolerance
 * @returns {'low' | 'medium' | 'high'}
 */
function riskToleranceToSpanRiskProfile(tolerance) {
  if (tolerance === 'high') return 'low'
  if (tolerance === 'low') return 'high'
  return 'medium'
}

/**
 * Sum of hierarchy `headcount` fields (best-effort).
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {number}
 */
function sumHierarchyHeadcount(engagement) {
  if (!engagement || typeof engagement !== 'object') return 0
  const intake =
    engagement.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const hierarchy = Array.isArray(intake.hierarchy) ? intake.hierarchy : []
  let sum = 0
  for (const row of hierarchy) {
    if (!row || typeof row !== 'object') continue
    sum += toNum(/** @type {Record<string, unknown>} */ (row).headcount)
  }
  return sum
}

/**
 * Calculates how much work one agent in the given role can absorb per day.
 *
 * **Consumed minutes (per spec):** per matching task, `human-only` → `avg_time_minutes`;
 * `tech-assisted` → `avg_time_minutes × 0.7`; `tech-automated` → `0`. (Not multiplied by volume — per-task handle time.)
 *
 * **Items/day capacity:** `effective_minutes / weighted_avg_time_per_item`, where the weighted average is
 * `sum(volume × avg_time) / sum(volume)` over human-only + tech-assisted tasks for this role (falls back to 1 minute if none).
 *
 * @param {Record<string, unknown>} role Hierarchy row (`role` / `name` / `role_name`).
 * @param {Record<string, unknown>[]} tasks All tasks for the engagement.
 * @param {{ shift_minutes_per_day?: number, shrinkage_pct?: number, utilization_pct?: number }} [options]
 * @returns {{
 *   productive_minutes_per_day: number,
 *   effective_minutes_per_day: number,
 *   tasks_consumed_minutes: number,
 *   remaining_capacity_minutes: number,
 *   items_per_day_capacity: number
 * }}
 */
export function computeAgentCapacity(role, tasks, options) {
  const opt = { ...DEFAULT_AGENT_OPTIONS, ...(options && typeof options === 'object' ? options : {}) }
  const shift = toNum(opt.shift_minutes_per_day) || 480
  const shrink = toNum(opt.shrinkage_pct)
  const util = toNum(opt.utilization_pct)

  const productive = shift * (1 - shrink / 100)
  const effective = productive * (util / 100)

  const roleTasks = tasksForRole(role, tasks)
  let consumed = 0
  for (const t of roleTasks) {
    consumed += taskConsumedMinutesPerSpec(t)
  }

  const wAvg = weightedAvgItemMinutes(roleTasks)
  const itemsPerDay = wAvg > 0 ? effective / wAvg : 0
  const remaining = Math.max(0, effective - consumed)

  return {
    productive_minutes_per_day: productive,
    effective_minutes_per_day: effective,
    tasks_consumed_minutes: consumed,
    remaining_capacity_minutes: remaining,
    items_per_day_capacity: itemsPerDay,
  }
}

/**
 * Recommended span-of-control band for a team lead.
 *
 * @param {'low' | 'medium' | 'high'} riskProfile Operational risk band.
 * @returns {{ min: number, max: number, recommended: number }}
 */
export function computeSpanCapacity(riskProfile) {
  const p = typeof riskProfile === 'string' ? riskProfile.trim().toLowerCase() : 'medium'
  if (p === 'low') return { min: 18, max: 25, recommended: 22 }
  if (p === 'high') return { min: 8, max: 12, recommended: 10 }
  return { min: 12, max: 18, recommended: 15 }
}

/**
 * @param {Record<string, unknown>} constraints
 * @param {Record<string, unknown>} defaults
 * @returns {Record<string, unknown>}
 */
function mergeConstraints(constraints, defaults) {
  const c = constraints && typeof constraints === 'object' && !Array.isArray(constraints) ? constraints : {}
  return { ...defaults, ...c }
}

/**
 * Main pod composition for a single pod (deterministic).
 *
 * @param {Record<string, unknown>} constraints `{ target_span, max_pod_size?, sampling_rate_pct?, qa_audit_time_minutes? }`
 * @param {Record<string, unknown>} engagement Full engagement row (uses `intake_data`).
 * @param {Record<string, unknown>[]} tasks Tasks with final allocation fields set.
 * @returns {Record<string, unknown>} See return shape in implementation.
 */
export function computePodComposition(constraints, engagement, tasks) {
  const c = mergeConstraints(constraints, {
    ...DEFAULT_CONSTRAINTS,
    target_span: 12,
  })
  const targetSpan = toNum(c.target_span)
  const maxPod = toNum(c.max_pod_size)
  const samplingPct = toNum(c.sampling_rate_pct)
  const auditMin = toNum(c.qa_audit_time_minutes) || 6

  const volume = readEngagementVolumePerDay(engagement)
  const intake =
    engagement?.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const hierarchy = Array.isArray(intake.hierarchy) ? intake.hierarchy : []

  const agentRole = pickPrimaryAgentRole(hierarchy) ?? /** @type {Record<string, unknown>} */ ({ role: 'Agent' })
  const cap = computeAgentCapacity(agentRole, tasks, {})
  const itemsPerAgent = Math.max(0, cap.items_per_day_capacity)

  const podCountRough = Math.max(1, volume / VOLUME_POD_HEURISTIC_DIVISOR)
  const volumePerPod = volume / podCountRough
  const derivedFromVolume = itemsPerAgent > 0 ? volumePerPod / itemsPerAgent : maxPod

  const spanCandidates = [targetSpan, maxPod, derivedFromVolume].filter((x) => Number.isFinite(x) && x > 0)
  const rawAgents = spanCandidates.length > 0 ? Math.min(...spanCandidates) : 1
  const agentsPerPod = Math.max(1, Math.floor(rawAgents))

  const qaAuditsPerDay = agentsPerPod * (samplingPct / 100) * itemsPerAgent
  const rawQaFte = (qaAuditsPerDay * auditMin) / QA_CAPACITY_MINUTES
  const qaPerPod = rawQaFte

  const list = Array.isArray(tasks) ? tasks : []
  let autoVolTotal = 0
  for (const t of list) {
    autoVolTotal += automatedVolumePerDay(t)
  }
  const autoVolPerPod = autoVolTotal / podCountRough
  const aiAuditorPerPod = (autoVolPerPod * 0.05) / QA_CAPACITY_MINUTES

  const smePerPod = 0.15
  const wfmPerPod = 0.1
  const podCapacityPerDay = agentsPerPod * itemsPerAgent

  const spanRisk = riskToleranceToSpanRiskProfile(readRiskTolerance(engagement))
  const span = computeSpanCapacity(spanRisk)

  const rawPodCount = podCapacityPerDay > 0 ? volume / podCapacityPerDay : podCountRough
  const finalPodCount = computePodCount(volume, podCapacityPerDay)

  const calculation_trace = {
    agents_formula: `min(target_span=${targetSpan}, max_pod_size=${maxPod}, derived_from_volume=${round4(derivedFromVolume)}) → ${agentsPerPod}`,
    agents_inputs: {
      target_span: targetSpan,
      max_pod_size: maxPod,
      derived_from_volume: derivedFromVolume,
      items_per_agent_per_day: itemsPerAgent,
      pod_count_rough: podCountRough,
      volume_per_pod: volumePerPod,
      agent_role_used: roleNameFromHierarchyRow(agentRole),
    },
    qa_formula: `(${round4(qaAuditsPerDay)} audits/day × ${auditMin} min) / ${QA_CAPACITY_MINUTES} QA min = ${round4(rawQaFte)} FTE`,
    qa_inputs: {
      audits_per_day: qaAuditsPerDay,
      audit_minutes: auditMin,
      qa_capacity_minutes: QA_CAPACITY_MINUTES,
      raw_fte: rawQaFte,
      rounded_fte: qaPerPod,
      sampling_rate_pct: samplingPct,
      agents_per_pod: agentsPerPod,
      items_per_agent_per_day: itemsPerAgent,
    },
    ai_auditor_inputs: {
      automated_volume_total: autoVolTotal,
      automated_volume_per_pod: autoVolPerPod,
      formula: `(${round4(autoVolPerPod)} × 0.05) / ${QA_CAPACITY_MINUTES}`,
      ai_auditor_per_pod: aiAuditorPerPod,
    },
    span_lookup_used: { risk_profile: spanRisk, recommended_range: span },
    pod_count_formula: `${volume} / ${round4(podCapacityPerDay)} = ${round4(rawPodCount)} → ceil = ${finalPodCount}`,
    pod_count_inputs: {
      total_volume: volume,
      pod_capacity: podCapacityPerDay,
      raw_count: rawPodCount,
      final_count: finalPodCount,
    },
    agent_capacity_snapshot: cap,
  }

  return {
    agents_per_pod: agentsPerPod,
    derived_from_volume: derivedFromVolume,
    qa_per_pod: qaPerPod,
    ai_auditor_per_pod: aiAuditorPerPod,
    sme_per_pod: smePerPod,
    wfm_per_pod: wfmPerPod,
    pod_capacity_per_day: podCapacityPerDay,
    calculation_trace,
  }
}

/**
 * @param {number} n
 * @returns {number}
 */
function round4(n) {
  return Math.round(n * 10000) / 10000
}

/**
 * @param {number} totalVolume
 * @param {number} podCapacity
 * @returns {number}
 */
export function computePodCount(totalVolume, podCapacity) {
  const v = Math.max(0, toNum(totalVolume))
  const cap = Math.max(0, toNum(podCapacity))
  if (cap <= 0) return v > 0 ? 1 : 0
  return Math.ceil(v / cap)
}

/**
 * @param {Record<string, unknown>} podComposition Output of {@link computePodComposition}.
 * @param {number} podCount
 * @param {Record<string, unknown>} engagement
 * @returns {Record<string, unknown>}
 */
export function computeOrgRollup(podComposition, podCount, engagement) {
  const pc = podComposition && typeof podComposition === 'object' ? podComposition : {}
  const pods = Math.max(0, Math.floor(toNum(podCount)))

  const agents = toNum(pc.agents_per_pod) * pods
  const tls = pods
  const qa = Math.round(toNum(pc.qa_per_pod) * pods * 1000) / 1000
  const aiOps = Math.round(toNum(pc.ai_auditor_per_pod) * pods * 1000) / 1000
  const sme = Math.round(toNum(pc.sme_per_pod) * pods * 1000) / 1000
  const wfm = Math.round(toNum(pc.wfm_per_pod) * pods * 1000) / 1000
  const heads = 1

  const totalHeadcount = agents + tls + qa + aiOps + sme + wfm + heads
  const today = sumHierarchyHeadcount(engagement)
  const delta = totalHeadcount - today
  const deltaPct = today > 0 ? (delta / today) * 100 : 0

  return {
    pod_count: pods,
    total_agents: agents,
    total_team_leads: tls,
    total_central_qa: qa,
    total_ai_ops: aiOps,
    total_sme: sme,
    total_wfm: wfm,
    total_unit_heads: heads,
    total_headcount: totalHeadcount,
    today_headcount: today,
    headcount_delta: delta,
    headcount_delta_pct: deltaPct,
  }
}

/**
 * Span band (min / recommended / max agents per TL) for an intake `risk_tolerance` value,
 * after applying {@link riskToleranceToSpanRiskProfile}.
 *
 * @param {'low' | 'medium' | 'high'} intakeRiskTolerance
 * @returns {{ min: number, max: number, recommended: number }}
 */
export function getSpanCapacityForIntakeRisk(intakeRiskTolerance) {
  const t =
    intakeRiskTolerance === 'low' || intakeRiskTolerance === 'medium' || intakeRiskTolerance === 'high'
      ? intakeRiskTolerance
      : 'medium'
  const spanRisk = riskToleranceToSpanRiskProfile(t)
  return computeSpanCapacity(spanRisk)
}

/**
 * Default intake risk tolerance + span band for F4 UI initialization.
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {{ intake_risk_tolerance: 'low'|'medium'|'high', span: { min: number, max: number, recommended: number } }}
 */
export function getF4SpanDefaultsFromEngagement(engagement) {
  const intake_risk_tolerance = readRiskTolerance(engagement)
  const span = getSpanCapacityForIntakeRisk(intake_risk_tolerance)
  return { intake_risk_tolerance, span }
}

/**
 * Builds Conservative / Balanced / Aggressive sizing variants.
 *
 * @param {Record<string, unknown>} engagement
 * @param {Record<string, unknown>[]} tasks
 * @param {{ overrideConstraints?: Record<string, unknown> }} [options]
 * @returns {Record<string, unknown>[]}
 */
export function generateThreeVariants(engagement, tasks, options) {
  const opts = options && typeof options === 'object' ? options : {}
  const oc =
    opts.overrideConstraints && typeof opts.overrideConstraints === 'object' && !Array.isArray(opts.overrideConstraints)
      ? /** @type {Record<string, unknown>} */ (opts.overrideConstraints)
      : {}

  const tolOverrideRaw = oc.risk_profile
  const tolOverride =
    typeof tolOverrideRaw === 'string' ? tolOverrideRaw.trim().toLowerCase() : ''
  const tol =
    tolOverride === 'low' || tolOverride === 'medium' || tolOverride === 'high'
      ? /** @type {'low' | 'medium' | 'high'} */ (tolOverride)
      : readRiskTolerance(engagement)
  const span = getSpanCapacityForIntakeRisk(tol)

  const maxPodRaw = toNum(oc.max_pod_size)
  const maxPod = maxPodRaw > 0 ? maxPodRaw : DEFAULT_CONSTRAINTS.max_pod_size

  const baseConstraints = {
    max_pod_size: maxPod,
    qa_audit_time_minutes: DEFAULT_CONSTRAINTS.qa_audit_time_minutes,
  }

  let balancedTarget = span.recommended
  const ts = toNum(oc.target_span)
  if (ts > 0) {
    balancedTarget = Math.round(Math.min(Math.max(ts, span.min), span.max))
  }

  /** @type {{ key: string, display: string, target: number, sampling: number, recommended?: boolean, aiMult?: number }[]} */
  const defs = [
    { key: 'conservative', display: 'Conservative', target: span.min, sampling: 6, aiMult: 1 },
    { key: 'balanced', display: 'Balanced', target: balancedTarget, sampling: 5, recommended: true, aiMult: 1 },
    { key: 'aggressive', display: 'Aggressive', target: span.max, sampling: 4, aiMult: 1.5 },
  ]

  const out = []
  /** @type {Record<string, unknown> | null} */
  let balancedRollup = null

  for (const def of defs) {
    const constraints = {
      ...baseConstraints,
      target_span: def.target,
      sampling_rate_pct: def.sampling,
    }
    let podComposition = /** @type {Record<string, unknown>} */ (computePodComposition(constraints, engagement, tasks))
    if (def.aiMult && def.aiMult !== 1) {
      const ai = toNum(podComposition.ai_auditor_per_pod) * def.aiMult
      podComposition = {
        ...podComposition,
        ai_auditor_per_pod: ai,
        calculation_trace: {
          ...(typeof podComposition.calculation_trace === 'object' && podComposition.calculation_trace
            ? podComposition.calculation_trace
            : {}),
          aggressive_ai_auditor_multiplier: def.aiMult,
        },
      }
    }

    const vol = readEngagementVolumePerDay(engagement)
    const cap = toNum(podComposition.pod_capacity_per_day)
    const pods = computePodCount(vol, cap)
    const orgRollup = computeOrgRollup(podComposition, pods, engagement)

    if (def.key === 'balanced') {
      balancedRollup = orgRollup
    }

    out.push({
      variant_name: def.key,
      display_name: def.display,
      is_recommended: Boolean(def.recommended),
      constraints_used: constraints,
      pod_composition: podComposition,
      org_rollup: orgRollup,
      cost_index: 1.0, // filled in second pass
    })
  }

  const balancedHc =
    balancedRollup && typeof balancedRollup.total_headcount === 'number' && balancedRollup.total_headcount > 0
      ? balancedRollup.total_headcount
      : 1

  for (const row of out) {
    const rollup = /** @type {Record<string, unknown>} */ (row.org_rollup)
    const hc = toNum(rollup.total_headcount)
    row.cost_index = Math.round((hc / balancedHc) * 1000) / 1000
  }

  return out
}
