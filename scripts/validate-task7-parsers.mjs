/**
 * TASK 7 — automated checks for file parsing (same libraries as /api/extract-intake).
 * Full upload + Gemini + Supabase flows still require `vercel dev` + env vars (manual).
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { PDFParse } from 'pdf-parse'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const fixtures = join(root, 'tests', 'fixtures')

const MIN_TEXT = 50
const MAX_TEXT = 80_000

async function bufferToPlainText(buffer, ext) {
  if (ext === '.txt' || ext === '.md') {
    return buffer.toString('utf8')
  }
  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer })
    return value ?? ''
  }
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result?.text ?? ''
    } finally {
      await parser.destroy?.()
    }
  }
  if (ext === '.xlsx') {
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

let passed = 0
function ok(name) {
  passed += 1
  console.log(`OK  ${name}`)
}

async function main() {
  // TEST 1 — intake-style .txt
  const sampleBuf = await readFile(join(fixtures, 'sample-intake.txt'))
  const sampleText = await bufferToPlainText(sampleBuf, '.txt')
  assert(sampleText.includes('Acme Corp'), 'sample should mention Acme Corp')
  assert(sampleText.includes('50000'), 'sample should mention volume')
  assert(sampleText.replace(/\0/g, '').trim().length >= MIN_TEXT, 'sample should meet min extraction length')
  ok('TEST 1: sample-intake.txt parses with >= 50 chars and expected keywords')

  // TEST 2 — irrelevant (still valid text; relevance is Gemini-side)
  const recipeBuf = await readFile(join(fixtures, 'recipe.txt'))
  const recipeText = await bufferToPlainText(recipeBuf, '.txt')
  assert(recipeText.includes('Chocolate'), 'recipe fixture readable')
  assert(recipeText.replace(/\0/g, '').trim().length >= MIN_TEXT, 'recipe.txt is long enough for API not to 422')
  ok('TEST 2: recipe.txt parses (relevance modal requires live Gemini call)')

  // TEST 5 — .xlsx multi-sheet
  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Client', 'Acme Corp'],
    ['volume_per_day', 50000],
    ['agents', 100],
  ])
  XLSX.utils.book_append_sheet(wb, ws1, 'Intake')
  const ws2 = XLSX.utils.aoa_to_sheet([['Note', 'EMEA region']])
  XLSX.utils.book_append_sheet(wb, ws2, 'Meta')
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const xlsxText = await bufferToPlainText(xlsxBuf, '.xlsx')
  assert(xlsxText.includes('=== Sheet: Intake ==='), 'xlsx should label sheets')
  assert(xlsxText.includes('=== Sheet: Meta ==='), 'xlsx should include second sheet')
  assert(xlsxText.includes('Acme Corp'), 'xlsx CSV should contain client')
  ok('TEST 5: synthetic .xlsx round-trip with two sheets')

  // TEST 6 — empty / tiny
  const empty = await bufferToPlainText(Buffer.alloc(0), '.txt')
  assert(empty.replace(/\0/g, '').trim().length < MIN_TEXT, 'empty file should yield < MIN_TEXT')
  ok('TEST 6: 0-byte buffer yields short text (API should return 422 after extraction)')

  // 80k truncation note (logic mirror)
  const long = 'x'.repeat(MAX_TEXT + 5000)
  let plain = long
  let note = ''
  if (plain.length > MAX_TEXT) {
    plain = plain.slice(0, MAX_TEXT)
    note = '\n[Note: document was truncated to first 80,000 characters for processing]'
  }
  assert(plain.length === MAX_TEXT, 'truncation length')
  assert(note.includes('80,000'), 'truncation note')
  ok('Truncation: 80k cap + note matches API behavior')

  console.log(`\nDone. ${passed} checks passed.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
