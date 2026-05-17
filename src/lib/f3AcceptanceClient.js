import {
  applyAcceptanceStatus,
  f3RolesToJsonb,
  findLatestRedesignIndex,
  normalizeF3Roles,
} from './f3RolesStorage.js'
import { supabase } from '../supabaseClient.js'

/**
 * @typedef {'pending' | 'accepted' | 'rejected'} F3AcceptanceStatus
 */

/**
 * @param {string} engagementId
 * @returns {Promise<{ bundle: import('./f3RolesStorage.js').F3RolesBundle, pipelineRunId: string | null }>}
 */
async function loadF3Bundle(engagementId) {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('id, f3_roles')
    .eq('engagement_id', engagementId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const bundle = normalizeF3Roles(data?.f3_roles)
  return { bundle, pipelineRunId: data?.id ?? null }
}

/**
 * @param {string} engagementId
 * @param {import('./f3RolesStorage.js').F3RolesBundle} bundle
 * @param {string | null} pipelineRunId
 */
async function saveF3Bundle(engagementId, bundle, pipelineRunId) {
  const payload = f3RolesToJsonb(bundle)
  if (pipelineRunId) {
    const { error } = await supabase.from('pipeline_runs').update({ f3_roles: payload }).eq('id', pipelineRunId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('pipeline_runs').insert({
    engagement_id: engagementId,
    f3_roles: payload,
  })
  if (error) throw new Error(error.message)
}

/**
 * @param {Record<string, unknown>[]} redesigns
 * @param {string} roleName
 * @param {F3AcceptanceStatus} status
 * @returns {Record<string, unknown>[]}
 */
function patchRedesignAcceptance(redesigns, roleName, status) {
  const idx = findLatestRedesignIndex(redesigns, roleName)
  if (idx < 0) throw new Error(`No redesign found for role "${roleName}"`)
  const next = [...redesigns]
  next[idx] = applyAcceptanceStatus(/** @type {Record<string, unknown>} */ (next[idx]), status)
  return next
}

/**
 * @param {Record<string, unknown>[]} emergentRoles
 * @param {string} roleName
 * @param {F3AcceptanceStatus} status
 * @returns {Record<string, unknown>[]}
 */
function patchEmergentAcceptance(emergentRoles, roleName, status) {
  const key = roleName.trim().toLowerCase()
  let found = false
  const next = emergentRoles.map((row) => {
    const name = typeof row.name === 'string' ? row.name.trim().toLowerCase() : ''
    if (name === key) {
      found = true
      return applyAcceptanceStatus(row, status)
    }
    return row
  })
  if (!found) throw new Error(`No emergent role found for "${roleName}"`)
  return next
}

/**
 * @param {string} engagementId
 * @param {'redesign' | 'emergent'} kind
 * @param {string} roleName
 * @param {F3AcceptanceStatus} status
 */
export async function updateF3RoleAcceptance(engagementId, kind, roleName, status) {
  const { bundle, pipelineRunId } = await loadF3Bundle(engagementId)
  const next = { ...bundle }
  if (kind === 'redesign') {
    next.redesigns = patchRedesignAcceptance(bundle.redesigns, roleName, status)
  } else {
    next.emergent_roles = patchEmergentAcceptance(bundle.emergent_roles, roleName, status)
  }
  await saveF3Bundle(engagementId, next, pipelineRunId)
  return next
}

export { getAcceptanceStatus, withDefaultAcceptance } from './f3RolesStorage.js'
