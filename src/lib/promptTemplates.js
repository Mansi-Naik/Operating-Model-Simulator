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
 * @typedef {object} CandidateCapabilityCore
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
 * Graded match from `matchCapabilities` (wraps the library capability).
 *
 * @typedef {object} CandidateCapabilityMatch
 * @property {CandidateCapabilityCore} capability
 * @property {'exact' | 'partial' | 'speculative'} match_quality
 * @property {string[]} match_reasons
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
 * @param {CandidateCapabilityMatch[] | CandidateCapabilityCore[]} caps
 * @returns {CandidateCapabilityMatch[]}
 */
function normalizeCapabilityMatches(caps) {
  if (!Array.isArray(caps)) return []
  /** @type {CandidateCapabilityMatch[]} */
  const out = []
  for (const raw of caps) {
    if (!raw || typeof raw !== 'object') continue
    if ('capability' in raw && raw.capability && typeof raw.capability === 'object') {
      /** @type {'exact'|'partial'|'speculative'} */
      const mq =
        raw.match_quality === 'partial'
          ? 'partial'
          : raw.match_quality === 'speculative'
            ? 'speculative'
            : 'exact'
      /** @type {CandidateCapabilityMatch} */
      const m = {
        capability: /** @type {CandidateCapabilityCore} */ (raw.capability),
        match_quality: mq,
        match_reasons: Array.isArray(raw.match_reasons) ? raw.match_reasons.map(String) : [],
      }
      out.push(m)
      continue
    }
    /** @type {CandidateCapabilityCore} */
    const c = /** @type {CandidateCapabilityCore} */ (raw)
    if (typeof c.id === 'string') {
      out.push({ capability: c, match_quality: 'exact', match_reasons: [] })
    }
  }
  return out
}

/**
 * @param {CandidateCapabilityMatch[]} caps
 * @returns {string}
 */
function formatCandidatesBlock(caps) {
  const matches = normalizeCapabilityMatches(caps)
  if (matches.length === 0) {
    return [
      '### Section C — Capability candidates',
      'No structured candidate capabilities were supplied for this request (rare).',
      '',
      'If NO candidates are provided at all (rare), do not automatically recommend human-only. Instead:',
      '1. Read the task description carefully.',
      `2. Reason from first principles: could THIS task be done with current AI technology in general? Examples of automatable work: high-volume pattern matching, structured data processing, template-based outputs, classification with clear rules.`,
      `3. If the task description suggests automatable work, recommend tech-assisted with confidence 0.5-0.6 and rationale framing like: \"No exact capability match in library, but task profile suggests AI assistance is feasible. Recommended for further capability scoping.\" You may set primary_capability to null in that scenario.`,
      '4. Only recommend human-only with high confidence when regulatory_constraint is true (lock), the task involves nuanced human judgment/coaching/relationship work, or consequence_of_error is critical AND no suitable AI technology exists.',
    ].join('\n')
  }
  const body = matches
    .map((m, i) => {
      const c = m.capability
      const acc =
        typeof c.typical_accuracy === 'number' ? c.typical_accuracy.toFixed(2) : display(c.typical_accuracy)
      const reasons =
        Array.isArray(m.match_reasons) && m.match_reasons.length > 0
          ? `\n- match_reasons: ${m.match_reasons.map((r) => String(r)).join(' | ')}`
          : ''
      return [
        `### Candidate ${i + 1}: ${display(c.id)} (${display(c.name)})`,
        `- match_quality: ${display(m.match_quality)}`,
        reasons,
        `- description: ${display(c.description)}`,
        `- typical_accuracy (documented): ${acc}`,
        `- supports_input_types: ${Array.isArray(c.supports_input_types) ? c.supports_input_types.join(', ') : display(c.supports_input_types)}`,
        `- supports_task_types: ${Array.isArray(c.supports_task_types) ? c.supports_task_types.join(', ') : display(c.supports_task_types)}`,
        `- min_consequence_supported: ${display(c.min_consequence_supported)}`,
        `- maturity: ${display(c.maturity)}`,
      ]
        .filter((line) => line !== '')
        .join('\n')
    })
    .join('\n\n')
  return [
    '### Section C — Capability candidates',
    'You have been provided a list of candidate capabilities. Each has a match_quality tag:',
    '',
    '- "exact": candidates strongly match the task\'s data type, task type, and consequence threshold. Use these confidently.',
    '- "partial": candidates align on most classifier dimensions; uncertainty may remain — note that in rationale.',
    '- "speculative": weak overlap but mature tooling — use only when volume or payoff justifies experimentation; lower confidence.',
    '',
    body,
    '',
    `If structured candidates are sparse or mostly speculative, still reason from the task narrative; do not collapse to human-only solely because match_quality is not "exact".`,
    '',
    `If truly no candidates are listed above, follow the first-principles branch in the empty-candidate instructions (do not default to human-only).`,
  ].join('\n')
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

### Example 4 — speculative library match → still tech-assisted
**Task:** "High-volume routine ticket tagging for spam-like abuse" — rule-based, mixed input, medium consequence, data logged.
**Candidates:** auto_classification_text (match_quality: speculative)

**Output:**
{"allocation":"tech-assisted","confidence":0.58,"primary_capability":"auto_classification_text","rationale":"Library match is speculative, but the work is high-volume pattern routing with clear rubric signals; text classification tooling is mature enough to accelerate triage while humans handle appeals. Confidence is moderated because classifier fit is not exact.","risk_factors":["Label drift if abuse tactics change; bilingual edge cases"],"prerequisites":["Gold-label set refreshed regularly and override workflow for disputed tags."]}
`.trim()

const OUTPUT_SCHEMA = `
## Required JSON output (exact keys and types)

Return a single JSON object with these fields only (no extra keys):
- "allocation": string, one of "human-only" | "tech-assisted" | "tech-automated"
- "confidence": number from 0.0 to 1.0
- "primary_capability": string (preferred: exactly one candidate \`id\` listed below when you lean on the library) or null for human-only, or null for tech-assisted / tech-automated when you document a first-principles AI path with no fitting library id (rare — explain in rationale)
- "rationale": string, 2-3 sentences, plain language
- "risk_factors": array of strings, 1-3 short items
- "prerequisites": array of strings, 0-3 short items (what must be true before this allocation works)
`.trim()

const CONSTRAINTS = `
## Hard constraints (must follow)

1. If task.consequence_of_error is "critical", do NOT recommend "tech-automated" unless the chosen candidate capability has documented typical_accuracy strictly above 0.99 (none of the provided candidates may qualify—default to tech-assisted or human-only with explanation).
2. If task.regulatory_constraint is true, you MUST set allocation to "human-only" and primary_capability to null.
3. If task.data_logged is false, treat observability as weak: reflect that in your reasoning and reduce confidence by approximately 0.2 versus what you would otherwise assign (still clamp confidence to [0,1]).
4. When candidate capabilities include a plausible id for tech-assisted / tech-automated, cite that \`id\` as primary_capability. Never invent ids that do not appear in the candidate roster. Exception: truly empty candidate roster or first-principles AI fit with no roster id → primary_capability may be null while still recommending tech-assisted with confidence ~0.5–0.6 and explicit rationale.
5. **Deprecated:** do not interpret an empty roster as mandatory human-only. Empty or weak-match rosters still require qualitative reasoning against the task text (Section C spells out the fallback).
`.trim()

/**
 * Builds the full natural-language prompt to send to Gemini for task allocation analysis.
 *
 * @param {AllocationTask | null | undefined} task — Task row (or equivalent) with intake/matching fields.
 * @param {CandidateCapabilityMatch[] | CandidateCapabilityCore[]} candidateCapabilities — Capability matches from \`matchCapabilities\` (graded) or legacy flat capability shapes.
 * @param {EngagementContext | null | undefined} engagementContext — Domain, priorities, appetite, readiness.
 * @returns {string} Prompt body only; caller supplies model and API parameters.
 */
export function buildAllocationPrompt(task, candidateCapabilities, engagementContext) {
  const matches = normalizeCapabilityMatches(
    Array.isArray(candidateCapabilities) ? candidateCapabilities : [],
  )
  const candidateIds =
    matches.length > 0 ? matches.map((m) => m.capability?.id).filter(Boolean).join(', ') : '(none)'

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
    formatCandidatesBlock(matches),
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
