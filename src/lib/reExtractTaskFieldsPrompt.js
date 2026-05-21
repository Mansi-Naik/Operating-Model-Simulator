/**
 * Focused prompt for re-extracting only F2-critical task classifier fields.
 *
 * @param {string} documentText
 * @param {{ task_name: string, role_performing?: string | null }[]} existingTasks
 */
export function buildReExtractTaskFieldsPrompt(documentText, existingTasks) {
  const safeDoc = typeof documentText === 'string' ? documentText : String(documentText ?? '')
  const taskLines = (existingTasks ?? [])
    .map((t) => {
      const name = String(t.task_name ?? '').trim()
      const role = String(t.role_performing ?? '').trim()
      return role ? `- ${name} (role: ${role})` : `- ${name}`
    })
    .join('\n')

  return `You are re-classifying BPO operational tasks for allocation modeling.

Return ONLY a JSON object (no markdown):
{
  "task_updates": [
    {
      "task_name": "exact name matching an existing task below",
      "input_data_type": "structured|unstructured_text|unstructured_image|unstructured_video|unstructured_voice|mixed",
      "consequence_of_error": "low|medium|high|critical",
      "data_logged": true|false,
      "regulatory_constraint": true|false,
      "_extraction_confidence": {
        "input_data_type": "high|medium|low",
        "consequence_of_error": "high|medium|low",
        "data_logged": "high|medium|low",
        "regulatory_constraint": "high|medium|low"
      }
    }
  ]
}

RULES:
- Emit ONE update object per task in EXISTING TASKS (same count: ${existingTasks.length}).
- task_name must match exactly (case-insensitive OK in matching, but preserve spelling from list).
- All four classifier fields are REQUIRED on every row (never null).
- When uncertain on regulatory_constraint, prefer TRUE.

FIELD GUIDANCE (same as full intake extraction):

input_data_type: structured for DB/forms/logs; unstructured_text for text; unstructured_image; unstructured_video for video; unstructured_voice for calls/audio; mixed when multiple.

consequence_of_error: low = reversible/no safety impact; medium = correctable customer impact; high = significant harm; critical = irreversible/regulatory/life-safety (CSAM, self-harm, AML).

data_logged: true if actions recorded in systems (CRM, QA, case mgmt); false for off-system coaching/calibration; default true for operational BPO work.

regulatory_constraint: TRUE if any regulation cited (FinCEN, OCC, GDPR, CCPA, DSA, OSA, COPPA, HIPAA, PCI, AML, KYC, SEC, FINRA, eSafety, OFAC) OR child safety/CSAM/self-harm/severe moderation/fraud/KYC/compliance; FALSE only for clearly routine ops with low/medium consequence and no regulatory mention.

EXISTING TASKS (${existingTasks.length}):
${taskLines || '(none)'}

DOCUMENT:
---DOCUMENT START---
${safeDoc}
---DOCUMENT END---`
}
