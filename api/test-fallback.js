import callGemini from './_lib/geminiClient.js'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'

/**
 * POST /api/test-fallback — verify shared Gemini client (success path hits real API).
 * Body: `{ simulate?: 'success' | 'rpm_error' | 'rpd_error' | 'fatal' }`
 *
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin, { methods: 'POST, OPTIONS' })

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (origin && !resolveAllowedCorsOrigin(origin)) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }

  const started = Date.now()
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const simulate = typeof body.simulate === 'string' ? body.simulate : 'success'

  if (simulate !== 'success') {
    res.status(200).json({
      test_type: simulate,
      success: false,
      model_used: null,
      attempts: [],
      duration_ms: Date.now() - started,
      message:
        'Optional simulation modes are not wired. Use { "simulate": "success" } to run a minimal real Gemini call.',
    })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      test_type: simulate,
      success: false,
      error: 'Missing GEMINI_API_KEY',
      duration_ms: Date.now() - started,
    })
    return
  }

  try {
    const result = await callGemini(
      'Reply with exactly this JSON object and nothing else: {"result":"ok"}',
      {
        feature: 'f2_allocation',
        temperature: 0,
        response_mime_type: 'application/json',
        max_output_tokens: 256,
      },
    )

    res.status(200).json({
      test_type: simulate,
      success: true,
      model_used: result.model_used,
      attempts: result.attempts,
      duration_ms: result.total_duration_ms ?? Date.now() - started,
      response_preview: String(result.response_text ?? '').slice(0, 200),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      test_type: simulate,
      success: false,
      error: message,
      duration_ms: Date.now() - started,
    })
  }
}
