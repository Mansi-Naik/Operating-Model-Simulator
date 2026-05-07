/**
 * @typedef {{ reason: string, delta: number }} ConfidenceAdjustment
 */

/**
 * @typedef {{
 *   calibrated: number,
 *   breakdown: {
 *     llm_raw: number,
 *     adjustments: ConfidenceAdjustment[],
 *     final: number
 *   }
 * }} CalibratedConfidenceResult
 */

/**
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toFiniteNumberOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null
}

/**
 * Calibrates raw LLM confidence using data quality, readiness, and adoption signals.
 * Pure function: no mutations or side effects.
 *
 * @param {number} rawConfidence LLM-provided confidence in [0, 1].
 * @param {Record<string, any> | null | undefined} task Task context used for adjustments.
 * @param {Record<string, any> | null | undefined} engagement Engagement-level context used for adjustments.
 * @returns {CalibratedConfidenceResult}
 */
export function calibrateConfidence(rawConfidence, task, engagement) {
  const llmRaw = clamp01(rawConfidence)
  /** @type {ConfidenceAdjustment[]} */
  const adjustments = []

  const avgTime = task?.avg_time_minutes ?? null
  if (avgTime == null) {
    adjustments.push({ reason: "No time data", delta: -0.1 })
  }

  const volume = task?.volume_per_day ?? null
  if (volume == null) {
    adjustments.push({ reason: "No volume data", delta: -0.05 })
  }

  if (task?.data_logged === false) {
    adjustments.push({ reason: "Task not logged today", delta: -0.15 })
  }

  const readinessScore = toFiniteNumberOrNull(engagement?.readiness_score)
  if (readinessScore != null) {
    if (readinessScore < 50) {
      adjustments.push({ reason: "Low context readiness", delta: -0.2 })
    } else if (readinessScore < 75) {
      adjustments.push({ reason: "Medium context readiness", delta: -0.1 })
    }
  }

  const primaryCapability =
    task?.ai_primary_capability ?? task?.primary_capability ?? null
  const aiInUse =
    engagement?.intake_data?.tech_stack?.ai_in_use
  if (
    typeof primaryCapability === "string" &&
    Array.isArray(aiInUse) &&
    aiInUse.includes(primaryCapability)
  ) {
    adjustments.push({
      reason: "Capability already in production",
      delta: 0.1,
    })
  }

  const totalDelta = adjustments.reduce((sum, item) => sum + item.delta, 0)
  const finalValue = clamp01(llmRaw + totalDelta)

  return {
    calibrated: finalValue,
    breakdown: {
      llm_raw: llmRaw,
      adjustments,
      final: finalValue,
    },
  }
}
