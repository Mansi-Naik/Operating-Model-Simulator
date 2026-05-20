import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ArrowDown,
  ArrowUp,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../hooks/useEngagement';
import { aggregateSummary } from '../../../lib/summaryAggregator';
import { downloadSummaryReportPdf } from '../../../lib/summaryPdfExport';
import { getFinalAllocation } from '../../../lib/roleAggregation';
import {
  formatDomainSubfunctionLine,
  formatMarginProfileForDisplay,
  remainingMonthsChipLabel,
} from '../../../lib/intakePhaseADisplay';
import { supabase } from '../../../supabaseClient';

type Recommendation = 'PROCEED' | 'MARGINAL' | 'DO_NOT_PROCEED' | 'NEEDS_REVIEW';
type Direction = 'positive' | 'negative' | 'neutral';

interface SummaryProps {
  onBack?: () => void;
  onNavigateToFeature?: (featureId: string) => void;
}

interface JourneyNode {
  feature: string;
  label: string;
  status: string;
  summary: string;
}

interface StatTile {
  label: string;
  current: string | number | null;
  future: string | number | null;
  delta_pct: number | null;
  direction: Direction;
}

interface RiskCategoryRow {
  name: string;
  severity: string;
  kept_human: boolean;
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function recommendationChipClass(rec: Recommendation): string {
  switch (rec) {
    case 'PROCEED':
      return 'bg-[#E2EFDA] text-[#548235]';
    case 'MARGINAL':
      return 'bg-[#FFF0DC] text-[#FFAB28]';
    case 'DO_NOT_PROCEED':
      return 'bg-[#FCE4D6] text-[#FD4E59]';
    default:
      return 'bg-[#E8E8E8] text-[#6D7069]';
  }
}

function directionColor(direction: Direction): string {
  if (direction === 'positive') return 'text-[#548235]';
  if (direction === 'negative') return 'text-[#FD4E59]';
  return 'text-[#6D7069]';
}

function severityChipClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'critical') return 'bg-[#FCE4D6] text-[#FD4E59]';
  if (s === 'high') return 'bg-[#FFF0DC] text-[#FFAB28]';
  if (s === 'medium') return 'bg-[#FFF0DC] text-[#6D7069]';
  return 'bg-[#E2EFDA] text-[#548235]';
}

function formatTileValue(value: string | number | null): string {
  if (value == null) return '—';
  if (typeof value === 'number') return `${value}%`;
  return value;
}

function formatDelta(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return '';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

async function persistF7Summary(
  engagementId: string,
  pipelineId: string | null,
  headline: { recommendation: string; scenario_name: string },
): Promise<void> {
  const payload = {
    generated_at: new Date().toISOString(),
    recommendation: headline.recommendation,
    scenario_name: headline.scenario_name,
  };

  if (pipelineId) {
    await supabase.from('pipeline_runs').update({ f7_summary: payload }).eq('id', pipelineId);
    return;
  }

  await supabase.from('pipeline_runs').insert({
    engagement_id: engagementId,
    f7_summary: payload,
  });
}

function StackedAllocationBar({
  label,
  automated,
  assisted,
  human,
  automatedPct,
  assistedPct,
  humanPct,
}: {
  label: string;
  automated: number;
  assisted: number;
  human: number;
  automatedPct: number;
  assistedPct: number;
  humanPct: number;
}) {
  const total = automated + assisted + human;
  const aPct = total > 0 ? (automated / total) * 100 : automatedPct;
  const sPct = total > 0 ? (assisted / total) * 100 : assistedPct;
  const hPct = total > 0 ? (human / total) * 100 : humanPct;

  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">{label}</div>
      <div className="flex-1 h-7 rounded-full overflow-hidden flex border border-[#494949]/12">
        {aPct > 0 ? (
          <div
            className="bg-[#548235] flex items-center justify-center min-w-[48px]"
            style={{ width: `${Math.max(aPct, 8)}%` }}
          >
            <span className="text-[10px] font-medium text-white px-1">
              {label.includes('count') ? `${automated} auto` : `${Math.round(automatedPct)}% auto`}
            </span>
          </div>
        ) : null}
        {sPct > 0 ? (
          <div
            className="bg-[#FFAB28] flex items-center justify-center min-w-[48px]"
            style={{ width: `${Math.max(sPct, 8)}%` }}
          >
            <span className="text-[10px] font-medium text-white px-1">
              {label.includes('count') ? `${assisted} assist` : `${Math.round(assistedPct)}% assist`}
            </span>
          </div>
        ) : null}
        {hPct > 0 ? (
          <div
            className="bg-[#6D7069] flex items-center justify-center min-w-[48px]"
            style={{ width: `${Math.max(hPct, 8)}%` }}
          >
            <span className="text-[10px] font-medium text-white px-1">
              {label.includes('count') ? `${human} human` : `${Math.round(humanPct)}% human`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}


export function Summary({ onBack, onNavigateToFeature }: SummaryProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError, loadEngagement } =
    useEngagement(engagementIdFromUrl);

  const [pipelineRuns, setPipelineRuns] = useState<Record<string, unknown>>({});
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [showRiskDetails, setShowRiskDetails] = useState(true);
  const [showCaveats, setShowCaveats] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const savedF7Ref = useRef<string | null>(null);

  const loadPipeline = useCallback(async () => {
    if (!engagementIdFromUrl) {
      setPipelineError('Missing engagement');
      setPipelineLoading(false);
      return;
    }

    setPipelineLoading(true);
    setPipelineError(null);

    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('id, f2_matrix, f3_roles, f4_pods, f5_economics, f6_timeline')
      .eq('engagement_id', engagementIdFromUrl)
      .maybeSingle();

    if (error) {
      setPipelineError(error.message);
      setPipelineRuns({});
      setPipelineId(null);
      setPipelineLoading(false);
      return;
    }

    setPipelineId(typeof data?.id === 'string' ? data.id : null);
    setPipelineRuns({
      f2_matrix: data?.f2_matrix,
      f3_roles: parseJsonObject(data?.f3_roles),
      f4_pods: parseJsonObject(data?.f4_pods),
      f5_economics: parseJsonObject(data?.f5_economics),
      f6_timeline: parseJsonObject(data?.f6_timeline),
    });
    setPipelineLoading(false);
  }, [engagementIdFromUrl]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const taskRows = useMemo(
    () => (Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : []),
    [tasks],
  );

  const summary = useMemo(() => {
    if (!engagement) return null;
    return aggregateSummary(engagement as Record<string, unknown>, taskRows, pipelineRuns);
  }, [engagement, taskRows, pipelineRuns]);

  const headline = asObj(summary?.headline);
  const recommendation = String(headline.recommendation ?? 'NEEDS_REVIEW') as Recommendation;

  const summaryContextChips = useMemo(() => {
    const raw = engagement?.intake_data;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [] as string[];
    const intake = raw as Record<string, unknown>;
    const eng = (intake.engagement as Record<string, unknown>) || {};
    const pref = (intake.preferences as Record<string, unknown>) || {};
    const chips: string[] = [];
    const domSub = formatDomainSubfunctionLine(
      typeof eng.domain === 'string' ? eng.domain : '',
      typeof eng.sub_function === 'string' ? eng.sub_function : '',
    );
    if (domSub) chips.push(domSub);
    const rem = remainingMonthsChipLabel(
      typeof eng.contract_end_date === 'string' ? eng.contract_end_date : '',
    );
    if (rem) chips.push(rem);
    const mp = formatMarginProfileForDisplay(typeof pref.margin_profile === 'string' ? pref.margin_profile : '');
    if (mp) chips.push(mp);
    const exp = pref.expected_implementation_months;
    if (typeof exp === 'number' && Number.isFinite(exp) && exp >= 1) {
      chips.push(`${exp} months expected`);
    } else if (typeof exp === 'string') {
      const n = parseInt(exp.trim(), 10);
      if (Number.isFinite(n) && n >= 1) chips.push(`${n} months expected`);
    }
    return chips;
  }, [engagement?.intake_data]);

  const statTiles = (Array.isArray(summary?.stat_tiles) ? summary.stat_tiles : []) as StatTile[];
  const journey = (Array.isArray(summary?.journey) ? summary.journey : []) as JourneyNode[];
  const allocationSummary = asObj(summary?.allocation_summary);
  const coverageByVolume = asObj(allocationSummary.coverage_by_volume);
  const riskEvidence = asObj(summary?.risk_evidence);
  const coverageCheck = asObj(riskEvidence.coverage_check);
  const caveats = asObj(summary?.caveats);
  const limitations = Array.isArray(summary?.limitations) ? (summary.limitations as string[]) : [];

  const allocationCounts = useMemo(() => {
    let automated = 0;
    let assisted = 0;
    let human = 0;
    for (const task of taskRows) {
      const alloc = getFinalAllocation(task) || 'human-only';
      if (alloc === 'tech-automated') automated += 1;
      else if (alloc === 'tech-assisted') assisted += 1;
      else human += 1;
    }
    return { automated, assisted, human };
  }, [taskRows]);

  const missingFeatures = useMemo(() => {
    const f5 = asObj(pipelineRuns.f5_economics);
    const f3 = asObj(pipelineRuns.f3_roles);
    const f4 = asObj(pipelineRuns.f4_pods);
    const f6 = asObj(pipelineRuns.f6_timeline);
    const hasF2 = journey.find((j) => j.feature === 'F2')?.status === 'complete';
    const hasF3 = Array.isArray(f3.redesigns) && f3.redesigns.length > 0;
    const hasF4 = Boolean(f4.selected_variant_name);
    const hasF5 = Boolean(f5.economics_result);
    const hasF6 = Boolean(f6.summary);

    const items: { id: string; label: string }[] = [];
    if (!hasF2) items.push({ id: 'f2', label: 'F2 Allocation' });
    if (!hasF3) items.push({ id: 'f3', label: 'F3 Roles' });
    if (!hasF4) items.push({ id: 'f4', label: 'F4 Pods' });
    if (!hasF5) items.push({ id: 'f5', label: 'F5 Economics' });
    if (!hasF6) items.push({ id: 'f6', label: 'F6 Timeline' });
    return items;
  }, [journey, pipelineRuns]);

  useEffect(() => {
    if (!summary || !engagementIdFromUrl) return;
    const sig = JSON.stringify({
      rec: headline.recommendation,
      scenario: headline.scenario_name,
      tasks: taskRows.length,
      pipeline: pipelineId,
    });
    if (savedF7Ref.current === sig) return;
    savedF7Ref.current = sig;

    void persistF7Summary(engagementIdFromUrl, pipelineId, {
      recommendation: String(headline.recommendation ?? 'NEEDS_REVIEW'),
      scenario_name: String(headline.scenario_name ?? ''),
    });
  }, [summary, engagementIdFromUrl, pipelineId, headline.recommendation, headline.scenario_name, taskRows.length]);

  const loading = engagementLoading || pipelineLoading;
  const error = engagementError ?? pipelineError;

  const riskCategories = (
    Array.isArray(riskEvidence.risk_categories) ? riskEvidence.risk_categories : []
  ) as RiskCategoryRow[];
  const lockedTasks = Array.isArray(riskEvidence.locked_tasks) ? (riskEvidence.locked_tasks as string[]) : [];
  const extractionWarnings = Array.isArray(caveats.extraction_warnings)
    ? (caveats.extraction_warnings as string[])
    : [];
  const dataGaps = Array.isArray(caveats.data_gaps) ? (caveats.data_gaps as string[]) : [];

  const todayHumanVol = Number(coverageCheck.total_volume_handled_by_humans_today) || 0;
  const futureHumanVol = Number(coverageCheck.total_volume_handled_by_humans_future) || 0;
  const todayHumanPct = todayHumanVol > 0 ? 100 : 0;
  const futureHumanPct =
    todayHumanVol > 0 ? Math.round((futureHumanVol / todayHumanVol) * 100) : 0;

  const handleExport = async () => {
    if (!summary || pdfExporting) return;

    setPdfExporting(true);
    setExportNotice(null);

    const clientName =
      engagement && typeof (engagement as Record<string, unknown>).client_name === 'string'
        ? String((engagement as Record<string, unknown>).client_name).trim()
        : 'Engagement';
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileBase = `${clientName}-operating-model-summary-${dateStamp}`;

    try {
      await downloadSummaryReportPdf(summary as Record<string, unknown>, clientName, fileBase);
      setExportNotice('Report downloaded as PDF.');
      window.setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create PDF.';
      setExportNotice(msg);
      window.setTimeout(() => setExportNotice(null), 6000);
    } finally {
      setPdfExporting(false);
    }
  };

  const featureRoute = (feature: string) => {
    const map: Record<string, string> = {
      F1: 'f1',
      F2: 'f2',
      F3: 'f3',
      F4: 'f4',
      F5: 'f5',
      F6: 'f6',
    };
    return map[feature] ?? 'f1';
  };

  if (loading) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[13px] text-[#161916] uppercase tracking-wide mb-4">Summary</div>
        <p className="text-[14px] text-[#494949]">Loading summary…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[13px] text-[#161916] uppercase tracking-wide mb-4">Summary</div>
        <div className="text-[14px] text-[#FD4E59] mb-4">{error}</div>
        <button
          type="button"
          onClick={() => {
            if (engagementIdFromUrl) void loadEngagement(engagementIdFromUrl);
            void loadPipeline();
          }}
          className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1204px] mx-auto pb-16">
      {exportNotice ? (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161916] text-white text-[13px] px-5 py-3 rounded-lg shadow-lg">
          {exportNotice}
        </div>
      ) : null}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timeline
        </button>
      ) : null}

      {missingFeatures.length > 0 ? (
        <div className="mb-6 bg-[#FFF0DC] border border-[#FFAB28]/30 rounded-xl p-5">
          <p className="text-[14px] text-[#161916] mb-3">
            Some features haven&apos;t been generated yet. Run F2–F6 to see the full picture.
          </p>
          <div className="flex flex-wrap gap-2">
            {missingFeatures.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateToFeature?.(item.id)}
                className="h-8 px-3 text-[12px] font-medium text-[#FD4E59] border border-[#FD4E59]/40 rounded-md hover:bg-[#FD4E59]/5"
              >
                Go to {item.label} →
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Section 1 — Headline */}
      <div className="relative bg-[#FDF8F4] border-l-4 border-[#FD4E59] rounded-2xl p-8 mb-6">
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
          <span
            className={`px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${recommendationChipClass(recommendation)}`}
          >
            {recommendation.replace(/_/g, ' ')}
          </span>
          {caveats.illustrative_flag !== false ? (
            <span className="h-7 px-3 border-[1.5px] border-dashed border-[#FFAB28] rounded-full flex items-center text-[10px] font-medium text-[#FFAB28] uppercase tracking-wider">
              Illustrative
            </span>
          ) : null}
        </div>

        <div className="pr-40">
          <h1 className="text-[36px] font-bold text-[#161916] mb-2 leading-tight">
            {String(headline.scenario_name ?? 'Operating model summary')}
          </h1>
          <p className="text-[16px] text-[#494949] mb-4 max-w-[720px]">
            {String(headline.one_line_summary ?? '')}
          </p>
          {summaryContextChips.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {summaryContextChips.map((chip, i) => (
                <span
                  key={`${i}-${chip}`}
                  className="inline-flex items-center rounded-full bg-[#FFF8ED] px-3 py-1 text-[12px] font-medium text-[#494949] border border-[#161916]/8"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          <span className="inline-block px-3 py-1 bg-white border border-[#494949]/15 rounded-full text-[12px] font-medium text-[#6D7069]">
            {String(headline.pattern_label ?? '')}
          </span>
        </div>
      </div>

      {/* Section 2 — Stat tiles */}
      {statTiles.length > 0 ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statTiles.map((tile) => (
            <div
              key={tile.label}
              className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm"
              style={{ minHeight: '140px' }}
            >
              <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                {tile.label}
              </div>
              {tile.label === 'AI COVERAGE' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[18px] font-medium text-[#6D7069]">{formatTileValue(tile.current)}</span>
                    <span className="text-[14px] text-[#6D7069]">→</span>
                    <span className="text-[28px] font-bold text-[#161916]">{formatTileValue(tile.future)}</span>
                  </div>
                  <div className={`text-[18px] font-bold flex items-center gap-1 ${directionColor(tile.direction)}`}>
                    {tile.delta_pct != null && tile.delta_pct > 0 ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : tile.delta_pct != null && tile.delta_pct < 0 ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : null}
                    {formatDelta(tile.delta_pct)}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[16px] font-medium text-[#6D7069]">{formatTileValue(tile.current)}</span>
                    <span className="text-[14px] text-[#6D7069]">→</span>
                    <span className="text-[22px] font-bold text-[#161916]">{formatTileValue(tile.future)}</span>
                  </div>
                  {tile.delta_pct != null ? (
                    <div className={`text-[18px] font-bold flex items-center gap-1 ${directionColor(tile.direction)}`}>
                      {tile.delta_pct < 0 ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                      {formatDelta(tile.delta_pct)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Section 3 — Journey */}
      <div className="mb-6">
        <h2 className="text-[14px] font-medium text-[#6D7069] uppercase tracking-widest mb-3">Pipeline journey</h2>
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {journey.map((node, index) => {
            const complete = node.status === 'complete';
            return (
              <div key={node.feature} className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateToFeature?.(featureRoute(node.feature))}
                  className={`w-[168px] text-left rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer ${
                    complete
                      ? 'bg-[#FCE4D6]/40 border-[#FD4E59]/30'
                      : 'bg-white border-[#494949]/12'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#FD4E59] uppercase">{node.feature}</span>
                    {complete ? (
                      <Check className="w-4 h-4 text-[#548235]" strokeWidth={2.5} />
                    ) : (
                      <Circle className="w-4 h-4 text-[#6D7069]" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="text-[13px] font-semibold text-[#161916] mb-1">{node.label}</div>
                  <p className="text-[11px] text-[#6D7069] leading-snug">{node.summary}</p>
                </button>
                {index < journey.length - 1 ? <ArrowRight className="w-4 h-4 text-[#6D7069] flex-shrink-0" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4 — Allocation */}
      <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-6">
        <h2 className="text-[14px] font-medium text-[#161916] mb-4">Allocation summary</h2>
        <StackedAllocationBar
          label="By task count"
          automated={allocationCounts.automated}
          assisted={allocationCounts.assisted}
          human={allocationCounts.human}
          automatedPct={Number(allocationSummary.automated_pct) || 0}
          assistedPct={Number(allocationSummary.assisted_pct) || 0}
          humanPct={Number(allocationSummary.human_only_pct) || 0}
        />
        <StackedAllocationBar
          label="By volume × time"
          automated={0}
          assisted={0}
          human={0}
          automatedPct={Number(coverageByVolume.automated_pct) || 0}
          assistedPct={Number(coverageByVolume.assisted_pct) || 0}
          humanPct={Number(coverageByVolume.human_only_pct) || 0}
        />
        <p className="text-[12px] italic text-[#6D7069] mt-1">
          Volume-weighted reflects business impact; task count reflects breadth of change.
        </p>
      </div>

      {/* Section 5 — Risk */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowRiskDetails((v) => !v)}
          className="w-full flex items-center justify-between bg-white border border-[#494949]/12 rounded-xl px-6 py-4 hover:bg-[#FDF8F4]/50"
        >
          <span className="text-[15px] font-semibold text-[#161916]">Risk &amp; Escalation Evidence</span>
          {showRiskDetails ? <ChevronUp className="w-5 h-5 text-[#6D7069]" /> : <ChevronDown className="w-5 h-5 text-[#6D7069]" />}
        </button>

        {showRiskDetails ? (
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                Risk categories preserved
              </h3>
              {riskCategories.length === 0 ? (
                <p className="text-[13px] text-[#6D7069]">No risk categories captured in intake.</p>
              ) : (
                <div className="border border-[#494949]/12 rounded-lg overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-[#FDF8F4]">
                        <th className="text-left p-3 font-semibold text-[#6D7069]">Risk</th>
                        <th className="text-left p-3 font-semibold text-[#6D7069]">Severity</th>
                        <th className="text-left p-3 font-semibold text-[#6D7069]">Kept human</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskCategories.map((row) => (
                        <tr key={row.name} className="border-t border-[#494949]/12">
                          <td className="p-3 text-[#161916]">{row.name}</td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${severityChipClass(row.severity)}`}
                            >
                              {row.severity}
                            </span>
                          </td>
                          <td className="p-3">
                            {row.kept_human ? (
                              <span className="text-[#548235] font-medium">Yes</span>
                            ) : (
                              <span className="text-[#FD4E59] font-medium">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Locked tasks</h3>
              {lockedTasks.length === 0 ? (
                <p className="text-[13px] text-[#6D7069]">No regulatory-locked tasks.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {lockedTasks.map((name) => (
                    <div
                      key={name}
                      className="bg-white border border-[#494949]/12 rounded-lg px-4 py-3 min-w-[200px]"
                    >
                      <div className="text-[13px] font-medium text-[#161916] mb-1">{name}</div>
                      <span className="inline-block px-2 py-0.5 bg-[#FCE4D6] text-[#FD4E59] text-[10px] font-semibold uppercase rounded">
                        Locked: regulatory
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5">
              <h3 className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Coverage check</h3>
              <p className="text-[14px] text-[#161916] mb-1">
                Today: humans handle{' '}
                <span className="font-semibold">{todayHumanPct}%</span> of volume → Future: humans handle{' '}
                <span className="font-semibold">{futureHumanPct}%</span> of volume
              </p>
              <p className="text-[14px] text-[#494949] mb-3">
                Reduction: <span className="font-semibold">{Number(coverageCheck.reduction_pct) || 0}%</span>
              </p>
              {coverageCheck.sufficient_safety_review === true ? (
                <div className="flex items-center gap-2 text-[#548235] text-[13px] font-medium">
                  <Check className="w-4 h-4" />
                  Safety review coverage maintained
                </div>
              ) : (
                <p className="text-[13px] text-[#FD4E59]">
                  Review critical-consequence tasks — not all remain human-only.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Section 6 — Caveats */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowCaveats((v) => !v)}
          className="w-full flex items-center justify-between bg-white border border-[#494949]/12 rounded-xl px-6 py-4 hover:bg-[#FDF8F4]/50"
        >
          <span className="text-[15px] font-semibold text-[#161916]">Caveats &amp; Assumptions</span>
          {showCaveats ? <ChevronUp className="w-5 h-5 text-[#6D7069]" /> : <ChevronDown className="w-5 h-5 text-[#6D7069]" />}
        </button>

        {showCaveats ? (
          <div className="mt-4 space-y-4">
            {extractionWarnings.map((warning) => (
              <div
                key={warning}
                className="bg-[#FFF0DC] border border-[#FFAB28]/25 rounded-lg px-4 py-3 text-[13px] text-[#494949]"
              >
                {warning}
              </div>
            ))}
            {dataGaps.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#494949]">
                {dataGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[#6D7069]">No additional data gaps flagged.</p>
            )}
            <p className="text-[13px] italic text-[#6D7069]">
              All financial values are illustrative based on industry assumptions.
            </p>
          </div>
        ) : null}
      </div>

      {/* Section 7 — Limitations */}
      <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-8">
        <h2 className="text-[13px] font-medium text-[#6D7069] uppercase tracking-wide mb-3">
          Limitations of this analysis
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          {limitations.map((item) => (
            <li key={item} className="text-[13px] italic text-[#6D7069]">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 8 — Export */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={pdfExporting || !summary}
          className="h-11 px-6 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {pdfExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Export full report →
        </button>
      </div>
    </div>
  );
}
