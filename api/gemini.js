import { GoogleGenerativeAI } from '@google/generative-ai'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'

/** Name of the Gemini model used for completions. */
const MODEL_NAME = 'gemini-2.5-flash'

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
