/**
 * @fileoverview Deterministic F6 timeline planning logic (pure functions, no I/O).
 */

const DEFAULT_IMPLEMENTATION_PATHS = Object.freeze(['configure', 'pilot', 'rollout', 'monitor'])
const RISK_SCORE = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 })

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asObj(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {}
}

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
 * @param {unknown} value
 * @returns {number}
 */
function nonNeg(value) {
  return Math.max(0, toNum(value))
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function slugify(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s || 'unknown'
}

/**
 * @param {Record<string, unknown> | null | undefined} task
 * @returns {string}
 */
function finalAllocation(task) {
  if (!task || typeof task !== 'object') return ''
  const user = task.user_allocation
  if (typeof user === 'string' && user.trim()) return user.trim().toLowerCase()
  const ai = task.ai_allocation
  return typeof ai === 'string' ? ai.trim().toLowerCase() : ''
}

/**
 * @param {Record<string, unknown>} task
 * @returns {'full' | 'assist' | null}
 */
function deploymentTypeForTask(task) {
  const alloc = finalAllocation(task)
  if (alloc === 'tech-automated') return 'full'
  if (alloc === 'tech-assisted') return 'assist'
  return null
}

/**
 * @param {Record<string, unknown>} task
 * @returns {string}
 */
function taskId(task) {
  return String(task.task_id ?? task.id ?? task.task_name ?? 'task').trim()
}

/**
 * @param {Record<string, unknown>} task
 * @returns {string | null}
 */
function taskCapabilityId(task) {
  const raw = task.ai_primary_capability ?? task.primary_capability ?? task.capability_id
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/**
 * @param {unknown} value
 * @returns {'low' | 'medium' | 'high'}
 */
function normalizeRisk(value) {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (s === 'low' || s === 'medium' || s === 'high') return s
  if (s === 'critical') return 'high'
  return 'medium'
}

/**
 * @param {Record<string, unknown>[]} tasks
 * @returns {'low' | 'medium' | 'high'}
 */
function maxTaskRisk(tasks) {
  let max = 1
  for (const task of tasks) {
    const raw = typeof task.consequence_of_error === 'string' ? task.consequence_of_error.trim().toLowerCase() : 'medium'
    const score = RISK_SCORE[raw] ?? RISK_SCORE.medium
    max = Math.max(max, score)
  }
  return max >= 3 ? 'high' : max === 2 ? 'medium' : 'low'
}

/**
 * @param {unknown} capabilityLibrary
 * @returns {Map<string, Record<string, unknown>>}
 */
function capabilityMap(capabilityLibrary) {
  const list = Array.isArray(capabilityLibrary)
    ? capabilityLibrary
    : Array.isArray(asObj(capabilityLibrary).capabilities)
      ? asObj(capabilityLibrary).capabilities
      : []
  const map = new Map()
  for (const item of list) {
    const cap = asObj(item)
    const id = typeof cap.id === 'string' && cap.id.trim() ? cap.id.trim() : ''
    if (id) map.set(id, cap)
  }
  return map
}

/**
 * @param {Record<string, unknown>} capability
 * @returns {string[]}
 */
function implementationPaths(capability) {
  const paths = capability.implementation_paths
  if (Array.isArray(paths)) {
    const out = paths.map((p) => String(p).trim()).filter(Boolean)
    if (out.length > 0) return out
  }
  return [...DEFAULT_IMPLEMENTATION_PATHS]
}

/**
 * @param {Record<string, unknown>} capability
 * @returns {number}
 */
function effortWeeks(capability) {
  return nonNeg(capability.effort_weeks ?? capability.implementation_effort_weeks) || 4
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>}
 */
function intakeData(engagement) {
  return asObj(engagement?.intake_data)
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>[]}
 */
function engagementTasks(engagement) {
  const tasks = asObj(engagement).tasks ?? intakeData(engagement).tasks
  return Array.isArray(tasks) ? tasks.map((t) => asObj(t)).filter((t) => Object.keys(t).length > 0) : []
}

/**
 * @param {Record<string, unknown> | null | undefined} engagement
 * @returns {Record<string, unknown>[]}
 */
function f3Redesigns(engagement) {
  const pipeline = asObj(engagement?.pipeline_runs ?? engagement?.pipeline_run ?? engagement?.pipeline)
  const f3 = asObj(engagement?.f3_roles ?? pipeline.f3_roles)
  const redesigns = Array.isArray(f3.redesigns) ? f3.redesigns : Array.isArray(engagement?.f3_roles) ? engagement?.f3_roles : []
  return Array.isArray(redesigns) ? redesigns.map((r) => asObj(r)).filter((r) => Object.keys(r).length > 0) : []
}

/**
 * @param {Record<string, unknown>[]} redesigns
 * @param {Set<string>} taskIds
 * @returns {number}
 */
function phaseHeadcountChange(redesigns, taskIds) {
  let total = 0
  for (const row of redesigns) {
    const tasks = [
      ...(Array.isArray(row.retained_tasks) ? row.retained_tasks : []),
      ...(Array.isArray(row.lost_tasks) ? row.lost_tasks : []),
      ...(Array.isArray(row.source_tasks) ? row.source_tasks : []),
    ].map((t) => taskId(asObj(t)))
    if (tasks.some((id) => taskIds.has(id))) {
      total += toNum(row.future_headcount_delta ?? row.headcount_delta ?? row.headcount_change)
    }
  }
  return total
}

/**
 * @param {Record<string, unknown>[]} tasks
 * @returns {string[]}
 */
function risksForTasks(tasks) {
  const risks = new Set()
  if (tasks.some((t) => normalizeRisk(t.consequence_of_error) === 'high')) {
    risks.add('High-consequence tasks require human fallback, audit sampling, and rollback controls.')
  }
  if (tasks.some((t) => t.data_logged === false)) {
    risks.add('Some affected tasks have weak logging, which may slow tuning and control validation.')
  }
  if (tasks.some((t) => String(t.input_data_type ?? '').trim() === '')) {
    risks.add('Some affected tasks have unclear input types, increasing integration discovery risk.')
  }
  return [...risks]
}

/**
 * @param {Record<string, unknown>[]} nodes
 * @param {Array<{ from: string, to: string, reason: string }>} edges
 * @returns {Map<string, string[]>}
 */
function incomingMap(nodes, edges) {
  const map = new Map(nodes.map((node) => [String(node.id), []]))
  for (const edge of edges) {
    if (!map.has(edge.to)) map.set(edge.to, [])
    map.get(edge.to).push(edge.from)
  }
  return map
}

/**
 * @param {Record<string, unknown>[]} nodes
 * @param {Array<{ from: string, to: string, reason: string }>} edges
 * @returns {Map<string, string[]>}
 */
function outgoingMap(nodes, edges) {
  const map = new Map(nodes.map((node) => [String(node.id), []]))
  for (const edge of edges) {
    if (!map.has(edge.from)) map.set(edge.from, [])
    map.get(edge.from).push(edge.to)
  }
  return map
}

/**
 * @param {Record<string, unknown>} node
 * @param {Record<string, unknown>[]} tasks
 * @returns {boolean}
 */
function isCleanDataQuickCandidate(node, tasks) {
  const affected = new Set(Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : [])
  const nodeTasks = tasks.filter((t) => affected.has(taskId(t)))
  return nodeTasks.some((t) => t.data_logged === true && String(t.input_data_type ?? '').trim())
}

/**
 * Builds a dependency graph where each node is a capability deployment unit.
 *
 * @param {Record<string, unknown>[] | null | undefined} tasks Task rows with F2 allocation fields.
 * @param {unknown} capabilityLibrary Capability library array or object containing `capabilities`.
 * @param {Record<string, unknown> | null | undefined} engagement Engagement context.
 * @returns {{
 *   nodes: Array<{
 *     id: string,
 *     capability_id: string,
 *     display_name: string,
 *     deployment_type: 'full' | 'assist',
 *     affected_tasks: string[],
 *     total_volume_affected: number,
 *     effort_weeks: number,
 *     implementation_paths: string[],
 *     risk_level: 'low' | 'medium' | 'high'
 *   }>,
 *   edges: Array<{ from: string, to: string, reason: 'prerequisite' | 'related_capability' | 'data_dependency' }>
 * }}
 */
export function buildDependencyGraph(tasks, capabilityLibrary, engagement) {
  void engagement
  const caps = capabilityMap(capabilityLibrary)
  const list = Array.isArray(tasks) ? tasks.map((t) => asObj(t)) : []
  /** @type {Map<string, { capability_id: string, deployment_type: 'full' | 'assist', tasks: Record<string, unknown>[] }>} */
  const grouped = new Map()

  for (const task of list) {
    const deploymentType = deploymentTypeForTask(task)
    if (!deploymentType) continue
    const capabilityId = taskCapabilityId(task)
    if (!capabilityId) continue
    const id = slugify(capabilityId)
    const prev = grouped.get(id)
    if (prev) {
      prev.tasks.push(task)
      if (deploymentType === 'full') prev.deployment_type = 'full'
    } else {
      grouped.set(id, { capability_id: capabilityId, deployment_type: deploymentType, tasks: [task] })
    }
  }

  const nodes = [...grouped.entries()].map(([id, group]) => {
    const cap = caps.get(group.capability_id) ?? {}
    return {
      id,
      capability_id: group.capability_id,
      display_name: typeof cap.name === 'string' && cap.name.trim() ? cap.name : group.capability_id,
      deployment_type: group.deployment_type,
      affected_tasks: group.tasks.map(taskId),
      total_volume_affected: group.tasks.reduce((sum, task) => sum + nonNeg(task.volume_per_day), 0),
      effort_weeks: effortWeeks(cap),
      implementation_paths: implementationPaths(cap),
      risk_level: maxTaskRisk(group.tasks),
    }
  })

  const nodeIds = new Set(nodes.map((n) => n.id))
  /** @type {Array<{ from: string, to: string, reason: 'prerequisite' | 'related_capability' | 'data_dependency' }>} */
  const edges = []
  const addEdge = (from, to, reason) => {
    if (from === to || !nodeIds.has(from) || !nodeIds.has(to)) return
    if (edges.some((edge) => edge.from === from && edge.to === to && edge.reason === reason)) return
    edges.push({ from, to, reason })
  }

  if (nodeIds.has('confidence_routing')) {
    for (const node of nodes) {
      if (node.deployment_type === 'full') addEdge('confidence_routing', node.id, 'prerequisite')
    }
  }
  if (nodeIds.has('auto_classification_text') && nodeIds.has('llm_drafting')) {
    addEdge('auto_classification_text', 'llm_drafting', 'prerequisite')
  }

  return { nodes, edges }
}

/**
 * Computes the critical path through a deployment graph using topological sort
 * and longest path by node effort.
 *
 * @param {{ nodes?: Record<string, unknown>[], edges?: Array<{ from: string, to: string, reason?: string }> }} graph
 * @returns {{ critical_path: string[], total_critical_weeks: number, parallel_branches: string[][] }}
 */
export function computeCriticalPath(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []
  const byId = new Map(nodes.map((node) => [String(node.id), node]))
  const incoming = incomingMap(nodes, edges)
  const outgoing = outgoingMap(nodes, edges)
  const indegree = new Map(nodes.map((node) => [String(node.id), incoming.get(String(node.id))?.length ?? 0]))
  const queue = nodes.map((node) => String(node.id)).filter((id) => (indegree.get(id) ?? 0) === 0).sort()
  /** @type {string[]} */
  const order = []

  while (queue.length > 0) {
    const id = queue.shift()
    order.push(id)
    for (const next of outgoing.get(id) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1)
      if ((indegree.get(next) ?? 0) === 0) {
        queue.push(next)
        queue.sort()
      }
    }
  }

  for (const node of nodes) {
    const id = String(node.id)
    if (!order.includes(id)) order.push(id)
  }

  const dist = new Map()
  const prev = new Map()
  for (const id of order) {
    const base = dist.get(id) ?? nonNeg(byId.get(id)?.effort_weeks)
    dist.set(id, base)
    for (const next of outgoing.get(id) ?? []) {
      const candidate = base + nonNeg(byId.get(next)?.effort_weeks)
      if (candidate > (dist.get(next) ?? 0)) {
        dist.set(next, candidate)
        prev.set(next, id)
      }
    }
  }

  let end = ''
  let max = 0
  for (const [id, value] of dist.entries()) {
    if (value > max) {
      max = value
      end = id
    }
  }

  /** @type {string[]} */
  const criticalPath = []
  while (end) {
    criticalPath.unshift(end)
    end = prev.get(end) ?? ''
  }
  const criticalSet = new Set(criticalPath)
  const parallel = order.filter((id) => !criticalSet.has(id))
  const parallelBranches = parallel.length > 0 ? parallel.map((id) => [id]) : []

  return {
    critical_path: criticalPath,
    total_critical_weeks: max,
    parallel_branches: parallelBranches,
  }
}

/**
 * Returns the highest-volume low-effort deployment nodes with no prerequisites.
 *
 * @param {{ nodes?: Record<string, unknown>[], edges?: Array<{ from: string, to: string, reason?: string }> }} graph
 * @param {Record<string, unknown> | null | undefined} engagement Engagement containing task context when available.
 * @returns {Record<string, unknown>[]}
 */
export function identifyQuickWins(graph, engagement) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []
  const tasks = engagementTasks(engagement)
  const incoming = incomingMap(nodes, edges)
  const byTaskId = new Map(tasks.map((task) => [taskId(task), task]))

  return nodes
    .filter((node) => {
      const affectedIds = Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : []
      const affectedTasks = affectedIds.map((id) => byTaskId.get(id)).filter(Boolean)
      return (
        nonNeg(node.effort_weeks) <= 4 &&
        (incoming.get(String(node.id))?.length ?? 0) === 0 &&
        affectedTasks.length > 0 &&
        affectedTasks.every((task) => normalizeRisk(task.consequence_of_error) !== 'high') &&
        affectedTasks.every((task) => task.data_logged === true)
      )
    })
    .sort((a, b) => nonNeg(b.total_volume_affected) - nonNeg(a.total_volume_affected))
    .slice(0, 5)
}

/**
 * Groups deployment graph nodes into deterministic timeline phases.
 *
 * @param {{ nodes?: Record<string, unknown>[], edges?: Array<{ from: string, to: string, reason?: string }> }} graph Dependency graph.
 * @param {{ critical_path?: string[], total_critical_weeks?: number, parallel_branches?: string[][] } | string[]} criticalPath Critical path object or node id array.
 * @param {Record<string, unknown> | null | undefined} engagement Engagement context.
 * @returns {Array<{
 *   phase_id: 1 | 2 | 3 | 4,
 *   phase_name: string,
 *   start_week: number,
 *   end_week: number,
 *   nodes: string[],
 *   description: string,
 *   deliverables: string[],
 *   risks: string[],
 *   headcount_change: number
 * }>}
 */
export function groupNodesIntoPhases(graph, criticalPath, engagement) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []
  const tasks = engagementTasks(engagement)
  const byTaskId = new Map(tasks.map((task) => [taskId(task), task]))
  const incoming = incomingMap(nodes, edges)
  const quickWins = new Set(identifyQuickWins(graph, engagement).map((node) => String(node.id)))
  const criticalIds = new Set(Array.isArray(criticalPath) ? criticalPath : Array.isArray(criticalPath?.critical_path) ? criticalPath.critical_path : [])
  const assigned = new Set()
  const phaseNodes = [[], [], [], []]

  const assign = (phaseIndex, nodeId) => {
    if (assigned.has(nodeId)) return
    phaseNodes[phaseIndex].push(nodeId)
    assigned.add(nodeId)
  }

  for (const node of nodes) {
    const id = String(node.id)
    if (id === 'confidence_routing' || quickWins.has(id)) assign(0, id)
  }
  for (const node of nodes) {
    const id = String(node.id)
    if (assigned.has(id)) continue
    const affected = (Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : [])
      .map((id) => byTaskId.get(id))
      .filter(Boolean)
    if (
      criticalIds.has(id) ||
      normalizeRisk(node.risk_level) === 'medium' ||
      affected.some((task) => normalizeRisk(task.consequence_of_error) === 'medium')
    ) {
      assign(1, id)
    }
  }
  for (const node of nodes) {
    const id = String(node.id)
    if (assigned.has(id)) continue
    if ((incoming.get(id)?.length ?? 0) > 0 || normalizeRisk(node.risk_level) === 'high') {
      assign(2, id)
    }
  }
  for (const node of nodes) {
    assign(3, String(node.id))
  }

  const phaseMeta = [
    { id: 1, name: 'Foundation', start: 1, end: 6 },
    { id: 2, name: 'Pilot', start: 5, end: 12 },
    { id: 3, name: 'Scale', start: 10, end: 22 },
    { id: 4, name: 'Optimize', start: 18, end: 30 },
  ]
  const redesigns = f3Redesigns(engagement)

  return phaseMeta.map((meta, idx) => {
    const ids = phaseNodes[idx]
    const nodeRows = nodes.filter((node) => ids.includes(String(node.id)))
    const affectedTasks = nodeRows.flatMap((node) => {
      const affected = Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : []
      return affected.map((id) => byTaskId.get(id)).filter(Boolean)
    })
    const affectedSet = new Set(affectedTasks.map(taskId))
    return {
      phase_id: /** @type {1 | 2 | 3 | 4} */ (meta.id),
      phase_name: meta.name,
      start_week: meta.start,
      end_week: meta.end,
      nodes: ids,
      description: '',
      deliverables: deliverablesForPhase(meta.id, ids),
      risks: risksForTasks(affectedTasks),
      headcount_change: phaseHeadcountChange(redesigns, affectedSet),
    }
  })
}

/**
 * @param {number} phaseId
 * @param {string[]} nodeIds
 * @returns {string[]}
 */
function deliverablesForPhase(phaseId, nodeIds) {
  const countLabel = `${nodeIds.length} deployment${nodeIds.length === 1 ? '' : 's'}`
  if (phaseId === 1) {
    return ['Data plumbing and event logging baseline', 'Governance, fallback, and audit controls', `Foundation-ready ${countLabel}`]
  }
  if (phaseId === 2) {
    return ['Pilot deployment plan', 'Build-vs-license decision record', `Pilot validation for ${countLabel}`]
  }
  if (phaseId === 3) {
    return ['Scale rollout plan', 'Cross-capability integration checkpoints', `Scaled rollout for ${countLabel}`]
  }
  return ['Model tuning and retraining loop', 'QA process updates', 'Emergent role onboarding plan']
}

/**
 * Summarizes the timeline phases and critical-path result.
 *
 * @param {Array<{ phase_id: number, start_week: number, end_week: number, nodes?: string[] }>} phases Timeline phases.
 * @param {{ critical_path?: string[], total_critical_weeks?: number, parallel_branches?: string[][] } | string[]} criticalPath Critical path object or array.
 * @param {Record<string, unknown> | null | undefined} engagement Engagement context.
 * @returns {{
 *   total_duration_weeks: number,
 *   total_duration_months: number,
 *   phases_count: number,
 *   deployments_count: number,
 *   parallel_streams_max: number,
 *   within_client_timeline: boolean
 * }}
 */
export function computeTimelineSummary(phases, criticalPath, engagement) {
  const list = Array.isArray(phases) ? phases : []
  const totalWeeks = list.reduce((max, phase) => Math.max(max, nonNeg(phase.end_week)), 0)
  const deployments = new Set()
  for (const phase of list) {
    const ids = Array.isArray(phase.nodes) ? phase.nodes : []
    for (const id of ids) deployments.add(id)
  }
  const cpObj = Array.isArray(criticalPath) ? { critical_path: criticalPath, parallel_branches: [] } : asObj(criticalPath)
  const parallelBranches = Array.isArray(cpObj.parallel_branches) ? cpObj.parallel_branches : []
  const parallelMax = Math.max(1, 1 + parallelBranches.length)
  const goals = asObj(asObj(intakeData(engagement).engagement).goals)
  const timelineMonths = nonNeg(goals.timeline_months ?? intakeData(engagement).timeline_months)
  const durationMonths = totalWeeks / 4.345

  return {
    total_duration_weeks: totalWeeks,
    total_duration_months: Math.round(durationMonths * 10) / 10,
    phases_count: 4,
    deployments_count: deployments.size,
    parallel_streams_max: parallelMax,
    within_client_timeline: timelineMonths > 0 ? durationMonths <= timelineMonths : true,
  }
}
