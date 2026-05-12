/**
 * Canonical `pipeline_runs.f3_roles` JSONB shape.
 * Legacy rows may store only an array of role redesign entries; treat that as `redesigns`.
 *
 * @typedef {{
 *   redesigns: Record<string, unknown>[],
 *   emergent_roles: Record<string, unknown>[]
 * }} F3RolesBundle
 */

/**
 * @param {unknown} raw
 * @returns {F3RolesBundle}
 */
export function normalizeF3Roles(raw) {
  if (raw == null) {
    return { redesigns: [], emergent_roles: [] }
  }
  if (Array.isArray(raw)) {
    return {
      redesigns: raw.filter((x) => x && typeof x === 'object' && !Array.isArray(x)),
      emergent_roles: [],
    }
  }
  if (typeof raw === 'object') {
    const o = /** @type {Record<string, unknown>} */ (raw)
    const redesigns = Array.isArray(o.redesigns)
      ? o.redesigns.filter((x) => x && typeof x === 'object' && !Array.isArray(x))
      : []
    const emergent_roles = Array.isArray(o.emergent_roles)
      ? o.emergent_roles.filter((x) => x && typeof x === 'object' && !Array.isArray(x))
      : []
    return { redesigns, emergent_roles }
  }
  return { redesigns: [], emergent_roles: [] }
}

/**
 * Keeps the latest redesign entry per `role_name` (by `generated_at` ISO string).
 *
 * @param {Record<string, unknown>[]} redesignEntries
 * @returns {Record<string, unknown>[]}
 */
export function dedupeLatestRedesignsByRole(redesignEntries) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byRole = new Map()
  for (const e of redesignEntries) {
    if (!e || typeof e !== 'object') continue
    const rn = e.role_name
    if (typeof rn !== 'string' || !rn.trim()) continue
    const key = rn.trim().toLowerCase()
    const prev = byRole.get(key)
    const t = typeof e.generated_at === 'string' ? e.generated_at : ''
    const pt = prev && typeof prev.generated_at === 'string' ? prev.generated_at : ''
    if (!prev || t >= pt) byRole.set(key, /** @type {Record<string, unknown>} */ (e))
  }
  return [...byRole.values()]
}

/**
 * JSONB payload for Supabase (object form).
 *
 * @param {F3RolesBundle} bundle
 * @returns {Record<string, unknown>}
 */
export function f3RolesToJsonb(bundle) {
  return {
    redesigns: bundle.redesigns,
    emergent_roles: bundle.emergent_roles,
  }
}
