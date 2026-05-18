import { useCallback, useEffect, useState } from 'react'
import { dedupeLatestRedesignsByRole, normalizeF3Roles } from '../lib/f3RolesStorage.js'
import {
  hasMeaningfulJson,
  tasksFullyAllocated,
  tasksHaveAiAllocations,
  tasksHaveF2Allocations,
} from '../lib/pipelineCacheUtils.js'
import { supabase } from '../supabaseClient.js'

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
function asObj(raw) {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? /** @type {Record<string, unknown>} */ (parsed)
        : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return /** @type {Record<string, unknown>} */ (raw)
  return {}
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
function parseF4Pods(raw) {
  const o = asObj(raw)
  return Object.keys(o).length > 0 ? o : null
}

/**
 * @param {Record<string, unknown> | null} f4
 * @returns {boolean}
 */
function f4SelectionExists(f4) {
  if (!f4) return false
  const name = f4.selected_variant_name
  const variants = f4.all_variants
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    Array.isArray(variants) &&
    variants.length > 0
  )
}

/**
 * @param {Record<string, unknown> | null} f3Bundle
 * @returns {boolean}
 */
function f3RolesExist(f3Bundle) {
  if (!f3Bundle) return false
  const redesigns = dedupeLatestRedesignsByRole(
    Array.isArray(f3Bundle.redesigns) ? f3Bundle.redesigns : [],
  )
  const emergent = Array.isArray(f3Bundle.emergent_roles) ? f3Bundle.emergent_roles : []
  return redesigns.length > 0 || emergent.length > 0
}

/**
 * @param {Record<string, unknown> | null} f5
 * @returns {boolean}
 */
function f5EconomicsExist(f5) {
  if (!f5) return false
  return hasMeaningfulJson(f5.economics_result)
}

/**
 * @param {Record<string, unknown> | null} f6
 * @returns {boolean}
 */
function f6TimelineExist(f6) {
  if (!f6) return false
  if (hasMeaningfulJson(f6.phases) && /** @type {unknown[]} */ (f6.phases).length > 0) return true
  if (hasMeaningfulJson(f6.graph)) return true
  return hasMeaningfulJson(f6.summary)
}

const EMPTY_STATE = {
  isLoading: true,
  f2_exists: false,
  f2_complete: false,
  f3_exists: false,
  f4_exists: false,
  f5_exists: false,
  f6_exists: false,
  f2_data: null,
  f3_data: null,
  f4_data: null,
  f5_data: null,
  f6_data: null,
}

/**
 * Read-only pipeline cache for an engagement (F2–F6 saved outputs).
 *
 * @param {string | null | undefined} engagementId
 */
export function usePipelineRuns(engagementId) {
  const [state, setState] = useState(EMPTY_STATE)

  const refresh = useCallback(async () => {
    if (!engagementId || typeof engagementId !== 'string') {
      setState({ ...EMPTY_STATE, isLoading: false })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const [pipelineRes, tasksRes] = await Promise.all([
        supabase
          .from('pipeline_runs')
          .select('f2_matrix, f3_roles, f4_pods, f5_economics, f6_timeline')
          .eq('engagement_id', engagementId)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select(
            'id, task_id, task_name, role_performing, ai_allocation, user_allocation, ai_confidence_calibrated, ai_confidence_raw, regulatory_constraint, consequence_of_error',
          )
          .eq('engagement_id', engagementId),
      ])

      if (pipelineRes.error) throw new Error(pipelineRes.error.message)
      if (tasksRes.error) throw new Error(tasksRes.error.message)

      const row = pipelineRes.data
      const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : []

      const f2FromMatrix = hasMeaningfulJson(row?.f2_matrix) ? asObj(row.f2_matrix) : null
      const f2FromTasks = tasksHaveAiAllocations(tasks)
      const f2_exists = f2FromMatrix != null || f2FromTasks
      const f2_complete = f2FromMatrix != null || tasksFullyAllocated(tasks)
      /** @type {Record<string, unknown> | null} */
      const f2_data = f2_exists
        ? {
            source: f2FromMatrix ? 'f2_matrix' : 'tasks',
            matrix: f2FromMatrix,
            tasks,
          }
        : null

      const f3Bundle = normalizeF3Roles(row?.f3_roles)
      const f3_exists = f3RolesExist(f3Bundle)
      const f3_data = f3_exists ? { ...f3Bundle } : null

      const f4_data = parseF4Pods(row?.f4_pods)
      const f4_exists = f4SelectionExists(f4_data)

      const f5_data = asObj(row?.f5_economics)
      const f5_exists = f5EconomicsExist(Object.keys(f5_data).length > 0 ? f5_data : null)

      const f6_data = asObj(row?.f6_timeline)
      const f6_exists = f6TimelineExist(Object.keys(f6_data).length > 0 ? f6_data : null)

      setState({
        isLoading: false,
        f2_exists,
        f2_complete,
        f3_exists,
        f4_exists,
        f5_exists,
        f6_exists,
        f2_data,
        f3_data,
        f4_data,
        f5_data: f5_exists ? f5_data : null,
        f6_data: f6_exists ? f6_data : null,
      })
    } catch {
      setState({ ...EMPTY_STATE, isLoading: false })
    }
  }, [engagementId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
