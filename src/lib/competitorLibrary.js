/**
 * @fileoverview Domain-specific competitor sets for F5 competitor analysis.
 */

/** @typedef {{ name: string, logo: string, short: string }} CompetitorProfile */

/** @type {Record<string, CompetitorProfile[]>} */
export const COMPETITOR_LIBRARY = {
  'Trust & Safety': [
    { name: 'Teleperformance', logo: 'https://logo.clearbit.com/teleperformance.com', short: 'TP' },
    { name: 'Concentrix', logo: 'https://logo.clearbit.com/concentrix.com', short: 'CNX' },
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TaskUs', logo: 'https://logo.clearbit.com/taskus.com', short: 'TU' },
  ],
  'Customer Service': [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'Concentrix', logo: 'https://logo.clearbit.com/concentrix.com', short: 'CNX' },
    { name: 'Teleperformance', logo: 'https://logo.clearbit.com/teleperformance.com', short: 'TP' },
  ],
  'Finance Operations': [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'Infosys BPM', logo: 'https://logo.clearbit.com/infosys.com', short: 'INF' },
    { name: 'WNS', logo: 'https://logo.clearbit.com/wns.com', short: 'WNS' },
  ],
  'HR Operations': [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'IBM', logo: 'https://logo.clearbit.com/ibm.com', short: 'IBM' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'ADP', logo: 'https://logo.clearbit.com/adp.com', short: 'ADP' },
  ],
  'Sales Operations': [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'Cognizant', logo: 'https://logo.clearbit.com/cognizant.com', short: 'COG' },
    { name: 'TaskUs', logo: 'https://logo.clearbit.com/taskus.com', short: 'TU' },
  ],
  'Supply Chain': [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'Cognizant', logo: 'https://logo.clearbit.com/cognizant.com', short: 'COG' },
    { name: 'Capgemini', logo: 'https://logo.clearbit.com/capgemini.com', short: 'CAP' },
  ],
  default: [
    { name: 'Accenture', logo: 'https://logo.clearbit.com/accenture.com', short: 'ACN' },
    { name: 'TCS', logo: 'https://logo.clearbit.com/tcs.com', short: 'TCS' },
    { name: 'Infosys', logo: 'https://logo.clearbit.com/infosys.com', short: 'INF' },
    { name: 'Cognizant', logo: 'https://logo.clearbit.com/cognizant.com', short: 'COG' },
  ],
}

/** @type {CompetitorProfile} */
export const GENPACT_PROFILE = {
  name: 'Genpact',
  logo: 'https://logo.clearbit.com/genpact.com',
  short: 'GEN',
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
