/**
 * Normalize Phase A / Phase B intake fields from Gemini extraction before persistence.
 */

const COMPETITIVE_CONTEXT_VALUES = new Set([
  'incumbent_stable',
  'incumbent_threatened',
  'challenger',
  'new_client',
  'not_specified',
]);

const MARGIN_PROFILE_VALUES = new Set(['low', 'medium', 'high', 'not_disclosed']);

const BILLING_TYPE_VALUES = new Set([
  'transactional',
  'hourly',
  'fte_based',
  'fixed',
  'not_specified',
]);

const EMPTY_BILLING_MODEL = {
  type: 'not_specified',
  unit_cost: null,
  unit_cost_variance_pct: null,
  hourly_rate: null,
  monthly_per_fte: null,
  fixed_monthly_value: null,
};

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseNullableNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function parseIsoDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * @param {unknown} raw
 * @returns {typeof EMPTY_BILLING_MODEL}
 */
export function normalizeBillingModel(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_BILLING_MODEL };
  }
  const bm = /** @type {Record<string, unknown>} */ (raw);
  const typeRaw = typeof bm.type === 'string' ? bm.type.trim() : '';
  const type = BILLING_TYPE_VALUES.has(typeRaw) ? typeRaw : 'not_specified';
  if (type === 'not_specified') {
    return { ...EMPTY_BILLING_MODEL };
  }
  if (type === 'transactional') {
    const variance = parseNullableNumber(bm.unit_cost_variance_pct);
    return {
      type: 'transactional',
      unit_cost: parseNullableNumber(bm.unit_cost),
      unit_cost_variance_pct: variance != null ? variance : 10,
      hourly_rate: null,
      monthly_per_fte: null,
      fixed_monthly_value: null,
    };
  }
  if (type === 'hourly') {
    return {
      type: 'hourly',
      unit_cost: null,
      unit_cost_variance_pct: null,
      hourly_rate: parseNullableNumber(bm.hourly_rate),
      monthly_per_fte: null,
      fixed_monthly_value: null,
    };
  }
  if (type === 'fte_based') {
    return {
      type: 'fte_based',
      unit_cost: null,
      unit_cost_variance_pct: null,
      hourly_rate: null,
      monthly_per_fte: parseNullableNumber(bm.monthly_per_fte),
      fixed_monthly_value: null,
    };
  }
  if (type === 'fixed') {
    return {
      type: 'fixed',
      unit_cost: null,
      unit_cost_variance_pct: null,
      hourly_rate: null,
      monthly_per_fte: null,
      fixed_monthly_value: parseNullableNumber(bm.fixed_monthly_value),
    };
  }
  return { ...EMPTY_BILLING_MODEL };
}

/**
 * @param {Record<string, unknown>} engagement
 * @returns {Record<string, unknown>}
 */
function normalizeEngagementPhaseFields(engagement) {
  const sub =
    typeof engagement.sub_function === 'string' && engagement.sub_function.trim()
      ? engagement.sub_function.trim()
      : null;
  const competitiveRaw =
    typeof engagement.competitive_context === 'string' ? engagement.competitive_context.trim() : '';
  const competitive_context = COMPETITIVE_CONTEXT_VALUES.has(competitiveRaw) ? competitiveRaw : null;

  return {
    ...engagement,
    sub_function: sub,
    contract_start_date: parseIsoDate(engagement.contract_start_date),
    contract_end_date: parseIsoDate(engagement.contract_end_date),
    competitive_context,
  };
}

/**
 * @param {Record<string, unknown>} preferences
 * @returns {Record<string, unknown>}
 */
function normalizePreferencesPhaseFields(preferences) {
  const marginRaw =
    typeof preferences.margin_profile === 'string' ? preferences.margin_profile.trim() : '';
  let margin_profile = null;
  if (MARGIN_PROFILE_VALUES.has(marginRaw)) {
    margin_profile = marginRaw === 'not_disclosed' ? null : marginRaw;
  }

  let expected_implementation_months = parseNullableNumber(preferences.expected_implementation_months);
  if (expected_implementation_months != null) {
    const n = Math.round(expected_implementation_months);
    expected_implementation_months = n >= 1 && n <= 36 ? n : null;
  }

  const prevBilling =
    preferences.billing_model && typeof preferences.billing_model === 'object' && !Array.isArray(preferences.billing_model)
      ? preferences.billing_model
      : null;

  return {
    ...preferences,
    margin_profile,
    expected_implementation_months,
    billing_model: normalizeBillingModel(prevBilling),
  };
}

/**
 * Merge and normalize extracted intake_data for DB persistence (upload path).
 *
 * @param {Record<string, unknown>} intakeData
 * @returns {Record<string, unknown>}
 */
export function mergeExtractedIntakeData(intakeData) {
  const intake =
    intakeData && typeof intakeData === 'object' && !Array.isArray(intakeData)
      ? { ...intakeData }
      : {};

  const engagement =
    intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
      ? normalizeEngagementPhaseFields(/** @type {Record<string, unknown>} */ (intake.engagement))
      : normalizeEngagementPhaseFields({});

  const preferences =
    intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
      ? normalizePreferencesPhaseFields(/** @type {Record<string, unknown>} */ (intake.preferences))
      : normalizePreferencesPhaseFields({});

  return {
    ...intake,
    engagement: {
      goals: {},
      ...engagement,
    },
    preferences,
  };
}
