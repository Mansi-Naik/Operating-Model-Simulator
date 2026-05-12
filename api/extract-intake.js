import fs from 'node:fs/promises'
import formidable from 'formidable'
import { jsonrepair } from 'jsonrepair'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { applyCorsHeaders, resolveAllowedCorsOrigin } from '../src/lib/apiCors.js'
import { buildExtractionPrompt } from '../src/lib/extractionPrompt.js'
import { createSupabaseAdmin } from '../src/lib/supabaseAdmin.js'

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FEATURE = 'f1_extraction'
const MAX_BYTES = 10 * 1024 * 1024
const MIN_TEXT = 50
const MAX_TEXT = 80_000

const ALLOWED_MIME = new Set([
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const EXT_OK = new Set(['.txt', '.md', '.docx', '.pdf', '.xlsx'])

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} row
 */
async function insertLlmCallLog(supabase, row) {
  const { error } = await supabase.from('llm_call_logs').insert(row)
  if (error) console.error('[extract-intake] llm_call_logs insert failed:', error.message)
}

/**
 * @param {string} name
 */
function extFromName(name) {
  if (!name || typeof name !== 'string') return ''
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * @param {string} mime
 * @param {string} origName
 */
function isAllowedFile(mime, origName) {
  const ext = extFromName(origName)
  if (ext && EXT_OK.has(ext)) return true
  if (mime && ALLOWED_MIME.has(String(mime).toLowerCase())) return true
  return false
}

/**
 * Lazy-load heavy parsers so cold starts for .txt do not pull in pdfjs / xlsx / mammoth
 * (avoids Vercel FUNCTION_INVOCATION_FAILED on some runtimes).
 */
async function bufferToPlainText(buffer, ext) {
  if (ext === '.txt' || ext === '.md') {
    return buffer.toString('utf8')
  }
  if (ext === '.docx') {
    const mammothMod = await import('mammoth')
    const mammoth = mammothMod.default ?? mammothMod
    const { value } = await mammoth.extractRawText({ buffer })
    return value ?? ''
  }
  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result?.text ?? ''
    } finally {
      await parser.destroy?.()
    }
  }
  if (ext === '.xlsx') {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const parts = []
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      parts.push(`=== Sheet: ${sheetName} ===\n${csv}`)
    }
    return parts.join('\n\n')
  }
  return ''
}

/**
 * Strip markdown fences and isolate `{ ... }` when models wrap JSON.
 *
 * @param {string} raw
 * @returns {string}
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
 * Parse model JSON; repair common Gemini malformations (trailing commas, bad strings, truncation).
 *
 * @param {string} responseText
 * @returns {{ value: Record<string, unknown>, repaired: boolean }}
 */
function parseExtractionJson(responseText) {
  const jsonText = extractJsonText(responseText)
  try {
    return { value: JSON.parse(jsonText), repaired: false }
  } catch (firstErr) {
    try {
      const repaired = jsonrepair(jsonText)
      const value = JSON.parse(repaired)
      console.warn('[extract-intake] JSON.parse failed; jsonrepair recovered:', firstErr?.message)
      return { value, repaired: true }
    } catch {
      throw firstErr
    }
  }
}

/**
 * Coerce common Gemini quirks (numeric strings, null arrays) before validation.
 *
 * @param {Record<string, unknown>} parsed
 */
function coerceExtractionPayload(parsed) {
  const q = parsed.extraction_quality
  if (typeof q === 'string') {
    let n = q.trim().toLowerCase().replace(/-/g, '_')
    if (n === 'not_intake_document') n = 'not_intake_doc'
    parsed.extraction_quality = n
  }

  let score = parsed.document_relevance_score
  if (typeof score === 'string' && score.trim() !== '') {
    score = Number(score)
  }
  if (typeof score === 'number' && Number.isFinite(score)) {
    parsed.document_relevance_score = Math.max(0, Math.min(1, score))
  }

  for (const key of ['extracted_fields_count', 'total_possible_fields']) {
    const v = parsed[key]
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseInt(v, 10)
      if (Number.isFinite(n)) parsed[key] = n
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      parsed[key] = Math.round(v)
    }
  }

  if (parsed.summary_message == null || typeof parsed.summary_message !== 'string') {
    parsed.summary_message = parsed.summary_message == null ? '' : String(parsed.summary_message)
  }

  if (typeof parsed.extracted_fields_count !== 'number' || !Number.isFinite(parsed.extracted_fields_count)) {
    parsed.extracted_fields_count = 0
  }
  if (typeof parsed.total_possible_fields !== 'number' || !Number.isFinite(parsed.total_possible_fields)) {
    parsed.total_possible_fields = 50
  }
  if (typeof parsed.document_relevance_score !== 'number' || !Number.isFinite(parsed.document_relevance_score)) {
    parsed.document_relevance_score = 0.5
  }

  const allowedQ = new Set(['high', 'medium', 'low', 'not_intake_doc'])
  if (!allowedQ.has(/** @type {string} */ (parsed.extraction_quality))) {
    parsed.extraction_quality = 'medium'
  }
  if (!Array.isArray(parsed.tasks)) parsed.tasks = []

  if (parsed.extraction_warnings == null) parsed.extraction_warnings = []
  if (!Array.isArray(parsed.extraction_warnings)) parsed.extraction_warnings = []

  if (parsed.intake_data == null || typeof parsed.intake_data !== 'object' || Array.isArray(parsed.intake_data)) {
    parsed.intake_data = {}
  }
}

function validateExtractionPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'Root JSON must be an object'
  }
  const q = parsed.extraction_quality
  if (q !== 'high' && q !== 'medium' && q !== 'low' && q !== 'not_intake_doc') {
    return 'Missing or invalid extraction_quality'
  }
  const score = parsed.document_relevance_score
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
    return 'Missing or invalid document_relevance_score'
  }
  if (typeof parsed.summary_message !== 'string') return 'Missing summary_message'
  if (typeof parsed.extracted_fields_count !== 'number' || !Number.isFinite(parsed.extracted_fields_count)) {
    return 'Missing extracted_fields_count'
  }
  if (typeof parsed.total_possible_fields !== 'number' || !Number.isFinite(parsed.total_possible_fields)) {
    return 'Missing total_possible_fields'
  }
  if (parsed.intake_data == null || typeof parsed.intake_data !== 'object' || Array.isArray(parsed.intake_data)) {
    return 'intake_data must be an object'
  }
  if (!Array.isArray(parsed.tasks)) return 'tasks must be an array'
  if (!Array.isArray(parsed.extraction_warnings)) return 'extraction_warnings must be an array'
  return null
}

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeExtractionResponse(raw) {
  const intake = raw.intake_data && typeof raw.intake_data === 'object' && !Array.isArray(raw.intake_data)
    ? /** @type {Record<string, unknown>} */ (raw.intake_data)
    : {}
  const engagement =
    intake.engagement && typeof intake.engagement === 'object' && !Array.isArray(intake.engagement)
      ? intake.engagement
      : {}
  const mergedIntake = {
    ...intake,
    engagement: {
      goals: {},
      ...(typeof engagement === 'object' && engagement ? engagement : {}),
    },
    hierarchy: Array.isArray(intake.hierarchy) ? intake.hierarchy : [],
    tech_stack:
      intake.tech_stack && typeof intake.tech_stack === 'object' && !Array.isArray(intake.tech_stack)
        ? {
            current_systems: {},
            ai_in_use: [],
            ...(/** @type {Record<string, unknown>} */ (intake.tech_stack)),
          }
        : { current_systems: {}, ai_in_use: [] },
    governance:
      intake.governance && typeof intake.governance === 'object' && !Array.isArray(intake.governance)
        ? {
            risk_categories: [],
            escalation_paths: [],
            ...(/** @type {Record<string, unknown>} */ (intake.governance)),
          }
        : { risk_categories: [], escalation_paths: [] },
    kpis:
      intake.kpis && typeof intake.kpis === 'object' && !Array.isArray(intake.kpis)
        ? { .../** @type {Record<string, unknown>} */ (intake.kpis) }
        : {},
    preferences:
      intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
        ? { .../** @type {Record<string, unknown>} */ (intake.preferences) }
        : {},
  }

  const ts = /** @type {Record<string, unknown>} */ (mergedIntake.tech_stack)
  if (!ts.current_systems || typeof ts.current_systems !== 'object') ts.current_systems = {}
  if (!Array.isArray(ts.ai_in_use)) ts.ai_in_use = []

  const gov = /** @type {Record<string, unknown>} */ (mergedIntake.governance)
  if (!Array.isArray(gov.risk_categories)) gov.risk_categories = []
  if (!Array.isArray(gov.escalation_paths)) gov.escalation_paths = []

  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : [])
    .filter((t) => t && typeof t === 'object' && !Array.isArray(t))
    .map((t) => /** @type {Record<string, unknown>} */ (t))

  return {
    extraction_quality: raw.extraction_quality,
    document_relevance_score: raw.document_relevance_score,
    summary_message: raw.summary_message,
    extracted_fields_count: raw.extracted_fields_count,
    total_possible_fields: raw.total_possible_fields,
    intake_data: mergedIntake,
    tasks,
    extraction_warnings: Array.isArray(raw.extraction_warnings) ? raw.extraction_warnings : [],
  }
}

/**
 * POST multipart/form-data (field `file`) — extract intake via Gemini.
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

  let supabase = null
  let promptText = ''
  let responseText = ''

  try {
    supabase = createSupabaseAdmin()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server configuration error'
    res.status(500).json({ error: msg })
    return
  }

  try {
    const form = formidable({
      maxFiles: 1,
      maxFileSize: MAX_BYTES,
      allowEmptyFiles: false,
    })

    const [, files] = await form.parse(req)
    const fileField = files.file
    const file = Array.isArray(fileField) ? fileField[0] : fileField
    if (!file) {
      res.status(400).json({ error: 'Missing file field "file" in multipart form data' })
      return
    }

    const origName = file.originalFilename ?? 'upload'
    const mime = file.mimetype ?? ''
    if (file.size != null && file.size > MAX_BYTES) {
      res.status(400).json({ error: 'File exceeds maximum size of 10 MB' })
      return
    }
    if (!isAllowedFile(mime, origName)) {
      res.status(400).json({
        error:
          'Unsupported file type. Use .txt, .md, .docx, .pdf, or .xlsx with a recognized Content-Type.',
      })
      return
    }

    const ext = extFromName(origName)
    if (!EXT_OK.has(ext)) {
      res.status(400).json({ error: 'Unsupported file extension. Use .txt, .md, .docx, .pdf, or .xlsx.' })
      return
    }

    const filepath = file.filepath
    const buffer = await fs.readFile(filepath)
    await fs.unlink(filepath).catch(() => {})

    let plain = await bufferToPlainText(buffer, ext)
    plain = plain.replace(/\0/g, '').trim()

    if (plain.length < MIN_TEXT) {
      res.status(422).json({
        error:
          'Could not extract meaningful text from this file. The document may be empty, scanned, or in an unsupported format.',
      })
      return
    }

    let truncatedNote = ''
    if (plain.length > MAX_TEXT) {
      plain = plain.slice(0, MAX_TEXT)
      truncatedNote = '\n[Note: document was truncated to first 80,000 characters for processing]'
    }

    promptText = buildExtractionPrompt(plain + truncatedNote)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
      return
    }

    const extractMaxOut = Number(process.env.GEMINI_EXTRACT_MAX_OUTPUT_TOKENS)
    const maxOutputTokens =
      Number.isFinite(extractMaxOut) && extractMaxOut > 0 ? Math.min(65536, Math.floor(extractMaxOut)) : 65536

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens,
      },
    })

    const geminiResult = await model.generateContent(promptText)
    responseText =
      typeof geminiResult.response?.text === 'function' ? geminiResult.response.text() : ''

    let parsed
    let jsonRepaired = false
    try {
      const parsedWrap = parseExtractionJson(responseText)
      parsed = parsedWrap.value
      jsonRepaired = parsedWrap.repaired
    } catch (parseErr) {
      console.error('[extract-intake] Invalid JSON from model:', parseErr, responseText?.slice(0, 2000))
      await insertLlmCallLog(supabase, {
        engagement_id: null,
        feature: FEATURE,
        model: MODEL_ID,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        error_message: `Invalid JSON from Gemini: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        duration_ms: Date.now() - started,
      })
      res.status(500).json({ error: 'Extraction produced invalid output. Try again or use the guided form.' })
      return
    }

    if (jsonRepaired) {
      console.warn('[extract-intake] Used jsonrepair on model output (length', responseText?.length, ')')
    }

    coerceExtractionPayload(/** @type {Record<string, unknown>} */ (parsed))
    const validationErr = validateExtractionPayload(parsed)
    if (validationErr) {
      console.error('[extract-intake] Schema validation failed:', validationErr, parsed)
      await insertLlmCallLog(supabase, {
        engagement_id: null,
        feature: FEATURE,
        model: MODEL_ID,
        prompt_text: promptText,
        response_text: responseText,
        status: 'error',
        error_message: validationErr,
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        duration_ms: Date.now() - started,
      })
      res.status(500).json({ error: 'Extraction produced invalid output. Try again or use the guided form.' })
      return
    }

    const body = normalizeExtractionResponse(/** @type {Record<string, unknown>} */ (parsed))

    await insertLlmCallLog(supabase, {
      engagement_id: null,
      feature: FEATURE,
      model: MODEL_ID,
      prompt_text: promptText,
      response_text: responseText,
      status: 'success',
      error_message: null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      duration_ms: Date.now() - started,
    })

    res.status(200).json(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[extract-intake]', err)
    try {
      if (supabase) {
        await insertLlmCallLog(supabase, {
          engagement_id: null,
          feature: FEATURE,
          model: MODEL_ID,
          prompt_text: promptText,
          response_text: responseText,
          status: 'error',
          error_message: message,
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          duration_ms: Date.now() - started,
        })
      }
    } catch (logErr) {
      console.error('[extract-intake] log failure', logErr)
    }
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
}
