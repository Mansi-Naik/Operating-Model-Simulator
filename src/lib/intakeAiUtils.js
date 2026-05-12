/**
 * Helpers for Gemini intake `_confidence` sibling keys on `intake_data`.
 *
 * @param {unknown} v
 * @returns {v is 'high' | 'medium' | 'low'}
 */
function isConfidenceLevel(v) {
  return v === 'high' || v === 'medium' || v === 'low'
}

/**
 * Deletes `parent[baseKey + '_confidence']` when present.
 *
 * @param {Record<string, unknown>} parent
 * @param {string} baseKey Field key without `_confidence` suffix (e.g. `client_name`)
 */
export function deleteSiblingConfidence(parent, baseKey) {
  if (!parent || typeof parent !== 'object') return
  const confKey = `${baseKey}_confidence`
  if (Object.prototype.hasOwnProperty.call(parent, confKey)) {
    delete parent[confKey]
  }
}

/**
 * Deep-clone via JSON (sufficient for plain intake objects).
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function cloneIntake(obj) {
  return JSON.parse(JSON.stringify(obj ?? {}))
}

/**
 * Removes `baseKey_confidence` on the parent object addressed by `dotPath` (without the base key).
 * Example: `engagement.client_name` → deletes `intake_data.engagement.client_name_confidence`.
 *
 * @param {Record<string, unknown>} intakeRoot
 * @param {string} dotPath path to the **value field** (not the `_confidence` key)
 */
export function removeConfidenceForIntakePath(intakeRoot, dotPath) {
  if (!intakeRoot || typeof intakeRoot !== 'object' || !dotPath) return
  const lastDot = dotPath.lastIndexOf('.')
  if (lastDot <= 0) return
  const parentPath = dotPath.slice(0, lastDot)
  const baseKey = dotPath.slice(lastDot + 1)
  if (!baseKey) return
  let cur = /** @type {unknown} */ (intakeRoot)
  for (const seg of parentPath.split('.')) {
    if (!cur || typeof cur !== 'object') return
    cur = /** @type {Record<string, unknown>} */ (cur)[seg]
  }
  if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
    deleteSiblingConfidence(/** @type {Record<string, unknown>} */ (cur), baseKey)
  }
}

/**
 * Walks `intake_data` using dotted paths with optional bracket indices, e.g.
 * `engagement.client_name`, `hierarchy[0].role`, `tech_stack.ai_in_use[0].capability`,
 * then deletes `{fieldKey}_confidence` on the resolved parent object.
 *
 * @param {Record<string, unknown>} intakeRoot
 * @param {string} path
 */
export function removeConfidenceAtFieldPath(intakeRoot, path) {
  if (!intakeRoot || typeof intakeRoot !== 'object' || typeof path !== 'string' || !path.trim()) return
  const segments = path.split('.')
  const fieldKey = segments.pop()
  if (!fieldKey || segments.length === 0) return
  let cur = /** @type {unknown} */ (intakeRoot)
  for (const seg of segments) {
    if (!cur || typeof cur !== 'object') return
    const bracket = /^([a-zA-Z0-9_]+)\[(\d+)\]$/.exec(seg)
    if (bracket) {
      const arr = /** @type {Record<string, unknown>} */ (cur)[bracket[1]]
      cur = Array.isArray(arr) ? arr[Number(bracket[2])] : undefined
    } else {
      cur = /** @type {Record<string, unknown>} */ (cur)[seg]
    }
  }
  if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
    deleteSiblingConfidence(/** @type {Record<string, unknown>} */ (cur), fieldKey)
  }
}

/**
 * Recursively removes every `*_confidence` key (high|medium|low tracking from extraction).
 *
 * @param {unknown} node
 */
export function stripAllConfidenceKeysDeep(node) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) {
      stripAllConfidenceKeysDeep(item)
    }
    return
  }
  const o = /** @type {Record<string, unknown>} */ (node)
  for (const k of Object.keys(o)) {
    if (k.endsWith('_confidence')) {
      delete o[k]
    }
  }
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v != null && typeof v === 'object') {
      stripAllConfidenceKeysDeep(v)
    }
  }
}

/**
 * @param {unknown} intakeData
 * @returns {Map<string, 'high' | 'medium' | 'low'>}
 */
export function collectAiConfidenceByFieldPath(intakeData) {
  /** @type {Map<string, 'high' | 'medium' | 'low'>} */
  const map = new Map()
  if (!intakeData || typeof intakeData !== 'object') return map

  function walk(node, prefix) {
    if (node == null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${prefix}[${i}]`))
      return
    }
    const o = /** @type {Record<string, unknown>} */ (node)
    for (const [k, v] of Object.entries(o)) {
      if (k.endsWith('_confidence') && isConfidenceLevel(v)) {
        const base = k.replace(/_confidence$/, '')
        const path = prefix ? `${prefix}.${base}` : base
        map.set(path, v)
      }
    }
    for (const [k, v] of Object.entries(o)) {
      if (k.endsWith('_confidence')) continue
      if (v != null && typeof v === 'object') {
        walk(v, prefix ? `${prefix}.${k}` : k)
      }
    }
  }

  walk(intakeData, '')
  return map
}
