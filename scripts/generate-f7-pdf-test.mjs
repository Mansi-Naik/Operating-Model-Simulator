import React from 'react'
import { renderToFile } from '@react-pdf/renderer'
import { readFileSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { aggregateSummary } from '../src/lib/summaryAggregator.js'
import { buildPdfExportContext, collectLogoUrls } from '../src/lib/pdfExportData.js'
import { prefetchAllLogos } from '../src/lib/pdfLogos.js'
import { SummaryPdfDocument } from '../src/lib/pdfExportTemplate.jsx'

async function main() {
  const env = readFileSync('.env.local', 'utf8')
  const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim()
  const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim()

  let engagement = null
  let tasks = []
  let pipelineRuns = {}

  if (url && key) {
    const sb = createClient(url, key)
    const { data: eng } = await sb
      .from('engagements')
      .select('*')
      .ilike('client_name', '%FinAxis%')
      .limit(1)
      .maybeSingle()
    if (eng) {
      engagement = eng
      const { data: taskRows } = await sb.from('tasks').select('*').eq('engagement_id', eng.id)
      tasks = taskRows ?? []
      const { data: pr } = await sb.from('pipeline_runs').select('*').eq('engagement_id', eng.id).maybeSingle()
      if (pr) {
        pipelineRuns = {
          f2_matrix: pr.f2_matrix,
          f3_roles: pr.f3_roles,
          f4_pods: pr.f4_pods,
          f5_economics: pr.f5_economics,
          f6_timeline: pr.f6_timeline,
          competitor_analysis: pr.competitor_analysis,
          reinvestment_opportunities: pr.reinvestment_opportunities,
        }
      }
    }
  }

  const summary = aggregateSummary(engagement, tasks, pipelineRuns)
  const ctx = buildPdfExportContext({
    summary,
    engagement,
    tasks,
    pipelineRuns,
    clientName: engagement?.client_name ?? 'FinAxis',
  })

  await prefetchAllLogos(collectLogoUrls(ctx))
  const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'FinAxis-OMS-Summary-test.pdf')
  await renderToFile(React.createElement(SummaryPdfDocument, { ctx }), outPath)
  console.log('Wrote', outPath)
  console.log('Bytes', statSync(outPath).size)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
