/**
 * @typedef {Object} TimeSplit
 * @property {Record<string, number>} [activities] Alternative: flat map activity → percentage
 * Or the object itself may be activity → percentage when passed as `current_time_split`.
 */

/**
 * Aggregate view of one role for future-state redesign (tasks, time split, AI absorption).
 *
 * @typedef {Object} RoleAggregate
 * @property {string} [name] Role display name
 * @property {string} [role_name] Alias for name
 * @property {number} [level] Hierarchy level (1–5 style)
 * @property {Record<string, number>} [current_time_split] Activity label → percentage (should sum ~100)
 * @property {string[]} [current_responsibilities] Optional one-line bullets if not derived from time split
 * @property {{ task_name?: string, name?: string, volume_per_day?: number }[]} [top_tasks_today] Top tasks for this role
 * @property {number} [time_freed_pct] Percentage of role time freed by AI (0–100)
 * @property {'minor_evolution' | 'transformation' | 'redefinition' | string} [pattern] Redesign pattern label
 * @property {string[]} [retained_tasks] Tasks the role keeps performing
 * @property {string[]} [lost_tasks] Tasks absorbed by AI or removed from the role
 */

/**
 * Minimal engagement slice for role redesign (domain, goals, preferences).
 *
 * @typedef {Object} EngagementContext
 * @property {string} [domain] Engagement domain enum or label
 * @property {string} [primary_priority] e.g. cost, quality, speed, scale, risk_reduction
 * @property {'conservative' | 'balanced' | 'aggressive' | string} [automation_appetite]
 */

/**
 * Builds a Gemini-ready prompt for redesigning a single job role into its future state,
 * given AI absorption of tasks and what the role retains.
 *
 * @param {RoleAggregate} roleAggregate
 * @param {EngagementContext} engagementContext
 * @returns {string}
 *
 * @example
 * const prompt = buildRoleRedesignPrompt(
 *   {
 *     name: 'Team Lead',
 *     level: 2,
 *     current_time_split: { coaching: 40, qa_review: 35, admin: 25 },
 *     top_tasks_today: [{ task_name: 'Sample audits' }],
 *     time_freed_pct: 15,
 *     pattern: 'minor_evolution',
 *     retained_tasks: ['Coaching', 'Escalations'],
 *     lost_tasks: ['Manual report formatting'],
 *   },
 *   { domain: 'customer_service', primary_priority: 'quality', automation_appetite: 'balanced' },
 * )
 */
export function buildRoleRedesignPrompt(roleAggregate, engagementContext) {
  const r = roleAggregate && typeof roleAggregate === 'object' ? roleAggregate : {}
  const e = engagementContext && typeof engagementContext === 'object' ? engagementContext : {}

  const roleName = String(r.name ?? r.role_name ?? 'Unnamed role').trim() || 'Unnamed role'
  const level = r.level != null && r.level !== '' ? String(r.level) : 'not specified'
  const timeSplit = r.current_time_split && typeof r.current_time_split === 'object' && !Array.isArray(r.current_time_split)
    ? r.current_time_split
    : {}
  const splitLines =
    Object.keys(timeSplit).length > 0
      ? Object.entries(timeSplit)
          .map(([k, v]) => `  - ${k}: ${typeof v === 'number' ? v : String(v)}%`)
          .join('\n')
      : '  (not provided — infer cautiously from responsibilities below)'

  const responsibilities = Array.isArray(r.current_responsibilities)
    ? r.current_responsibilities.map((x) => String(x).trim()).filter(Boolean)
    : []
  const respBlock =
    responsibilities.length > 0
      ? responsibilities.map((x) => `  - ${x}`).join('\n')
      : '  (derive from time split and top tasks if responsibilities are implicit)'

  const topTasks = Array.isArray(r.top_tasks_today) ? r.top_tasks_today : []
  const topTaskLines =
    topTasks.length > 0
      ? topTasks
          .slice(0, 8)
          .map((t) => {
            const nm = t && typeof t === 'object' ? String(t.task_name ?? t.name ?? 'Task').trim() : String(t)
            const vol =
              t && typeof t === 'object' && t.volume_per_day != null ? ` (volume/day: ${t.volume_per_day})` : ''
            return `  - ${nm}${vol}`
          })
          .join('\n')
      : '  (none listed)'

  const timeFreed = typeof r.time_freed_pct === 'number' && Number.isFinite(r.time_freed_pct) ? r.time_freed_pct : null
  const pattern = String(r.pattern ?? 'not specified').trim()

  const retained = Array.isArray(r.retained_tasks) ? r.retained_tasks.map((x) => String(x).trim()).filter(Boolean) : []
  const lost = Array.isArray(r.lost_tasks) ? r.lost_tasks.map((x) => String(x).trim()).filter(Boolean) : []

  const domain = String(e.domain ?? 'not specified').trim()
  const primaryPriority = String(e.primary_priority ?? 'not specified').trim()
  const automationAppetite = String(e.automation_appetite ?? 'not specified').trim()

  const retainedBlock = retained.length ? retained.map((x) => `  - ${x}`).join('\n') : '  (none listed)'
  const lostBlock = lost.length ? lost.map((x) => `  - ${x}`).join('\n') : '  (none listed)'

  return `You are an operations consultant redesigning a job role for the future state of an engagement, given which tasks AI is absorbing and which the role retains.

## Current role state
- **Role name:** ${roleName}
- **Level:** ${level}
- **Current time split (activity → %):**
${splitLines}
- **Current responsibilities (from \`current_time_split\` and context; explicit bullets if provided):**
${respBlock}
- **Top tasks today (for this role):**
${topTaskLines}

## What is changing
- **Time freed (approx. %):** ${timeFreed != null ? `${timeFreed}%` : 'not specified'}
- **Redesign pattern:** ${pattern}
- **Retained tasks (role still performs):**
${retainedBlock}
- **Lost tasks (absorbed by AI, automated away, or removed from role):**
${lostBlock}

## Engagement context
- **Domain:** ${domain}
- **Primary priority:** ${primaryPriority}
- **Automation appetite:** ${automationAppetite}

## EXACT output format (JSON only — structure)
Return a single JSON object with this shape (all keys required; use empty arrays only where allowed by field semantics):
{
  "future_role_name": string,
  "future_responsibilities": array of 3-6 strings,
  "new_tasks_added": array of strings,
  "skills_retained": array of strings,
  "skills_added": array of strings,
  "skills_removed": array of strings,
  "future_time_split": object mapping activity label to percentage number (4-6 entries, must sum to 100),
  "transition_narrative": string,
  "day_in_the_life": string,
  "key_transition_risks": array of 1-3 strings
}

## Constraints (apply strictly)
- The future role must remain coherent as **ONE** job — no kitchen-sink responsibility lists.
- **skills_added** must contain **2–4 items maximum** — organizational change is hard; do not exceed four.
- For **minor_evolution** pattern: keep changes small — **at most 1–2** items in **new_tasks_added**.
- For **transformation** or **redefinition**: you may propose an evolved **future_role_name** (e.g. "TL → Pod Coach & AI Validator").
- For **redefinition**: explicitly acknowledge in **transition_narrative** or **key_transition_risks** that incumbents may need **significant reskilling** or that the role may effectively become a **different job**.

---

## Few-shot example 1 — minor_evolution (content moderation Agent, ~12% time freed)

**Input snapshot (illustrative):**
- Role: Content Moderation Agent, level 1
- current_time_split: { queue_review: 55, policy_escalation: 20, coaching_peers: 10, admin_reporting: 15 }
- time_freed_pct: 12, pattern: minor_evolution
- retained_tasks: ["Review flagged posts", "Apply policy nuances", "Escalate edge cases"]
- lost_tasks: ["Repetitive obvious spam triage"]
- engagement: domain safety_security, primary_priority quality, automation_appetite balanced

**Example output:**
{
  "future_role_name": "Content Moderation Agent",
  "future_responsibilities": [
    "Own nuanced policy decisions on escalated and borderline content.",
    "Spot-check AI triage decisions and correct systematic errors.",
    "Coach peers on policy changes and ambiguous moderation patterns.",
    "Participate in calibration sessions to keep human and AI judgments aligned."
  ],
  "new_tasks_added": [
    "Audit a sample of AI-cleared items for false negatives weekly."
  ],
  "skills_retained": [
    "Policy interpretation",
    "Written communication",
    "Attention to ambiguous harm signals"
  ],
  "skills_added": [
    "Sampling and QA of model-assisted decisions",
    "Structured feedback to improve automation rules"
  ],
  "skills_removed": [
    "High-volume repetitive sorting of obvious violations"
  ],
  "future_time_split": {
    "queue_review": 48,
    "policy_escalation": 22,
    "ai_qa_sampling": 12,
    "coaching_peers": 10,
    "admin_reporting": 8
  },
  "transition_narrative": "The Agent shifts from bulk triage toward judgment-heavy review while supervising AI on the easy tail of the queue.",
  "day_in_the_life": "Most of the day is still in the moderation queue, but time blocks rotate between deep dives on escalations, short calibration huddles, and quick audits of AI decisions. Admin reporting shrinks slightly as dashboards auto-generate first drafts.",
  "key_transition_risks": [
    "Trusting AI triage too quickly before base rates on errors are understood"
  ]
}

---

## Few-shot example 2 — transformation (QA Officer, ~62% time freed)

**Input snapshot (illustrative):**
- Role: QA Officer, level 2
- current_time_split: { manual_call_audits: 50, scoring_forms: 25, calibration: 15, reporting: 10 }
- time_freed_pct: 62, pattern: transformation
- retained_tasks: ["Calibration with ops", "Investigate serious quality incidents"]
- lost_tasks: ["Line-by-line call scoring", "Routine checklist audits", "Manual compilation of weekly QA reports"]
- engagement: domain customer_service, primary_priority quality, automation_appetite aggressive

**Example output:**
{
  "future_role_name": "QA Officer → AI-augmented Quality Lead",
  "future_responsibilities": [
    "Define and tune QA rubrics and thresholds consumed by automated scoring.",
    "Lead calibration cycles where AI scores are compared to human gold standards.",
    "Investigate spikes in AI-human disagreement and drive root-cause fixes.",
    "Partner with tech and ops to prioritize model and workflow improvements.",
    "Communicate quality posture and risk tradeoffs to leadership with evidence."
  ],
  "new_tasks_added": [
    "Validate AI-generated QA summaries before they ship to stakeholders.",
    "Design targeted human audit samples when automation confidence drops.",
    "Facilitate incident reviews when automation introduces new failure modes."
  ],
  "skills_retained": [
    "Root-cause analysis on quality incidents",
    "Facilitation of calibration discussions",
    "Structured communication of risk"
  ],
  "skills_added": [
    "Basic literacy in model metrics (precision/recall style thinking at operational level)",
    "Experiment design for sampling and A/B style QA tests",
    "Data storytelling for exec-ready quality narratives"
  ],
  "skills_removed": [
    "High-volume repetitive manual scoring",
    "Manual stitching of weekly QA spreadsheets"
  ],
  "future_time_split": {
    "calibration_and_thresholds": 28,
    "ai_output_validation": 22,
    "incident_and_disagreement_triage": 20,
    "cross_function_partnering": 18,
    "reporting_narratives": 12
  },
  "transition_narrative": "The QA Officer shifts from hands-on auditing to leading an AI-augmented quality system grounded in calibration, sampling, and incident learning.",
  "day_in_the_life": "Mornings focus on reviewing dashboards of AI scoring drift and picking audit samples. Afternoons blend calibration workshops with ops and deep dives on a small set of serious incidents. Even short blocks go to tightening rubrics so automation stays aligned with policy.",
  "key_transition_risks": [
    "Skill gap for incumbents who built careers on manual auditing volume",
    "Temporary quality volatility while automation coverage ramps"
  ]
}

---

Return ONLY the JSON object, no markdown formatting, no code fences, no additional text.
`
}
