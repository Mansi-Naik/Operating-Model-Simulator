/**
 * @typedef {'minor_evolution' | 'meaningful_shift' | 'transformation' | 'redefinition'} RolePattern
 */

/**
 * @typedef {{
 *   role_name: string,
 *   level: number,
 *   current_headcount: number,
 *   current_cost_per_fte: number,
 *   total_tasks_today: number,
 *   total_time_minutes_today: number,
 *   retained_tasks: object[],
 *   lost_tasks: object[],
 *   retained_time_minutes: number,
 *   lost_time_minutes: number,
 *   time_freed_pct: number,
 *   pattern: RolePattern,
 *   current_time_split: Record<string, number>
 * }} RoleAggregate
 */

/**
 * Final allocation for UI / analytics: user override wins when set.
 *
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {string} Normalized allocation string, or '' if unknown
 */
export function getFinalAllocation(task) {
  if (!task || typeof task !== 'object') return ''
  const u = task.user_allocation
  if (typeof u === 'string' && u.trim()) {
    return u.trim().toLowerCase()
  }
  const a = task.ai_allocation
  if (typeof a === 'string' && a.trim()) {
    return a.trim().toLowerCase()
  }
  return ''
}

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
function taskTimeMinutes(task) {
  if (!task || typeof task !== 'object') return 0
  return toNonNegNumber(task.volume_per_day) * toNonNegNumber(task.avg_time_minutes)
}

/**
 * @param {string} word
 * @returns {string}
 */
function singularizeToken(word) {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('sses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/**
 * Normalizes role labels across intake and task rows. This avoids skipping roles
 * because one source says "Team Leads" while another says "Team Lead".
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalizeRoleKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeToken)
    .join(' ')
}

/**
 * @param {number} pct
 * @returns {RolePattern}
 */
function classifyPattern(pct) {
  if (!Number.isFinite(pct) || pct < 0) return 'minor_evolution'
  if (pct < 15) return 'minor_evolution'
  if (pct < 40) return 'meaningful_shift'
  if (pct <= 70) return 'transformation'
  return 'redefinition'
}

/**
 * Percentages by task label; last entry absorbs rounding so the map sums to 100.
 *
 * @param {Record<string, number>} minutesByLabel
 * @returns {Record<string, number>}
 */
function toPercentageSplit(minutesByLabel) {
  const entries = Object.entries(minutesByLabel).filter(([, m]) => m > 0)
  const total = entries.reduce((s, [, m]) => s + m, 0)
  if (total <= 0) return {}

  /** @type {Record<string, number>} */
  const out = {}
  let sum = 0
  for (let i = 0; i < entries.length; i += 1) {
    const [name, m] = entries[i]
    if (i === entries.length - 1) {
      out[name] = Math.round((100 - sum) * 100) / 100
    } else {
      const v = Math.round(((m / total) * 100) * 100) / 100
      out[name] = v
      sum += v
    }
  }
  return out
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function hierarchyRoleName(row) {
  if (!row || typeof row !== 'object') return ''
  const r = /** @type {Record<string, unknown>} */ (row)
  const name = r.role ?? r.name ?? r.role_name
  return typeof name === 'string' ? name.trim() : ''
}

/**
 * @param {unknown} row
 * @returns {number}
 */
function hierarchyLevel(row) {
  if (!row || typeof row !== 'object') return 1
  const lv = /** @type {Record<string, unknown>} */ (row).level
  const n = typeof lv === 'number' ? lv : Number(lv)
  if (!Number.isFinite(n)) return 1
  return Math.min(5, Math.max(1, Math.round(n)))
}

/**
 * @param {Record<string, unknown>[]} roleTasks
 * @param {string} role_name
 * @param {number} level
 * @param {number} current_headcount
 * @param {number} current_cost_per_fte
 * @returns {RoleAggregate}
 */
function buildRoleAggregate(roleTasks, role_name, level, current_headcount, current_cost_per_fte) {
  const total_tasks_today = roleTasks.length
  let total_time_minutes_today = 0
  for (const t of roleTasks) {
    total_time_minutes_today += taskTimeMinutes(t)
  }

  /** @type {Record<string, unknown>[]} */
  const retained_tasks = []
  /** @type {Record<string, unknown>[]} */
  const lost_tasks = []
  let retained_time_minutes = 0
  let lost_time_minutes = 0

  /** @type {Record<string, number>} */
  const minutesByTaskName = {}

  for (const t of roleTasks) {
    const mins = taskTimeMinutes(t)
    const label =
      typeof t.task_name === 'string' && t.task_name.trim()
        ? t.task_name.trim()
        : typeof t.task_id === 'string' && t.task_id.trim()
          ? t.task_id.trim()
          : '(unnamed task)'

    minutesByTaskName[label] = (minutesByTaskName[label] ?? 0) + mins

    const finalAllocation = getFinalAllocation(t) || 'human-only'

    if (finalAllocation === 'tech-automated') {
      lost_tasks.push(t)
      lost_time_minutes += mins
    } else if (finalAllocation === 'human-only' || finalAllocation === 'tech-assisted') {
      retained_tasks.push(t)
      retained_time_minutes += mins
    }
  }

  const time_freed_pct =
    total_time_minutes_today > 0
      ? Math.min(100, Math.max(0, (lost_time_minutes / total_time_minutes_today) * 100))
      : 0

  const pattern = classifyPattern(time_freed_pct)
  const current_time_split = toPercentageSplit(minutesByTaskName)

  return {
    role_name,
    level,
    current_headcount,
    current_cost_per_fte,
    total_tasks_today,
    total_time_minutes_today,
    retained_tasks,
    lost_tasks,
    retained_time_minutes,
    lost_time_minutes,
    time_freed_pct,
    pattern,
    current_time_split,
  }
}

/**
 * Aggregates task rows per hierarchy role for F3 (time freed, pattern, donut split).
 * No I/O, no mutation of inputs. (Temporary `console` traces for allocation debugging.)
 *
 * @param {Array<Record<string, unknown>> | null | undefined} tasks
 * @param {Array<Record<string, unknown>> | null | undefined} hierarchy Rows like `{ role, level, headcount, cost }` (see StepHierarchy save shape).
 * @returns {RoleAggregate[]}
 */
export function aggregateByRole(tasks, hierarchy) {
  const taskList = Array.isArray(tasks) ? tasks : []
  const hierList = Array.isArray(hierarchy) ? hierarchy : []
  /** @type {Set<string>} */
  const matchedTaskRoleKeys = new Set()

  const hierarchyAggregates = hierList.map((row) => {
    const role_name = hierarchyRoleName(row)
    const level = hierarchyLevel(row)
    const head = /** @type {Record<string, unknown>} */ (row).headcount
    const cost = /** @type {Record<string, unknown>} */ (row).cost
    const current_headcount = toNonNegNumber(head)
    const current_cost_per_fte = toNonNegNumber(cost)
    const roleKey = normalizeRoleKey(role_name)

    const roleTasks = taskList.filter((t) => {
      const rp = t?.role_performing
      const name = typeof rp === 'string' ? rp.trim() : ''
      const taskRoleKey = normalizeRoleKey(name)
      const isMatch = Boolean(roleKey) && taskRoleKey === roleKey
      if (isMatch) matchedTaskRoleKeys.add(taskRoleKey)
      return isMatch
    })

    return buildRoleAggregate(roleTasks, role_name, level, current_headcount, current_cost_per_fte)
  })

  /** @type {Map<string, { roleName: string, tasks: Record<string, unknown>[] }>} */
  const unmatchedByRole = new Map()
  for (const task of taskList) {
    const rawRole = typeof task.role_performing === 'string' ? task.role_performing.trim() : ''
    const taskRoleKey = normalizeRoleKey(rawRole)
    if (!taskRoleKey || matchedTaskRoleKeys.has(taskRoleKey)) continue
    const prev = unmatchedByRole.get(taskRoleKey)
    if (prev) {
      prev.tasks.push(task)
    } else {
      unmatchedByRole.set(taskRoleKey, { roleName: rawRole, tasks: [task] })
    }
  }

  const nextLevel =
    hierList.reduce((max, row) => Math.max(max, hierarchyLevel(row)), 0) + 1
  const unmatchedAggregates = [...unmatchedByRole.values()].map((entry) =>
    buildRoleAggregate(entry.tasks, entry.roleName, nextLevel, 0, 0),
  )

  return [...hierarchyAggregates, ...unmatchedAggregates]
}

const SHIFT_MINUTES = 540
const BREAKS_MINUTES = 60
const ADMIN_MINUTES = 30
const BUFFER_MINUTES = 15
const DEVELOPMENT_MINUTES = 45
const TOTAL_OVERHEAD_MINUTES = BREAKS_MINUTES + ADMIN_MINUTES + BUFFER_MINUTES + DEVELOPMENT_MINUTES
const PRODUCTIVE_MINUTES = SHIFT_MINUTES - TOTAL_OVERHEAD_MINUTES

const OVERHEAD_ACTIVITIES = Object.freeze([
  { name: 'Team standup + admin', minutes: ADMIN_MINUTES, type: 'overhead' },
  { name: 'Breaks (lunch + short)', minutes: BREAKS_MINUTES, type: 'overhead' },
  { name: 'Context switching / buffer', minutes: BUFFER_MINUTES, type: 'overhead' },
  { name: 'Coaching / training', minutes: DEVELOPMENT_MINUTES, type: 'development' },
])

/**
 * @param {number} mins
 * @returns {string}
 */
export function formatShiftMinutes(mins) {
  const total = Math.max(0, Math.round(mins))
  const hours = Math.floor(total / 60)
  const remainder = total % 60
  return `${hours}h ${String(remainder).padStart(2, '0')}m`
}

/**
 * @param {Array<{ minutes: number }>} activities
 * @param {number} target
 */
function rebalanceMinutes(activities, target) {
  if (!Array.isArray(activities) || activities.length === 0) return
  let sum = activities.reduce((s, a) => s + Math.max(0, Math.round(a.minutes)), 0)
  let diff = target - sum
  let idx = activities.length - 1
  while (diff !== 0 && idx >= 0) {
    const next = Math.max(1, Math.round(activities[idx].minutes) + diff)
    const applied = next - Math.round(activities[idx].minutes)
    activities[idx].minutes = next
    diff -= applied
    idx -= 1
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} role
 * @param {Record<string, unknown>[] | null | undefined} tasks
 * @param {number} productiveMinutes
 * @returns {Array<{ name: string, minutes: number, type: 'productive', ai_allocation?: string }>}
 */
function computeRedesignedRoleActivities(role, tasks, productiveMinutes) {
  const roleName =
    typeof role?.role_name === 'string' && role.role_name.trim()
      ? role.role_name.trim()
      : typeof role?.future_role_name === 'string'
        ? role.future_role_name.trim()
        : ''
  const roleKey = normalizeRoleKey(roleName)
  const headcount = Math.max(
    1,
    toNonNegNumber(role?.headcount_future) ||
      toNonNegNumber(role?.headcount_current) ||
      toNonNegNumber(role?.current_headcount) ||
      1,
  )

  const roleTasks = (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (!t || typeof t !== 'object') return false
    const rp = typeof t.role_performing === 'string' ? t.role_performing.trim() : ''
    if (!roleKey || normalizeRoleKey(rp) !== roleKey) return false
    return getFinalAllocation(t) !== 'tech-automated'
  })

  if (roleTasks.length === 0) {
    return [{ name: 'AI output review and exception handling', minutes: productiveMinutes, type: 'productive' }]
  }

  const rawTaskMinutes = roleTasks.map((task) => {
    const dailyVolume = toNonNegNumber(task.volume_per_day)
    const minutesPerTask = toNonNegNumber(task.avg_time_minutes)
    const totalDailyMinutes = dailyVolume * minutesPerTask
    const alloc = getFinalAllocation(task)
    const effortMultiplier = alloc === 'tech-assisted' ? 0.5 : 1
    const perFteMinutes = (totalDailyMinutes * effortMultiplier) / headcount
    return {
      name:
        typeof task.task_name === 'string' && task.task_name.trim()
          ? task.task_name.trim()
          : typeof task.task_id === 'string' && task.task_id.trim()
            ? task.task_id.trim()
            : 'Task',
      raw_minutes: perFteMinutes,
      allocation: alloc || 'human-only',
    }
  })

  const totalRaw = rawTaskMinutes.reduce((sum, t) => sum + t.raw_minutes, 0)
  if (totalRaw <= 0) {
    return [{ name: 'Strategic activities (new scope)', minutes: productiveMinutes, type: 'productive' }]
  }

  const scaleFactor = productiveMinutes / totalRaw
  let activities = rawTaskMinutes.map((t) => ({
    name: t.name,
    minutes: Math.round(t.raw_minutes * scaleFactor),
    type: /** @type {'productive'} */ ('productive'),
    ai_allocation: t.allocation,
  }))
  activities = activities.filter((a) => a.minutes >= 5)
  if (activities.length === 0) {
    return [{ name: 'Strategic activities (new scope)', minutes: productiveMinutes, type: 'productive' }]
  }
  activities.sort((a, b) => b.minutes - a.minutes)
  rebalanceMinutes(activities, productiveMinutes)
  return activities
}

/**
 * @param {Record<string, unknown>} role
 * @param {number} productiveMinutes
 * @returns {Array<{ name: string, minutes: number, type: 'productive' }>}
 */
function generateEmergentRoleActivities(role, productiveMinutes) {
  const daily = role.daily_activities
  if (Array.isArray(daily) && daily.length > 0) {
    const parsed = daily
      .filter((a) => a && typeof a === 'object' && !Array.isArray(a))
      .map((a) => {
        const row = /** @type {Record<string, unknown>} */ (a)
        const name = typeof row.name === 'string' ? row.name.trim() : ''
        const minutes = toNonNegNumber(row.minutes)
        if (!name || minutes <= 0) return null
        return { name, minutes: Math.round(minutes), type: /** @type {'productive'} */ ('productive') }
      })
      .filter(Boolean)
    if (parsed.length > 0) {
      rebalanceMinutes(parsed, productiveMinutes)
      return /** @type {Array<{ name: string, minutes: number, type: 'productive' }>} */ (parsed)
    }
  }

  const responsibilities = Array.isArray(role.future_responsibilities)
    ? role.future_responsibilities.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).trim())
    : []
  const skills = Array.isArray(role.skills)
    ? role.skills.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).trim())
    : []
  const roleLabel = typeof role.name === 'string' && role.name.trim() ? role.name.trim() : 'Emergent role'

  if (responsibilities.length >= 2) {
    const slice = responsibilities.slice(0, 4)
    const per = Math.floor(productiveMinutes / slice.length)
    const activities = slice.map((name, idx) => ({
      name: name.length > 48 ? `${name.slice(0, 45)}…` : name,
      minutes: idx === slice.length - 1 ? productiveMinutes - per * (slice.length - 1) : per,
      type: /** @type {'productive'} */ ('productive'),
    }))
    rebalanceMinutes(activities, productiveMinutes)
    return activities
  }

  if (skills.length >= 2) {
    const labels = skills.slice(0, 3).map((s) => `${s}-focused work`)
    const per = Math.floor(productiveMinutes / labels.length)
    const activities = labels.map((name, idx) => ({
      name,
      minutes: idx === labels.length - 1 ? productiveMinutes - per * (labels.length - 1) : per,
      type: /** @type {'productive'} */ ('productive'),
    }))
    rebalanceMinutes(activities, productiveMinutes)
    return activities
  }

  const activityCount = 3
  const perActivity = Math.floor(productiveMinutes / activityCount)
  return [
    { name: `${roleLabel} primary activities`, minutes: perActivity, type: 'productive' },
    { name: 'Cross-functional coordination', minutes: perActivity, type: 'productive' },
    {
      name: 'Exception handling and oversight',
      minutes: productiveMinutes - 2 * perActivity,
      type: 'productive',
    },
  ]
}

/**
 * Daily 9-hour shift breakdown for F3 role detail (future-state responsibilities).
 *
 * @param {Record<string, unknown> | null | undefined} role Redesign or emergent role row.
 * @param {Record<string, unknown>[] | null | undefined} tasks Engagement tasks (F2); omit for emergent.
 * @param {boolean} isEmergent
 * @returns {{
 *   total_shift_minutes: number,
 *   productive_minutes: number,
 *   overhead_minutes: number,
 *   activities: Array<{ name: string, minutes: number, type: 'productive' | 'overhead' | 'development', ai_allocation?: string }>
 * }}
 */
export function computeDailyTimeBreakdown(role, tasks, isEmergent) {
  const roleObj = role && typeof role === 'object' ? role : {}
  let productiveActivities = isEmergent
    ? generateEmergentRoleActivities(roleObj, PRODUCTIVE_MINUTES)
    : computeRedesignedRoleActivities(roleObj, tasks, PRODUCTIVE_MINUTES)

  const activities = [
    ...productiveActivities.map((a) => ({ ...a })),
    ...OVERHEAD_ACTIVITIES.map((a) => ({ ...a })),
  ]
  rebalanceMinutes(activities, SHIFT_MINUTES)

  return {
    total_shift_minutes: SHIFT_MINUTES,
    productive_minutes: PRODUCTIVE_MINUTES,
    overhead_minutes: TOTAL_OVERHEAD_MINUTES,
    activities,
  }
}
