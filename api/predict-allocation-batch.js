import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'
import { backoffDelay } from './_lib/geminiClient.js'
import {
  isAllocationUuid,
  isRetryableAllocationError,
  maybeLogF2AllocationQualityAlert,
  predictAllocationForTask,
  sleepMs,
} from './_lib/predictAllocationCore.js'

const INTER_TASK_MS = 500
const MAX_RETRIES = 2

/**
 * POST JSON `{ engagementId: uuid }` — allocate all tasks missing `ai_allocation` with pacing + retries.
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
    if (!isAllocationUuid(engagementId)) {
      res.status(400).json({ error: 'engagementId must be a valid UUID' })
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

    const { data: taskRows, error: tasksErr } = await supabase
      .from('tasks')
      .select('id, task_id, task_name, ai_allocation')
      .eq('engagement_id', engagementId)

    if (tasksErr) {
      throw new Error(`Failed to load tasks: ${tasksErr.message}`)
    }

    const allTasks = Array.isArray(taskRows) ? taskRows : []
    const toProcess = allTasks.filter((t) => {
      const ai = t?.ai_allocation
      return ai == null || !String(ai).trim()
    })

    const processedTaskIds = []
    const failedTaskIds = []
    /** @type {{ taskId: string, taskName: string, error: string }[]} */
    const failures = []

    for (let i = 0; i < toProcess.length; i += 1) {
      const row = toProcess[i]
      const taskId = typeof row?.id === 'string' ? row.id : null
      if (!taskId) continue

      let success = false
      let lastError = 'Unknown error'

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const result = await predictAllocationForTask(
          supabase,
          engagementId,
          taskId,
          /** @type {Record<string, unknown>} */ (engagementRow),
        )

        if (result.ok) {
          processedTaskIds.push(taskId)
          success = true
          break
        }

        lastError = result.error
        const retryable = isRetryableAllocationError(new Error(result.error))
        if (attempt < MAX_RETRIES && retryable) {
          await backoffDelay(attempt + 1)
          continue
        }
        break
      }

      if (!success) {
        failedTaskIds.push(taskId)
        failures.push({
          taskId,
          taskName: String(row?.task_name ?? '').trim() || '(unnamed task)',
          error: lastError,
        })
      }

      if (i < toProcess.length - 1) {
        await sleepMs(INTER_TASK_MS)
      }
    }

    await maybeLogF2AllocationQualityAlert(supabase, engagementId)

    res.status(200).json({
      engagementId,
      total: allTasks.length,
      queued: toProcess.length,
      processedTaskIds,
      failedTaskIds,
      failures,
      skippedAlreadyAllocated: allTasks.length - toProcess.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[predict-allocation-batch]', err)
    res.status(500).json({ error: message })
  }
}
