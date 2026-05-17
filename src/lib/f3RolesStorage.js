/**
 * Canonical `pipeline_runs.f3_roles` JSONB shape.
 * Legacy rows may store only an array of role redesign entries; treat that as `redesigns`.
 *
 * @typedef {'pending' | 'accepted' | 'rejected'} F3AcceptanceStatus
 *
 * @typedef {{
 *   redesigns: Record<string, unknown>[],
 *   emergent_roles: Record<string, unknown>[],
 *   emergent_roles_meta?: Record<string, unknown> | null
 * }} F3RolesBundle
 */

/**
 * @param {unknown} raw
 * @returns {F3RolesBundle}
 */
export function normalizeF3Roles(raw) {
  if (raw == null) {
    return { redesigns: [], emergent_roles: [], emergent_roles_meta: null }
  }
  if (Array.isArray(raw)) {
    return {
      redesigns: raw.filter((x) => x && typeof x === 'object' && !Array.isArray(x)),
      emergent_roles: [],
      emergent_roles_meta: null,
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
    const emergent_roles_meta =
      o.emergent_roles_meta && typeof o.emergent_roles_meta === 'object' && !Array.isArray(o.emergent_roles_meta)
        ? /** @type {Record<string, unknown>} */ (o.emergent_roles_meta)
        : null
    return { redesigns, emergent_roles, emergent_roles_meta }
  }
  return { redesigns: [], emergent_roles: [], emergent_roles_meta: null }
}

/**
 * @param {unknown} row
 * @returns {F3AcceptanceStatus}
 */
export function getAcceptanceStatus(row) {
  if (!row || typeof row !== 'object') return 'pending'
  const s = /** @type {Record<string, unknown>} */ (row).acceptance_status
  if (s === 'accepted' || s === 'rejected' || s === 'pending') return s
  return 'pending'
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function withDefaultAcceptance(row) {
  if (getAcceptanceStatus(row) !== 'pending') return { ...row }
  return {
    ...row,
    acceptance_status: 'pending',
    accepted_at: row.accepted_at ?? null,
    rejected_at: row.rejected_at ?? null,
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {F3AcceptanceStatus} status
 * @returns {Record<string, unknown>}
 */
export function applyAcceptanceStatus(row, status) {
  const now = new Date().toISOString()
  if (status === 'accepted') {
    return {
      ...row,
      acceptance_status: 'accepted',
      accepted_at: now,
      rejected_at: null,
    }
  }
  if (status === 'rejected') {
    return {
      ...row,
      acceptance_status: 'rejected',
      rejected_at: now,
      accepted_at: null,
    }
  }
  return {
    ...row,
    acceptance_status: 'pending',
    accepted_at: null,
    rejected_at: null,
  }
}

/**
 * Index of the latest redesign row for a role (by generated_at).
 *
 * @param {Record<string, unknown>[]} redesignEntries
 * @param {string} roleName
 * @returns {number}
 */
export function findLatestRedesignIndex(redesignEntries, roleName) {
  const key = roleName.trim().toLowerCase()
  let latestIdx = -1
  let latestAt = ''
  redesignEntries.forEach((e, i) => {
    if (!e || typeof e !== 'object') return
    const rn = e.role_name
    if (typeof rn !== 'string' || rn.trim().toLowerCase() !== key) return
    const t = typeof e.generated_at === 'string' ? e.generated_at : ''
    if (latestIdx < 0 || t >= latestAt) {
      latestIdx = i
      latestAt = t
    }
  })
  return latestIdx
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
  /** @type {Record<string, unknown>} */
  const out = {
    redesigns: bundle.redesigns,
    emergent_roles: bundle.emergent_roles,
  }
  if (bundle.emergent_roles_meta != null && typeof bundle.emergent_roles_meta === 'object') {
    out.emergent_roles_meta = bundle.emergent_roles_meta
  } else if ('emergent_roles_meta' in bundle) {
    out.emergent_roles_meta = null
  }
  return out
}
