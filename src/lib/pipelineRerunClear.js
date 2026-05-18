import { supabase } from '../supabaseClient.js'

export const PIPELINE_RERUN_CONFIRM_MESSAGES = {
  f2: 'Re-running F2 will overwrite AI predictions and reset downstream features (F3, F4, F5, F6). Your task overrides will be preserved. Continue?',
  f3: 'Re-running F3 will overwrite roles and reset downstream features (F4, F5, F6). Continue?',
  f4: 'Re-running F4 will overwrite pod design and reset downstream features (F5, F6). Continue?',
  f5: 'Re-running F5 will overwrite economics and reset downstream feature (F6). Continue?',
  f6: 'Re-running F6 will overwrite the saved implementation timeline. Continue?',
}

/**
 * @param {string} engagementId
 */
export async function clearF6SavedState(engagementId) {
  await clearPipelineRunColumns(engagementId, {
    f6_timeline: null,
  })
}

const F2_AI_FIELDS = {
  ai_allocation: null,
  ai_confidence_raw: null,
  ai_confidence_calibrated: null,
  ai_primary_capability: null,
  ai_rationale: null,
  ai_risk_factors: null,
  ai_prerequisites: null,
}

/**
 * @param {string} engagementId
 * @param {Record<string, null>} patch
 */
async function clearPipelineRunColumns(engagementId, patch) {
  const { error } = await supabase.from('pipeline_runs').update(patch).eq('engagement_id', engagementId)
  if (error) throw new Error(error.message)
}

/**
 * Clear F2 AI task fields (preserve user_allocation / user_override_reason) and downstream pipeline data.
 *
 * @param {string} engagementId
 */
export async function clearF2SavedState(engagementId) {
  const { error: taskError } = await supabase
    .from('tasks')
    .update(F2_AI_FIELDS)
    .eq('engagement_id', engagementId)
  if (taskError) throw new Error(taskError.message)

  await clearPipelineRunColumns(engagementId, {
    f2_matrix: null,
    f3_roles: null,
    f4_pods: null,
    f5_economics: null,
    f6_timeline: null,
  })
}

/**
 * @param {string} engagementId
 */
export async function clearF3SavedState(engagementId) {
  await clearPipelineRunColumns(engagementId, {
    f3_roles: null,
    f4_pods: null,
    f5_economics: null,
    f6_timeline: null,
  })
}

/**
 * @param {string} engagementId
 */
export async function clearF4SavedState(engagementId) {
  await clearPipelineRunColumns(engagementId, {
    f4_pods: null,
    f5_economics: null,
    f6_timeline: null,
  })
}

/**
 * @param {string} engagementId
 */
export async function clearF5SavedState(engagementId) {
  await clearPipelineRunColumns(engagementId, {
    f5_economics: null,
    f6_timeline: null,
  })
}

/**
 * @param {'f2' | 'f3' | 'f4' | 'f5'} feature
 * @param {string} engagementId
 */
export async function clearPipelineFeatureForRerun(feature, engagementId) {
  switch (feature) {
    case 'f2':
      return clearF2SavedState(engagementId)
    case 'f3':
      return clearF3SavedState(engagementId)
    case 'f4':
      return clearF4SavedState(engagementId)
    case 'f5':
      return clearF5SavedState(engagementId)
    default:
      throw new Error(`Unknown rerun feature: ${feature}`)
  }
}
