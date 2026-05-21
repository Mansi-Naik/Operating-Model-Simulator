import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'
import {
  isAllocationUuid,
  maybeLogF2AllocationQualityAlert,
  predictAllocationForTask,
} from './_lib/predictAllocationCore.js'

/**
 * F2 allocation: single task. Prefer `predict-allocation-batch` for full-matrix runs.
 *
 * POST JSON `{ engagementId: uuid, taskId: uuid }`
 */
export default async function handler(req, res) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  applyCorsHeaders(res, origin, { methods: 'POST, OPTIONS' })

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (origin && !resolveAllowedCorsOrigin(origin)) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
      return
    }

    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }

    const engagementId = body.engagementId
    const taskId = body.taskId

    if (!isAllocationUuid(engagementId) || !isAllocationUuid(taskId)) {
      res.status(400).json({ error: 'engagementId and taskId must be valid UUIDs' })
      return
    }

    const supabase = createSupabaseAdmin()

    const { data: engagementRow, error: engErr } = await supabase
      .from('engagements')
      .select('id, domain, readiness_band, intake_data')
      .eq('id', engagementId)
      .maybeSingle()

    if (engErr) {
      throw new Error(`Failed to load engagement: ${engErr.message}`)
    }
    if (!engagementRow) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const result = await predictAllocationForTask(
      supabase,
      engagementId,
      taskId,
      /** @type {Record<string, unknown>} */ (engagementRow),
    )

    if (!result.ok) {
      const status = result.error === 'Task not found' ? 404 : 500
      res.status(status).json({ error: result.error, taskId: result.taskId })
      return
    }

    await maybeLogF2AllocationQualityAlert(supabase, engagementId)

    res.status(200).json({
      taskId: result.taskId,
      taskName: result.taskName,
      allocation: result.allocation,
      skipped: Boolean(result.skipped),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[predict-allocation]', err)
    res.status(500).json({ error: message })
  }
}
