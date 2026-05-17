import { getFinalAllocation } from './roleAggregation.js'

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function hasMeaningfulJson(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0 && value.trim() !== '{}'
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(/** @type {object} */ (value)).length > 0
  return false
}

/**
 * @returns {boolean}
 */
export function isForceRerun() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('forceRerun') === 'true'
}

/**
 * @param {boolean} enabled
 */
export function setForceRerunFlag(enabled) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (enabled) url.searchParams.set('forceRerun', 'true')
  else url.searchParams.delete('forceRerun')
  window.history.replaceState({}, '', url.toString())
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {string}
 */
export function taskStableKey(task) {
  if (!task || typeof task !== 'object') return ''
  const tid = task.task_id != null ? String(task.task_id).trim() : ''
  if (tid) return `id:${tid}`
  const name = task.task_name != null ? String(task.task_name).trim().toLowerCase() : ''
  return name ? `name:${name}` : ''
}

/** Fields produced by F2 allocation — preserved when intake tasks are re-saved. */
export const F2_TASK_PRESERVE_FIELDS = [
  'user_allocation',
  'user_override_reason',
  'ai_allocation',
  'ai_confidence_raw',
  'ai_confidence_calibrated',
  'ai_primary_capability',
  'ai_rationale',
  'ai_risk_factors',
  'ai_prerequisites',
]

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {Record<string, unknown>}
 */
export function pickF2TaskFields(task) {
  if (!task || typeof task !== 'object') return {}
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const key of F2_TASK_PRESERVE_FIELDS) {
    if (task[key] != null && task[key] !== '') out[key] = task[key]
  }
  return out
}

/**
 * @param {Record<string, unknown>[]} tasks
 * @returns {boolean}
 */
export function tasksHaveF2Allocations(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return false
  return tasks.some((t) => getFinalAllocation(t).length > 0)
}

/**
 * @param {Record<string, unknown>[]} tasks
 * @returns {boolean}
 */
export function tasksFullyAllocated(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return false
  return tasks.every((t) => getFinalAllocation(t).length > 0)
}

/**
 * @param {Record<string, unknown>[]} existingTasks
 * @returns {Map<string, Record<string, unknown>>}
 */
export function buildF2PreserveMap(existingTasks) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map()
  if (!Array.isArray(existingTasks)) return map
  for (const task of existingTasks) {
    const key = taskStableKey(task)
    const fields = pickF2TaskFields(task)
    if (key && Object.keys(fields).length > 0) map.set(key, fields)
  }
  return map
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<string, Record<string, unknown>>} preserveMap
 * @returns {Record<string, unknown>}
 */
export function mergePreservedF2Fields(row, preserveMap) {
  const key = taskStableKey(row)
  if (!key) return row
  const preserved = preserveMap.get(key)
  if (!preserved) return row
  return { ...row, ...preserved }
}
