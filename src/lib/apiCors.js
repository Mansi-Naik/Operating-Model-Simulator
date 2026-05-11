/**
 * CORS helpers for Vercel `/api/*` serverless handlers (browser fetch from the Vite SPA).
 *
 * Allowed origins (union — any match mirrors `Origin` in `Access-Control-Allow-Origin`):
 * - `http(s)://localhost`, `http(s)://127.0.0.1` (any port)
 * - `https://operating-model-simulator.vercel.app` (production; also matches `*.vercel.app` rule below)
 * - `https://*.vercel.app` (any Vercel deployment host, including branch previews)
 * - Plus any comma-separated entries in `ALLOWED_ORIGINS` (extra staging / custom domains)
 */

/**
 * @param {string} origin
 * @returns {boolean}
 */
function isLocalDevOrigin(origin) {
  try {
    const u = new URL(origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Production + Vercel preview URLs (HTTPS, hostname under `.vercel.app`).
 *
 * @param {string} origin
 * @returns {boolean}
 */
function isVercelDeploymentOrigin(origin) {
  try {
    const u = new URL(origin)
    if (u.protocol !== 'https:') return false
    return u.hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

/**
 * Returns the request `Origin` if it is allowed, otherwise `null`.
 * When non-null, echo this exact string in `Access-Control-Allow-Origin` (never `*` with credentials).
 *
 * @param {string | undefined} origin
 * @returns {string | null}
 */
export function resolveAllowedCorsOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null
  const trimmed = origin.trim()

  const envExtra =
    typeof process.env.ALLOWED_ORIGINS === 'string' && process.env.ALLOWED_ORIGINS.trim()
      ? process.env.ALLOWED_ORIGINS.split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  if (envExtra.includes(trimmed)) return trimmed
  if (isLocalDevOrigin(trimmed)) return trimmed
  if (isVercelDeploymentOrigin(trimmed)) return trimmed

  return null
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string | undefined} origin
 * @param {{ methods?: string }} [opts]
 */
export function applyCorsHeaders(res, origin, opts = {}) {
  const methods = opts.methods ?? 'POST, OPTIONS'
  const allow = resolveAllowedCorsOrigin(origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow)
    res.setHeader('Vary', 'Origin')
  }
}
