/**
 * Heuristics and helpers to detect incomplete task extraction from intake documents.
 */

/**
 * Rough count of distinct task-like lines in document text (lists, bullets, tables).
 *
 * @param {string} documentText
 * @returns {number}
 */
export function estimateTaskRowsInDocument(documentText) {
  const text = typeof documentText === 'string' ? documentText : String(documentText ?? '')
  if (!text.trim()) return 0

  const lines = text.split(/\r?\n/)
  /** @type {Set<string>} */
  const seen = new Set()
  let count = 0

  const addLine = (body) => {
    const b = String(body ?? '').trim()
    if (b.length < 4) return
    if (/^(page|section|table|figure|appendix|chapter|note|source)\b/i.test(b)) return
    if (/^\d+(\.\d+)?%?$/.test(b)) return
    const key = b.slice(0, 120).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    count += 1
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue

    const numbered = t.match(/^\d{1,2}[\.\):\-]\s+(.+)/)
    const bullet = t.match(/^[-•*●]\s+(.+)/)
    if (numbered) addLine(numbered[1])
    else if (bullet) addLine(bullet[1])

    const labeled = t.match(/^(?:task|activity|work item|process step)\s*[:\-–]\s*(.+)/i)
    if (labeled) addLine(labeled[1])
  }

  // Pipe/table rows that look like task inventory (Activity | Role | ...)
  const tableHeader = /task|activity|work\s*item|process/i
  let inTable = false
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      inTable = false
      continue
    }
    if (tableHeader.test(t) && t.includes('|')) {
      inTable = true
      continue
    }
    if (inTable && t.includes('|')) {
      const cells = t.split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length >= 2) addLine(cells[0])
    }
  }

  return count
}

/**
 * @param {string} responseText
 */
export function responseLooksTruncated(responseText) {
  const s = typeof responseText === 'string' ? responseText.trim() : ''
  if (!s) return true
  if (!s.endsWith('}')) return true
  const tasksKey = s.lastIndexOf('"tasks"')
  if (tasksKey < 0) return false
  const afterTasks = s.slice(tasksKey)
  if (!afterTasks.includes(']')) return true
  const closeIdx = afterTasks.indexOf(']')
  const tail = afterTasks.slice(closeIdx + 1).trim()
  if (tail.startsWith(',') && !tail.includes('extraction_warnings')) return true
  return false
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
export function taskRowKey(a, b) {
  const row = b && typeof b === 'object' ? b : a
  const r = /** @type {Record<string, unknown>} */ (row && typeof row === 'object' ? row : {})
  const name = String(r.task_name ?? '').trim().toLowerCase()
  const role = String(r.role_performing ?? '').trim().toLowerCase()
  return `${name}|||${role}`
}

/**
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} additional
 */
export function mergeTaskLists(existing, additional) {
  const out = [...existing]
  const keys = new Set(existing.map((t) => taskRowKey(t, t)))
  for (const t of additional) {
    if (!t || typeof t !== 'object') continue
    const k = taskRowKey(t, t)
    if (!String(/** @type {Record<string, unknown>} */ (t).task_name ?? '').trim()) continue
    if (keys.has(k)) continue
    keys.add(k)
    out.push(t)
  }
  return out
}

/**
 * @param {number} extractedCount
 * @param {number} estimatedCount
 */
export function shouldRetryTaskSupplement(extractedCount, estimatedCount) {
  if (estimatedCount < 8) return false
  if (extractedCount >= estimatedCount) return false
  if (extractedCount < Math.max(8, Math.floor(estimatedCount * 0.75))) return true
  if (estimatedCount - extractedCount >= 4) return true
  return false
}

/**
 * Second-pass prompt to recover tasks missing from the first extraction.
 *
 * @param {string} documentText
 * @param {Record<string, unknown>[]} existingTasks
 */
export function buildTaskSupplementPrompt(documentText, existingTasks) {
  const names = existingTasks
    .map((t) => {
      const n = String(t.task_name ?? '').trim()
      const r = String(t.role_performing ?? '').trim()
      return r ? `${n} (${r})` : n
    })
    .filter(Boolean)

  const doc =
    documentText.length > 40_000
      ? `${documentText.slice(0, 20_000)}\n\n[...middle omitted...]\n\n${documentText.slice(-20_000)}`
      : documentText

  return `You are completing a BPO intake task extraction. The first pass found only ${existingTasks.length} tasks, but the document likely lists more distinct operational activities.

Return ONLY a JSON object (no markdown):
{
  "tasks": [ /* additional task rows only */ ]
}

RULES:
- Add ONE object per distinct activity still missing from the list below.
- Do NOT repeat tasks already extracted.
- Do NOT merge or summarize multiple document tasks into one row.
- Every task MUST include: task_name, role_performing, task_type, input_data_type, consequence_of_error, data_logged, regulatory_constraint (never null), and _field_confidence for the four classifier fields.
- Scan numbered lists, bulleted lists, tables, RACI/workflow sections, and role task inventories.

ALREADY EXTRACTED (${existingTasks.length} tasks — do not duplicate):
${names.map((n) => `- ${n}`).join('\n') || '(none)'}

DOCUMENT:
---DOCUMENT START---
${doc}
---DOCUMENT END---`
}
