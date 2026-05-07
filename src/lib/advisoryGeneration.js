/**
 * @typedef {'info' | 'warn'} AdvisorySeverity
 */

/**
 * @typedef {{
 *   id: string,
 *   severity: AdvisorySeverity,
 *   title: string,
 *   body: string,
 *   affected_items?: string[]
 * }} Advisory
 */

import { CAPABILITY_LIBRARY } from './capabilityLibrary.js'

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNonNegNumber(value) {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {number}
 */
function taskMinutes(task) {
  if (!task || typeof task !== 'object') return 0
  return toNonNegNumber(task.volume_per_day) * toNonNegNumber(task.avg_time_minutes)
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normAlloc(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

/**
 * @param {string} role
 * @returns {string}
 */
function slugify(role) {
  return String(role || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {boolean}
 */
function isSafetySecurityOrFinancialDomain(engagement) {
  const domain = String(engagement?.domain ?? '').toLowerCase()
  if (
    domain.includes('financial') ||
    domain.includes('finance') ||
    domain.includes('banking') ||
    domain.includes('insurance')
  ) {
    return true
  }
  if (domain.includes('safety') || domain.includes('security')) {
    return true
  }
  const intake = engagement?.intake_data
  if (intake && typeof intake === 'object' && !Array.isArray(intake)) {
    const industry = /** @type {Record<string, unknown>} */ (intake).industry
    const ind = typeof industry === 'string' ? industry.toLowerCase() : ''
    if (ind.includes('financial') || ind.includes('finance') || ind.includes('security')) {
      return true
    }
  }
  return false
}

/**
 * Best-effort scale target label for advisory copy (intake shape may vary).
 *
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {string | null}
 */
function getScaleTargetLabel(engagement) {
  const intake =
    engagement?.intake_data && typeof engagement.intake_data === 'object' && !Array.isArray(engagement.intake_data)
      ? /** @type {Record<string, unknown>} */ (engagement.intake_data)
      : null
  if (!intake) return null

  const prefs = intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
    ? /** @type {Record<string, unknown>} */ (intake.preferences)
    : null
  const fromPrefs = prefs?.scale_target
  if (fromPrefs != null && fromPrefs !== '') {
    return typeof fromPrefs === 'number' && Number.isFinite(fromPrefs)
      ? `${fromPrefs}x`
      : String(fromPrefs).trim()
  }

  const top = intake.scale_target
  if (top != null && top !== '') {
    return typeof top === 'number' && Number.isFinite(top) ? `${top}x` : String(top).trim()
  }

  const engBlock = intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
    ? /** @type {Record<string, unknown>} */ (intake.engagement)
    : null
  const fromEng = engBlock?.scale_target
  if (fromEng != null && fromEng !== '') {
    return typeof fromEng === 'number' && Number.isFinite(fromEng) ? `${fromEng}x` : String(fromEng).trim()
  }

  return null
}

/**
 * @param {string} capabilityId
 * @returns {string}
 */
function capabilityDisplayName(capabilityId) {
  const cap = CAPABILITY_LIBRARY.find((c) => c.id === capabilityId)
  return cap?.name ?? capabilityId
}

/**
 * Derives F2 allocation advisories from task rows and engagement context.
 * Pure function: no I/O, no mutation of inputs.
 *
 * Uses `ai_allocation` only (not user overrides), per advisory rules.
 *
 * @param {Array<Record<string, unknown>> | null | undefined} tasks
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Advisory[]}
 */
export function generateAdvisories(tasks, engagement) {
  const list = Array.isArray(tasks) ? tasks : []
  /** @type {Advisory[]} */
  const out = []

  // --- 1. Coverage check ---
  let totalMinutes = 0
  let shiftedMinutes = 0
  for (const t of list) {
    const m = taskMinutes(t)
    totalMinutes += m
    const alloc = normAlloc(t?.ai_allocation)
    if (alloc && alloc !== 'human-only') {
      shiftedMinutes += m
    }
  }

  if (totalMinutes > 0) {
    const shiftedPct = (shiftedMinutes / totalMinutes) * 100
    const rounded = Math.round(shiftedPct)
    const scaleLabel = getScaleTargetLabel(engagement)
    const tail = scaleLabel
      ? `Aligns with your stated scale_target of ${scaleLabel}.`
      : 'Higher than typical for this domain.'
    const sensitive = isSafetySecurityOrFinancialDomain(engagement)
    const severity = shiftedPct > 70 && sensitive ? 'warn' : 'info'
    out.push({
      id: 'coverage-check',
      severity,
      title: 'Coverage check',
      body: `Recommendations would shift ${rounded}% of total task-hours to tech-assisted or automated. ${tail}`,
    })
  }

  // --- 2. Role hollowing ---
  /** @type {Map<string, { total: number, auto: number }>} */
  const byRole = new Map()
  for (const t of list) {
    const role = typeof t?.role_performing === 'string' && t.role_performing.trim() ? t.role_performing.trim() : '—'
    const m = taskMinutes(t)
    if (!byRole.has(role)) {
      byRole.set(role, { total: 0, auto: 0 })
    }
    const bucket = byRole.get(role)
    if (!bucket) continue
    bucket.total += m
    if (normAlloc(t?.ai_allocation) === 'tech-automated') {
      bucket.auto += m
    }
  }
  for (const [roleName, { total, auto }] of byRole) {
    if (total <= 0) continue
    const autoPct = (auto / total) * 100
    if (autoPct > 75) {
      const rounded = Math.round(autoPct)
      out.push({
        id: `role-hollowing-${slugify(roleName)}`,
        severity: 'warn',
        title: `Role hollowing — ${roleName}`,
        body: `${roleName} would lose ${rounded}% of current tasks. Treat as transformation, not a tweak. F3 will handle role redesign.`,
        affected_items: [roleName],
      })
    }
  }

  // --- 3. Capability concentration ---
  /** @type {Map<string, number>} */
  const capCounts = new Map()
  let autoTaskCount = 0
  for (const t of list) {
    if (normAlloc(t?.ai_allocation) !== 'tech-automated') continue
    const capId = t?.ai_primary_capability
    if (typeof capId !== 'string' || !capId.trim()) continue
    autoTaskCount += 1
    const key = capId.trim()
    capCounts.set(key, (capCounts.get(key) ?? 0) + 1)
  }
  if (autoTaskCount > 0) {
    for (const [capId, count] of capCounts) {
      const pct = (count / autoTaskCount) * 100
      if (pct > 50) {
        const rounded = Math.round(pct)
        const name = capabilityDisplayName(capId)
        out.push({
          id: 'capability-concentration',
          severity: 'info',
          title: 'Capability concentration risk',
          body: `${rounded}% of automated tasks rely on ${name}. Single-vendor risk; consider failover plan.`,
          affected_items: [capId],
        })
        break
      }
    }
  }

  // --- 4. Low confidence cluster ---
  let lowConf = 0
  for (const t of list) {
    const c = t?.ai_confidence_calibrated
    const v = typeof c === 'number' && Number.isFinite(c) ? c : null
    if (v != null && v < 0.65) {
      lowConf += 1
    }
  }
  if (lowConf >= 3) {
    out.push({
      id: 'low-confidence-cluster',
      severity: 'info',
      title: 'Low confidence cluster',
      body: `${lowConf} tasks have AI confidence below 65%. Consider manual review before committing these allocations.`,
    })
  }

  // --- 5. No logging ---
  let noLog = 0
  for (const t of list) {
    const alloc = normAlloc(t?.ai_allocation)
    if (!alloc || alloc === 'human-only') continue
    if (t?.data_logged === false) {
      noLog += 1
    }
  }
  if (noLog > 0) {
    out.push({
      id: 'automation-without-data-trail',
      severity: 'warn',
      title: 'Automation without data trail',
      body: `${noLog} automated/assisted tasks aren't currently logged. Set up logging before deploying these capabilities.`,
    })
  }

  return out
}
