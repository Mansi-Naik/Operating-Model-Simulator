/**
 * Deterministic tech application recommendations for F2 allocation matrix (no API).
 */

/** @type {Record<string, string>} */
const TECH_LOGO_DOMAINS = {
  sap_s4hana: 'sap.com',
  oracle_cloud_erp: 'oracle.com',
  oracle_fusion: 'oracle.com',
  ms_dynamics_365: 'microsoft.com',
  oracle_netsuite: 'netsuite.com',
  blackline: 'blackline.com',
  highradius: 'highradius.com',
  coupa: 'coupa.com',
  zuora: 'zuora.com',
  salesforce_crm: 'salesforce.com',
  hubspot: 'hubspot.com',
  zendesk: 'zendesk.com',
  servicenow: 'servicenow.com',
  anaplan: 'anaplan.com',
  snowflake: 'snowflake.com',
  databricks: 'databricks.com',
  ms_fabric: 'microsoft.com',
  bigquery: 'google.com',
  postgresql: 'postgresql.org',
  workday: 'workday.com',
}

/** @type {Record<string, string>} */
const TECH_BRAND_ABBREV = {
  sap_s4hana: 'SAP',
  oracle_cloud_erp: 'OR',
  oracle_fusion: 'OF',
  ms_dynamics_365: 'D365',
  oracle_netsuite: 'NS',
  blackline: 'BL',
  highradius: 'HR',
  coupa: 'CP',
  zuora: 'ZU',
  salesforce_crm: 'SF',
  hubspot: 'HB',
  zendesk: 'ZD',
  servicenow: 'SN',
  anaplan: 'AN',
  snowflake: 'SNF',
  databricks: 'DB',
  ms_fabric: 'MF',
  bigquery: 'BQ',
  postgresql: 'PG',
  workday: 'WD',
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function faviconLogoUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

/**
 * @param {string} domain
 * @returns {string}
 */
function clearbitLogoUrl(domain) {
  return `https://logo.clearbit.com/${domain}`
}

/**
 * @param {Record<string, unknown>} tech
 * @param {string} id
 * @returns {Record<string, unknown>}
 */
function enrichTechEntry(tech, id) {
  const domain = TECH_LOGO_DOMAINS[id] ?? 'example.com'
  return {
    ...tech,
    logo_domain: domain,
    logo: faviconLogoUrl(domain),
    logo_alt: clearbitLogoUrl(domain),
    brand_abbrev: TECH_BRAND_ABBREV[id] ?? String(tech.name ?? 'T').slice(0, 2).toUpperCase(),
  }
}

const TECH_STACK_RAW = {
  sap_s4hana: {
    id: 'sap_s4hana',
    name: 'SAP S/4HANA',
    logo: 'https://logo.clearbit.com/sap.com',
    annual_cost_usd: 120000,
    category: 'ERP',
    setup_weeks: '12-24',
    maintenance_hours_monthly: '20-40',
  },
  oracle_cloud_erp: {
    id: 'oracle_cloud_erp',
    name: 'Oracle Cloud ERP',
    logo: 'https://logo.clearbit.com/oracle.com',
    annual_cost_usd: 110000,
    category: 'ERP',
    setup_weeks: '12-24',
    maintenance_hours_monthly: '20-40',
  },
  oracle_fusion: {
    id: 'oracle_fusion',
    name: 'Oracle Fusion',
    logo: 'https://logo.clearbit.com/oracle.com',
    annual_cost_usd: 85000,
    category: 'ERP',
    setup_weeks: '8-16',
    maintenance_hours_monthly: '15-30',
  },
  ms_dynamics_365: {
    id: 'ms_dynamics_365',
    name: 'Microsoft Dynamics 365',
    logo: 'https://logo.clearbit.com/microsoft.com',
    annual_cost_usd: 70000,
    category: 'ERP',
    setup_weeks: '8-12',
    maintenance_hours_monthly: '10-20',
  },
  oracle_netsuite: {
    id: 'oracle_netsuite',
    name: 'Oracle NetSuite',
    logo: 'https://logo.clearbit.com/netsuite.com',
    annual_cost_usd: 40000,
    category: 'ERP',
    setup_weeks: '6-12',
    maintenance_hours_monthly: '10-15',
  },
  blackline: {
    id: 'blackline',
    name: 'BlackLine',
    logo: 'https://logo.clearbit.com/blackline.com',
    annual_cost_usd: 55000,
    category: 'Reconciliation',
    setup_weeks: '6-10',
    maintenance_hours_monthly: '5-10',
  },
  highradius: {
    id: 'highradius',
    name: 'HighRadius',
    logo: 'https://logo.clearbit.com/highradius.com',
    annual_cost_usd: 50000,
    category: 'AR/Receivables',
    setup_weeks: '6-10',
    maintenance_hours_monthly: '5-10',
  },
  coupa: {
    id: 'coupa',
    name: 'Coupa',
    logo: 'https://logo.clearbit.com/coupa.com',
    annual_cost_usd: 48000,
    category: 'Procurement',
    setup_weeks: '6-10',
    maintenance_hours_monthly: '5-10',
  },
  zuora: {
    id: 'zuora',
    name: 'Zuora',
    logo: 'https://logo.clearbit.com/zuora.com',
    annual_cost_usd: 45000,
    category: 'Billing/Subscriptions',
    setup_weeks: '6-12',
    maintenance_hours_monthly: '5-10',
  },
  salesforce_crm: {
    id: 'salesforce_crm',
    name: 'Salesforce CRM',
    logo: 'https://logo.clearbit.com/salesforce.com',
    annual_cost_usd: 105000,
    category: 'CRM',
    setup_weeks: '8-16',
    maintenance_hours_monthly: '15-25',
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    logo: 'https://logo.clearbit.com/hubspot.com',
    annual_cost_usd: 18000,
    category: 'CRM',
    setup_weeks: '2-6',
    maintenance_hours_monthly: '5-10',
  },
  zendesk: {
    id: 'zendesk',
    name: 'Zendesk',
    logo: 'https://logo.clearbit.com/zendesk.com',
    annual_cost_usd: 22000,
    category: 'Customer Service',
    setup_weeks: '4-8',
    maintenance_hours_monthly: '5-10',
  },
  servicenow: {
    id: 'servicenow',
    name: 'ServiceNow',
    logo: 'https://logo.clearbit.com/servicenow.com',
    annual_cost_usd: 55000,
    category: 'ITSM',
    setup_weeks: '8-16',
    maintenance_hours_monthly: '10-20',
  },
  anaplan: {
    id: 'anaplan',
    name: 'Anaplan',
    logo: 'https://logo.clearbit.com/anaplan.com',
    annual_cost_usd: 60000,
    category: 'Planning',
    setup_weeks: '6-12',
    maintenance_hours_monthly: '10-20',
  },
  snowflake: {
    id: 'snowflake',
    name: 'Snowflake',
    logo: 'https://logo.clearbit.com/snowflake.com',
    annual_cost_usd: 45000,
    category: 'Data Warehouse',
    setup_weeks: '4-8',
    maintenance_hours_monthly: '10-20',
  },
  databricks: {
    id: 'databricks',
    name: 'Databricks',
    logo: 'https://logo.clearbit.com/databricks.com',
    annual_cost_usd: 80000,
    category: 'Data/ML Platform',
    setup_weeks: '6-12',
    maintenance_hours_monthly: '15-25',
  },
  ms_fabric: {
    id: 'ms_fabric',
    name: 'Microsoft Fabric',
    logo: 'https://logo.clearbit.com/microsoft.com',
    annual_cost_usd: 50000,
    category: 'Data Platform',
    setup_weeks: '6-10',
    maintenance_hours_monthly: '10-20',
  },
  bigquery: {
    id: 'bigquery',
    name: 'BigQuery',
    logo: 'https://logo.clearbit.com/cloud.google.com',
    annual_cost_usd: 35000,
    category: 'Data Warehouse',
    setup_weeks: '2-6',
    maintenance_hours_monthly: '5-15',
  },
  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL',
    logo: 'https://logo.clearbit.com/postgresql.org',
    annual_cost_usd: 15000,
    category: 'Database',
    setup_weeks: '2-4',
    maintenance_hours_monthly: '5-10',
  },
  workday: {
    id: 'workday',
    name: 'Workday',
    logo: 'https://logo.clearbit.com/workday.com',
    annual_cost_usd: 85000,
    category: 'HR/HCM',
    setup_weeks: '12-24',
    maintenance_hours_monthly: '15-25',
  },
}

export const TECH_STACK = Object.freeze(
  Object.fromEntries(
    Object.entries(TECH_STACK_RAW).map(([id, tech]) => [id, Object.freeze(enrichTechEntry(tech, id))]),
  ),
)

/** @type {Record<string, string[]>} */
export const CONSIDERATIONS_BY_CATEGORY = Object.freeze({
  ERP: [
    'Long implementation cycle requires careful change management',
    'Integration with existing systems may need middleware',
    'Best when consolidating multiple legacy systems',
  ],
  Reconciliation: [
    'Requires GL data integration',
    'Best for high-volume routine breaks',
    'Complex multi-entity breaks may still need human judgment',
  ],
  'AR/Receivables': [
    'Customer master data must be clean for high accuracy',
    'Best ROI with high-volume AR portfolios',
    'Dispute workflows may need customization',
  ],
  Procurement: [
    'Requires supplier onboarding effort',
    'Integrates well with existing ERPs',
    'P2P automation requires policy clarity',
  ],
  CRM: [
    'Sales process must be standardized to leverage automation',
    'Best with clean customer data',
    'AI features need training time to reach full accuracy',
  ],
  'Customer Service': [
    'Self-service deflection requires content investment',
    'Multi-channel routing needs design upfront',
    'AI triage accuracy improves over 3-6 months',
  ],
  ITSM: [
    'Service catalog design is critical upfront work',
    'Best with mature ITIL practices',
    'Integration with monitoring tools enables proactive ticket creation',
  ],
  'Data Warehouse': [
    'ETL pipelines need ongoing maintenance',
    'Best for analytical workloads over operational ones',
    'Costs scale with query volume — monitor usage',
  ],
  'Data/ML Platform': [
    'Requires data science talent to fully leverage',
    'Best ROI on predictive use cases with clear value',
    'Model governance and monitoring needed for production',
  ],
  'Data Platform': [
    'ETL pipelines need ongoing maintenance',
    'Best for analytical workloads over operational ones',
    'Costs scale with query volume — monitor usage',
  ],
  'HR/HCM': [
    'Long implementation cycle, often 12-18 months',
    'Best when replacing legacy HR systems',
    'Workflow customization is extensive',
  ],
  Planning: [
    'Best for multi-dimensional planning use cases',
    'Requires data integration from finance/sales systems',
    'Model design takes 2-3 months to mature',
  ],
  'Billing/Subscriptions': [
    'Best for recurring revenue businesses',
    'Integration with payment processors needed',
    'Revenue recognition rules need configuration',
  ],
  Database: [
    'Pilot recommended before full deployment',
    'Integration effort varies by existing tech stack',
    'Change management critical for user adoption',
  ],
  default: [
    'Pilot recommended before full deployment',
    'Integration effort varies by existing tech stack',
    'Change management critical for user adoption',
  ],
})

/**
 * @param {string} category
 * @returns {string[]}
 */
export function getConsiderationsForCategory(category) {
  const key = typeof category === 'string' ? category.trim() : ''
  return CONSIDERATIONS_BY_CATEGORY[key] ?? CONSIDERATIONS_BY_CATEGORY.default
}

/**
 * @param {typeof TECH_STACK[keyof typeof TECH_STACK]} tech
 * @param {Record<string, unknown>} task
 * @param {string} rationale
 */
/**
 * @param {Record<string, unknown>} tech
 * @param {Record<string, unknown>} task
 * @param {string} rationale
 * @param {'primary' | 'complementary'} [fit]
 */
function buildRecommendation(tech, task, rationale, fit = 'primary') {
  const taskName = typeof task.task_name === 'string' ? task.task_name : ''
  const domain = typeof tech.logo_domain === 'string' ? tech.logo_domain : ''
  return {
    tech_id: tech.id,
    tech_name: tech.name,
    logo: tech.logo,
    logo_alt: tech.logo_alt,
    logo_domain: domain,
    brand_abbrev: tech.brand_abbrev,
    annual_cost_usd: tech.annual_cost_usd,
    category: tech.category,
    setup_weeks: tech.setup_weeks,
    maintenance_hours_monthly: tech.maintenance_hours_monthly,
    rationale,
    task_name: taskName,
    fit,
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function lower(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

const MAX_RECOMMENDATIONS_PER_TASK = 3

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {ReturnType<typeof buildRecommendation>[]}
 */
export function recommendTechStackForTask(task) {
  if (!task || typeof task !== 'object') return []

  const name = lower(task.task_name)
  const inputType = lower(task.input_data_type)
  const regulatory = task.regulatory_constraint === true

  /** @type {ReturnType<typeof buildRecommendation>[]} */
  const out = []
  const seen = new Set()

  /**
   * @param {Record<string, unknown>} tech
   * @param {string} rationale
   * @param {'primary' | 'complementary'} [fit]
   */
  const add = (tech, rationale, fit = 'primary') => {
    const id = String(tech.id ?? '')
    if (!id || seen.has(id) || out.length >= MAX_RECOMMENDATIONS_PER_TASK) return
    seen.add(id)
    out.push(buildRecommendation(tech, task, rationale, fit))
  }

  if (regulatory) return []

  if (
    name.includes('fraud investigation') ||
    name.includes('aml/') ||
    name.includes('aml ') ||
    name.includes('kyc') ||
    name.includes('sox compliance') ||
    name.includes('sox audit') ||
    (name.includes('compliance audit') && name.includes('sox'))
  ) {
    return []
  }

  if (
    name.includes('coach') ||
    name.includes('calibrat') ||
    name.includes('policy interpretation') ||
    name.includes('guidance authoring') ||
    (name.includes('specialist coaching') && !name.includes('system'))
  ) {
    return []
  }

  if (
    (name.includes('spam') || name.includes('bot')) &&
    (name.includes('email') || name.includes('vendor email') || name.includes('filter'))
  ) {
    return []
  }

  const isReportingTask =
    name.includes('operational report') ||
    (name.includes('daily') && name.includes('report')) ||
    (name.includes('weekly') && name.includes('report')) ||
    name.includes('compile') ||
    name.includes('dashboard') ||
    (name.includes('transaction') && name.includes('volume')) ||
    (name.includes('report') && !name.includes('financial statement'))

  const isReconTask =
    name.includes('reconcil') || name.includes('recon break') || name.includes('settlement matching')
  const isMultiEntity =
    name.includes('multi-entity') || name.includes('intercompany') || name.includes('multi entity')

  if (isReconTask) {
    add(
      TECH_STACK.blackline,
      'BlackLine specializes in reconciliation automation — 70%+ straight-through match on routine breaks.',
    )
    if (isMultiEntity) {
      add(
        TECH_STACK.sap_s4hana,
        'SAP S/4HANA provides multi-entity GL, consolidation, and chart-of-accounts backbone for complex reconciliations.',
        'complementary',
      )
    }
  }

  if (name.includes('intercompany') && (name.includes('settlement') || name.includes('matching'))) {
    add(
      TECH_STACK.blackline,
      'BlackLine supports intercompany matching, settlement, and exception workflows.',
    )
    add(
      TECH_STACK.sap_s4hana,
      'SAP feeds intercompany balances and elimination rules into the reconciliation process.',
      'complementary',
    )
  }

  if (name.includes('payment file') && (name.includes('upload') || name.includes('valid'))) {
    add(TECH_STACK.highradius, 'HighRadius ingests and validates payment files against AR and cash application rules.')
    add(
      TECH_STACK.oracle_fusion,
      'Oracle Fusion cash management can post validated payment files into the GL.',
      'complementary',
    )
  }

  if (
    name.includes('invoice') &&
    (name.includes('data entry') || name.includes('process') || name.includes('capture') || name.includes('routine'))
  ) {
    add(TECH_STACK.highradius, 'HighRadius automates AR/invoice workflows with 90%+ accuracy on structured PDFs.')
  }

  if (
    name.includes('vendor') &&
    (name.includes('onboard') ||
      name.includes('management') ||
      name.includes('procurement') ||
      name.includes('inquiry') ||
      name.includes('triage') ||
      name.includes('response'))
  ) {
    add(TECH_STACK.coupa, 'Coupa handles vendor lifecycle, inquiry triage, and procurement workflows end-to-end.')
    if (name.includes('inquiry') || name.includes('triage') || name.includes('response')) {
      add(
        TECH_STACK.zendesk,
        'Zendesk can route and track vendor inquiries when communication is ticket-based.',
        'complementary',
      )
    }
  }

  if (name.includes('expense') && (name.includes('classification') || name.includes('approval'))) {
    add(TECH_STACK.oracle_fusion, 'Oracle Fusion automates expense routing and approval policy enforcement.')
  }

  if (
    name.includes('financial report') ||
    name.includes('financial statement') ||
    (name.includes('reporting') && name.includes('review')) ||
    (name.includes('reporting') && name.includes('adjustment'))
  ) {
    add(TECH_STACK.anaplan, 'Anaplan provides connected planning and reporting with audit-grade controls.')
    if (name.includes('reconcil') || name.includes('adjustment')) {
      add(
        TECH_STACK.blackline,
        'BlackLine ties reporting adjustments back to reconciled balances and audit trails.',
        'complementary',
      )
    }
  }

  if (
    (name.includes('subscription') || name.includes('billing')) &&
    (name.includes('recurring') || name.includes('subscription'))
  ) {
    add(TECH_STACK.zuora, 'Zuora is purpose-built for subscription billing and revenue recognition.')
  }

  if (
    (name.includes('ticket') ||
      name.includes('triage') ||
      name.includes('inquiry') ||
      (name.includes('routing') && !name.includes('expense') && !name.includes('approval'))) &&
    !name.includes('vendor')
  ) {
    if (name.includes('it') || name.includes('incident') || name.includes('support ticket')) {
      add(TECH_STACK.servicenow, 'ServiceNow ITSM automates ticket triage, routing, and SLA management.')
    } else {
      add(TECH_STACK.zendesk, 'Zendesk handles inquiry routing and ticket workflows with built-in AI triage.')
    }
  }

  if (name.includes('lead') || name.includes('crm') || name.includes('customer record')) {
    if (name.includes('enterprise') || name.includes('account')) {
      add(TECH_STACK.salesforce_crm, 'Salesforce Einstein automates lead scoring, routing, and engagement workflows.')
    } else {
      add(TECH_STACK.hubspot, 'HubSpot CRM automates lead capture and customer engagement workflows.')
    }
  }

  if (isReportingTask) {
    if (inputType === 'structured' || name.includes('transaction') || name.includes('volume')) {
      add(TECH_STACK.snowflake, 'Snowflake handles aggregation queries and dashboards over structured transaction data.')
    }
    add(
      TECH_STACK.ms_fabric,
      'Microsoft Fabric unifies data engineering, semantic models, and operational reporting.',
      out.some((r) => r.tech_id === TECH_STACK.snowflake.id) ? 'complementary' : 'primary',
    )
    if (name.includes('predict') || name.includes('forecast')) {
      add(
        TECH_STACK.databricks,
        'Databricks adds forecasting and anomaly models on top of the reporting data pipeline.',
        'complementary',
      )
    }
  }

  if (
    !isReportingTask &&
    (name.includes('predict') || name.includes('anomaly') || name.includes('forecast') || name.includes('ml model'))
  ) {
    add(TECH_STACK.databricks, 'Databricks supports ML model development, training, and serving at scale.')
    add(
      TECH_STACK.snowflake,
      'Snowflake stores feature data and model outputs for downstream reporting.',
      'complementary',
    )
  }

  if (
    name.includes('payroll') ||
    name.includes('benefits') ||
    name.includes('employee onboard') ||
    (name.includes('hr') && !name.includes('through'))
  ) {
    add(TECH_STACK.workday, 'Workday automates payroll, benefits administration, and HR workflows.')
  }

  if (name.includes('schedul') || name.includes('workforce')) {
    add(TECH_STACK.ms_dynamics_365, 'Microsoft Dynamics 365 supports workforce scheduling and resource planning.')
  }

  return out
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {ReturnType<typeof buildRecommendation> | null}
 */
export function recommendTechForTask(task) {
  const stack = recommendTechStackForTask(task)
  return stack[0] ?? null
}

/**
 * FinAxis-style sample tasks for local verification (not used in production UI).
 */
export const FINAXIS_SAMPLE_TASKS = [
  { task_name: 'Routine reconciliation breaks investigation', regulatory_constraint: false },
  { task_name: 'Routine invoice data entry', regulatory_constraint: false },
  { task_name: 'Vendor inquiry triage and response', regulatory_constraint: false },
  { task_name: 'Expense classification and approval routing', regulatory_constraint: false },
  { task_name: 'Workforce management and scheduling adjustments', regulatory_constraint: false },
  { task_name: 'Daily and weekly operational reporting', regulatory_constraint: false, input_data_type: 'structured' },
  { task_name: 'Complex multi-entity reconciliation', regulatory_constraint: false },
  { task_name: 'Financial reporting review and adjustment', regulatory_constraint: false },
  { task_name: 'Spam and bot vendor email filtering', regulatory_constraint: false },
  { task_name: 'Fraud investigation', regulatory_constraint: true },
  { task_name: 'AML/KYC verification', regulatory_constraint: true },
  { task_name: 'SOX compliance audit work', regulatory_constraint: true },
  { task_name: 'Quality calibration sessions', regulatory_constraint: false },
  { task_name: 'Specialist coaching', regulatory_constraint: false },
  { task_name: 'Policy interpretation', regulatory_constraint: false },
  { task_name: 'Payment file upload validation', regulatory_constraint: false },
  { task_name: 'Intercompany settlement matching', regulatory_constraint: false },
]
