/**
 * @param {{
 *   domain: string | null,
 *   automation_appetite: string | null,
 *   automated_tasks: { task_name: string, role_performing: string, primary_capability: string | null, allocation: string }[],
 *   cross_task_advisories: { id: string, severity: string, title: string, body: string, affected_items?: string[] }[],
 *   redesigned_roles: Record<string, unknown>[],
 *   automation_stats?: {
 *     automatedTaskCount: number,
 *     assistedTaskCount: number,
 *     humanTaskCount: number,
 *     totalAutomationCoverage: number
 *   }
 * }} ctx
 * @returns {string}
 */
export function buildEmergentRolesPrompt(ctx) {
  const automatedBlock = JSON.stringify(ctx.automated_tasks, null, 2)
  const advisoryBlock = JSON.stringify(ctx.cross_task_advisories, null, 2)
  const rolesBlock = JSON.stringify(ctx.redesigned_roles, null, 2)
  const stats = ctx.automation_stats
  const coveragePct =
    stats && Number.isFinite(stats.totalAutomationCoverage)
      ? Math.round(stats.totalAutomationCoverage * 1000) / 10
      : null
  const statsBlock = stats
    ? `- automated tasks (tech-automated): ${stats.automatedTaskCount}
- assisted tasks (tech-assisted): ${stats.assistedTaskCount}
- human-only tasks: ${stats.humanTaskCount}
- AI involvement coverage: ${coveragePct}% of tasks`
    : ''

  return `You are an operating-model strategist. Your job is to identify NEW role types that may be needed after AI is deployed and existing roles are redesigned — work that clearly does not fit any current role's redesign and would otherwise be unowned.

## Engagement context
- domain: ${JSON.stringify(ctx.domain)}
- automation_appetite: ${JSON.stringify(ctx.automation_appetite)}

## F2 automation footprint (ground truth — do not ignore)
${statsBlock}

Emergent roles should ONLY be created when there is genuine new work emerging from AI deployment. The engagement has ${stats?.automatedTaskCount ?? '—'} automated tasks and ${stats?.assistedTaskCount ?? '—'} assisted tasks (${coveragePct ?? '—'}% coverage). Suggest emergent roles ONLY for activities that the existing redesigned roles cannot absorb. Be conservative. Cap at **3** emergent roles maximum. If fewer than 3 are genuinely justified, return fewer. Returning **zero** emergent roles is acceptable and appropriate when existing roles can absorb the new work.

Do not generate generic emergent roles like "AI Operations Specialist" without grounding them in specific automated tasks or capabilities from F2 below. Each emergent role must reference specific automated tasks or capabilities that justify its existence.

## Automated / tech-shifted tasks (effective allocation: user override if set, else model allocation; primary capability from the model)
${automatedBlock}

## Cross-task advisories (pay special attention to "capability concentration" and "role hollowing" patterns; include others if they imply unowned work)
${advisoryBlock}

## Existing redesigned roles (F3 outputs — emergent roles must NOT duplicate this scope; only propose if work is still genuinely unowned)
${rolesBlock}

## Instructions
1. Be conservative: only propose emergent roles when there is **clear** unowned work implied by automation, advisories, and gaps relative to the redesigned roles.
2. **Maximum 3** emergent roles. If none are justified, return \`"emergent_roles": []\` — do not invent filler roles.
3. Each proposed role must include:
   - name: concise role title
   - why_needed: exactly one sentence
   - headcount_estimate: a non-negative number (can be fractional FTE if appropriate, e.g. 0.5)
   - sits_under: parent role name in the hierarchy (string)
   - skills: array of strings (key skills)
   - sourcing_options: array of short strings describing options such as "promote internally", "lateral move", "external hire" (use wording that fits the situation)

## Output
Return **only** valid JSON (no markdown) with this exact shape:
{
  "emergent_roles": [
    {
      "name": "string",
      "why_needed": "string",
      "headcount_estimate": 0,
      "sits_under": "string",
      "skills": ["string"],
      "sourcing_options": ["string"]
    }
  ]
}
`
}
