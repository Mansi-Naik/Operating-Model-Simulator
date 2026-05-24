/**
 * @fileoverview Domain-specific competitor sets for F5 competitor analysis.
 */

/** @typedef {{ name: string, domain: string, logo: string, short: string }} CompetitorProfile */

/**
 * High-quality favicon/logo URLs (Clearbit Logo API was discontinued).
 *
 * @param {string} domain
 * @returns {string[]}
 */
export function logoUrlCandidates(domain) {
  const d = String(domain ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
  if (!d) return []
  const site = encodeURIComponent(`https://${d}`)
  const host = encodeURIComponent(d)
  return [
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${site}&size=128`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://unavatar.io/${host}`,
  ]
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function primaryLogoUrl(domain) {
  const urls = logoUrlCandidates(domain)
  return urls[0] ?? ''
}

/**
 * @param {string} name
 * @param {string} domain
 * @param {string} short
 * @returns {CompetitorProfile}
 */
function competitor(name, domain, short) {
  return { name, domain, short, logo: primaryLogoUrl(domain) }
}

/** @type {Record<string, CompetitorProfile[]>} */
export const COMPETITOR_LIBRARY = {
  'Trust & Safety': [
    competitor('Teleperformance', 'teleperformance.com', 'TP'),
    competitor('Concentrix', 'concentrix.com', 'CNX'),
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TaskUs', 'taskus.com', 'TU'),
  ],
  'Customer Service': [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('Concentrix', 'concentrix.com', 'CNX'),
    competitor('Teleperformance', 'teleperformance.com', 'TP'),
  ],
  'Finance Operations': [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('Infosys BPM', 'infosys.com', 'INF'),
    competitor('WNS', 'wns.com', 'WNS'),
  ],
  'HR Operations': [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('IBM', 'ibm.com', 'IBM'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('ADP', 'adp.com', 'ADP'),
  ],
  'Sales Operations': [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('Cognizant', 'cognizant.com', 'COG'),
    competitor('TaskUs', 'taskus.com', 'TU'),
  ],
  'Supply Chain': [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('Cognizant', 'cognizant.com', 'COG'),
    competitor('Capgemini', 'capgemini.com', 'CAP'),
  ],
  default: [
    competitor('Accenture', 'accenture.com', 'ACN'),
    competitor('TCS', 'tcs.com', 'TCS'),
    competitor('Infosys', 'infosys.com', 'INF'),
    competitor('Cognizant', 'cognizant.com', 'COG'),
  ],
}

/** @type {CompetitorProfile} */
export const GENPACT_PROFILE = competitor('Genpact', 'genpact.com', 'GEN')

/** @type {Map<string, string>} */
const DOMAIN_BY_NAME = new Map()

for (const list of Object.values(COMPETITOR_LIBRARY)) {
  for (const row of list) {
    DOMAIN_BY_NAME.set(row.name.toLowerCase(), row.domain)
  }
}
DOMAIN_BY_NAME.set('genpact', 'genpact.com')
DOMAIN_BY_NAME.set('infosys bpm', 'infosys.com')

/**
 * Resolve company domain for logo loading (cached rows may lack domain field).
 *
 * @param {string | null | undefined} name
 * @param {string | null | undefined} logo
 * @param {string | null | undefined} domain
 * @returns {string | null}
 */
export function resolveCompetitorDomain(name, logo, domain) {
  if (typeof domain === 'string' && domain.trim()) {
    return domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  }
  const n = String(name ?? '').trim().toLowerCase()
  if (n && DOMAIN_BY_NAME.has(n)) return DOMAIN_BY_NAME.get(n) ?? null
  if (typeof logo === 'string') {
    const clearbit = logo.match(/(?:clearbit\.com|logo\.clearbit\.com)\/([^/?]+)/i)
    if (clearbit?.[1]) return clearbit[1]
  }
  return null
}

/** @type {Array<{ id: string, label: string, description: string, is_north_star?: boolean }>} */
export const COMPETITOR_DIMENSIONS = [
  {
    id: 'ai_automation',
    label: 'AI/Automation Maturity',
    description: 'Depth of in-house AI capabilities, automation platforms, GenAI offerings',
    is_north_star: true,
  },
  {
    id: 'industry_expertise',
    label: 'Industry Expertise',
    description: 'Depth in this specific domain and sub-function',
  },
  {
    id: 'cost_competitive',
    label: 'Cost Competitiveness',
    description: 'Pricing position relative to market',
  },
  {
    id: 'implementation_speed',
    label: 'Implementation Speed',
    description: 'Typical time-to-value for transformation projects',
  },
  {
    id: 'risk_compliance',
    label: 'Risk & Compliance',
    description: 'Track record on regulated and compliance-sensitive work',
  },
  {
    id: 'client_outcomes',
    label: 'Client Outcomes',
    description: 'Historical results — savings delivered, quality, satisfaction',
  },
]

/**
 * @param {string | null | undefined} domain
 * @returns {CompetitorProfile[]}
 */
export function getCompetitorsForDomain(domain) {
  const key = typeof domain === 'string' ? domain.trim() : ''
  if (key && COMPETITOR_LIBRARY[key]) return COMPETITOR_LIBRARY[key]
  return COMPETITOR_LIBRARY.default
}
