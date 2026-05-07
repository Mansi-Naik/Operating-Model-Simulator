const VAGUE_START_VERBS = new Set(["handle", "manage", "do", "process", "work"]);

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function wordCount(text) {
  if (!isNonEmptyString(text)) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function startsWithVagueVerb(taskName) {
  if (!isNonEmptyString(taskName)) return true;
  const first = taskName.trim().split(/\s+/)[0]?.toLowerCase();
  return VAGUE_START_VERBS.has(first);
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return clamp01(numerator / denominator);
}

function severityFor(score01) {
  if (score01 < 0.4) return "high";
  if (score01 < 0.55) return "med";
  return "low";
}

function gapFor(dimension, score01) {
  const severity = severityFor(score01);
  const base = { dimension, severity };

  switch (dimension) {
    case "task_coverage":
      return {
        ...base,
        message: "Low task coverage per role; task inventory may be incomplete.",
        suggested_action: "Add more tasks per role (aim for 5+ per role).",
      };
    case "task_granularity":
      return {
        ...base,
        message: "Task names are too vague or not granular enough.",
        suggested_action:
          "Rewrite tasks as specific actions (3+ words) and avoid vague verbs like handle/manage/process.",
      };
    case "volume_data":
      return {
        ...base,
        message: "Many tasks are missing volume per day.",
        suggested_action: "Fill volume per day for each task (even rough estimates).",
      };
    case "time_data":
      return {
        ...base,
        message: "Many tasks are missing average time (minutes).",
        suggested_action: "Fill avg time minutes for each task (even rough estimates).",
      };
    case "cost_data":
      return {
        ...base,
        message: "Some hierarchy roles are missing cost data.",
        suggested_action: "Enter fully-loaded monthly cost per FTE for each role.",
      };
    case "risk_data":
      return {
        ...base,
        message: "No risk categories captured with severity.",
        suggested_action: "Add at least one risk category and set a severity level.",
      };
    case "tech_stack":
      return {
        ...base,
        message: "Tech stack details are missing.",
        suggested_action: "Complete the Tech & AI step to capture current systems and AI in use.",
      };
    case "goals":
      return {
        ...base,
        message: "Primary goal/priority is missing.",
        suggested_action: "Set a primary priority (e.g., cost, quality, or scale) in the engagement goals.",
      };
    default:
      return {
        ...base,
        message: "Missing data for readiness dimension.",
        suggested_action: "Provide the missing inputs for this dimension.",
      };
  }
}

/**
 * Compute readiness score + band from engagement and tasks.
 *
 * @param {object | null | undefined} engagement Engagement row from `engagements` (including `intake_data`).
 * @param {Array<object> | null | undefined} tasks Task rows from `tasks` table.
 * @returns {{
 *   score: number,
 *   band: 'green'|'amber'|'red',
 *   breakdown: {
 *     task_coverage: number,
 *     task_granularity: number,
 *     volume_data: number,
 *     time_data: number,
 *     cost_data: number,
 *     risk_data: number,
 *     tech_stack: number,
 *     goals: number
 *   },
 *   gaps: Array<{dimension: string, severity: 'low'|'med'|'high', message: string, suggested_action: string}>
 * }}
 */
export function computeReadiness(engagement, tasks) {
  const t = asArray(tasks);
  const intake = (engagement && typeof engagement === "object" ? engagement.intake_data : null) || {};

  // Roles: prefer intake_data.hierarchy if present; else infer from tasks.
  const hierarchy = asArray(intake.hierarchy);
  const roleNamesFromHierarchy = hierarchy
    .map((r) => (r && typeof r === "object" ? r.role ?? r.name : null))
    .filter(isNonEmptyString)
    .map((s) => s.trim());
  const inferredRoles = t
    .map((row) => row?.role_performing)
    .filter(isNonEmptyString)
    .map((s) => s.trim());
  const roleSet = new Set((roleNamesFromHierarchy.length > 0 ? roleNamesFromHierarchy : inferredRoles) || []);
  const roleCount = roleSet.size;

  // Dimension: task_coverage
  const avgTasksPerRole = roleCount > 0 ? t.length / roleCount : 0;
  const task_coverage = clamp01(avgTasksPerRole / 5);

  // Dimension: task_granularity
  const granularityDenom = t.length;
  const granularityNumer = t.filter((row) => {
    const name = row?.task_name ?? row?.name;
    return wordCount(name) >= 3 && !startsWithVagueVerb(name);
  }).length;
  const task_granularity = ratio(granularityNumer, granularityDenom);

  // Dimension: volume_data
  const volumeNumer = t.filter((row) => row?.volume_per_day != null).length;
  const volume_data = ratio(volumeNumer, t.length);

  // Dimension: time_data
  const timeNumer = t.filter((row) => row?.avg_time_minutes != null).length;
  const time_data = ratio(timeNumer, t.length);

  // Dimension: cost_data
  const costDenom = hierarchy.length;
  const costNumer = hierarchy.filter((r) => r && typeof r === "object" && r.cost != null).length;
  const cost_data = ratio(costNumer, costDenom);

  // Dimension: risk_data
  const governance = intake.governance && typeof intake.governance === "object" ? intake.governance : {};
  const riskCats = asArray(governance.risk_categories);
  const hasRiskWithSeverity = riskCats.some(
    (r) => r && typeof r === "object" && isNonEmptyString(r.name) && isNonEmptyString(r.severity),
  );
  const risk_data = hasRiskWithSeverity ? 1 : 0;

  // Dimension: tech_stack
  const tech_stack = intake.tech_stack ? 1 : 0;

  // Dimension: goals
  // Spec says intake_data.goals.primary_priority; allow fallback to intake_data.engagement.goals.primary_priority.
  const goalsObj =
    (intake.goals && typeof intake.goals === "object" ? intake.goals : null) ||
    (intake.engagement?.goals && typeof intake.engagement.goals === "object" ? intake.engagement.goals : null) ||
    null;
  const goals = goalsObj && isNonEmptyString(goalsObj.primary_priority) ? 1 : 0;

  const breakdown = {
    task_coverage,
    task_granularity,
    volume_data,
    time_data,
    cost_data,
    risk_data,
    tech_stack,
    goals,
  };

  const weights = {
    task_coverage: 0.25,
    task_granularity: 0.15,
    volume_data: 0.15,
    time_data: 0.1,
    cost_data: 0.1,
    risk_data: 0.1,
    tech_stack: 0.05,
    goals: 0.1,
  };

  const weightedSum =
    breakdown.task_coverage * weights.task_coverage +
    breakdown.task_granularity * weights.task_granularity +
    breakdown.volume_data * weights.volume_data +
    breakdown.time_data * weights.time_data +
    breakdown.cost_data * weights.cost_data +
    breakdown.risk_data * weights.risk_data +
    breakdown.tech_stack * weights.tech_stack +
    breakdown.goals * weights.goals;

  const score = Math.round(clamp01(weightedSum) * 100);
  const band = score >= 75 ? "green" : score >= 50 ? "amber" : "red";

  const gaps = Object.entries(breakdown)
    .filter(([, v]) => v < 0.7)
    .map(([dimension, v]) => gapFor(dimension, v));

  return { score, band, breakdown, gaps };
}

