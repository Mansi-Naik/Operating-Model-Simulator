import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { COMPETITOR_DIMENSIONS } from './competitorLibrary.js'
import { getCachedLogo, logoInitials } from './pdfLogos.js'
import { PDF_COLORS, pdfStyles as s } from './pdfExportStyles.js'

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {}
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v, fallback = '—') {
  if (v == null) return fallback
  const t = String(v).trim()
  return t || fallback
}

/**
 * @param {unknown} v
 * @returns {number}
 */
function toNum(v) {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatTileValue(value) {
  if (value == null) return '—'
  if (typeof value === 'number') return `${value}%`
  return String(value)
}

/**
 * @param {unknown} delta
 * @returns {string}
 */
function formatDelta(delta) {
  const n = typeof delta === 'number' ? delta : Number(delta)
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}%`
}

/**
 * @param {unknown} value
 * @param {boolean} [withMo]
 * @returns {string}
 */
function formatCurrency(value, withMo = false) {
  const n = toNum(value)
  if (n <= 0) return '—'
  const suffix = withMo ? '/mo' : ''
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M${suffix}`
  }
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000).toLocaleString('en-US')}k${suffix}`
  return `$${Math.round(n).toLocaleString('en-US')}${suffix}`
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatPct(value) {
  const n = toNum(value)
  const r = Math.round(n * 10) / 10
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)}%`
}

/**
 * @param {{ clientName: string, generatedAt: string }} meta
 * @param {React.ReactNode} children
 */
function PageFrame({ meta, children }) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.pageHeader}>
        {meta.clientName} · {meta.generatedAt}
      </Text>
      {children}
      <Text
        style={s.pageFooter}
        render={({ pageNumber, totalPages }) =>
          `Confidential — Internal use only · Page ${pageNumber} of ${totalPages}`
        }
        fixed
      />
    </Page>
  )
}

/**
 * @param {{ url?: string, label: string }} props
 */
function PdfLogo({ url, label }) {
  const cached = url ? getCachedLogo(url) : null
  if (cached) {
    return <Image src={cached} style={s.logoImage} />
  }
  return (
    <View style={s.logoCircle}>
      <Text style={s.logoInitial}>{logoInitials(label)}</Text>
    </View>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function CoverPage({ ctx }) {
  const cover = asObj(ctx.cover)
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const genpactLogo = getCachedLogo('https://logo.clearbit.com/genpact.com')
  const statTiles = Array.isArray(cover.statTiles) ? cover.statTiles : []

  return (
    <PageFrame meta={meta}>
      {genpactLogo ? (
        <Image src={genpactLogo} style={{ width: 96, height: 28, objectFit: 'contain', marginBottom: 16 }} />
      ) : (
        <Text style={[s.boldText, s.coralText, { fontSize: 14, marginBottom: 16 }]}>GENPACT</Text>
      )}

      <Text style={s.title}>{str(cover.title)}</Text>
      <Text style={s.subtitle}>{str(cover.subtitle)}</Text>
      <Text style={[s.mutedText, { marginBottom: 14 }]}>{str(meta.generatedAt)}</Text>

      <View style={s.heroCard}>
        <Text style={[s.boldText, { fontSize: 14, marginBottom: 6 }]}>{str(cover.scenarioName)}</Text>
        <Text style={[s.boldText, { fontSize: 12, marginBottom: 4 }]}>{str(cover.headlinePrimary)}</Text>
        {cover.headlineSecondary ? (
          <Text style={s.mutedText}>{str(cover.headlineSecondary)}</Text>
        ) : null}
        <Text style={[s.mutedText, { marginTop: 6, fontSize: 9 }]}>
          Recommendation: {str(cover.recommendation)}
        </Text>
      </View>

      {Array.isArray(cover.chips) && cover.chips.length > 0 ? (
        <View style={s.chipRow}>
          {cover.chips.map((chip) => (
            <Text key={String(chip)} style={s.chip}>
              {String(chip)}
            </Text>
          ))}
        </View>
      ) : null}

      {cover.illustrative !== false ? (
        <Text style={[s.mutedText, { fontSize: 9, marginBottom: 10 }]}>
          Illustrative — values are directional, not commercial terms.
        </Text>
      ) : null}

      <Text style={s.sectionTitle}>Key metrics</Text>
      <View style={s.metricGrid}>
        {statTiles.map((tile) => {
          const t = asObj(tile)
          return (
            <View key={str(t.label)} style={s.metricTile}>
              <Text style={s.metricLabel}>{str(t.label)}</Text>
              <Text style={s.metricNumber}>
                {formatTileValue(t.current)} → {formatTileValue(t.future)}
              </Text>
              {t.delta_pct != null ? (
                <Text style={s.greenText}>{formatDelta(t.delta_pct)}</Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </PageFrame>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function PipelinePage({ ctx }) {
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const journey = Array.isArray(ctx.journey) ? ctx.journey : []
  const alloc = asObj(ctx.allocation)
  const vol = asObj(alloc.coverage_by_volume)

  return (
    <PageFrame meta={meta}>
      <Text style={s.sectionTitle}>Pipeline journey</Text>
      <View style={s.journeyRow}>
        {journey.map((node) => {
          const n = asObj(node)
          return (
            <View key={str(n.feature)} style={s.journeyCard}>
              <Text style={[s.boldText, s.coralText, { fontSize: 9 }]}>{str(n.feature)}</Text>
              <Text style={[s.boldText, { fontSize: 10, marginVertical: 2 }]}>{str(n.label)}</Text>
              <Text style={s.mutedText}>{str(n.summary)}</Text>
              <Text style={[s.mutedText, { fontSize: 8, marginTop: 2 }]}>
                {str(n.status) === 'complete' ? 'Complete' : 'Pending'}
              </Text>
            </View>
          )
        })}
      </View>

      <Text style={s.sectionTitle}>Allocation summary</Text>
      <View style={s.card}>
        <Text style={s.bodyText}>
          Out of {str(alloc.total_tasks, '0')} tasks: {formatPct(alloc.automated_pct)} automated ·{' '}
          {formatPct(alloc.assisted_pct)} AI-assisted · {formatPct(alloc.human_only_pct)} human-only
        </Text>
        <Text style={[s.mutedText, { marginTop: 8 }]}>
          By volume × time: {formatPct(vol.automated_pct)} automated · {formatPct(vol.assisted_pct)}{' '}
          assisted · {formatPct(vol.human_only_pct)} human
        </Text>
        <Text style={[s.mutedText, { marginTop: 6, fontSize: 9 }]}>
          Volume-weighted reflects business impact; task count reflects breadth of change.
        </Text>
      </View>
    </PageFrame>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function GenpactPage({ ctx }) {
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const uplift = asObj(ctx.genpactUplift)
  const billing = asObj(ctx.billingModel)

  return (
    <PageFrame meta={meta}>
      <Text style={s.title}>Genpact economic uplift</Text>
      <Text style={s.subtitle}>Margin transformation under recommended model</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <View style={s.metricTileThird}>
          <Text style={s.metricLabel}>Margin today</Text>
          <Text style={s.metricNumber}>
            {formatPct(uplift.margin_current_pct)} → {formatPct(uplift.margin_future_pct)}
          </Text>
          <Text style={s.greenText}>+{formatPct(uplift.margin_delta_pp).replace('%', 'pp')}</Text>
        </View>
        <View style={s.metricTileThird}>
          <Text style={s.metricLabel}>Monthly cost drop</Text>
          <Text style={s.metricNumber}>
            {formatCurrency(uplift.cost_current_monthly, true)} → {formatCurrency(uplift.cost_future_monthly, true)}
          </Text>
        </View>
        <View style={s.metricTileThird}>
          <Text style={s.metricLabel}>Annual margin uplift</Text>
          <Text style={s.metricNumber}>{formatCurrency(uplift.annual_margin_uplift)}</Text>
        </View>
      </View>

      {billing.current || billing.recommended ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Recommended billing model</Text>
          <Text style={s.bodyText}>
            <Text style={s.boldText}>Recommended: </Text>
            {str(billing.recommended)}
          </Text>
          <Text style={[s.bodyText, { marginTop: 4 }]}>
            <Text style={s.boldText}>Current: </Text>
            {str(billing.current)}
          </Text>
          {billing.rationale ? (
            <Text style={[s.mutedText, { marginTop: 8 }]}>{str(billing.rationale)}</Text>
          ) : null}
        </View>
      ) : null}
    </PageFrame>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function CompetitivePage({ ctx }) {
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const competitive = asObj(ctx.competitive)
  const competitors = Array.isArray(competitive.competitors) ? competitive.competitors : []
  const dims = COMPETITOR_DIMENSIONS.slice(0, 6)
  const colW = [52, 78, ...dims.map(() => 28)]

  return (
    <PageFrame meta={meta}>
      <Text style={s.title}>Competitive position</Text>
      <Text style={s.subtitle}>Based on 2025 analyst reports (Gartner, ISG, HFS, IDC)</Text>

      {competitive.north_star_score ? (
        <Text style={[s.bodyText, { marginBottom: 8 }]}>
          ★ {str(competitive.north_star_dimension)}: {Math.round(toNum(competitive.north_star_score))} of 5
        </Text>
      ) : null}

      <View style={s.tableHeaderRow}>
        <Text style={{ width: colW[0], fontSize: 8, fontWeight: 'bold' }}> </Text>
        <Text style={{ width: colW[1], fontSize: 8, fontWeight: 'bold' }}>Provider</Text>
        {dims.map((dim, i) => (
          <Text key={dim.id} style={{ width: colW[i + 2], fontSize: 7, fontWeight: 'bold', textAlign: 'center' }}>
            {dim.id === 'ai_automation' ? 'AI★' : dim.label.split(' ')[0]}
          </Text>
        ))}
      </View>

      {competitors.map((row) => {
        const r = asObj(row)
        const scores = asObj(r.scores)
        return (
          <View key={str(r.name)} style={[s.tableRow, r.is_genpact ? s.genpactRow : {}]}>
            <View style={{ width: colW[0], alignItems: 'center' }}>
              <PdfLogo url={str(r.logo)} label={str(r.short, r.name)} />
            </View>
            <Text style={{ width: colW[1], fontSize: 9, fontWeight: r.is_genpact ? 'bold' : 'normal' }}>
              {str(r.name)}
            </Text>
            {dims.map((dim, i) => (
              <Text key={dim.id} style={{ width: colW[i + 2], fontSize: 9, textAlign: 'center' }}>
                {toNum(scores[dim.id]) || '—'}
              </Text>
            ))}
          </View>
        )
      })}

      {competitive.fullSummary ? (
        <Text style={[s.bodyText, { marginTop: 10 }]}>{str(competitive.fullSummary)}</Text>
      ) : competitive.summary ? (
        <Text style={[s.bodyText, { marginTop: 10 }]}>{str(competitive.summary)}</Text>
      ) : null}

      {Array.isArray(competitive.key_differentiators) && competitive.key_differentiators.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text style={s.sectionTitle}>Key differentiators</Text>
          {competitive.key_differentiators.map((item) => (
            <Text key={String(item)} style={s.bullet}>
              • {String(item)}
            </Text>
          ))}
        </View>
      ) : null}

      {Array.isArray(competitive.key_risks) && competitive.key_risks.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={s.sectionTitle}>Key risks</Text>
          {competitive.key_risks.map((item) => (
            <Text key={String(item)} style={s.bullet}>
              • {String(item)}
            </Text>
          ))}
        </View>
      ) : null}
    </PageFrame>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function ReinvestmentPage({ ctx }) {
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const reinvest = asObj(ctx.reinvestment)
  const opportunities = Array.isArray(reinvest.opportunities) ? reinvest.opportunities : []

  return (
    <PageFrame meta={meta}>
      <Text style={s.title}>Reinvestment opportunities</Text>
      <Text style={s.subtitle}>Where to deploy delivery cost savings</Text>
      {reinvest.headline ? <Text style={[s.bodyText, { marginBottom: 10 }]}>{str(reinvest.headline)}</Text> : null}

      {opportunities.map((row, idx) => {
        const opp = asObj(row)
        const category = str(opp.category).replace(/_/g, ' ').toUpperCase()
        return (
          <View key={`${str(opp.title)}-${idx}`} style={s.oppCard}>
            <Text style={[s.metricLabel, { marginBottom: 4 }]}>
              {category || 'OPPORTUNITY'} · Risk: {str(opp.risk_level, 'medium')}
            </Text>
            <Text style={[s.boldText, { fontSize: 12, marginBottom: 4 }]}>{str(opp.title)}</Text>
            {opp.summary || opp.rationale ? (
              <Text style={[s.mutedText, { marginBottom: 6 }]}>
                {str(opp.summary || opp.rationale)}
              </Text>
            ) : null}
            <Text style={s.bodyText}>
              Investment: {str(opp.investment_required)} · Revenue: {str(opp.revenue_impact)}
            </Text>
            <Text style={s.bodyText}>
              Cost saved: {str(opp.cost_impact, '—')} · Timeline: {str(opp.timeline_months, '—')} months
            </Text>
            {opp.first_step ? (
              <View style={s.firstStepBox}>
                <Text style={s.bodyText}>↳ First step: {str(opp.first_step)}</Text>
              </View>
            ) : null}
          </View>
        )
      })}

      {reinvest.total_annual_uplift ? (
        <View style={s.callout}>
          <Text style={s.boldText}>Total potential annual uplift: {str(reinvest.total_annual_uplift)}</Text>
        </View>
      ) : null}
    </PageFrame>
  )
}

/**
 * @param {{ drivers: Array<Record<string, unknown>>, baseValue: number, chartWidth: number, leftPad: number }} props
 */
function PdfTornadoChart({ drivers, baseValue, chartWidth, leftPad }) {
  if (!drivers.length) return null

  const allValues = drivers.flatMap((d) => [toNum(d.low), toNum(d.high), toNum(d.base), baseValue])
  const minVal = Math.min(...allValues) - 2
  const maxVal = Math.max(...allValues) + 2
  const span = Math.max(0.001, maxVal - minVal)
  const xScale = (v) => leftPad + ((v - minVal) / span) * chartWidth
  const baseX = xScale(baseValue)
  const rowH = 22

  return (
    <View style={{ marginTop: 8, marginBottom: 12 }}>
      <View
        style={{
          position: 'absolute',
          left: baseX,
          top: 8,
          width: 1,
          height: drivers.length * rowH + 8,
          backgroundColor: PDF_COLORS.coral,
        }}
      />
      {drivers.map((driver, index) => {
        const low = toNum(driver.low)
        const high = toNum(driver.high)
        const y = 12 + index * rowH
        const x1 = xScale(Math.min(low, high))
        const x2 = xScale(Math.max(low, high))
        return (
          <View key={str(driver.name)} style={{ height: rowH, justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, marginBottom: 2 }}>{str(driver.name)}</Text>
            <View style={{ height: 8, position: 'relative' }}>
              <View
                style={{
                  position: 'absolute',
                  left: x1,
                  width: Math.max(2, x2 - x1),
                  height: 8,
                  backgroundColor: PDF_COLORS.coral,
                  opacity: 0.6,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={{ fontSize: 7, color: PDF_COLORS.gray }}>
              {formatPct(low)} — {formatPct(high)} (base {formatPct(driver.base)})
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
function SensitivityAppendixPage({ ctx }) {
  const meta = { clientName: str(ctx.clientName), generatedAt: str(ctx.generatedAt) }
  const sensitivity = asObj(ctx.sensitivity)
  const drivers = Array.isArray(sensitivity.drivers) ? sensitivity.drivers : []
  const headline = asObj(sensitivity.headline)
  const baseValue =
    drivers.find((d) => str(asObj(d).name) !== 'Ramp speed')?.base ??
    drivers[0]?.base ??
    headline.base_pct ??
    0

  const tech = Array.isArray(ctx.techRecommendations) ? ctx.techRecommendations : []
  const roleBreakdowns = Array.isArray(ctx.roleBreakdowns) ? ctx.roleBreakdowns : []

  return (
    <PageFrame meta={meta}>
      <Text style={s.title}>Projection confidence</Text>

      {headline.most_sensitive_driver ? (
        <Text style={[s.bodyText, { marginBottom: 8 }]}>
          Savings most sensitive to: {str(headline.most_sensitive_driver)} (variance{' '}
          {formatPct(headline.range_pp).replace('%', ' pp')})
        </Text>
      ) : null}

      {drivers.length > 0 ? (
        <>
          <View style={s.tableHeaderRow}>
            <Text style={{ width: 130, fontSize: 8, fontWeight: 'bold' }}>Driver</Text>
            <Text style={{ width: 55, fontSize: 8, fontWeight: 'bold' }}>Downside</Text>
            <Text style={{ width: 45, fontSize: 8, fontWeight: 'bold' }}>Base</Text>
            <Text style={{ width: 55, fontSize: 8, fontWeight: 'bold' }}>Upside</Text>
            <Text style={{ width: 45, fontSize: 8, fontWeight: 'bold' }}>Range</Text>
          </View>
          {drivers.map((row) => {
            const d = asObj(row)
            return (
              <View key={str(d.name)} style={s.tableRow}>
                <Text style={{ width: 130, fontSize: 9 }}>{str(d.name)}</Text>
                <Text style={{ width: 55, fontSize: 9 }}>{formatPct(d.low)}</Text>
                <Text style={{ width: 45, fontSize: 9 }}>{formatPct(d.base)}</Text>
                <Text style={{ width: 55, fontSize: 9 }}>{formatPct(d.high)}</Text>
                <Text style={{ width: 45, fontSize: 9 }}>{formatPct(d.range).replace('%', 'pp')}</Text>
              </View>
            )
          })}
          <PdfTornadoChart drivers={drivers} baseValue={toNum(baseValue)} chartWidth={320} leftPad={0} />
        </>
      ) : null}

      {sensitivity.narrative ? (
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Sensitivity narrative</Text>
          <Text style={s.bodyText}>{str(sensitivity.narrative)}</Text>
        </View>
      ) : null}

      {tech.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Tech stack recommendations</Text>
          <Text style={[s.mutedText, { marginBottom: 6 }]}>Recommended platforms by task type:</Text>
          {tech.map((item) => {
            const row = asObj(item)
            const tools = Array.isArray(row.tools) ? row.tools : []
            return (
              <View key={str(row.taskName)} style={{ marginBottom: 6 }}>
                <Text style={[s.boldText, { fontSize: 9 }]}>{str(row.taskName)}</Text>
                {tools.map((tool) => {
                  const t = asObj(tool)
                  return (
                    <View key={str(t.name)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <PdfLogo url={str(t.logo)} label={str(t.name)} />
                      <Text style={[s.bodyText, { marginLeft: 6, fontSize: 9 }]}>
                        {str(t.name)} — {str(t.category)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      ) : null}

      {roleBreakdowns.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Role time breakdowns</Text>
          {roleBreakdowns.map((role) => {
            const r = asObj(role)
            const activities = Array.isArray(r.activities) ? r.activities : []
            return (
              <View key={str(r.roleName)} style={{ marginBottom: 8 }}>
                <Text style={[s.boldText, { fontSize: 10 }]}>{str(r.roleName)}</Text>
                {activities.map((act) => {
                  const a = asObj(act)
                  return (
                    <Text key={str(a.name)} style={[s.mutedText, { fontSize: 9 }]}>
                      {str(a.name)} — {Math.round(toNum(a.minutes))} min
                    </Text>
                  )
                })}
              </View>
            )
          })}
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Generation metadata</Text>
      <Text style={s.mutedText}>Generated on {str(ctx.generatedAt)}</Text>
      <Text style={s.mutedText}>Engagement ID: {str(ctx.engagementId, '—')}</Text>
      <Text style={s.mutedText}>Tool version: {str(ctx.toolVersion, 'V2.4.1')}</Text>
    </PageFrame>
  )
}

/**
 * @param {{ ctx: Record<string, unknown> }} props
 */
export function SummaryPdfDocument({ ctx }) {
  const hasGenpact = Boolean(ctx.genpactUplift)
  const hasCompetitive =
    Boolean(ctx.competitive) &&
    ((Array.isArray(asObj(ctx.competitive).competitors) && asObj(ctx.competitive).competitors.length > 0) ||
      Boolean(str(asObj(ctx.competitive).fullSummary)))
  const hasReinvestment =
    Boolean(ctx.reinvestment) &&
    Array.isArray(asObj(ctx.reinvestment).opportunities) &&
    asObj(ctx.reinvestment).opportunities.length > 0
  const sensitivity = asObj(ctx.sensitivity)
  const hasSensitivity =
    (Array.isArray(sensitivity.drivers) && sensitivity.drivers.length > 0) ||
    Boolean(sensitivity.narrative) ||
    (Array.isArray(ctx.techRecommendations) && ctx.techRecommendations.length > 0) ||
    (Array.isArray(ctx.roleBreakdowns) && ctx.roleBreakdowns.length > 0)

  return (
    <Document title={`${str(ctx.clientName)} — Operating Model Summary`} author="Operating Model Simulator">
      <CoverPage ctx={ctx} />
      <PipelinePage ctx={ctx} />
      {hasGenpact ? <GenpactPage ctx={ctx} /> : null}
      {hasCompetitive ? <CompetitivePage ctx={ctx} /> : null}
      {hasReinvestment ? <ReinvestmentPage ctx={ctx} /> : null}
      {hasSensitivity ? <SensitivityAppendixPage ctx={ctx} /> : null}
    </Document>
  )
}
