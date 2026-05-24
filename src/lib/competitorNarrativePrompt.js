/**
 * @fileoverview Gemini prompt for F5 competitor analysis narrative only (scores are curated).
 */

/**
 * @param {Record<string, unknown>} engagement
 * @param {Array<Record<string, unknown>>} competitors
 * @returns {string}
 */
export function buildCompetitorNarrativePrompt(engagement, competitors) {
  const intake =
    engagement.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : {}
  const engBlock =
    intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
      ? /** @type {Record<string, unknown>} */ (intake.engagement)
      : {}

  const clientName =
    typeof engagement.client_name === 'string' && engagement.client_name.trim()
      ? engagement.client_name.trim()
      : 'the client'
  const domain =
    typeof engagement.domain === 'string' && engagement.domain.trim()
      ? engagement.domain.trim()
      : 'BPO'
  const subFunction =
    typeof engBlock.sub_function === 'string' && engBlock.sub_function.trim()
      ? engBlock.sub_function.trim()
      : 'general operations'
  const competitiveContext =
    typeof engBlock.competitive_context === 'string' && engBlock.competitive_context.trim()
      ? engBlock.competitive_context.trim()
      : 'not_specified'

  const genpact = competitors.find((c) => c.is_genpact)
  const scoreLines = competitors
    .map((c) => {
      const scores = c.scores && typeof c.scores === 'object' ? c.scores : {}
      return `${c.name}: AI=${scores.ai_automation}, Industry=${scores.industry_expertise}, Cost=${scores.cost_competitive}, Speed=${scores.implementation_speed}, Risk=${scores.risk_compliance}, Outcomes=${scores.client_outcomes}`
    })
    .join('\n')

  const genpactStrengths = Array.isArray(genpact?.strengths) ? genpact.strengths.join(', ') : ''
  const genpactWeaknesses = Array.isArray(genpact?.weaknesses) ? genpact.weaknesses.join(', ') : ''

  return `You are a Genpact strategy analyst. Given the curated competitive benchmark scores below, write a strategic narrative for an internal pursuit team.

Engagement: ${clientName} in ${domain}, ${subFunction}
Competitive context: ${competitiveContext}

Competitors and scores (1-5 scale, from 2025 analyst benchmarks — do NOT change scores):
${scoreLines}

Genpact strengths: ${genpactStrengths}
Genpact weaknesses: ${genpactWeaknesses}

Write specifically for ${clientName} and ${subFunction}. Be candid and internal-facing.

Return JSON only:
{
  "summary": "2-3 sentences on strategic positioning for this pursuit",
  "key_differentiators": ["3 bullets where Genpact wins for this client"],
  "key_risks": ["2-3 bullets where Genpact is at risk vs this competitor set"]
}

No markdown. No code fences.`
}
