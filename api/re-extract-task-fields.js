import callGemini, { geminiLogExtras } from './_lib/geminiClient.js'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { getSourceDocumentTextFromMetadata, normalizeExtractedTaskFields } from '../src/lib/extractTaskFieldsNormalize.js'
import { buildReExtractTaskFieldsPrompt } from '../src/lib/reExtractTaskFieldsPrompt.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const FEATURE = 'f1_re_extraction'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 */
async function insertLlmCallLog(supabase, row) {
  const { error } = await supabase.from('llm_call_logs').insert(row)
  if (error) console.error('[re-extract-task-fields] llm_call_logs insert failed:', error.message)
}

/**
 * @param {string} raw
 */
function extractJsonText(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '')
    const fence = s.lastIndexOf('```')
    if (fence >= 0) s = s.slice(0, fence)
    s = s.trim()
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) return s.slice(start, end + 1)
  return s
}

/**
 * @param {string} name
 */
function normalizeTaskNameKey(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * POST { engagement_id: string }
 *
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  const started = Date.now()
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

  const engagementId =
    typeof req.body?.engagement_id === 'string'
      ? req.body.engagement_id.trim()
      : typeof req.body?.engagementId === 'string'
        ? req.body.engagementId.trim()
        : ''

  if (!engagementId) {
    res.status(400).json({ error: 'Missing engagement_id' })
    return
  }

  let supabase = null
  let promptText = ''
  let responseText = ''
  /** @type {any} */
  let geminiMeta = null

  try {
    supabase = createSupabaseAdmin()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server configuration error'
    res.status(500).json({ error: msg })
    return
  }

  try {
    const { data: engagement, error: engErr } = await supabase
      .from('engagements')
      .select('id, extraction_metadata, intake_mode')
      .eq('id', engagementId)
      .maybeSingle()

    if (engErr) {
      res.status(500).json({ error: engErr.message })
      return
    }
    if (!engagement?.id) {
      res.status(404).json({ error: 'Engagement not found' })
      return
    }

    const sourceText = getSourceDocumentTextFromMetadata(engagement.extraction_metadata)
    if (!sourceText) {
      res.status(400).json({
        error:
          'Original document not available for re-extraction. Please re-upload the document via F1.0.',
      })
      return
    }

    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('id, task_name, role_performing')
      .eq('engagement_id', engagementId)
      .order('task_id', { ascending: true })

    if (taskErr) {
      res.status(500).json({ error: taskErr.message })
      return
    }

    const existingTasks = Array.isArray(taskRows) ? taskRows : []
    if (existingTasks.length === 0) {
      res.status(400).json({ error: 'No tasks found for this engagement.' })
      return
    }

    promptText = buildReExtractTaskFieldsPrompt(
      sourceText,
      existingTasks.map((t) => ({
        task_name: String(t.task_name ?? ''),
        role_performing: t.role_performing,
      })),
    )

    geminiMeta = await callGemini(promptText, {
      feature: 'f1_re_extraction',
      temperature: 0.1,
      response_mime_type: 'application/json',
      max_output_tokens: 16384,
    })
    responseText = geminiMeta.response_text

    let parsed
    try {
      parsed = JSON.parse(extractJsonText(responseText))
    } catch (parseErr) {
      await insertLlmCallLog(supabase, {
        engagement_id: engagementId,
        feature: FEATURE,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        ...geminiLogExtras(geminiMeta, {
          errorMessage: parseErr instanceof Error ? parseErr.message : String(parseErr),
          durationFallbackMs: Date.now() - started,
        }),
      })
      res.status(500).json({ error: 'Re-extraction produced invalid JSON. Try again.' })
      return
    }

    const updates = Array.isArray(parsed?.task_updates)
      ? parsed.task_updates
      : Array.isArray(parsed?.tasks)
        ? parsed.tasks
        : []

    /** @type {Map<string, { id: string, task_name: string, role_performing: string | null }[]>} */
    const tasksByName = new Map()
    for (const row of existingTasks) {
      const key = normalizeTaskNameKey(row.task_name)
      if (!key) continue
      const list = tasksByName.get(key) ?? []
      list.push({
        id: row.id,
        task_name: String(row.task_name ?? ''),
        role_performing:
          typeof row.role_performing === 'string' ? row.role_performing : null,
      })
      tasksByName.set(key, list)
    }

    /** @type {string[]} */
    const errors = []
    let tasksUpdated = 0

    for (const raw of updates) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const u = /** @type {Record<string, unknown>} */ (raw)
      const key = normalizeTaskNameKey(u.task_name)
      if (!key) {
        errors.push('Skipped update with missing task_name')
        continue
      }
      const matches = tasksByName.get(key)
      if (!matches?.length) {
        errors.push(`No DB task matched name: ${String(u.task_name)}`)
        continue
      }

      const fields = normalizeExtractedTaskFields({
        task_name: u.task_name,
        role_performing: matches[0].role_performing,
        input_data_type: u.input_data_type,
        consequence_of_error: u.consequence_of_error,
        data_logged: u.data_logged,
        regulatory_constraint: u.regulatory_constraint,
      })

      for (const match of matches) {
        const { error: updErr } = await supabase
          .from('tasks')
          .update({
            input_data_type: fields.input_data_type,
            consequence_of_error: fields.consequence_of_error,
            data_logged: fields.data_logged,
            regulatory_constraint: fields.regulatory_constraint,
          })
          .eq('id', match.id)
          .eq('engagement_id', engagementId)

        if (updErr) {
          errors.push(`${match.task_name}: ${updErr.message}`)
        } else {
          tasksUpdated += 1
        }
      }
    }

    const meta =
      engagement.extraction_metadata && typeof engagement.extraction_metadata === 'object'
        ? { .../** @type {Record<string, unknown>} */ (engagement.extraction_metadata) }
        : {}
    meta.task_fields_re_extracted_at = new Date().toISOString()
    meta.task_fields_re_extracted_count = tasksUpdated

    await supabase.from('engagements').update({ extraction_metadata: meta }).eq('id', engagementId)

    await insertLlmCallLog(supabase, {
      engagement_id: engagementId,
      feature: FEATURE,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      ...geminiLogExtras(geminiMeta, { errorMessage: null, durationFallbackMs: Date.now() - started }),
    })

    res.status(200).json({
      tasks_updated: tasksUpdated,
      fields_updated: tasksUpdated * 4,
      errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[re-extract-task-fields]', err)
    try {
      if (supabase) {
        await insertLlmCallLog(supabase, {
          engagement_id: engagementId || null,
          feature: FEATURE,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          ...geminiLogExtras(geminiMeta, { errorMessage: message, durationFallbackMs: Date.now() - started }),
        })
      }
    } catch (logErr) {
      console.error('[re-extract-task-fields] log failure', logErr)
    }
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
}
