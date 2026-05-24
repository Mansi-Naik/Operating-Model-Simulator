import { GoogleGenerativeAI } from '@google/generative-ai'

/** @typedef {'f1_extraction' | 'f1_re_extraction' | 'f2_allocation' | 'f3_role' | 'f3_emergent' | 'f4_variant_narrative' | 'f5_sensitivity' | 'f6_phase_narratives' | 'competitor_analysis'} GeminiFeature */

export const MODEL_CHAINS = {
  f1_extraction: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
  f1_re_extraction: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
  f2_allocation: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
  f3_role: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
  f3_emergent: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
  f4_variant_narrative: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
  f5_sensitivity: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
  f6_phase_narratives: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
  competitor_analysis: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
}

export const DEFAULT_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

/**
 * @param {unknown} error
 * @returns {'rpd_exceeded' | 'rpm_exceeded' | 'server_error' | 'client_error' | 'unknown'}
 */
export function classifyError(error) {
  const message = String(error?.message ?? '')
  const status = error?.status ?? error?.statusCode ?? error?.code
  const num =
    typeof status === 'number'
      ? status
      : typeof status === 'string' && /^\d+$/.test(status.trim())
        ? Number(status.trim())
        : NaN

  if (num === 429 || message.includes('429')) {
    const ml = message.toLowerCase()
    if (ml.includes('rpd') || ml.includes('per day') || ml.includes('daily')) {
      return 'rpd_exceeded'
    }
    if (
      ml.includes('rpm') ||
      ml.includes('per minute') ||
      ml.includes('tpm') ||
      ml.includes('tokens per minute')
    ) {
      return 'rpm_exceeded'
    }
    return 'rpm_exceeded'
  }

  if (Number.isFinite(num) && num >= 500 && num < 600) return 'server_error'
  if (Number.isFinite(num) && num >= 400 && num < 500) return 'client_error'
  if (/fetch failed|network|econnreset|etimedout|timeout|timed out/i.test(message)) return 'server_error'
  return 'unknown'
}

/**
 * @param {number} attemptNumber
 * @returns {Promise<number>} delay applied (ms)
 */
export async function backoffDelay(attemptNumber) {
  const baseMs = Math.pow(2, attemptNumber) * 1000
  const jitter = baseMs * (Math.random() * 0.5 - 0.25)
  const totalMs = baseMs + jitter
  const cappedMs = Math.min(totalMs, 10000)
  await new Promise((resolve) => setTimeout(resolve, cappedMs))
  return cappedMs
}

/**
 * @param {import('@google/generative-ai').GenerativeModel} modelInstance
 * @param {string} prompt
 * @returns {Promise<{ text: string, usageMetadata: import('@google/generative-ai').UsageMetadata | null }>}
 */
async function callSingleModel(modelInstance, prompt) {
  const result = await modelInstance.generateContent(prompt)
  const response = result.response
  const text = typeof response?.text === 'function' ? response.text() : ''
  const usageMetadata = response?.usageMetadata ?? null
  return { text, usageMetadata }
}

/**
 * @param {string} model
 * @param {string} prompt
 * @param {{
 *   temperature?: number,
 *   response_mime_type?: string,
 *   max_output_tokens?: number,
 * }} options
 */
function buildModelInstance(model, options) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const err = new Error('Missing GEMINI_API_KEY')
    /** @type {any} */ (err).status = 500
    throw err
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  /** @type {Record<string, unknown>} */
  const generationConfig = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: options.max_output_tokens ?? 4096,
  }
  if (options.response_mime_type) {
    generationConfig.responseMimeType = options.response_mime_type
  }
  return genAI.getGenerativeModel({
    model,
    generationConfig: /** @type {import('@google/generative-ai').GenerationConfig} */ (generationConfig),
  })
}

/**
 * @param {unknown} usage
 * @returns {{ prompt_tokens: number | null, completion_tokens: number | null, total_tokens: number | null }}
 */
export function usageFromMetadata(usage) {
  if (!usage || typeof usage !== 'object') {
    return { prompt_tokens: null, completion_tokens: null, total_tokens: null }
  }
  const u = /** @type {Record<string, unknown>} */ (usage)
  return {
    prompt_tokens: typeof u.promptTokenCount === 'number' ? u.promptTokenCount : null,
    completion_tokens: typeof u.candidatesTokenCount === 'number' ? u.candidatesTokenCount : null,
    total_tokens: typeof u.totalTokenCount === 'number' ? u.totalTokenCount : null,
  }
}

/**
 * @param {unknown} attempts
 * @param {string | null} [baseMessage]
 * @returns {string | null}
 */
export function appendAttemptsToErrorMessage(attempts, baseMessage) {
  if (!Array.isArray(attempts) || attempts.length <= 1) return baseMessage ?? null
  const summary = JSON.stringify(attempts)
  const suffix = summary.length > 3500 ? `${summary.slice(0, 3500)}…` : summary
  if (!baseMessage) return `gemini_attempts: ${suffix}`
  return `${baseMessage} | gemini_attempts: ${suffix}`
}

/**
 * Fields for `llm_call_logs` rows after a Gemini call.
 *
 * @param {Awaited<ReturnType<typeof callGemini>> | null} geminiResult
 * @param {{ errorMessage?: string | null, durationFallbackMs?: number | null }} [opts]
 */
export function geminiLogExtras(geminiResult, opts = {}) {
  const attempts = geminiResult?.attempts ?? []
  const { errorMessage = null, durationFallbackMs = null } = opts
  return {
    model: geminiResult?.model_used ?? DEFAULT_CHAIN[0],
    duration_ms: geminiResult?.total_duration_ms ?? durationFallbackMs ?? null,
    fallback_occurred: attempts.length > 1,
    fallback_attempts: attempts.length > 1 ? attempts : null,
    error_message: appendAttemptsToErrorMessage(attempts, errorMessage),
    prompt_tokens: geminiResult?.prompt_tokens ?? null,
    completion_tokens: geminiResult?.completion_tokens ?? null,
    total_tokens: geminiResult?.total_tokens ?? null,
  }
}

/**
 * @param {string} prompt
 * @param {{
 *   feature: GeminiFeature,
 *   temperature?: number,
 *   response_mime_type?: string,
 *   max_output_tokens?: number,
 * }} options
 * @returns {Promise<{
 *   response_text: string,
 *   model_used: string,
 *   attempts: Array<Record<string, unknown>>,
 *   total_duration_ms: number,
 *   usage_metadata: import('@google/generative-ai').UsageMetadata | null,
 *   prompt_tokens: number | null,
 *   completion_tokens: number | null,
 *   total_tokens: number | null,
 * }>}
 */
export default async function callGemini(prompt, options) {
  const chain = MODEL_CHAINS[/** @type {string} */ (options.feature)] || DEFAULT_CHAIN
  const startTime = Date.now()
  /** @type {Array<Record<string, unknown>>} */
  const attempts = []

  for (let modelIdx = 0; modelIdx < chain.length; modelIdx++) {
    const model = chain[modelIdx]
    const maxRetriesForThisModel = 3

    for (let retry = 0; retry < maxRetriesForThisModel; retry++) {
      try {
        if (retry === 0 && modelIdx === 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 200))
        }

        const modelInstance = buildModelInstance(model, {
          temperature: options.temperature,
          response_mime_type: options.response_mime_type,
          max_output_tokens: options.max_output_tokens,
        })
        const { text, usageMetadata } = await callSingleModel(modelInstance, prompt)

        attempts.push({ model, retry, status: 'success' })

        const tokens = usageFromMetadata(usageMetadata)
        return {
          response_text: text,
          model_used: model,
          attempts,
          total_duration_ms: Date.now() - startTime,
          usage_metadata: usageMetadata,
          prompt_tokens: tokens.prompt_tokens,
          completion_tokens: tokens.completion_tokens,
          total_tokens: tokens.total_tokens,
        }
      } catch (error) {
        const errorType = classifyError(error)
        const msg = error instanceof Error ? error.message : String(error)
        attempts.push({
          model,
          retry,
          status: 'error',
          errorType,
          message: msg,
        })

        if (errorType === 'rpd_exceeded') {
          console.warn(`[Gemini] ${model} RPD exhausted, falling back`)
          break
        }

        if (errorType === 'rpm_exceeded') {
          if (retry < maxRetriesForThisModel - 1) {
            const delay = await backoffDelay(retry)
            console.warn(`[Gemini] ${model} ${errorType}, retry ${retry + 1} after ${Math.round(delay)}ms`)
            continue
          }
          break
        }

        if (errorType === 'server_error') {
          if (retry < 1) {
            const delay = await backoffDelay(retry)
            console.warn(`[Gemini] ${model} ${errorType}, retry ${retry + 1} after ${Math.round(delay)}ms`)
            continue
          }
          break
        }

        if (errorType === 'client_error' || errorType === 'unknown') {
          throw error
        }
        console.warn(`[Gemini] ${model} unclassified errorType=${errorType}, treating as fatal`)
        throw error
      }
    }
  }

  const allModels = chain.join(', ')
  throw new Error(
    `[Gemini] All models exhausted (tried: ${allModels}). ` +
      `Free tier quota likely exceeded. Try again after midnight Pacific time.`,
  )
}
