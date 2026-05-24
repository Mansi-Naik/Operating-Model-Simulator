/**
 * @fileoverview Hand-curated domain-specific competitor benchmarks for F5 competitor analysis.
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

const LIMITED_BENCHMARK =
  'General capability; limited public benchmark depth for this sub-domain.'

/**
 * @param {string} detail
 * @returns {Record<string, string>}
 */
function limitedRationales(detail) {
  const base = `${detail} ${LIMITED_BENCHMARK}`
  return {
    ai_automation: base,
    industry_expertise: base,
    cost_competitive: base,
    implementation_speed: base,
    risk_compliance: base,
    client_outcomes: base,
  }
}

/** @typedef {{ name: string, domain: string, short: string, is_genpact: boolean, scores: Record<string, number>, rationales: Record<string, string>, strengths: string[], weaknesses: string[] }} CuratedProviderRaw */

/** @type {CuratedProviderRaw[]} */
const FINANCE_OPERATIONS_PROVIDERS = [
  {
    name: 'Genpact',
    domain: 'genpact.com',
    short: 'GEN',
    is_genpact: true,
    scores: {
      ai_automation: 4,
      industry_expertise: 5,
      cost_competitive: 3,
      implementation_speed: 4,
      risk_compliance: 4,
      client_outcomes: 4,
    },
    rationales: {
      ai_automation:
        'Cora platform integrates RPA, ML, and GenAI. AP Suite is first agentic AI solution launched 2025. Cora Knowledge Assist, LiveSpread for financial statements, OrderAssist deployed at scale. Named ISG Leader for GenAI + Agentic AI 2025.',
      industry_expertise:
        'Born from GE Capital 1997. Everest FAO PEAK Matrix Leader 13 consecutive years. Listed in Gartner Magic Quadrant F&A BPO 2025. Manages P2P, O2C, R2R, FP&A, treasury at enterprise scale. 20M+ transactions/month via Cora across 250 ecosystems.',
      cost_competitive:
        'Mid-market pricing. Not the cheapest (TCS, Infosys often undercut) but not premium (Accenture). Strong outcome-based pricing options.',
      implementation_speed:
        'Established F&A delivery model with reusable accelerators. Typical 6-9 months for full transition. AI Model Hub and Engineering Library accelerate deployment.',
      risk_compliance:
        'Deep regulated industry experience (banking, insurance). SOX, GDPR, financial services regulations expertise. Strong compliance frameworks. Insurance vertical Leader recognition.',
      client_outcomes:
        'Documented results in case studies: 45% touch-time reduction, 100% automated spreading accuracy in lending. Strong NPS in F&A segment per analyst reports.',
    },
    strengths: [
      'Cora platform maturity in F&A',
      'Agentic AI early mover with AP Suite',
      'Deep enterprise F&A heritage',
    ],
    weaknesses: [
      'Less marketing aggression vs Infosys Topaz',
      'Cost position weaker than Indian Tier-1',
    ],
  },
  {
    name: 'Accenture',
    domain: 'accenture.com',
    short: 'ACN',
    is_genpact: false,
    scores: {
      ai_automation: 5,
      industry_expertise: 4,
      cost_competitive: 2,
      implementation_speed: 3,
      risk_compliance: 5,
      client_outcomes: 4,
    },
    rationales: {
      ai_automation:
        '$5B AI revenue, $12B AI sales bookings FY2025. $2.7B GenAI/agentic revenue alone. SynOps platform, myWizard, MyConcerto. Largest scale of AI investment in industry. Reinvention Services strategy positions AI as core offering.',
      industry_expertise:
        'Strong F&A practice but consulting-led, not BPO-native. Listed Gartner MQ F&A BPO 2025. Less F&A-specialist than Genpact/EXL/WNS but matches breadth.',
      cost_competitive:
        'Premium pricing position. Highest day rates in tier. Wins on capability not cost. Not viable for cost-led pursuits.',
      implementation_speed:
        'Large consulting overhead can slow F&A operational deployments. 9-12 months typical. Strong on transformation, less on rapid operational stand-up.',
      risk_compliance:
        'Best-in-class compliance infrastructure. Big-4 alternative for regulated F&A. Strong audit relationships and SOX expertise.',
      client_outcomes:
        'Strong delivery track record but pricing erodes savings ROI. Best outcomes on premium engagements with transformation scope.',
    },
    strengths: [
      'Massive GenAI investment scale',
      'Premium brand positioning',
      'Best-in-class compliance infrastructure',
    ],
    weaknesses: [
      'Premium pricing limits cost-led wins',
      'Slower operational deployment than BPO-native players',
    ],
  },
  {
    name: 'TCS',
    domain: 'tcs.com',
    short: 'TCS',
    is_genpact: false,
    scores: {
      ai_automation: 3,
      industry_expertise: 4,
      cost_competitive: 5,
      implementation_speed: 4,
      risk_compliance: 4,
      client_outcomes: 3,
    },
    rationales: {
      ai_automation:
        'ignio platform for cognitive ops. Microsoft partnership for AI in Sales/HR/Finance. AI marketing less aggressive than Infosys Topaz or Accenture. Strong on automation engineering, weaker on GenAI-first positioning.',
      industry_expertise:
        'TCS BaNCS strong in banking/capital markets. F&A BPO included in Gartner MQ 2025. Deep enterprise F&A relationships, especially in Asia/India clients.',
      cost_competitive:
        'Most aggressive cost position among Tier-1. Pyramid economics model. Defends time-and-materials billing. Strong on labor arbitrage.',
      implementation_speed:
        'Scale advantage for rapid ramp. Standardized delivery methodology. Can deploy faster than Accenture but slower than smaller specialists.',
      risk_compliance:
        'Strong banking compliance through BaNCS heritage. SOX, banking regulations expertise. Generally conservative deployment posture.',
      client_outcomes:
        'Reliable delivery but less GenAI-driven transformation outcomes documented. Strong on cost reduction, weaker on outcomes-based positioning.',
    },
    strengths: [
      'Cost competitiveness in cost-led pursuits',
      'BaNCS platform depth in banking',
      'Scale and global delivery',
    ],
    weaknesses: [
      'AI/GenAI brand position weaker than Infosys/Accenture',
      'Time-and-materials model misaligned with automation',
    ],
  },
  {
    name: 'Infosys BPM',
    domain: 'infosys.com',
    short: 'INF',
    is_genpact: false,
    scores: {
      ai_automation: 4,
      industry_expertise: 3,
      cost_competitive: 4,
      implementation_speed: 3,
      risk_compliance: 3,
      client_outcomes: 3,
    },
    rationales: {
      ai_automation:
        "Topaz AI platform heavily marketed and growing fast. Among world's largest Copilot deployments. Microsoft strategic AI partnership. Clients report 20-40% productivity gains. Aggressive AI-first positioning.",
      industry_expertise:
        'Infosys BPM is the F&A unit, less F&A-specialist than Genpact/EXL. Listed Gartner MQ F&A BPO 2025 but stronger in IT services than pure F&A operations.',
      cost_competitive:
        'India-based Tier-1, competitive cost position. Slightly above TCS, below Genpact blended rates.',
      implementation_speed:
        'Growing capability but operational maturity in F&A less established than Genpact. Topaz deployments accelerating in 2025.',
      risk_compliance:
        'Standard Tier-1 compliance infrastructure. Less F&A regulatory specialization than Genpact or Big-4-aligned providers.',
      client_outcomes:
        'Strong Topaz case studies but more weighted to IT/cloud than F&A operational outcomes.',
    },
    strengths: [
      'Topaz AI platform marketing leadership',
      'Microsoft AI partnership depth',
      'Aggressive GenAI positioning',
    ],
    weaknesses: [
      'F&A operational maturity less than Genpact',
      'Mixed BPO + IT services dilutes F&A focus',
    ],
  },
  {
    name: 'WNS',
    domain: 'wns.com',
    short: 'WNS',
    is_genpact: false,
    scores: {
      ai_automation: 3,
      industry_expertise: 4,
      cost_competitive: 4,
      implementation_speed: 4,
      risk_compliance: 3,
      client_outcomes: 3,
    },
    rationales: {
      ai_automation:
        'AI/automation capabilities present but smaller scale of investment vs Tier-1 players. No flagship AI platform with the visibility of Cora, Topaz, or SynOps.',
      industry_expertise:
        "Specialist F&A focus. HfS 'High Performer' in F&A BPO. Strong in mid-market F&A. Listed Gartner MQ F&A BPO 2025.",
      cost_competitive:
        'Competitive mid-market pricing. Agile pricing models for smaller deals.',
      implementation_speed:
        'Agile deployment for mid-market. Smaller engagement portfolios allow faster transition.',
      risk_compliance:
        'Adequate compliance for mid-market F&A. Less deep regulated industry coverage than Genpact or Accenture.',
      client_outcomes:
        'Strong NPS in mid-market F&A. Less visible on large enterprise transformations.',
    },
    strengths: ['F&A specialist focus', 'Mid-market agility', 'Cost-effective for sub-enterprise deals'],
    weaknesses: ['Smaller AI/GenAI investment', 'Less enterprise-scale credibility'],
  },
]

/** @type {Record<string, { providers: CuratedProviderRaw[] }>} */
export const COMPETITOR_LIBRARY = {
  'Finance Operations': { providers: FINANCE_OPERATIONS_PROVIDERS },
  'Customer Service': {
    providers: [
      {
        name: 'Genpact',
        domain: 'genpact.com',
        short: 'GEN',
        is_genpact: true,
        scores: {
          ai_automation: 4,
          industry_expertise: 4,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation:
            'Cora platform with conversational AI, NLP capabilities. Cora Knowledge Assist for customer service knowledge transfer. Growing GenAI deployments.',
          industry_expertise:
            'Strong CX/CS practice but not primary positioning vs Concentrix/TP/TaskUs who specialize.',
          cost_competitive: 'Mid-tier blended pricing. Not cheapest in CS specifically.',
          implementation_speed: 'Established CS operational playbooks. Typical 4-8 months.',
          risk_compliance: 'Strong regulated CS (banking, insurance) compliance.',
          client_outcomes: 'Documented CSAT improvements, knowledge transfer outcomes.',
        },
        strengths: [
          'AI-augmented CS through Cora',
          'Regulated CS strength',
          'Cross-domain delivery integration',
        ],
        weaknesses: [
          'CS specialist competitors have deeper voice expertise',
          'Not primary positioning',
        ],
      },
      {
        name: 'Accenture',
        domain: 'accenture.com',
        short: 'ACN',
        is_genpact: false,
        scores: {
          ai_automation: 5,
          industry_expertise: 4,
          cost_competitive: 2,
          implementation_speed: 3,
          risk_compliance: 5,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation:
            'SynOps, GenAI investment scale unmatched. AI-led CX transformation positioning.',
          industry_expertise: 'Strong CX consulting through Accenture Song.',
          cost_competitive: 'Premium pricing.',
          implementation_speed: 'Slower than CS specialists.',
          risk_compliance: 'Best-in-class for regulated CS.',
          client_outcomes: 'Transformation outcomes documented, premium pricing impacts ROI.',
        },
        strengths: ['AI investment scale', 'Song CX consulting depth', 'Compliance leadership'],
        weaknesses: ['Premium cost', 'Slower operational ramp'],
      },
      {
        name: 'TCS',
        domain: 'tcs.com',
        short: 'TCS',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 3,
          cost_competitive: 5,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: {
          ai_automation: 'ignio for ops, AI for CS less mature than Tier-1 peers.',
          industry_expertise: 'CS BPO present but not headline practice.',
          cost_competitive: 'Most aggressive cost. Strong on labor arbitrage.',
          implementation_speed: 'Scale enables rapid ramp.',
          risk_compliance: 'Standard Tier-1 compliance.',
          client_outcomes: 'Reliable but less differentiated.',
        },
        strengths: ['Cost leadership', 'Scale', 'Banking CS depth'],
        weaknesses: ['AI for CS less developed', 'Less CS specialization'],
      },
      {
        name: 'Concentrix',
        domain: 'concentrix.com',
        short: 'CNX',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 5,
          cost_competitive: 4,
          implementation_speed: 5,
          risk_compliance: 3,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation:
            'Conversational AI and CX-specific automation platforms. Post-Webhelp merger, expanded AI capability.',
          industry_expertise: 'CX/CS specialist — primary positioning. Voice, chat, email, social.',
          cost_competitive: 'Competitive for high-volume CS workloads.',
          implementation_speed: 'CS specialists deploy fastest. 3-6 months typical.',
          risk_compliance: 'Standard CS compliance, less depth in heavily regulated CS.',
          client_outcomes: 'Strong CSAT track record at scale.',
        },
        strengths: ['CS/CX specialist depth', 'Voice operations leadership', 'Rapid deployment'],
        weaknesses: ['Less regulated industry depth', 'More commoditized AI tooling'],
      },
      {
        name: 'Teleperformance',
        domain: 'teleperformance.com',
        short: 'TP',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 5,
          cost_competitive: 5,
          implementation_speed: 5,
          risk_compliance: 3,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation:
            'TP.ai investments growing. Historically labor-led, AI investment catching up but behind tech-led players.',
          industry_expertise: 'Largest pure-play CX provider globally. 410k+ specialists.',
          cost_competitive:
            'Strong cost position via global delivery footprint including LATAM, Philippines.',
          implementation_speed: 'Largest CS deployment capacity. Fast scale-up.',
          risk_compliance: 'Adequate for standard CS, less depth for highly regulated.',
          client_outcomes: 'Volume CSAT leadership in non-regulated CS.',
        },
        strengths: ['CS volume leadership', 'Cost competitiveness', 'Global footprint'],
        weaknesses: ['AI maturity behind tech-led players', 'Less regulated industry depth'],
      },
    ],
  },
  'Trust & Safety': {
    providers: [
      {
        name: 'Genpact',
        domain: 'genpact.com',
        short: 'GEN',
        is_genpact: true,
        scores: {
          ai_automation: 3,
          industry_expertise: 3,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: {
          ai_automation:
            'Content classification and moderation AI through Cora. Less specialized than T&S-native players.',
          industry_expertise:
            'T&S not primary positioning. Stronger in adjacent risk/compliance.',
          cost_competitive: 'Mid-tier blended pricing.',
          implementation_speed: 'Strong operational deployment but less T&S-native.',
          risk_compliance:
            'Strong on regulatory frameworks (DSA, OSA) given compliance heritage.',
          client_outcomes: 'Limited public T&S case studies vs specialists.',
        },
        strengths: [
          'Regulatory compliance heritage',
          'Cross-functional integration',
          'Cora moderation capabilities',
        ],
        weaknesses: ['T&S not primary positioning', 'Limited published T&S case studies'],
      },
      {
        name: 'TaskUs',
        domain: 'taskus.com',
        short: 'TU',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 5,
          cost_competitive: 4,
          implementation_speed: 5,
          risk_compliance: 4,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation: 'AI-augmented moderation, dedicated AI Operations services for T&S.',
          industry_expertise: 'T&S specialist - primary business. Major social platforms as clients.',
          cost_competitive:
            'Competitive cost position with Philippines, LATAM, Eastern Europe delivery.',
          implementation_speed: 'T&S specialist rapid ramp capabilities.',
          risk_compliance: 'Strong DSA, COPPA, FOSTA-SESTA frameworks.',
          client_outcomes: 'Documented T&S accuracy improvements at scale.',
        },
        strengths: [
          'T&S specialist depth',
          'Major platform client relationships',
          'Specialized AI tooling',
        ],
        weaknesses: ['Less diversified portfolio', 'Mid-tier scale'],
      },
      {
        name: 'Accenture',
        domain: 'accenture.com',
        short: 'ACN',
        is_genpact: false,
        scores: {
          ai_automation: 5,
          industry_expertise: 4,
          cost_competitive: 2,
          implementation_speed: 3,
          risk_compliance: 5,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation:
            'Industry-leading AI investment scale applies to T&S moderation AI.',
          industry_expertise:
            'Strong T&S consulting practice; less operational T&S volume than specialists.',
          cost_competitive: 'Premium pricing limits T&S volume contracts.',
          implementation_speed: 'Slower than T&S specialists.',
          risk_compliance: 'Best-in-class regulatory frameworks.',
          client_outcomes: 'Strong consulting outcomes, premium pricing affects ROI.',
        },
        strengths: ['AI scale', 'Premium brand', 'Compliance leadership'],
        weaknesses: ['Premium cost', 'Less T&S operational scale'],
      },
      {
        name: 'Concentrix',
        domain: 'concentrix.com',
        short: 'CNX',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 4,
          cost_competitive: 4,
          implementation_speed: 5,
          risk_compliance: 3,
          client_outcomes: 4,
        },
        rationales: {
          ai_automation: 'Conversational AI extending to content moderation post-Webhelp.',
          industry_expertise: 'Strong T&S practice especially in non-English markets via Webhelp.',
          cost_competitive: 'Competitive for volume workloads.',
          implementation_speed: 'Fast deployment.',
          risk_compliance: 'Standard frameworks, building DSA capability.',
          client_outcomes: 'Documented platform client relationships.',
        },
        strengths: ['Multilingual T&S strength', 'Volume scale', 'EMEA presence via Webhelp'],
        weaknesses: ['Less depth in critical content categories', 'Compliance frameworks building'],
      },
    ],
  },
  'HR Operations': {
    providers: [
      {
        name: 'Genpact',
        domain: 'genpact.com',
        short: 'GEN',
        is_genpact: true,
        scores: {
          ai_automation: 4,
          industry_expertise: 4,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Cora-enabled HR ops and payroll automation with cross-functional delivery.',
        ),
        strengths: ['Cora HR automation', 'Global delivery scale', 'Regulated HR compliance'],
        weaknesses: ['HR not primary market positioning', 'Less HR-specific analyst recognition'],
      },
      {
        name: 'Accenture',
        domain: 'accenture.com',
        short: 'ACN',
        is_genpact: false,
        scores: {
          ai_automation: 5,
          industry_expertise: 4,
          cost_competitive: 2,
          implementation_speed: 3,
          risk_compliance: 5,
          client_outcomes: 4,
        },
        rationales: limitedRationales(
          'Workday/SAP HR transformation and SynOps at enterprise scale.',
        ),
        strengths: ['GenAI investment scale', 'HR transformation consulting', 'Compliance depth'],
        weaknesses: ['Premium pricing', 'Slower operational HR BPO ramp'],
      },
      {
        name: 'TCS',
        domain: 'tcs.com',
        short: 'TCS',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 3,
          cost_competitive: 5,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales('ignio and HR BPO at competitive India-based rates.'),
        strengths: ['Cost leadership', 'Scale', 'Microsoft HR AI partnership'],
        weaknesses: ['Less HR specialist depth', 'Weaker GenAI HR brand'],
      },
      {
        name: 'IBM',
        domain: 'ibm.com',
        short: 'IBM',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 4,
          cost_competitive: 3,
          implementation_speed: 3,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Watson/watsonx and legacy HR outsourcing footprint for large enterprises.',
        ),
        strengths: ['Enterprise HR platform heritage', 'AI/watsonx positioning', 'Global accounts'],
        weaknesses: ['Mixed BPO/consulting model', 'Slower mid-market agility'],
      },
      {
        name: 'ADP',
        domain: 'adp.com',
        short: 'ADP',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 5,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 4,
        },
        rationales: limitedRationales(
          'Payroll and HCM specialist with deep compliance and product-led delivery.',
        ),
        strengths: ['Payroll/HCM specialist', 'Compliance track record', 'Productized HR ops'],
        weaknesses: ['Less transformation BPO breadth', 'Limited GenAI narrative vs Tier-1'],
      },
    ],
  },
  'Sales Operations': {
    providers: [
      {
        name: 'Genpact',
        domain: 'genpact.com',
        short: 'GEN',
        is_genpact: true,
        scores: {
          ai_automation: 4,
          industry_expertise: 3,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Cora sales ops automation for quote-to-cash and revenue operations adjacencies.',
        ),
        strengths: ['Cora automation', 'Revenue ops adjacency', 'Enterprise delivery'],
        weaknesses: ['Sales ops not core positioning', 'Less CRM-native depth'],
      },
      {
        name: 'Accenture',
        domain: 'accenture.com',
        short: 'ACN',
        is_genpact: false,
        scores: {
          ai_automation: 5,
          industry_expertise: 4,
          cost_competitive: 2,
          implementation_speed: 3,
          risk_compliance: 4,
          client_outcomes: 4,
        },
        rationales: limitedRationales(
          'Salesforce/CRM transformation and SynOps for revenue operations.',
        ),
        strengths: ['GenAI scale', 'CRM transformation depth', 'Premium brand'],
        weaknesses: ['Premium cost', 'Consulting-led vs pure sales BPO'],
      },
      {
        name: 'TCS',
        domain: 'tcs.com',
        short: 'TCS',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 3,
          cost_competitive: 5,
          implementation_speed: 4,
          risk_compliance: 3,
          client_outcomes: 3,
        },
        rationales: limitedRationales('Cost-competitive sales support and CRM ops at scale.'),
        strengths: ['Cost leadership', 'Global delivery', 'CRM implementation scale'],
        weaknesses: ['Less sales-ops specialist focus', 'Weaker GenAI sales narrative'],
      },
      {
        name: 'Cognizant',
        domain: 'cognizant.com',
        short: 'COG',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 3,
          cost_competitive: 4,
          implementation_speed: 3,
          risk_compliance: 3,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'TriZetto/health and digital ops with growing sales operations BPO.',
        ),
        strengths: ['Digital sales ops', 'Healthcare revenue cycle adjacency', 'US client base'],
        weaknesses: ['Less pure sales BPO depth', 'Mixed IT/BPO positioning'],
      },
      {
        name: 'Capgemini',
        domain: 'capgemini.com',
        short: 'CAP',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 3,
          cost_competitive: 3,
          implementation_speed: 3,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Sogeti/Capgemini Invent for CRM-led sales transformation and ops.',
        ),
        strengths: ['European enterprise presence', 'CRM transformation', 'Compliance frameworks'],
        weaknesses: ['Sales BPO less specialized', 'Mid-tier AI visibility'],
      },
    ],
  },
  'Supply Chain': {
    providers: [
      {
        name: 'Genpact',
        domain: 'genpact.com',
        short: 'GEN',
        is_genpact: true,
        scores: {
          ai_automation: 4,
          industry_expertise: 3,
          cost_competitive: 3,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Supply chain analytics and ops through Cora with procurement adjacency.',
        ),
        strengths: ['Cora analytics', 'Procurement adjacency', 'Global ops delivery'],
        weaknesses: ['Supply chain not primary positioning', 'Less 3PL/4PL depth'],
      },
      {
        name: 'Accenture',
        domain: 'accenture.com',
        short: 'ACN',
        is_genpact: false,
        scores: {
          ai_automation: 5,
          industry_expertise: 4,
          cost_competitive: 2,
          implementation_speed: 3,
          risk_compliance: 4,
          client_outcomes: 4,
        },
        rationales: limitedRationales(
          'Supply chain reinvention and control-tower consulting at enterprise scale.',
        ),
        strengths: ['GenAI supply chain', 'Transformation consulting', 'Global footprint'],
        weaknesses: ['Premium pricing', 'Less operational BPO depth'],
      },
      {
        name: 'TCS',
        domain: 'tcs.com',
        short: 'TCS',
        is_genpact: false,
        scores: {
          ai_automation: 3,
          industry_expertise: 3,
          cost_competitive: 5,
          implementation_speed: 4,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales('Cost-competitive supply chain BPO and IT integration.'),
        strengths: ['Cost leadership', 'IT/BPO integration', 'Manufacturing client base'],
        weaknesses: ['Less supply chain specialist brand', 'Weaker GenAI narrative'],
      },
      {
        name: 'Cognizant',
        domain: 'cognizant.com',
        short: 'COG',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 3,
          cost_competitive: 4,
          implementation_speed: 3,
          risk_compliance: 3,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Digital supply chain and procurement ops for US-centric enterprises.',
        ),
        strengths: ['Digital supply chain', 'US enterprise relationships', 'Procurement ops'],
        weaknesses: ['Less analyst recognition in supply BPO', 'Mixed positioning'],
      },
      {
        name: 'Capgemini',
        domain: 'capgemini.com',
        short: 'CAP',
        is_genpact: false,
        scores: {
          ai_automation: 4,
          industry_expertise: 4,
          cost_competitive: 3,
          implementation_speed: 3,
          risk_compliance: 4,
          client_outcomes: 3,
        },
        rationales: limitedRationales(
          'Supply chain consulting and BPO with strong European manufacturing clients.',
        ),
        strengths: ['Supply chain consulting', 'European manufacturing', 'Sustainability focus'],
        weaknesses: ['Premium vs Indian Tier-1', 'Operational BPO less visible'],
      },
    ],
  },
  default: { providers: FINANCE_OPERATIONS_PROVIDERS },
}

/** @type {Record<string, string>} */
export const DOMAIN_ALIASES = {
  finance_ops: 'Finance Operations',
  customer_service: 'Customer Service',
  safety_security: 'Trust & Safety',
  hr_ops: 'HR Operations',
  sales_ops: 'Sales Operations',
  supply_chain: 'Supply Chain',
}

/** @type {CompetitorProfile} */
export const GENPACT_PROFILE = competitor('Genpact', 'genpact.com', 'GEN')

/**
 * @param {CuratedProviderRaw} provider
 * @returns {CuratedProviderRaw & { logo: string }}
 */
function enrichCuratedProvider(provider) {
  return {
    ...provider,
    logo: primaryLogoUrl(provider.domain),
  }
}

/**
 * Map intake alias or display domain to COMPETITOR_LIBRARY key.
 *
 * @param {string | null | undefined} domain
 * @returns {string}
 */
export function resolveDomainKey(domain) {
  const key = typeof domain === 'string' ? domain.trim() : ''
  if (!key) return 'default'
  if (COMPETITOR_LIBRARY[key]) return key
  if (DOMAIN_ALIASES[key]) return DOMAIN_ALIASES[key]
  return 'default'
}

/**
 * Hand-curated competitors for a domain (Genpact first), with logos enriched.
 *
 * @param {string | null | undefined} domain
 * @returns {Array<CuratedProviderRaw & { logo: string }>}
 */
export function getCuratedCompetitorsForDomain(domain) {
  const libraryKey = resolveDomainKey(domain)
  const entry = COMPETITOR_LIBRARY[libraryKey] ?? COMPETITOR_LIBRARY.default
  const providers = entry.providers.map(enrichCuratedProvider)
  return [...providers].sort((a, b) => {
    if (a.is_genpact && !b.is_genpact) return -1
    if (!a.is_genpact && b.is_genpact) return 1
    return 0
  })
}

/**
 * Backward-compatible competitor list for prompts (non-Genpact only).
 *
 * @param {string | null | undefined} domain
 * @returns {CompetitorProfile[]}
 */
export function getCompetitorsForDomain(domain) {
  return getCuratedCompetitorsForDomain(domain)
    .filter((p) => !p.is_genpact)
    .map(({ name, domain: companyDomain, short, logo }) => ({
      name,
      domain: companyDomain,
      short,
      logo,
    }))
}

/** @type {Map<string, string>} */
const DOMAIN_BY_NAME = new Map()

for (const entry of Object.values(COMPETITOR_LIBRARY)) {
  for (const row of entry.providers) {
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
