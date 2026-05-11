import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../../src/lib/supabaseAdmin.js'

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isUuid(value) {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

const VALID_ALLOCATION = new Set(['human-only', 'tech-assisted', 'tech-automated'])

/**
 * PATCH /api/tasks/:id — update user override fields on a task row.
 *
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin, { methods: 'PATCH, OPTIONS' })

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (origin && !resolveAllowedCorsOrigin(origin)) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }

  const rawId = req.query.id
  const taskId = Array.isArray(rawId) ? rawId[0] : rawId
  if (!taskId || !isUuid(taskId)) {
    res.status(400).json({ error: 'Invalid task id (expected UUID)' })
    return
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const user_allocation = body.user_allocation
  const user_override_reason = Object.prototype.hasOwnProperty.call(body, 'user_override_reason')
    ? body.user_override_reason
    : undefined

  if (user_allocation === undefined || user_allocation === null) {
    res.status(400).json({ error: 'user_allocation is required' })
    return
  }
  if (typeof user_allocation !== 'string' || !VALID_ALLOCATION.has(user_allocation)) {
    res.status(400).json({ error: 'user_allocation must be human-only, tech-assisted, or tech-automated' })
    return
  }

  const updates = {
    user_allocation,
  }
  if (user_override_reason !== undefined) {
    updates.user_override_reason =
      user_override_reason === null || user_override_reason === ''
        ? null
        : String(user_override_reason)
  }

  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    res.status(200).json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    res.status(500).json({ error: message })
  }
}
