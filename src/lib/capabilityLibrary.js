/**
 * @typedef {'structured' | 'unstructured_text' | 'unstructured_voice' | 'unstructured_image' | 'unstructured_video' | 'mixed'} InputDataType
 */

/**
 * @typedef {'rule-based' | 'judgment' | 'edge-case' | 'admin' | 'reporting'} TaskType
 */

/**
 * @typedef {'low' | 'medium' | 'high' | 'critical'} ConsequenceLevel
 */

/**
 * @typedef {'emerging' | 'mainstream' | 'mature'} Maturity
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   description: string,
 *   supports_input_types: InputDataType[],
 *   supports_task_types: TaskType[],
 *   typical_accuracy: number,
 *   min_consequence_supported: ConsequenceLevel,
 *   implementation_effort_weeks: number,
 *   monthly_cost_per_pod: number,
 *   maturity: Maturity,
 *   example_use_cases: string[]
 * }} Capability
 */

/**
 * @typedef {{
 *   input_data_type: InputDataType | string | null | undefined,
 *   task_type: TaskType | string | null | undefined,
 *   consequence_of_error: ConsequenceLevel | string | null | undefined,
 *   task_name?: string | null
 * }} TaskMatchShape
 */

/** Ordered consequence severity (low → critical). */
const CONSEQUENCE_ORDER = /** @type {const} */ ({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
})

/** Canonical input types (must match capability `supports_input_types` literals). */
const CANONICAL_INPUT_TYPES = new Set([
  'structured',
  'unstructured_text',
  'unstructured_voice',
  'unstructured_image',
  'unstructured_video',
  'mixed',
])

/** Canonical task types (must match capability `supports_task_types` literals). */
const CANONICAL_TASK_TYPES = new Set(['rule-based', 'judgment', 'edge-case', 'admin', 'reporting'])

/**
 * Normalizes free-form / DB task fields to library enums (case, spaces, common aliases).
 *
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function normalizeInputDataType(value) {
  if (value == null || typeof value !== 'string') return null
  let s = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  const alias = {
    unstructuredtext: 'unstructured_text',
    unstructured_text: 'unstructured_text',
    unstructuredvoice: 'unstructured_voice',
    unstructured_voice: 'unstructured_voice',
    unstructuredimage: 'unstructured_image',
    unstructured_image: 'unstructured_image',
    unstructuredvideo: 'unstructured_video',
    unstructured_video: 'unstructured_video',
    mixed: 'mixed',
    structured: 'structured',
  }
  const key = s.replace(/_/g, '') // e.g. unstructuredtext
  const mapped = alias[s] ?? alias[key] ?? (CANONICAL_INPUT_TYPES.has(s) ? s : null)
  return mapped
}

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function normalizeTaskType(value) {
  if (value == null || typeof value !== 'string') return null
  let s = value.trim().toLowerCase().replace(/\s+/g, '_')
  s = s.replace(/_/g, '-')
  /** @type {Record<string, TaskType>} */
  const aliases = {
    'rule-based': 'rule-based',
    rule: 'rule-based',
    'judgment-based': 'judgment',
    judgment: 'judgment',
    'edge-case': 'edge-case',
    edge: 'edge-case',
    admin: 'admin',
    reporting: 'reporting',
    creative: 'reporting',
    relationship: 'admin',
  }
  const mapped = aliases[s] ?? null
  return mapped && CANONICAL_TASK_TYPES.has(mapped) ? mapped : null
}

/**
 * @param {string | null | undefined} value
 * @returns {ConsequenceLevel | null}
 */
function normalizeConsequenceLevel(value) {
  if (value == null || typeof value !== 'string') return null
  const s = value.trim().toLowerCase()
  if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s
  return null
}

/**
 * Returns true when the task's consequence is at or above the capability's minimum threshold
 * (`min_consequence_supported`): the stakes are high enough that this automation is appropriate.
 *
 * Equivalently for `consequenceLevels = ['low','medium','high','critical']`:
 * `consequenceOK = consequenceLevels.indexOf(task.consequence_of_error)
 *   >= consequenceLevels.indexOf(cap.min_consequence_supported)`
 *
 * @param {ConsequenceLevel} capabilityLevel `min_consequence_supported` from a capability.
 * @param {ConsequenceLevel} taskLevel `consequence_of_error` from a task.
 * @returns {boolean}
 */
export function consequenceLevelGreaterOrEqual(capabilityLevel, taskLevel) {
  const cap = CONSEQUENCE_ORDER[capabilityLevel]
  const task = CONSEQUENCE_ORDER[taskLevel]
  if (typeof cap !== 'number' || typeof task !== 'number') return false
  return task >= cap
}

/**
 * Lookup table of AI/automation capabilities for matching tasks (F2).
 *
 * @type {readonly Capability[]}
 */
export const CAPABILITY_LIBRARY = Object.freeze([
  {
    id: 'image_classifier',
    name: 'Image classifier',
    description:
      'Automates visual categorization by assigning labels or classes to images at scale.',
    supports_input_types: ['unstructured_image'],
    supports_task_types: ['rule-based', 'judgment'],
    typical_accuracy: 0.92,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 8,
    monthly_cost_per_pod: 2000,
    maturity: 'mature',
    example_use_cases: [
      'Document type detection from scans',
      'Product defect screening on a line',
      'Satellite imagery land-use tagging',
    ],
  },
  {
    id: 'auto_classification_text',
    name: 'Text auto-classification',
    description:
      'Routes or triages unstructured text into queues, topics, or intents using ML classification.',
    supports_input_types: ['unstructured_text'],
    supports_task_types: ['rule-based', 'judgment'],
    typical_accuracy: 0.88,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 4,
    monthly_cost_per_pod: 1500,
    maturity: 'mature',
    example_use_cases: [
      'Email routing by department',
      'Ticket intent tagging',
      'FAQ bucket assignment',
    ],
  },
  {
    id: 'speech_analytics',
    name: 'Speech analytics',
    description:
      'Derives sentiment, keywords, and themes from voice interactions for QA and insight.',
    supports_input_types: ['unstructured_voice'],
    supports_task_types: ['judgment', 'reporting'],
    typical_accuracy: 0.85,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 12,
    monthly_cost_per_pod: 3500,
    maturity: 'mature',
    example_use_cases: [
      'Call-center sentiment dashboards',
      'Compliance phrase spotting',
      'Sales coaching highlights',
    ],
  },
  {
    id: 'llm_summarization',
    name: 'LLM summarization',
    description:
      'Condenses long documents or threads into concise bullet summaries for faster review.',
    supports_input_types: ['unstructured_text'],
    supports_task_types: ['reporting', 'admin'],
    typical_accuracy: 0.9,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 4,
    monthly_cost_per_pod: 1200,
    maturity: 'mainstream',
    example_use_cases: [
      'Executive briefs from reports',
      'Case notes recap',
      'Meeting transcript highlights',
    ],
  },
  {
    id: 'llm_drafting',
    name: 'LLM drafting',
    description:
      'Generates first-draft replies, emails, or internal notes from prompts and context.',
    supports_input_types: ['unstructured_text'],
    supports_task_types: ['admin', 'reporting'],
    typical_accuracy: 0.85,
    min_consequence_supported: 'low',
    implementation_effort_weeks: 4,
    monthly_cost_per_pod: 1500,
    maturity: 'mainstream',
    example_use_cases: [
      'Customer reply drafts',
      'Internal memo starters',
      'Status update templates',
    ],
  },
  {
    id: 'auto_qa',
    name: 'Automated QA scoring',
    description:
      'Scores transactions or interactions against rubrics to flag outliers and quality drift.',
    supports_input_types: ['mixed'],
    supports_task_types: ['judgment', 'reporting'],
    typical_accuracy: 0.8,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 16,
    monthly_cost_per_pod: 4000,
    maturity: 'mainstream',
    example_use_cases: [
      'Contact-center QA sampling',
      'Loan file completeness checks',
      'Claims handling consistency',
    ],
  },
  {
    id: 'rpa_workflow',
    name: 'RPA workflow',
    description:
      'Automates repetitive structured-data steps across systems without changing backends.',
    supports_input_types: ['structured'],
    supports_task_types: ['rule-based', 'admin'],
    typical_accuracy: 0.95,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 6,
    monthly_cost_per_pod: 1800,
    maturity: 'mature',
    example_use_cases: [
      'Form-to-ERP data entry',
      'Scheduled batch reconciliations',
      'Account provisioning scripts',
    ],
  },
  {
    id: 'agent_assist_copilot',
    name: 'Agent-assist copilot',
    description:
      'Surfaces next-best-action, policy snippets, and knowledge during live customer contacts.',
    supports_input_types: ['mixed'],
    supports_task_types: ['judgment'],
    typical_accuracy: 0.82,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 10,
    monthly_cost_per_pod: 3000,
    maturity: 'emerging',
    example_use_cases: [
      'Live troubleshooting hints',
      'Policy lookup during chat',
      'Upsell eligibility nudges',
    ],
  },
  {
    id: 'translation',
    name: 'Translation',
    description:
      'Converts text or speech between languages while preserving intent for operational use.',
    supports_input_types: ['unstructured_text', 'unstructured_voice'],
    supports_task_types: ['rule-based'],
    typical_accuracy: 0.93,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 4,
    monthly_cost_per_pod: 800,
    maturity: 'mature',
    example_use_cases: [
      'Multilingual support queues',
      'Localized knowledge articles',
      'Voice IVR language switching',
    ],
  },
  {
    id: 'document_extraction',
    name: 'Document extraction',
    description:
      'Pulls structured fields from PDFs, scans, and forms for downstream systems.',
    supports_input_types: ['unstructured_text'],
    supports_task_types: ['admin', 'rule-based'],
    typical_accuracy: 0.91,
    min_consequence_supported: 'high',
    implementation_effort_weeks: 8,
    monthly_cost_per_pod: 2200,
    maturity: 'mature',
    example_use_cases: [
      'Invoice field capture',
      'KYC document parsing',
      'Medical intake forms',
    ],
  },
  {
    id: 'content_moderation_classifier',
    name: 'Content moderation classifier',
    description:
      'Pre-screens user-generated text and images for policy breaches before human review.',
    // Text/image/mixed UGC; low-consequence tasks excluded via min_consequence_supported (e.g. coaching).
    supports_input_types: ['unstructured_text', 'unstructured_image', 'mixed'],
    supports_task_types: ['rule-based', 'judgment'],
    typical_accuracy: 0.89,
    min_consequence_supported: 'medium',
    implementation_effort_weeks: 12,
    monthly_cost_per_pod: 5000,
    maturity: 'mainstream',
    example_use_cases: [
      'UGC queue triage',
      'Brand safety on uploads',
      'Chat toxicity scoring',
    ],
  },
  {
    id: 'anomaly_detection',
    name: 'Anomaly detection',
    description:
      'Flags unusual patterns in tabular or event streams for investigation.',
    supports_input_types: ['structured'],
    supports_task_types: ['judgment', 'reporting'],
    typical_accuracy: 0.86,
    min_consequence_supported: 'high',
    implementation_effort_weeks: 10,
    monthly_cost_per_pod: 2500,
    maturity: 'mainstream',
    example_use_cases: [
      'Fraud transaction alerts',
      'IoT sensor drift',
      'Billing leakage signals',
    ],
  },
  {
    id: 'confidence_routing',
    name: 'Confidence routing',
    description:
      'Sends low-confidence model outputs to humans while auto-handling high-confidence cases.',
    supports_input_types: ['mixed'],
    supports_task_types: ['judgment'],
    typical_accuracy: 0.95,
    min_consequence_supported: 'critical',
    implementation_effort_weeks: 6,
    monthly_cost_per_pod: 1000,
    maturity: 'mature',
    example_use_cases: [
      'HITL escalation workflows',
      'Model score thresholds',
      'Audit sampling triggers',
    ],
  },
])

/**
 * Returns capabilities that match a task by input type, task type, and consequence ceiling,
 * sorted by `typical_accuracy` descending, at most five entries.
 *
 * @param {TaskMatchShape} task
 * @returns {Capability[]}
 */
export function matchCapabilities(task) {
  const inputNorm = normalizeInputDataType(task.input_data_type)
  const taskNorm = normalizeTaskType(task.task_type)
  const consNorm = normalizeConsequenceLevel(task.consequence_of_error)

  /** @type {Capability[]} */
  const matches = []
  for (const cap of CAPABILITY_LIBRARY) {
    const input_match = inputNorm != null && cap.supports_input_types.includes(inputNorm)
    const task_match = taskNorm != null && cap.supports_task_types.includes(taskNorm)
    const consequence_ok =
      consNorm != null &&
      consequenceLevelGreaterOrEqual(cap.min_consequence_supported, consNorm)
    const overall_match = input_match && task_match && consequence_ok

    if (overall_match) matches.push(cap)
  }

  matches.sort((a, b) => b.typical_accuracy - a.typical_accuracy)
  return matches.slice(0, 5)
}
