/**
 * Pre-fetch and cache logos as base64 data URLs for PDF generation.
 */

/** @type {Map<string, string>} */
const logoCache = new Map()

/**
 * @param {string | null | undefined} url
 * @returns {Promise<string | null>}
 */
export async function fetchLogoAsBase64(url) {
  if (!url) return null
  if (logoCache.has(url)) return logoCache.get(url) ?? null

  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) throw new Error('Logo fetch failed')

    const blob = await response.blob()
    const contentType = blob.type || 'image/png'

    if (typeof FileReader !== 'undefined') {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      if (base64) logoCache.set(url, base64)
      return base64
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`

    if (base64) logoCache.set(url, base64)
    return base64
  } catch (err) {
    console.warn('[pdf-logos] Failed to fetch logo:', url, err)
    return null
  }
}

/**
 * @param {Array<string | null | undefined>} logoUrls
 * @returns {Promise<void>}
 */
export async function prefetchAllLogos(logoUrls) {
  const unique = [...new Set(logoUrls.filter(Boolean).map(String))]
  await Promise.all(unique.map((url) => fetchLogoAsBase64(url)))
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function getCachedLogo(url) {
  if (!url) return null
  return logoCache.get(url) ?? null
}

/**
 * @param {string} label
 * @returns {string}
 */
export function logoInitials(label) {
  const parts = String(label ?? '')
    .trim()
    .split(/[\s/]+/)
    .filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}
