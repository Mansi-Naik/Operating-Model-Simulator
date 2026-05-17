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
 * @param {Record<string, unknown>[]} tasks
 * @returns {boolean}
 */
export function tasksHaveF2Allocations(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return false
  return tasks.some((t) => {
    if (!t || typeof t !== 'object') return false
    const ai = t.ai_allocation
    return ai != null && String(ai).trim().length > 0
  })
}
