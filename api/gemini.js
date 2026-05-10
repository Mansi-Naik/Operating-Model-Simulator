import { GoogleGenerativeAI } from '@google/generative-ai'

/** Name of the Gemini model used for completions. */
const MODEL_NAME = 'gemini-2.5-flash'

/**
 * Decide which `Origin` header value may receive `Access-Control-Allow-Origin`.
 * When `ALLOWED_ORIGINS` is set (comma-separated), only listed origins match.
 * When unset, `localhost` / `127.0.0.1` HTTP(S) origins are allowed for local dev.
 *
 * @param {string | undefined} origin Request `Origin` header.
 * @returns {string | null} Origin to mirror in CORS headers, or `null` if disallowed.
 */
function resolveAllowedCorsOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null
  const whitelist = process.env.ALLOWED_ORIGINS
  if (whitelist?.trim()) {
    const ok = whitelist
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(origin)
    return ok ? origin : null
  }
  try {
    const u = new URL(origin)
    const hostOk =
      u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    const schemeOk = u.protocol === 'http:' || u.protocol === 'https:'
    return hostOk && schemeOk ? origin : null
  } catch {
    return null
  }
}

/**
 * Set common CORS response headers when the caller's origin is allowed.
 *
 * @param {import('http').ServerResponse} res
 * @param {string | undefined} origin Request `Origin` header.
 */
function applyCorsHeaders(res, origin) {
  const allow = resolveAllowedCorsOrigin(origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow)
    res.setHeader('Vary', 'Origin')
  }
}

/**
 * `POST /api/gemini` — JSON `{ prompt: string }`, returns `{ response: string }`.
 * Handles `OPTIONS` for CORS preflight. Errors respond with `{ error: string }`.
 *
 * Requires `GEMINI_API_KEY` (server-side only).
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  const origin =
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
    return
  }

  /** @type {unknown} */
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const prompt = /** @type {{ prompt?: unknown }} */ (body).prompt
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Missing or invalid "prompt" (non-empty string required)' })
    return
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })
    const geminiResponse = await model.generateContent(prompt.trim())
    const text = geminiResponse.response?.text()

    if (typeof text !== 'string') {
      res.status(500).json({ error: 'Empty or invalid Gemini response' })
      return
    }

    res.status(200).json({ response: text })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error'
    res.status(500).json({ error: message })
  }
}
