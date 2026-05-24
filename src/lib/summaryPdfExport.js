/**
 * @fileoverview Generates the F7 summary PDF via @react-pdf/renderer.
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { buildPdfExportContext, collectLogoUrls, sanitizeFileBase } from './pdfExportData.js'
import { prefetchAllLogos } from './pdfLogos.js'
import { SummaryPdfDocument } from './pdfExportTemplate.jsx'

/**
 * @param {{
 *   summary: Record<string, unknown> | null | undefined,
 *   clientName: string,
 *   baseFileName: string,
 *   engagement?: Record<string, unknown> | null,
 *   tasks?: Record<string, unknown>[] | null,
 *   pipelineRuns?: Record<string, unknown> | null,
 * }} params
 * @returns {Promise<{ byteLength: number }>}
 */
export async function downloadSummaryReportPdf(params) {
  const {
    summary,
    clientName,
    baseFileName,
    engagement = null,
    tasks = [],
    pipelineRuns = {},
  } = params

  const ctx = buildPdfExportContext({
    summary,
    engagement,
    tasks,
    pipelineRuns,
    clientName,
  })

  const logoUrls = collectLogoUrls(ctx)
  await prefetchAllLogos(logoUrls)

  const doc = React.createElement(SummaryPdfDocument, { ctx })
  const blob = await pdf(doc).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFileBase(baseFileName)}.pdf`
  link.click()
  URL.revokeObjectURL(url)

  return { byteLength: blob.size }
}
