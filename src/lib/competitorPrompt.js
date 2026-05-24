/**
 * @fileoverview Gemini prompt for F5 competitor analysis.
 */

/**
 * @param {Record<string, unknown>} engagement
 * @param {Array<{ name: string }>} competitors
 * @returns {string}
 */
export function buildCompetitorAnalysisPrompt(engagement, competitors) {
  const intake =
    engagement.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
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

  const domain =
    typeof engagement.domain === 'string' && engagement.domain.trim()
      ? engagement.domain.trim()
      : typeof engBlock.domain === 'string' && engBlock.domain.trim()
        ? engBlock.domain.trim()
        : 'BPO'
  const subFunction =
    typeof engBlock.sub_function === 'string' && engBlock.sub_function.trim()
      ? engBlock.sub_function.trim()
      : 'general operations'
  const competitiveContext =
    typeof engBlock.competitive_context === 'string' && engBlock.competitive_context.trim()
      ? engBlock.competitive_context.trim()
      : 'not_specified'
  const automationAppetite =
    typeof prefs.automation_appetite === 'string' && prefs.automation_appetite.trim()
      ? prefs.automation_appetite.trim()
      : 'balanced'

  const competitorNames = competitors.map((c) => c.name).join(', ')

  return `You are a strategic analyst comparing BPO/services providers for an internal Genpact pursuit team.

Score Genpact and these competitors against 6 dimensions for a specific engagement profile.

## Engagement context
- Domain: ${domain}
- Sub-function: ${subFunction}
- Competitive context: ${competitiveContext}
- Genpact's automation appetite for this engagement: ${automationAppetite}

## Competitors to score
Genpact, ${competitorNames}

## Scoring dimensions (1-5 scale, where 5 = market-leading, 1 = weak)

1. **AI/Automation Maturity** — Depth of in-house AI capabilities, automation platforms (RPA, GenAI), proprietary AI products, AI talent base
2. **Industry Expertise** — Depth and breadth in ${domain}, specifically ${subFunction}. Number of clients in this domain. Specialized knowledge.
3. **Cost Competitiveness** — Pricing position. 5 = aggressive low-cost provider, 1 = premium pricing only
4. **Implementation Speed** — Typical transition timeline from contract sign to steady-state operations
5. **Risk & Compliance** — Track record on regulated work (SOX, banking regs, healthcare, etc.). Quality of compliance frameworks.
6. **Client Outcomes** — Historical results from publicly known case studies. Savings delivered, quality improvements, NPS.

## Required output

Return a single JSON object with this exact structure:

{
  "competitors": [
    {
      "name": "Genpact",
      "scores": {
        "ai_automation": 4,
        "industry_expertise": 4,
        "cost_competitive": 3,
        "implementation_speed": 4,
        "risk_compliance": 4,
        "client_outcomes": 4
      },
      "rationales": {
        "ai_automation": "Genpact has invested significantly in Cora AI platform, GenAI services...",
        "industry_expertise": "Strong presence in this domain with X+ clients...",
        "cost_competitive": "...",
        "implementation_speed": "...",
        "risk_compliance": "...",
        "client_outcomes": "..."
      },
      "strengths": ["Brief strength 1", "Brief strength 2"],
      "weaknesses": ["Brief weakness 1"]
    }
  ],
  "summary": "2-3 sentence strategic summary of where Genpact stands vs this competitor set for this engagement profile",
  "key_differentiators": ["Bullet 1: what Genpact should emphasize", "Bullet 2", "Bullet 3"],
  "key_risks": ["Bullet 1: where Genpact is weakest", "Bullet 2"]
}

Include one object in "competitors" for Genpact and one for each named competitor (${competitorNames}).

## Scoring guidance
- Use the full 1-5 range. Don't cluster everything at 3.
- Genpact should NOT automatically score 5 on everything — that's not credible. Be honest.
- Scores should reflect publicly known positioning, not hopes.
- The AI/Automation dimension is the most important — calibrate carefully.
- Industry Expertise should reflect each provider's documented strength in ${domain}.
- Each rationale should be 1-2 sentences referencing specific known offerings/capabilities where possible.
- Don't invent specific client names or contract values. Speak in general terms.

CRITICAL: This output is illustrative for internal strategy use. Acknowledge uncertainty in rationales where appropriate. Don't fabricate specific case studies or numbers.

Return ONLY the JSON object, no markdown, no code fences, no preamble.`
}
