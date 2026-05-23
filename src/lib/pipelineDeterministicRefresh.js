/**
 * @fileoverview Recompute deterministic pipeline outputs from current F1 intake + upstream data.
 * Preserves LLM-generated fields (narratives, etc.) and persists when math changes.
 */

import { aggregateByRole } from './roleAggregation.js'
import { generateThreeVariants } from './podSizing.js'
import { normalizeF3Roles } from './f3RolesStorage.js'
import { runFullEconomics } from './economicsEngine.js'
import { CAPABILITY_LIBRARY } from './capabilityLibrary.js'
import {
  buildDependencyGraph,
  computeCriticalPath,
  computeTimelineSummary,
  groupNodesIntoPhases,
  identifyQuickWins,
} from './timelineEngine.js'
import { supabase } from '../supabaseClient.js'

const INTAKE_CHANGE_TOLERANCE_MS = 30_000

/**
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (value === undefined) return 'null'
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const keys = Object.keys(/** @type {Record<string, unknown>} */ (value)).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(/** @type {Record<string, unknown>} */ (value)[k])}`).join(',')}}`
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deterministicJsonEqual(a, b) {
  return stableStringify(a) === stableStringify(b)
}

/**
 * @param {unknown} iso
 * @returns {number | null}
 */
export function parseTimestampMs(iso) {
  if (iso == null || iso === '') return null
  const t = new Date(String(iso)).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * True when engagement intake was saved after the pipeline row was first created (F2 proxy).
 *
 * @param {unknown} engagementUpdatedAt
 * @param {unknown} pipelineCreatedAt
 * @param {number} [toleranceMs]
 */
export function intakeChangedSincePipelineCreated(
  engagementUpdatedAt,
  pipelineCreatedAt,
  toleranceMs = INTAKE_CHANGE_TOLERANCE_MS,
) {
  const eng = parseTimestampMs(engagementUpdatedAt)
  const pipe = parseTimestampMs(pipelineCreatedAt)
  if (eng == null || pipe == null) return false
  return eng > pipe + toleranceMs
}

/**
 * @param {string} engagementId
 * @param {string} column
 * @param {unknown} payload
 */
export async function persistPipelineColumn(engagementId, column, payload) {
  const { data: row, error: selErr } = await supabase
    .from('pipeline_runs')
    .select('id')
    .eq('engagement_id', engagementId)
    .maybeSingle()

  if (selErr) return { ok: false, error: selErr.message }

  if (row?.id) {
    const { error } = await supabase.from('pipeline_runs').update({ [column]: payload }).eq('id', row.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, pipelineId: row.id }
  }

  const { data: ins, error: insErr } = await supabase
    .from('pipeline_runs')
    .insert({ engagement_id: engagementId, [column]: payload })
    .select('id')
    .maybeSingle()

  if (insErr) return { ok: false, error: insErr.message }
  return { ok: true, pipelineId: typeof ins?.id === 'string' ? ins.id : null }
}

/**
 * Stable signature of F1 preference fields that drive F5 economics (billing, margin, transition).
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {string}
 */
export function f5IntakePreferencesSignature(engagement) {
  const intake =
    engagement?.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const prefs =
    intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
      ? /** @type {Record<string, unknown>} */ (intake.preferences)
      : {}
  const eng =
    intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
      ? /** @type {Record<string, unknown>} */ (intake.engagement)
      : {}
  const hierarchy = Array.isArray(intake.hierarchy) ? intake.hierarchy : []
  const hierarchySig = hierarchy
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const r = /** @type {Record<string, unknown>} */ (row)
      return {
        role: r.role ?? r.role_name ?? r.name ?? null,
        headcount: r.headcount ?? r.current_headcount ?? null,
        cost: r.cost ?? r.cost_per_fte ?? r.monthly_cost_per_fte ?? null,
      }
    })
    .sort((a, b) => String(a.role).localeCompare(String(b.role)))

  return stableStringify({
    billing_model: prefs.billing_model ?? null,
    margin_profile: prefs.margin_profile ?? null,
    expected_implementation_months: prefs.expected_implementation_months ?? null,
    months_to_steady_state: prefs.months_to_steady_state ?? null,
    tech_build_cost_estimate: prefs.tech_build_cost_estimate ?? null,
    retraining_cost_per_fte: prefs.retraining_cost_per_fte ?? null,
    currency: prefs.currency ?? null,
    automation_appetite: prefs.automation_appetite ?? null,
    risk_tolerance: prefs.risk_tolerance ?? null,
    volume_per_day: eng.volume_per_day ?? intake.volume_per_day ?? null,
    volume_per_month: eng.volume_per_month ?? intake.volume_per_month ?? null,
    hierarchy: hierarchySig,
    engagement_updated_at:
      typeof engagement?.updated_at === 'string' ? engagement.updated_at : null,
  })
}

/**
 * @param {Record<string, unknown> | null | undefined} cached
 * @param {Record<string, unknown>} freshResult
 * @param {Record<string, unknown>} assumptionsUsed
 * @param {string} selectedVariantName
 * @param {string | null | undefined} sensitivityNarrative
 * @param {string | null | undefined} intakeSignature
 */
export function buildF5EconomicsPayload(
  cached,
  freshResult,
  assumptionsUsed,
  selectedVariantName,
  sensitivityNarrative,
  intakeSignature = null,
) {
  const prev = cached && typeof cached === 'object' && !Array.isArray(cached) ? cached : {}
  const out = {
    ...prev,
    selected_variant_at_compute: selectedVariantName,
    assumptions_used: assumptionsUsed,
    economics_result: freshResult,
    computed_at: new Date().toISOString(),
    intake_signature_at_compute: intakeSignature ?? null,
  }
  if (typeof sensitivityNarrative === 'string' && sensitivityNarrative.trim()) {
    out.sensitivity_narrative = sensitivityNarrative.trim()
  }
  return out
}

/**
 * Strip LLM narrative from f5 payload for deterministic comparison.
 *
 * @param {unknown} payload
 */
export function stripF5NarrativeFields(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const o = /** @type {Record<string, unknown>} */ ({ ...payload })
  delete o.sensitivity_narrative
  return o
}

/**
 * @param {Record<string, unknown>} variant
 */
export function stripVariantNarrative(variant) {
  const { narrative, ...rest } = variant
  void narrative
  return rest
}

/**
 * @param {Record<string, unknown>[]} freshVariants
 * @param {Record<string, unknown> | null | undefined} cachedPods
 * @param {Record<string, unknown>} constraintsUsed
 * @param {string | null | undefined} selectedVariantName
 */
export function mergeF4PodsWithCachedNarratives(freshVariants, cachedPods, constraintsUsed, selectedVariantName) {
  const cached =
    cachedPods && typeof cachedPods === 'object' && !Array.isArray(cachedPods) ? cachedPods : {}
  const cachedVariants = Array.isArray(cached.all_variants) ? cached.all_variants : []
  const narrativeByName = new Map()
  for (const v of cachedVariants) {
    if (!v || typeof v !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (v)
    const name = String(row.variant_name ?? '').toLowerCase()
    const n = typeof row.narrative === 'string' ? row.narrative.trim() : ''
    if (name && n) narrativeByName.set(name, n)
  }

  const all_variants = freshVariants.map((raw) => {
    const v = /** @type {Record<string, unknown>} */ ({ ...raw })
    const name = String(v.variant_name ?? '').toLowerCase()
    const cachedNarrative = narrativeByName.get(name)
    if (cachedNarrative) {
      v.narrative = cachedNarrative
    } else if (typeof v.narrative !== 'string' || !v.narrative) {
      v.narrative = 'Industry-typical configuration'
    }
    return v
  })

  const selected =
    typeof selectedVariantName === 'string' && selectedVariantName.trim()
      ? selectedVariantName.trim().toLowerCase()
      : typeof cached.selected_variant_name === 'string'
        ? cached.selected_variant_name
        : null

  return {
    ...cached,
    selected_variant_name: selected,
    all_variants,
    constraints_used: constraintsUsed,
    selected_at: cached.selected_at ?? new Date().toISOString(),
  }
}

/**
 * Deterministic slice of f4_pods for equality checks (no narratives).
 *
 * @param {unknown} pods
 */
export function f4PodsDeterministicSnapshot(pods) {
  if (!pods || typeof pods !== 'object' || Array.isArray(pods)) return null
  const o = /** @type {Record<string, unknown>} */ (pods)
  const variants = Array.isArray(o.all_variants)
    ? o.all_variants.map((v) => (v && typeof v === 'object' ? stripVariantNarrative(/** @type {Record<string, unknown>} */ (v)) : v))
    : []
  return {
    selected_variant_name: o.selected_variant_name ?? null,
    constraints_used: o.constraints_used ?? null,
    all_variants: variants,
  }
}

/**
 * @param {string} roleKey
 */
function normalizeRoleKey(roleKey) {
  return String(roleKey ?? '')
    .trim()
    .toLowerCase()
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {ReturnType<typeof aggregateByRole>} aggregates
 */
export function refreshF3DeterministicFields(bundle, aggregates) {
  const aggByKey = new Map(
    aggregates.map((a) => [normalizeRoleKey(a.role_name), a]),
  )

  const redesigns = (Array.isArray(bundle.redesigns) ? bundle.redesigns : []).map((row) => {
    if (!row || typeof row !== 'object') return row
    const r = /** @type {Record<string, unknown>} */ ({ ...row })
    const key = normalizeRoleKey(r.role_name ?? r.name)
    const agg = aggByKey.get(key)
    if (!agg) return r
    return {
      ...r,
      time_freed_pct: agg.time_freed_pct,
      pattern: agg.pattern,
      total_tasks_today: agg.total_tasks_today,
      total_time_minutes_today: agg.total_time_minutes_today,
      current_time_split: agg.current_time_split,
    }
  })

  return {
    ...bundle,
    redesigns,
  }
}

/**
 * @param {unknown} bundle
 */
export function f3DeterministicSnapshot(bundle) {
  const b = normalizeF3Roles(bundle)
  const redesigns = b.redesigns.map((row) => {
    if (!row || typeof row !== 'object') return row
    const r = /** @type {Record<string, unknown>} */ (row)
    const {
      role_name,
      name,
      time_freed_pct,
      pattern,
      total_tasks_today,
      total_time_minutes_today,
      current_time_split,
      acceptance_status,
    } = r
    return {
      role_name,
      name,
      time_freed_pct,
      pattern,
      total_tasks_today,
      total_time_minutes_today,
      current_time_split,
      acceptance_status,
    }
  })
  return { redesigns, emergent_roles: b.emergent_roles }
}

/**
 * @param {unknown} timeline
 */
export function stripTimelinePhaseNarratives(timeline) {
  if (!timeline || typeof timeline !== 'object' || Array.isArray(timeline)) return null
  const t = /** @type {Record<string, unknown>} */ ({ ...timeline })
  if (Array.isArray(t.phases)) {
    t.phases = t.phases.map((p) => {
      if (!p || typeof p !== 'object') return p
      const phase = /** @type {Record<string, unknown>} */ ({ ...p })
      delete phase.narrative
      delete phase.description
      return phase
    })
  }
  return t
}

/**
 * @param {Record<string, unknown>[]} phases
 * @param {Record<string, unknown>[]} cachedPhases
 */
export function mergePhaseNarrativesFromCache(phases, cachedPhases) {
  const byPhaseId = new Map()
  for (const row of Array.isArray(cachedPhases) ? cachedPhases : []) {
    if (!row || typeof row !== 'object') continue
    const r = /** @type {Record<string, unknown>} */ (row)
    const narrative =
      typeof r.narrative === 'string' && r.narrative.trim()
        ? r.narrative.trim()
        : typeof r.description === 'string'
          ? r.description.trim()
          : ''
    if (narrative) byPhaseId.set(Number(r.phase_id), narrative)
  }

  return phases.map((phase) => {
    const phaseId = Number(phase.phase_id)
    const narrative = byPhaseId.get(phaseId)
    if (!narrative) return phase
    return { ...phase, narrative, description: narrative }
  })
}

/**
 * @param {Record<string, unknown>} engagement
 * @param {Record<string, unknown>[]} tasks
 * @param {Record<string, unknown>} f3RolesBundle
 */
export function recomputeF6TimelineDeterministic(engagement, tasks, f3RolesBundle) {
  const enrichedEngagement = {
    ...engagement,
    tasks,
    f3_roles: f3RolesBundle,
    pipeline_runs: { f3_roles: f3RolesBundle },
  }
  const graph = buildDependencyGraph(tasks, CAPABILITY_LIBRARY, enrichedEngagement)
  const criticalPath = computeCriticalPath(graph)
  const phases = groupNodesIntoPhases(graph, criticalPath, enrichedEngagement)
  const quickWins = identifyQuickWins(graph, enrichedEngagement)
  const summary = computeTimelineSummary(phases, criticalPath, enrichedEngagement)
  return { graph, critical_path: criticalPath, phases, quick_wins: quickWins, summary }
}

/**
 * @param {Record<string, unknown> | null | undefined} cachedTimeline
 * @param {Record<string, unknown>} deterministic
 */
export function mergeF6TimelineWithCachedNarratives(cachedTimeline, deterministic) {
  const cached =
    cachedTimeline && typeof cachedTimeline === 'object' && !Array.isArray(cachedTimeline)
      ? cachedTimeline
      : {}
  const cachedPhases = Array.isArray(cached.phases) ? cached.phases : []
  const phasesWithNarratives = deterministic.phases.map((phase) => {
    const phaseId = Number(phase.phase_id)
    const match = cachedPhases.find((p) => Number(/** @type {Record<string, unknown>} */ (p).phase_id) === phaseId)
    if (!match || typeof match !== 'object') return phase
    const m = /** @type {Record<string, unknown>} */ (match)
    const narrative =
      typeof m.narrative === 'string' && m.narrative.trim()
        ? m.narrative
        : typeof m.description === 'string'
          ? m.description
          : ''
    if (!narrative) return phase
    return { ...phase, narrative, description: narrative }
  })

  return {
    ...cached,
    graph: deterministic.graph,
    critical_path: deterministic.critical_path,
    phases: phasesWithNarratives,
    quick_wins: deterministic.quick_wins,
    summary: deterministic.summary,
    generated_at: cached.generated_at ?? new Date().toISOString(),
    recomputed_at: new Date().toISOString(),
  }
}

export { runFullEconomics, generateThreeVariants, aggregateByRole, normalizeF3Roles }
