/**
 * Builds the Gemini prompt for structured intake extraction from raw document text.
 *
 * @param {string} documentText Plain text extracted from uploaded file (already truncated if needed).
 * @returns {string}
 */
export function buildExtractionPrompt(documentText) {
  const safeDoc =
    typeof documentText === 'string' ? documentText : String(documentText ?? '')

  return `SECTION A — ROLE AND CONTEXT
You are a business analyst extracting structured information from a client engagement document for an operating model design exercise.
The document was uploaded by a consultant and may be: a scoping doc, a proposal, an MSA, an org chart, an intake form, meeting notes, or something entirely unrelated. Your job is to extract whatever is relevant — without inventing anything.

SECTION B — CRITICAL ANTI-HALLUCINATION INSTRUCTIONS
Apply these rules strictly:
1. For most fields, leave null if not stated. EXCEPTION: For task-level fields task_type, input_data_type, consequence_of_error, data_logged, and regulatory_constraint, you MUST infer values based on the task description and standard BPO operations knowledge. These fields drive downstream feature logic and cannot be null. Mark them with _confidence: "medium" when inferred.
2. For numeric fields, only extract numbers that are clearly stated (e.g., "we have 100 agents"). Do not estimate.
3. For enum fields outside task-level task_type, input_data_type, and consequence_of_error, only pick a value if the document clearly implies it. Otherwise leave null.
4. Tag every extracted field with a confidence level: "high" (clearly stated), "medium" (implied but not stated directly), "low" (rough inference). Fields you can't extract should be omitted entirely, not given a "low" confidence guess.
5. If the document is clearly not a business engagement document (e.g., it's a recipe, news article, meeting transcript unrelated to BPO/operations), set document_relevance_score below 0.3 and extract minimal data. Do not pretend to extract from irrelevant text.

SECTION C — TARGET SCHEMA
intake_data: {
  engagement: {
    client_name: string | null,
    domain: "safety_security" | "customer_service" | "finance_ops" | "hr_ops" | "sales_ops" | "supply_chain" | "other" | null,
    geography: array of strings | null,
    languages: array of strings | null,
    channels: array of strings | null,
    volume_per_day: number | null,
    volume_per_month: number | null,
    seasonality_notes: string | null,
    pain_points: array of strings | null,
    goals: {
      cost_reduction_target: number | null,
      quality_threshold: number | null,
      scale_target: number | null,
      timeline_months: number | null,
      primary_priority: "cost" | "quality" | "speed" | "scale" | "risk_reduction" | null
    } | null
  },
  hierarchy: array of {
    level: number (1-5),
    role: string,
    headcount: number | null,
    cost: number | null,
    span: string | null,
    attrition: number | null,
    notes: string | null
  },
  tech_stack: {
    current_systems: {
      primary_work_platform: string | null,
      qa_audit_tool: string | null,
      ticketing: string | null,
      knowledge_base: string | null,
      workforce_management: string | null,
      reporting_bi: string | null
    },
    ai_in_use: array of { capability: string, vendor: string | null, coverage_pct: number | null, notes: string | null },
    data_logging_maturity: "none" | "low" | "medium" | "high" | null,
    data_privacy_constraints: string | null
  },
  governance: {
    risk_categories: array of { name: string, severity: "low" | "medium" | "high" | "critical", zero_tolerance: boolean, regulatory: boolean, description: string | null },
    escalation_paths: array of { from_role: string, to_role: string, trigger: string, avg_resolution_minutes: number | null },
    controls_in_place: array of strings | null,
    wellness_support: boolean | null
  },
  kpis: {
    productivity: { actual: number, target: number, unit: string } | null,
    quality_score: { actual: number, target: number, unit: string } | null,
    sla_adherence: { actual: number, target: number, unit: string } | null,
    turnaround_time: { actual: number, target: number, unit: string } | null,
    attrition_annualized: { actual: number, target: number, unit: string } | null,
    utilization: { actual: number, target: number, unit: string } | null,
    shrinkage: { actual: number, target: number, unit: string } | null,
    qa_sampling_coverage: { actual: number, target: number, unit: string } | null
  },
  preferences: {
    automation_appetite: "conservative" | "balanced" | "aggressive" | null,
    pod_design: string | null,
    risk_tolerance: "low" | "medium" | "high" | null,
    prefer_upskilling: boolean | null,
    include_emergent_roles: boolean | null,
    currency: "USD" | "INR" | "EUR" | "GBP" | null,
    months_to_steady_state: number | null
  }
}
tasks: array of {
  task_name: string,
  role_performing: string,
  task_type: "rule-based" | "judgment" | "edge-case" | "admin" | "reporting" | null,
  volume_per_day: number | null,
  avg_time_minutes: number | null,
  input_data_type: "structured" | "unstructured_text" | "unstructured_voice" | "unstructured_image" | "unstructured_video" | "mixed" | null,
  consequence_of_error: "low" | "medium" | "high" | "critical" | null,
  data_logged: boolean | null,
  regulatory_constraint: boolean | null
}

For task extraction, you MUST infer these fields based on the task description, even when they are not explicitly stated:

input_data_type — Inferred from what the task operates on:
- Reviewing posts, comments, articles → "unstructured_text"
- Analyzing call recordings, voice → "unstructured_voice"
- Reviewing images, photos → "unstructured_image"
- Reviewing videos → "unstructured_video"
- Compiling reports, calculations, dashboards → "structured"
- Coaching conversations (text-based) → "unstructured_text"
- Tasks involving multiple types (e.g., reviewing posts with images) → "mixed"
- Default if unclear: "mixed"

consequence_of_error — Inferred from task name and context:
- Spam filtering, routing, reporting on standard data → "low"
- Standard policy enforcement, sample audits → "medium"
- Severe content (violence, hate), high-stakes decisions → "high"
- CSAM, terrorism, regulatory-mandated tasks, precedent-setting → "critical"
- Default if unclear: "medium"

data_logged — Inferred from operational context:
- Mention of WFM, QA tools, ticketing systems, dashboards → true
- High-volume operational work in BPO context → true (defaults to true)
- Coaching conversations, qualitative work → false
- Calibration sessions, undocumented work → false
- Default if unclear: true (BPO operations are typically logged)

task_type — Inferred from task verb and structure:
- "Review against policy", "classify", "disposition" → "rule-based"
- "Assess", "interpret", "evaluate", "audit" → "judgment"
- "Escalate severe", "handle exception" → "edge-case"
- "Compile report", "generate dashboard" → "reporting"
- "Set up", "configure", "administer" → "admin"

regulatory_constraint — Inferred:
- Task mentions "mandatory human review", "regulatory", "jurisdictional law", "CSAM", "terrorism" → true
- Otherwise → false

Set the _confidence suffix to "medium" for inferred values (not "low" or null), since these inferences are based on standard BPO operations knowledge.

SECTION D — FIELD-LEVEL CONFIDENCE TRACKING
For every field you extract, also add a sibling key with the suffix "_confidence" set to "high", "medium", or "low". Example:
  client_name: "Acme Corp",
  client_name_confidence: "high",
  volume_per_day: 50000,
  volume_per_day_confidence: "medium"
Skip the _confidence key for fields you leave null — those are simply not extracted.
Apply the same pattern inside nested objects (e.g., engagement.goals.cost_reduction_target and goals.cost_reduction_target_confidence on the goals object).

SECTION E — OUTPUT FORMAT
Return ONLY a single JSON object with this top-level structure:
{
  "document_relevance_score": number,
  "extraction_quality": "high" | "medium" | "low" | "not_intake_doc",
  "summary_message": string,
  "extracted_fields_count": number,
  "total_possible_fields": number,
  "intake_data": { },
  "tasks": [ ],
  "extraction_warnings": [ ]
}
Use 50 as baseline for total_possible_fields unless you justify a different number.
Do not include markdown formatting, code fences, or commentary. Just the JSON object.

SHORT EXAMPLES (format only — do not copy values into your answer):
Example A — clear intake snippet:
{"document_relevance_score":0.92,"extraction_quality":"high","summary_message":"Extracted client, volumes, and cost goal from SOW.","extracted_fields_count":18,"total_possible_fields":50,"intake_data":{"engagement":{"client_name":"Acme Corp","client_name_confidence":"high","volume_per_day":50000,"volume_per_day_confidence":"high","goals":{"cost_reduction_target":25,"cost_reduction_target_confidence":"medium"}},"hierarchy":[],"tech_stack":{"current_systems":{},"ai_in_use":[]},"governance":{"risk_categories":[],"escalation_paths":[]},"kpis":{},"preferences":{}},"tasks":[{"task_name":"Review queue item","role_performing":"Agent","task_type":"rule-based","task_name_confidence":"high"}],"extraction_warnings":[]}

Example B — sparse / non-intake:
{"document_relevance_score":0.1,"extraction_quality":"not_intake_doc","summary_message":"Document appears to be a recipe; minimal operational fields found.","extracted_fields_count":0,"total_possible_fields":50,"intake_data":{"engagement":{"client_name":null},"hierarchy":[],"tech_stack":{"current_systems":{},"ai_in_use":[]},"governance":{"risk_categories":[],"escalation_paths":[]},"kpis":{},"preferences":{}},"tasks":[],"extraction_warnings":["No BPO engagement indicators found."]}

SECTION F — THE DOCUMENT
The document to extract from is below. Read it carefully and apply the rules strictly:

---DOCUMENT START---
${safeDoc}
---DOCUMENT END---
`
}
