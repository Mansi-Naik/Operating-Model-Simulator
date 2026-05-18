import { useCallback, useEffect, useRef } from 'react'
import { usePipelineRuns } from './usePipelineRuns.js'

/** @typedef {'f2' | 'f3' | 'f4' | 'f5' | 'f6'} PipelineFeature */

/**
 * @param {PipelineFeature} feature
 * @param {ReturnType<typeof usePipelineRuns>} pipeline
 * @returns {boolean}
 */
export function pipelineFeatureExists(feature, pipeline) {
  switch (feature) {
    case 'f2':
      return pipeline.f2_exists
    case 'f3':
      return pipeline.f3_exists
    case 'f4':
      return pipeline.f4_exists
    case 'f5':
      return pipeline.f5_exists
    case 'f6':
      return pipeline.f6_exists
    default:
      return false
  }
}

/**
 * @param {PipelineFeature} feature
 * @param {string | null | undefined} engagementId
 */
export function usePipelineCacheEntry(feature, engagementId) {
  const pipeline = usePipelineRuns(engagementId ?? null)
  const exists = pipelineFeatureExists(feature, pipeline)
  const hasCachedResults = !pipeline.isLoading && exists

  return {
    pipeline,
    exists,
    hasCachedResults,
    isLoading: pipeline.isLoading,
    refresh: pipeline.refresh,
  }
}

/**
 * On feature mount (or engagement change), jump to saved results when cache exists.
 * Does not re-fire when the user navigates to pre-run within the same mount.
 *
 * @param {PipelineFeature} feature
 * @param {string | null | undefined} engagementId
 * @param {() => void} onRedirect
 * @param {{ enabled?: boolean }} [options]
 */
export function useMountPipelineCacheRedirect(feature, engagementId, onRedirect, options = {}) {
  const { enabled = true } = options
  const { hasCachedResults, isLoading } = usePipelineCacheEntry(feature, engagementId)
  const appliedRef = useRef(false)

  useEffect(() => {
    appliedRef.current = false
  }, [engagementId, enabled])

  useEffect(() => {
    if (!hasCachedResults) {
      appliedRef.current = false
    }
  }, [hasCachedResults])

  useEffect(() => {
    if (!enabled || isLoading || !hasCachedResults || appliedRef.current) return
    appliedRef.current = true
    onRedirect()
  }, [engagementId, enabled, isLoading, hasCachedResults, onRedirect])
}

/**
 * @param {PipelineFeature} feature
 * @param {string | null | undefined} engagementId
 * @returns {() => boolean}
 */
export function useShouldBlockGeneration(feature, engagementId) {
  const { exists, isLoading } = usePipelineCacheEntry(feature, engagementId)
  return useCallback(() => !isLoading && exists, [exists, isLoading])
}
