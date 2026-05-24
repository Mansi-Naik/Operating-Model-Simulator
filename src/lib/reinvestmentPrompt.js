/**
 * @fileoverview Gemini prompt for F5 reinvestment opportunities.
 */

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNum(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {Record<string, unknown>} task
 * @returns {string}
 */
function allocationLabel(task) {
  const raw =
    task.final_allocation ??
    task.ai_allocation ??
    task.allocation ??
    task.recommended_allocation ??
    ''
  return String(raw).trim().toLowerCase()
}

/**
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {{ task_count: number, automated_count: number, assisted_count: number, human_count: number }}
 */
export function summarizeF2FromTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  let automated = 0
  let assisted = 0
  let human = 0
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const a = allocationLabel(row)
    if (a.includes('automated') && !a.includes('assist')) automated += 1
    else if (a.includes('assist')) assisted += 1
    else if (a.includes('human')) human += 1
  }
  return {
    task_count: list.length,
    automated_count: automated,
    assisted_count: assisted,
    human_count: human,
  }
}

/**
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {string}
 */
export function summarizeTasksForReinvestment(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  if (list.length === 0) return 'No in-scope tasks loaded.'
  return list
    .filter((row) => row && typeof row === 'object')
    .slice(0, 14)
    .map((row) => {
      const name = String(row.task_name ?? 'Unnamed task').trim()
      const alloc = allocationLabel(row) || 'not allocated'
      return `- ${name} [${alloc}]`
    })
    .join('\n')
}

/**
 * @param {Record<string, unknown> | null | undefined} pipelineData
 * @returns {string}
 */
export function summarizeProjectStages(pipelineData) {
  const f6 = pipelineData?.f6_timeline
  if (!f6 || typeof f6 !== 'object' || Array.isArray(f6)) {
    return 'Use rollout framing: Pilot (months 1-3) → Scale (4-9) → Steady state (10+).'
  }
  const phases = Array.isArray(f6.phases) ? f6.phases : []
  if (phases.length === 0) {
    return 'Use rollout framing: Pilot (months 1-3) → Scale (4-9) → Steady state (10+).'
  }
  return phases
    .slice(0, 8)
    .map((phase, idx) => {
      const p = phase && typeof phase === 'object' ? phase : {}
      const name = String(p.phase_name ?? p.name ?? `Phase ${idx + 1}`).trim()
      const weeks = p.duration_weeks ?? p.weeks ?? p.duration ?? '?'
      return `- ${name}: ${weeks} weeks`
    })
    .join('\n')
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>} economicsData
 * @param {Record<string, unknown> | null | undefined} pipelineData
 * @param {Record<string, unknown>} f2Summary
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @returns {string}
 */
export function buildReinvestmentPrompt(engagement, economicsData, pipelineData, f2Summary, tasks) {
  const intake =
    engagement?.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const engBlock =
    intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
      ? /** @type {Record<string, unknown>} */ (intake.engagement)
      : {}
  const prefs =
    intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
      ? /** @type {Record<string, unknown>} */ (intake.preferences)
      : {}
  const goals = intake.goals && typeof intake.goals === 'object' && !Array.isArray(intake.goals) ? intake.goals : {}

  const domain =
    typeof engagement?.domain === 'string' && engagement.domain.trim()
      ? engagement.domain.trim()
      : typeof engBlock.domain === 'string' && engBlock.domain.trim()
        ? engBlock.domain.trim()
        : 'BPO'
  const subFunction =
    typeof engBlock.sub_function === 'string' && engBlock.sub_function.trim()
      ? engBlock.sub_function.trim()
      : 'general operations'
  const clientName =
    typeof engagement?.client_name === 'string' && engagement.client_name.trim()
      ? engagement.client_name.trim()
      : 'the client'
  const competitiveContext =
    typeof engBlock.competitive_context === 'string' && engBlock.competitive_context.trim()
      ? engBlock.competitive_context.trim()
      : 'not_specified'
  const marginProfile =
    typeof prefs.margin_profile === 'string' && prefs.margin_profile.trim()
      ? prefs.margin_profile.trim()
      : 'not_disclosed'

  const economicsResult =
    economicsData?.economics_result && typeof economicsData.economics_result === 'object'
      ? /** @type {Record<string, unknown>} */ (economicsData.economics_result)
      : economicsData

  const genpact =
    economicsResult?.genpact_view && typeof economicsResult.genpact_view === 'object'
      ? /** @type {Record<string, unknown>} */ (economicsResult.genpact_view)
      : {}

  const monthlyRevenue = toNum(genpact.revenue_future)
  const monthlyCostCurrent = toNum(genpact.cost_to_deliver_current)
  const monthlyCostFuture = toNum(genpact.cost_to_deliver_future)
  const monthlySavings = monthlyCostCurrent - monthlyCostFuture
  const annualSavings = monthlySavings * 12

  const tasksHandled = toNum(f2Summary.task_count)
  const automatedCount = toNum(f2Summary.automated_count)
  const assistedCount = toNum(f2Summary.assisted_count)

  const clientGoals = JSON.stringify(goals).substring(0, 500)

  const f4Pods =
    pipelineData?.f4_pods && typeof pipelineData.f4_pods === 'object' ? pipelineData.f4_pods : null
  const selectedVariant =
    f4Pods && typeof f4Pods.selected_variant_name === 'string' ? f4Pods.selected_variant_name : 'not specified'
  const taskLines = summarizeTasksForReinvestment(tasks)
  const projectStages = summarizeProjectStages(
    pipelineData ? /** @type {Record<string, unknown>} */ (pipelineData) : null,
  )

  return `You are a Genpact strategy consultant identifying reinvestment opportunities for an active client engagement.

The engagement has generated cost savings through automation. Recommend where to reinvest savings to grow revenue from THIS client — be brief and surgical.

## Client engagement profile

- Client: ${clientName}
- Domain: ${domain}
- Sub-function: ${subFunction}
- Competitive context: ${competitiveContext}
- Margin profile: ${marginProfile}
- Selected pod variant: ${selectedVariant}

## Current economics (Genpact perspective)

- Monthly revenue from client: $${Math.round(monthlyRevenue / 1000)}k
- Monthly cost to deliver (current): $${Math.round(monthlyCostCurrent / 1000)}k
- Monthly cost to deliver (post-automation): $${Math.round(monthlyCostFuture / 1000)}k
- Monthly savings to reinvest: $${Math.round(monthlySavings / 1000)}k
- Annual savings to reinvest: $${Math.round(annualSavings / 1000)}k

## Operation context

- Tasks in scope: ${tasksHandled} (${automatedCount} automated, ${assistedCount} AI-assisted)
- Client goals: ${clientGoals}

## In-scope processes (reinvest at a named step below)

${taskLines}

## Project / rollout stages (tie each recommendation to one)

${projectStages}

## What to recommend

Identify exactly 4 opportunities. Each must:

1. Name the exact process step from the task list above (or adjacent step in same workflow)
2. Name the project stage when to invest (e.g. "Pilot month 2", "Scale phase week 8-12", "Post go-live month 10")
3. State revenue impact in one line — no fluff
4. Be implementable in 6-18 months without a new RFP

VALID reinvestment categories (use mix of these):

A) UPSELL ADJACENT CAPABILITIES IN SAME WORKFLOW
B) CROSS-SELL TO ADJACENT FUNCTIONS WITHIN CLIENT
C) DEEPEN AI/ANALYTICS LAYER
D) MOVE UP THE VALUE STACK
E) IMPROVE OWN DELIVERY ECONOMICS FURTHER
F) RETENTION-FOCUSED INVESTMENTS

INVALID categories (don't suggest these):
- Generic training programs without specific tie to this engagement
- "Invest in better tools" without naming what or why
- Hiring more staff (defeats the savings purpose)
- Acquiring new clients (must stay within THIS client)
- Speculative new ventures unrelated to existing scope

## Required output

Return JSON with this exact structure:

{
  "headline": "Max 15 words — where savings should go for ${clientName}",
  "opportunities": [
    {
      "title": "5-7 words",
      "category": "upsell",
      "process_step": "Exact workflow step (e.g. Exception queue triage, GL recon matching)",
      "project_stage": "When to invest (e.g. Pilot week 6-8, Scale month 5)",
      "summary": "Max 20 words — what to do and expected revenue lift",
      "investment_required": "$50-80k upfront",
      "revenue_impact": "+$30k/mo",
      "cost_impact": "-$8k/mo or none",
      "timeline_months": 6,
      "risk_level": "low",
      "first_step": "Max 12 words — one action"
    }
  ],
  "prioritization_note": "Max 25 words — which to do first and at what stage",
  "total_potential_annual_uplift": "$400-600k/yr"
}

Use category: upsell, cross_sell, ai_deepening, value_stack, delivery_economics, retention
Use risk_level: low, medium, high

## Brevity rules (strict)

- NO paragraphs. NO generic BPO language.
- process_step and project_stage are mandatory — vague answers are invalid.
- summary replaces long rationale; keep under 20 words.
- Reference real task/process names from the task list.
- Mix risk levels; include at least one low-risk option.
- Internal Genpact audience — direct and specific.

Return ONLY the JSON object. No markdown, no code fences, no preamble.`
}
