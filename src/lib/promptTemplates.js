/**
 * @typedef {object} AllocationTask
 * @property {string} [id]
 * @property {string} [task_id]
 * @property {string} [task_name]
 * @property {string} [role_performing]
 * @property {string} [task_type]
 * @property {string} [input_data_type]
 * @property {string} [consequence_of_error]
 * @property {number | null} [volume_per_day]
 * @property {number | null} [avg_time_minutes]
 * @property {boolean | null} [regulatory_constraint]
 * @property {boolean | null} [data_logged]
 * @property {string} [source]
 */

/**
 * @typedef {object} CandidateCapability
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {number} [typical_accuracy]
 * @property {string[]} [supports_input_types]
 * @property {string[]} [supports_task_types]
 * @property {string} [min_consequence_supported]
 * @property {string} [maturity]
 */

/**
 * @typedef {object} EngagementContext
 * @property {string | null | undefined} [domain]
 * @property {string | null | undefined} [primary_priority] Primary business priority (e.g. from intake).
 * @property {string | null | undefined} [automation_appetite] e.g. conservative | balanced | aggressive
 * @property {string | null | undefined} [readiness_band] e.g. red | amber | green
 */

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function display(value, fallback = 'Not specified') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

/**
 * @param {AllocationTask | null | undefined} task
 * @returns {string}
 */
function formatTaskBlock(task) {
  if (!task || typeof task !== 'object') return '- (no task object provided)'
  /** @type {Array<[string, unknown]>} */
  const entries = [
    ['task_id', task.task_id],
    ['task_name', task.task_name],
    ['role_performing', task.role_performing],
    ['task_type', task.task_type],
    ['input_data_type', task.input_data_type],
    ['consequence_of_error', task.consequence_of_error],
    ['volume_per_day', task.volume_per_day],
    ['avg_time_minutes', task.avg_time_minutes],
    ['regulatory_constraint', task.regulatory_constraint],
    ['data_logged', task.data_logged],
    ['source', task.source],
  ]
  const lines = entries.map(([k, v]) => `- ${k}: ${display(v, 'Not specified')}`)
  return lines.join('\n')
}

/**
 * @param {CandidateCapability[]} caps
 * @returns {string}
 */
function formatCandidatesBlock(caps) {
  if (!Array.isArray(caps) || caps.length === 0) {
    return 'No candidate capabilities were matched for this task. Treat the candidate list as empty.'
  }
  return caps
    .map((c, i) => {
      const acc =
        typeof c.typical_accuracy === 'number' ? c.typical_accuracy.toFixed(2) : display(c.typical_accuracy)
      return [
        `### Candidate ${i + 1}: ${display(c.id)} (${display(c.name)})`,
        `- description: ${display(c.description)}`,
        `- typical_accuracy (documented): ${acc}`,
        `- supports_input_types: ${Array.isArray(c.supports_input_types) ? c.supports_input_types.join(', ') : display(c.supports_input_types)}`,
        `- supports_task_types: ${Array.isArray(c.supports_task_types) ? c.supports_task_types.join(', ') : display(c.supports_task_types)}`,
        `- min_consequence_supported: ${display(c.min_consequence_supported)}`,
        `- maturity: ${display(c.maturity)}`,
      ].join('\n')
    })
    .join('\n\n')
}

/**
 * @param {EngagementContext | null | undefined} ctx
 * @returns {string}
 */
function formatEngagementBlock(ctx) {
  const c = ctx && typeof ctx === 'object' ? ctx : {}
  return [
    `- domain: ${display(c.domain)}`,
    `- primary_priority: ${display(c.primary_priority)}`,
    `- automation_appetite: ${display(c.automation_appetite)}`,
    `- readiness_band: ${display(c.readiness_band)}`,
  ].join('\n')
}

const FEW_SHOT_EXAMPLES = `
## Few-shot examples (follow the same JSON shape and reasoning discipline)

### Example 1 — clear automate
**Task:** "Compile daily volume report" — rule-based, structured input, low consequence, data logged.
**Candidates:** rpa_workflow, llm_summarization

**Output:**
{"allocation":"tech-automated","confidence":0.92,"primary_capability":"rpa_workflow","rationale":"The work is highly structured, rule-based, and low risk with telemetry in place. RPA can reliably pull and aggregate the same fields each day with minimal judgment.","risk_factors":["Upstream data schema changes could break the bot until remapped."],"prerequisites":["Source systems expose stable APIs or UI selectors for the report fields."]}

### Example 2 — clear human-only
**Task:** "Escalate severe safety case" — edge-case, mixed input, critical consequence, regulatory_constraint true.
**Candidates:** confidence_routing

**Output:**
{"allocation":"human-only","confidence":1.0,"primary_capability":null,"rationale":"Regulatory and safety escalation requires accountable human decision-making; automation must not own the final call. Even routing models are insufficient when policy mandates human review.","risk_factors":["Legal exposure and duty-of-care obligations if an algorithm triages safety incorrectly."],"prerequisites":[]}

### Example 3 — nuanced tech-assisted
**Task:** "Review flagged post against policy" — rule-based, mixed input, medium consequence, data logged.
**Candidates:** content_moderation_classifier, image_classifier

**Output:**
{"allocation":"tech-assisted","confidence":0.78,"primary_capability":"content_moderation_classifier","rationale":"A classifier can prioritize and pre-label policy risk across mixed media, but final judgment on edge cases should stay with trained moderators. Assistance reduces queue time without removing human accountability.","risk_factors":["Ambiguous policy boundaries and adversarial content can confuse models."],"prerequisites":["Clear escalation paths and audit logs for moderator overrides."]}
`.trim()

const OUTPUT_SCHEMA = `
## Required JSON output (exact keys and types)

Return a single JSON object with these fields only (no extra keys):
- "allocation": string, one of "human-only" | "tech-assisted" | "tech-automated"
- "confidence": number from 0.0 to 1.0
- "primary_capability": string (must be exactly one of the candidate \`id\` values below) or null if human-only
- "rationale": string, 2-3 sentences, plain language
- "risk_factors": array of strings, 1-3 short items
- "prerequisites": array of strings, 0-3 short items (what must be true before this allocation works)
`.trim()

const CONSTRAINTS = `
## Hard constraints (must follow)

1. If task.consequence_of_error is "critical", do NOT recommend "tech-automated" unless the chosen candidate capability has documented typical_accuracy strictly above 0.99 (none of the provided candidates may qualify—default to tech-assisted or human-only with explanation).
2. If task.regulatory_constraint is true, you MUST set allocation to "human-only" and primary_capability to null.
3. If task.data_logged is false, treat observability as weak: reflect that in your reasoning and reduce confidence by approximately 0.2 versus what you would otherwise assign (still clamp confidence to [0,1]).
4. Cite a specific capability by its candidate \`id\` when recommending tech-assisted or tech-automated; do not invent capabilities outside the candidate list.
5. If there are no candidate capabilities, recommend "human-only" with a rationale that no listed AI capability fits the task shape and stakes.
`.trim()

/**
 * Builds the full natural-language prompt to send to Gemini for task allocation analysis.
 *
 * @param {AllocationTask | null | undefined} task — Task row (or equivalent) with intake/matching fields.
 * @param {CandidateCapability[]} candidateCapabilities — Capabilities from the library (e.g. from \`matchCapabilities\`).
 * @param {EngagementContext | null | undefined} engagementContext — Domain, priorities, appetite, readiness.
 * @returns {string} Prompt body only; caller supplies model and API parameters.
 */
export function buildAllocationPrompt(task, candidateCapabilities, engagementContext) {
  const candidateIds =
    Array.isArray(candidateCapabilities) && candidateCapabilities.length > 0
      ? candidateCapabilities.map((c) => c?.id).filter(Boolean).join(', ')
      : '(none)'

  const parts = [
    'You are an operations consultant analyzing whether a specific task should be done by humans, with AI assistance, or fully automated.',
    '',
    '---',
    '',
    '## Current task',
    formatTaskBlock(task),
    '',
    '## Candidate AI / automation capabilities',
    `Valid capability ids for primary_capability: ${candidateIds}`,
    '',
    formatCandidatesBlock(Array.isArray(candidateCapabilities) ? candidateCapabilities : []),
    '',
    '## Engagement context',
    formatEngagementBlock(engagementContext),
    '',
    '---',
    '',
    FEW_SHOT_EXAMPLES,
    '',
    '---',
    '',
    OUTPUT_SCHEMA,
    '',
    '---',
    '',
    CONSTRAINTS,
    '',
    '---',
    '',
    'Return ONLY the JSON object, no markdown formatting, no code fences, no additional text.',
  ]

  return parts.join('\n')
}
