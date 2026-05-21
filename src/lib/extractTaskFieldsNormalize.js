/**
 * Normalize F2-critical task classifier fields after extraction or re-extraction.
 */

export const INPUT_DATA_TYPES = new Set([
  'structured',
  'unstructured_text',
  'unstructured_image',
  'unstructured_video',
  'unstructured_voice',
  'mixed',
])

export const CONSEQUENCE_LEVELS = new Set(['low', 'medium', 'high', 'critical'])

const TASK_TYPES = new Set(['rule-based', 'judgment', 'edge-case', 'admin', 'reporting'])

/**
 * @param {Record<string, unknown>} t
 * @param {{ includeTaskType?: boolean }} [opts]
 */
export function normalizeExtractedTaskFields(t, opts = {}) {
  const name = String(t.task_name ?? '').toLowerCase()
  const role = String(t.role_performing ?? '').toLowerCase()
  const blob = `${name} ${role}`

  let input_data_type =
    typeof t.input_data_type === 'string' ? t.input_data_type.trim().toLowerCase() : ''
  if (!INPUT_DATA_TYPES.has(input_data_type)) {
    if (/\b(call|voice|audio|phone)\b/.test(blob)) input_data_type = 'unstructured_voice'
    else if (/\b(image|photo|visual)\b/.test(blob)) input_data_type = 'unstructured_image'
    else if (/\b(video|stream|clip|recording)\b/.test(blob)) input_data_type = 'unstructured_video'
    else if (/\b(report|dashboard|metric|database|form|log|record)\b/.test(blob)) input_data_type = 'structured'
    else if (/\b(review|comment|email|chat|document|post|text|article)\b/.test(blob)) {
      input_data_type = 'unstructured_text'
    } else input_data_type = 'mixed'
  }

  let consequence_of_error =
    typeof t.consequence_of_error === 'string' ? t.consequence_of_error.trim().toLowerCase() : ''
  if (!CONSEQUENCE_LEVELS.has(consequence_of_error)) {
    if (/\b(csam|terror|self[- ]?harm|suicide|aml|kyc|child safety|zero tolerance)\b/.test(blob)) {
      consequence_of_error = 'critical'
    } else if (/\b(severe|violence|hate|fraud|harassment|high severity)\b/.test(blob)) {
      consequence_of_error = 'high'
    } else if (/\b(spam|routing)\b/.test(blob)) {
      consequence_of_error = 'low'
    } else {
      consequence_of_error = 'medium'
    }
  }

  let data_logged = t.data_logged
  if (typeof data_logged !== 'boolean') {
    if (/\b(coach|calibration|policy meeting|off[- ]?system|informal|ad[- ]?hoc)\b/.test(blob)) {
      data_logged = false
    } else {
      data_logged = true
    }
  }

  let regulatory_constraint = t.regulatory_constraint
  if (typeof regulatory_constraint !== 'boolean') {
    if (
      /\b(fincen|occ|gdpr|ccpa|dsa|osa|fosta|sesta|coppa|hipaa|pci|aml|kyc|sec|finra|ofac|esafety|ftc|cfpb|regulatory|csam|child safety|self[- ]?harm|human[- ]?only|must be human|certification required)\b/.test(
        blob,
      )
    ) {
      regulatory_constraint = true
    } else if (
      /\b(admin|routine|reporting|compile)\b/.test(blob) &&
      !/\b(moderat|fraud|compliance|safety|harassment|violence)\b/.test(blob) &&
      (consequence_of_error === 'low' || consequence_of_error === 'medium')
    ) {
      regulatory_constraint = false
    } else {
      regulatory_constraint = true
    }
  }

  const out = {
    input_data_type,
    consequence_of_error,
    data_logged,
    regulatory_constraint,
  }

  if (opts.includeTaskType) {
    let task_type = typeof t.task_type === 'string' ? t.task_type.trim().toLowerCase() : ''
    if (!TASK_TYPES.has(task_type)) {
      if (/\b(escalat|exception|edge)\b/.test(blob)) task_type = 'edge-case'
      else if (/\b(report|dashboard|compile)\b/.test(blob)) task_type = 'reporting'
      else if (/\b(setup|configure|admin)\b/.test(blob)) task_type = 'admin'
      else if (/\b(classify|disposition|policy review)\b/.test(blob)) task_type = 'rule-based'
      else task_type = 'judgment'
    }
    return { ...out, task_type }
  }

  return out
}

/**
 * @param {Record<string, unknown>} t
 */
export function normalizeExtractedTask(t) {
  const fields = normalizeExtractedTaskFields(t, { includeTaskType: true })
  return { ...t, ...fields }
}

/**
 * @param {unknown} meta
 * @returns {string | null}
 */
export function getSourceDocumentTextFromMetadata(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const m = /** @type {Record<string, unknown>} */ (meta)
  for (const key of ['source_document_text', 'source_text', 'extracted_text', 'document_text']) {
    const v = m[key]
    if (typeof v === 'string' && v.trim().length >= 50) return v.trim()
  }
  return null
}
