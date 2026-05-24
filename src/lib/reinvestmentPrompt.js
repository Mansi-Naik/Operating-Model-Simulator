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
 * @param {Record<string, unknown> | null | undefined} engagement
 * @param {Record<string, unknown>} economicsData
 * @param {Record<string, unknown> | null | undefined} pipelineData
 * @param {Record<string, unknown>} f2Summary
 * @returns {string}
 */
export function buildReinvestmentPrompt(engagement, economicsData, pipelineData, f2Summary) {
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

  return `You are a Genpact strategy consultant identifying reinvestment opportunities for an active client engagement.

The engagement has generated significant cost savings through automation. Your task: identify SPECIFIC, ACCOUNT-RELEVANT ways Genpact can reinvest these savings to GROW REVENUE from this SAME client.

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

- Tasks currently in scope: ${tasksHandled}
- Tasks being automated: ${automatedCount}
- Tasks AI-assisted: ${assistedCount}
- Client's stated goals: ${clientGoals}

## What to recommend

Identify 4-5 SPECIFIC reinvestment opportunities. Each must:

1. Use savings to grow revenue or further reduce cost FROM THIS SAME CLIENT
2. Be specific to the ${domain} / ${subFunction} context — not generic BPO advice
3. Have a credible investment-to-return ratio
4. Be implementable within 6-18 months
5. NOT require winning a separate contract or major contract renegotiation

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
  "headline": "1-sentence framing of the reinvestment opportunity for this client",
  "opportunities": [
    {
      "title": "Short title (5-8 words)",
      "category": "upsell",
      "rationale": "2-3 sentences",
      "investment_required": "$50-80k upfront",
      "revenue_impact": "+$30-50k/month",
      "cost_impact": "-$8k/month",
      "timeline_months": 6,
      "risk_level": "low",
      "first_step": "1-sentence concrete next action"
    }
  ],
  "prioritization_note": "1-2 sentences on which opportunity to pursue first and why",
  "total_potential_annual_uplift": "$500k-800k annualized"
}

Use category values: upsell, cross_sell, ai_deepening, value_stack, delivery_economics, retention
Use risk_level values: low, medium, high

## Guidance

- Be SPECIFIC to ${domain}/${subFunction}. Generic suggestions get filtered out.
- Mix risk levels — at least one low-risk and one higher-risk option.
- Total annual uplift should be plausible (typically 30-100% of annual savings).
- Be HONEST about risks.
- This output is for an internal Genpact strategy discussion, not client-facing. Be candid.

Return ONLY the JSON object. No markdown, no code fences, no preamble.`
}
