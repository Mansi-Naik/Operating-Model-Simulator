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
 * @typedef {'exact' | 'partial' | 'speculative'} MatchQuality
 */

/**
 * @typedef {{
 *   capability: Capability,
 *   match_quality: MatchQuality,
 *   match_reasons: string[]
 * }} CapabilityMatch
 */

/**
 * @typedef {{
 *   input_data_type: InputDataType | string | null | undefined,
 *   task_type: TaskType | string | null | undefined,
 *   consequence_of_error: ConsequenceLevel | string | null | undefined,
 *   task_name?: string | null,
 *   regulatory_constraint?: boolean | null,
 *   data_logged?: boolean | null
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

/** Input types overlapping with generic "mixed" BPO workloads. */
const MIXED_BRIDGE_INPUT_TYPES = ['unstructured_text', 'structured', 'mixed', 'unstructured_image', 'unstructured_voice']

/** @type {Record<MatchQuality, number>} */
const MATCH_QUALITY_RANK = {
  exact: 0,
  partial: 1,
  speculative: 2,
}

/**
 * Copy task row and infer missing classifier fields from task_name (never throws).
 *
 * @param {TaskMatchShape | null | undefined} task
 * @returns {Record<string, unknown>}
 */
export function inferMissingFields(task) {
  if (!task || typeof task !== 'object') return {}
  try {
    /** @type {Record<string, unknown>} */
    const inferred = { ...task }
    const name = typeof task.task_name === 'string' ? task.task_name.toLowerCase() : ''

    if (!inferred.input_data_type && inferred.input_data_type !== '') {
      if (
        name.includes('voice') ||
        name.includes('call') ||
        name.includes('phone')
      ) {
        inferred.input_data_type = 'unstructured_voice'
      } else if (
        name.includes('image') ||
        name.includes('photo') ||
        name.includes('visual')
      ) {
        inferred.input_data_type = 'unstructured_image'
      } else if (name.includes('video')) {
        inferred.input_data_type = 'unstructured_video'
      } else if (
        name.includes('report') ||
        name.includes('compile') ||
        name.includes('dashboard') ||
        name.includes('data')
      ) {
        inferred.input_data_type = 'structured'
      } else if (name.includes('coach') || name.includes('calibrat')) {
        inferred.input_data_type = 'unstructured_text'
      } else {
        inferred.input_data_type = 'mixed'
      }
      inferred._input_data_type_inferred = true
    }

    if (!inferred.task_type && inferred.task_type !== '') {
      if (
        name.includes('compile') ||
        name.includes('report') ||
        name.includes('dashboard') ||
        name.includes('summary')
      ) {
        inferred.task_type = 'reporting'
      } else if (
        name.includes('coach') ||
        name.includes('audit') ||
        name.includes('investigate') ||
        name.includes('judge') ||
        name.includes('assess') ||
        name.includes('evaluate')
      ) {
        inferred.task_type = 'judgment'
      } else if (
        name.includes('escalate') ||
        name.includes('exception') ||
        name.includes('severe') ||
        name.includes('precedent')
      ) {
        inferred.task_type = 'edge-case'
      } else if (
        name.includes('schedule') ||
        name.includes('approve') ||
        name.includes('admin')
      ) {
        inferred.task_type = 'admin'
      } else {
        inferred.task_type = 'rule-based'
      }
      inferred._task_type_inferred = true
    }

    if (!inferred.consequence_of_error && inferred.consequence_of_error !== '') {
      if (task.regulatory_constraint === true) {
        inferred.consequence_of_error = 'critical'
      } else if (
        name.includes('csam') ||
        name.includes('terror') ||
        name.includes('fraud') ||
        name.includes('compliance') ||
        name.includes('kyc') ||
        name.includes('aml')
      ) {
        inferred.consequence_of_error = 'critical'
      } else if (
        name.includes('precedent') ||
        name.includes('policy') ||
        name.includes('escalat') ||
        name.includes('severe')
      ) {
        inferred.consequence_of_error = 'high'
      } else if (
        name.includes('spam') ||
        name.includes('bot') ||
        name.includes('routine') ||
        name.includes('basic')
      ) {
        inferred.consequence_of_error = 'low'
      } else {
        inferred.consequence_of_error = 'medium'
      }
      inferred._consequence_inferred = true
    }

    if (inferred.data_logged === null || inferred.data_logged === undefined) {
      if (
        name.includes('coach') ||
        name.includes('calibrat') ||
        name.includes('investigat')
      ) {
        inferred.data_logged = false
      } else {
        inferred.data_logged = true
      }
      inferred._data_logged_inferred = true
    }

    return inferred
  } catch {
    return { ...(task && typeof task === 'object' ? task : {}) }
  }
}

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
 * Returns true when the task consequence is handled by capability min gate.
 *
 * @param {ConsequenceLevel} capabilityLevel min_consequence_supported
 * @param {ConsequenceLevel} taskLevel
 * @returns {boolean}
 */
export function consequenceLevelGreaterOrEqual(capabilityLevel, taskLevel) {
  const cap = CONSEQUENCE_ORDER[capabilityLevel]
  const task = CONSEQUENCE_ORDER[taskLevel]
  if (typeof cap !== 'number' || typeof task !== 'number') return false
  return task >= cap
}

/**
 * For critical-impact tasks: only capabilities whose min threshold is high or critical.
 *
 * @param {ConsequenceLevel} capMin
 * @returns {boolean}
 */
function criticalTaskCapabilityAllowed(capMin) {
  return capMin === 'high' || capMin === 'critical'
}

/**
 * @param {Capability} cap
 * @param {string | null} inputNorm
 * @returns {{ exact: boolean, partial: boolean }}
 */
function inputMatchFlags(cap, inputNorm) {
  if (!inputNorm) return { exact: false, partial: false }
  if (cap.supports_input_types.includes(inputNorm)) return { exact: true, partial: false }
  if (inputNorm === 'mixed') {
    const hasBridge = cap.supports_input_types.some((t) => MIXED_BRIDGE_INPUT_TYPES.includes(t))
    return { exact: cap.supports_input_types.includes('mixed'), partial: !!hasBridge }
  }
  if (cap.supports_input_types.includes('mixed')) return { exact: false, partial: true }
  return { exact: false, partial: false }
}

/**
 * @param {Capability} cap
 * @param {string | null} taskNorm
 * @returns {{ exact: boolean, partial: boolean }}
 */
function taskMatchFlags(cap, taskNorm) {
  if (!taskNorm) return { exact: false, partial: false }
  if (cap.supports_task_types.includes(taskNorm)) return { exact: true, partial: false }
  /** Cross-family partials common in moderation / ops queues */
  const pairs = [
    ['rule-based', 'judgment'],
    ['judgment', 'rule-based'],
    ['admin', 'reporting'],
    ['reporting', 'admin'],
  ]
  const partialOk = pairs.some(
    ([a, b]) => taskNorm === a && cap.supports_task_types.includes(b),
  )
  return { exact: false, partial: partialOk }
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
 * Graded capability matches for imperfect intake data — includes exact, partial, and speculative tiers.
 * Regulatory-locked tasks return an empty list (caller should force human-only).
 *
 * @param {TaskMatchShape} task Raw task shape (possibly null classifier fields).
 * @returns {CapabilityMatch[]}
 */
export function matchCapabilities(task) {
  const enrichedTask = inferMissingFields(
    /** @type {TaskMatchShape} */ (task && typeof task === 'object' ? task : {}),
  )
  /** @typedef {Record<string, unknown>} ET */
  const et = /** @type {ET} */ (enrichedTask)

  if (et.regulatory_constraint === true) {
    return []
  }

  const inputNorm = normalizeInputDataType(
    typeof et.input_data_type === 'string' ? et.input_data_type : null,
  )
  const taskNorm = normalizeTaskType(typeof et.task_type === 'string' ? et.task_type : null)
  const consNorm = normalizeConsequenceLevel(
    typeof et.consequence_of_error === 'string' ? et.consequence_of_error : null,
  )
  /** @type {ConsequenceLevel} */
  const consLevel = consNorm ?? 'medium'
  const stakesLowMed = consLevel === 'low' || consLevel === 'medium'

  /** @type {CapabilityMatch[]} */
  const tieredMatches = []

  for (const cap of CAPABILITY_LIBRARY) {
    if (!consequenceLevelGreaterOrEqual(cap.min_consequence_supported, consLevel)) {
      continue
    }
    if (consLevel === 'critical' && !criticalTaskCapabilityAllowed(cap.min_consequence_supported)) {
      continue
    }

    const inF = inputMatchFlags(cap, inputNorm)
    const taF = taskMatchFlags(cap, taskNorm)

    const inputExact = inF.exact
    const taskExact = taF.exact

    const matureOk = cap.maturity === 'mature' || cap.maturity === 'mainstream'

    /** @type {MatchQuality | null} */
    let quality = null
    /** @type {string[]} */
    const reasons = []

    const exactTriple = inputExact && taskExact
    if (exactTriple) {
      quality = 'exact'
      reasons.push(
        'Input type, task type, and consequence severity are all within this capability envelope.',
      )
    } else {
      /** Relaxed on exactly one of input vs task; consequence gate already enforced above. */
      const partialBridged =
        (inputExact && taF.partial) || (inF.partial && taskExact)

      if (partialBridged) {
        quality = 'partial'
        if (inF.partial) {
          reasons.push(
            'Input channel matched via relaxed overlap (e.g. mixed workload vs text-heavy capability).',
          )
        }
        if (taF.partial) {
          reasons.push('Task modality matched via adjacent ops pattern.')
        }
        if (inputExact && !taskExact && taF.partial) {
          reasons.push('Task type bridges to adjacent supported roles.')
        }
        if (!inputExact && inF.partial && taskExact) {
          reasons.push('Input bridges while task type is an exact fit.')
        }
      } else {
        /** One structural axis exact, no partial bridge on the other — mature + low/medium only. */
        const structExactCount = Number(inputExact) + Number(taskExact)
        const speculativeEligible =
          stakesLowMed &&
          matureOk &&
          structExactCount === 1 &&
          !inF.partial &&
          !taF.partial

        if (speculativeEligible) {
          quality = 'speculative'
          reasons.push(
            'Only one classifier dimension lines up exactly; mature or mainstream tooling — exploratory fit.',
          )
        }
      }
    }

    if (quality) {
      tieredMatches.push({
        capability: cap,
        match_quality: /** @type {MatchQuality} */ (quality),
        match_reasons: [...reasons],
      })
    }
  }

  /** Keep best match_quality per capability id */
  tieredMatches.sort((a, b) => MATCH_QUALITY_RANK[a.match_quality] - MATCH_QUALITY_RANK[b.match_quality])

  /** @type {Map<string, CapabilityMatch>} */
  const byId = new Map()
  for (const m of tieredMatches) {
    const prev = byId.get(m.capability.id)
    if (
      !prev ||
      MATCH_QUALITY_RANK[m.match_quality] < MATCH_QUALITY_RANK[prev.match_quality] ||
      (m.match_quality === prev.match_quality &&
        m.capability.typical_accuracy > prev.capability.typical_accuracy)
    ) {
      byId.set(m.capability.id, m)
    }
  }

  /** @type {CapabilityMatch[]} */
  let ranked = [...byId.values()]

  ranked.sort((a, b) => {
    const d = MATCH_QUALITY_RANK[a.match_quality] - MATCH_QUALITY_RANK[b.match_quality]
    if (d !== 0) return d
    return b.capability.typical_accuracy - a.capability.typical_accuracy
  })

  /** Ensure at least one candidate when not regulatory-locked and not critical-with-no-high-min */
  const criticalNeedsHighMin = consLevel === 'critical'
  const hasAnyCoverage = ranked.length > 0

  if (!hasAnyCoverage && et.regulatory_constraint !== true) {
    if (criticalNeedsHighMin) {
      const pool = CAPABILITY_LIBRARY.filter(
        (c) =>
          consequenceLevelGreaterOrEqual(c.min_consequence_supported, consLevel) &&
          criticalTaskCapabilityAllowed(c.min_consequence_supported),
      )
      pool.sort((a, b) => b.typical_accuracy - a.typical_accuracy)
      const cap = pool[0]
      if (cap) {
        ranked = [
          {
            capability: cap,
            match_quality: 'partial',
            match_reasons: [
              'Critical severity: library narrowed to capabilities whose minimum supported consequence is high or critical.',
            ],
          },
        ]
      }
    } else {
      const pool = [...CAPABILITY_LIBRARY].filter((c) =>
        consequenceLevelGreaterOrEqual(c.min_consequence_supported, consLevel),
      )
      pool.sort((a, b) => {
        const ma = Number(criticalTaskCapabilityAllowed(a.min_consequence_supported))
        const mb = Number(criticalTaskCapabilityAllowed(b.min_consequence_supported))
        if (ma !== mb) return mb - ma
        return b.typical_accuracy - a.typical_accuracy
      })
      const picks = []
      const maturePreferred = pool.filter((c) => c.maturity === 'mature' || c.maturity === 'mainstream')
      const source =
        stakesLowMed && maturePreferred.length > 0 ? maturePreferred : pool
      for (const cap of source) {
        if (picks.length >= 3) break
        picks.push({
          capability: cap,
          match_quality: 'speculative',
          match_reasons: [
            'Fallback: retain mature library options so the model can reason from task text, not an empty list.',
          ],
        })
      }
      ranked = picks
    }
  }

  return ranked.slice(0, 5)
}
