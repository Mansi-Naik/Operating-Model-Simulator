import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useEngagement } from '../../../hooks/useEngagement';
import { getSourceDocumentTextFromMetadata } from '../../../lib/extractTaskFieldsNormalize';
import { computeReadiness } from '../../../lib/readinessScoring';
import {
  formatContractPeriodSummary,
  formatDomainSubfunctionLine,
  formatMarginProfileForDisplay,
  formatCompetitiveContextForDisplay,
  formatBillingModelForDisplay,
} from '../../../lib/intakePhaseADisplay';

interface ReadinessReviewProps {
  onProceed: () => void;
  onBack?: () => void;
}

export function ReadinessReview({ onProceed, onBack }: ReadinessReviewProps) {
  const engagementId =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const { engagement, tasks, loading, error, updateEngagement, loadEngagement } = useEngagement(engagementId);
  const [reExtractOpen, setReExtractOpen] = useState(false);
  const [reExtractBusy, setReExtractBusy] = useState(false);

  const showReExtractButton = Boolean(engagement?.extraction_metadata);
  const hasSourceDocumentText = useMemo(
    () => getSourceDocumentTextFromMetadata(engagement?.extraction_metadata) != null,
    [engagement?.extraction_metadata],
  );
  const result = useMemo(() => computeReadiness(engagement, tasks), [engagement, tasks]);
  const score = result.score;
  const band = result.band;

  useEffect(() => {
    if (!engagement?.id) return;
    if (engagement.readiness_score === result.score && engagement.readiness_band === result.band) return;
    updateEngagement({ readiness_score: result.score, readiness_band: result.band });
  }, [engagement?.id, engagement?.readiness_score, engagement?.readiness_band, result.score, result.band, updateEngagement]);

  const dimensions = [
    { key: 'task_coverage', name: 'Task coverage', score: result.breakdown.task_coverage, weight: 25 },
    { key: 'task_granularity', name: 'Task granularity', score: result.breakdown.task_granularity, weight: 15 },
    { key: 'volume_data', name: 'Volume data', score: result.breakdown.volume_data, weight: 15 },
    { key: 'time_data', name: 'Time data', score: result.breakdown.time_data, weight: 10 },
    { key: 'cost_data', name: 'Cost data', score: result.breakdown.cost_data, weight: 10 },
    { key: 'risk_data', name: 'Risk categories', score: result.breakdown.risk_data, weight: 10 },
    { key: 'tech_stack', name: 'Tech stack', score: result.breakdown.tech_stack, weight: 5 },
    { key: 'goals', name: 'Goals', score: result.breakdown.goals, weight: 10 },
  ];

  const bandClass =
    band === 'green'
      ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#16A34A]'
      : band === 'amber'
        ? 'bg-[#FFAB28]/15 border-[#FFAB28] text-[#FFAB28]'
        : 'bg-[#FD4E59]/15 border-[#FD4E59] text-[#FD4E59]';

  const engagementContextLines = useMemo(() => {
    const raw = engagement?.intake_data;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [] as string[];
    const intake = raw as Record<string, unknown>;
    const eng = (intake.engagement as Record<string, unknown>) || {};
    const pref = (intake.preferences as Record<string, unknown>) || {};
    const lines: string[] = [];
    const domSub = formatDomainSubfunctionLine(
      typeof eng.domain === 'string' ? eng.domain : '',
      typeof eng.sub_function === 'string' ? eng.sub_function : '',
    );
    if (domSub) lines.push(domSub);
    const period = formatContractPeriodSummary(
      typeof eng.contract_start_date === 'string' ? eng.contract_start_date : '',
      typeof eng.contract_end_date === 'string' ? eng.contract_end_date : '',
    );
    if (period) lines.push(period);
    const competitiveLine = formatCompetitiveContextForDisplay(
      typeof eng.competitive_context === 'string' ? eng.competitive_context : '',
    );
    if (competitiveLine) lines.push(competitiveLine);
    const margin = formatMarginProfileForDisplay(
      typeof pref.margin_profile === 'string' ? pref.margin_profile : '',
    );
    if (margin) lines.push(margin);
    const billingLine = formatBillingModelForDisplay(pref.billing_model);
    if (billingLine) lines.push(billingLine);
    const exp = pref.expected_implementation_months;
    if (typeof exp === 'number' && Number.isFinite(exp) && exp >= 1) {
      lines.push(`${exp} months expected`);
    } else if (typeof exp === 'string') {
      const n = parseInt(exp.trim(), 10);
      if (Number.isFinite(n) && n >= 1) lines.push(`${n} months expected`);
    }
    return lines;
  }, [engagement?.intake_data]);

  const summaryText =
    band === 'green'
      ? 'Your context is strong enough to proceed.'
      : band === 'amber'
      ? 'Your context is partially complete. You can proceed with caveats.'
      : 'Your context is incomplete. Please address key gaps before proceeding.';

  const handleReExtractConfirm = async () => {
    if (!engagementId) return;
    setReExtractBusy(true);
    try {
      const res = await fetch('/api/re-extract-task-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagement_id: engagementId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        tasks_updated?: number;
        errors?: string[];
      };
      if (!res.ok) {
        toast.error(body.error ?? `Re-extraction failed (${res.status})`);
        return;
      }
      await loadEngagement(engagementId);
      const n = typeof body.tasks_updated === 'number' ? body.tasks_updated : 0;
      toast.success(
        `Task fields updated (${n} task${n === 1 ? '' : 's'}). You may want to re-run F2 to see updated allocations.`,
      );
      setReExtractOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-extraction failed');
    } finally {
      setReExtractBusy(false);
    }
  };

  return (
    <div className="p-10">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-[26px] font-bold text-[#161916]">Readiness Review</h1>
        {showReExtractButton ? (
          <button
            type="button"
            onClick={() => setReExtractOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 border border-[#161916]/30 text-[#494949] text-[13px] font-medium rounded-lg hover:bg-[#161916]/5 shrink-0"
            title={
              hasSourceDocumentText
                ? 'Re-run classifier fields from the original document'
                : 'Original document text was not stored for this engagement'
            }
          >
            <RefreshCw className="w-4 h-4" />
            Re-extract from document
          </button>
        ) : null}
      </div>

      {reExtractOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-lg border border-[#161916]/10">
            <h2 className="text-[18px] font-semibold text-[#161916] mb-3">Re-extract task fields?</h2>
            <p className="text-[14px] text-[#494949] mb-4 leading-relaxed">
              This will use 1 API call to re-process the document and update task fields like data type,
              consequence, and regulatory flags.
              <br />
              <br />
              Your task volumes, names, and roles will NOT change. Only the classification fields will be
              updated.
              <br />
              <br />
              Continue?
            </p>
            {!hasSourceDocumentText ? (
              <p className="text-[13px] text-[#FD4E59] mb-4">
                Original document not available for re-extraction. Please re-upload the document via F1.0.
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReExtractOpen(false)}
                disabled={reExtractBusy}
                className="h-10 px-5 border border-[#161916]/30 text-[#494949] text-[14px] rounded-lg hover:bg-[#161916]/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReExtractConfirm()}
                disabled={reExtractBusy || !hasSourceDocumentText}
                className="h-10 px-5 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-lg hover:bg-[#FD4E59]/90 disabled:opacity-60"
              >
                {reExtractBusy ? 'Re-extracting…' : 'Re-extract'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[55%,45%] gap-8">
        {/* Left Column */}
        <div>
          <div className={`inline-flex px-4 py-1.5 border text-[13px] font-semibold rounded-full mb-6 ${bandClass}`}>
            Status: {band.toUpperCase()}
          </div>

          {engagementContextLines.length > 0 ? (
            <div className="mb-6 rounded-lg border border-[#161916]/10 bg-[#FDF8F4] p-4">
              <h3 className="text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                Engagement context
              </h3>
              <ul className="space-y-1.5 text-[14px] text-[#161916]">
                {engagementContextLines.map((line, i) => (
                  <li key={`${i}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Score Gauge */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="#FFF0DC"
                  strokeWidth="12"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="#FD4E59"
                  strokeWidth="12"
                  strokeDasharray={`${(score / 100) * 414} 414`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[36px] font-bold text-[#161916]">{score}</div>
                <div className="text-[14px] text-[#6D7069]">/ 100</div>
              </div>
            </div>
            <p className="text-[14px] text-[#494949] text-center mt-4 max-w-xs">
              {summaryText}
            </p>
          </div>

          {/* Breakdown */}
          <h3 className="text-[14px] font-semibold text-[#161916] mb-4">Breakdown by Dimension</h3>
          <div className="space-y-3">
            {dimensions.map((dim) => (
              <div key={dim.key} className="flex items-center gap-4 cursor-pointer hover:bg-[#FFF0DC] p-2 rounded">
                <div className="text-[13px] text-[#161916] w-36">{dim.name}</div>
                <div className="flex-1 h-2 bg-[#FFF0DC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dim.score < 0.5 ? 'bg-[#FFAB28]' : 'bg-[#FD4E59]'}`}
                    style={{ width: `${dim.score * 100}%` }}
                  />
                </div>
                <div className="text-[13px] font-medium text-[#161916] w-9 text-right">
                  {dim.score.toFixed(2)}
                </div>
                <div className="text-[12px] text-[#6D7069] w-12 text-right">{dim.weight}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Gaps */}
        <div>
          <h3 className="text-[14px] font-semibold text-[#161916] mb-4">Gaps ({result.gaps.length})</h3>

          {loading && <p className="text-[13px] text-[#6D7069] mb-3">Computing readiness...</p>}
          {error && <p className="text-[13px] text-[#FD4E59] mb-3">{error}</p>}

          {result.gaps.map((gap) => (
            <div key={gap.dimension} className="bg-[#FDF8F4] border border-[#FFAB28] border-l-4 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-[#FFAB28]/20 border border-[#FFAB28] text-[#FFAB28] text-[11px] font-bold uppercase rounded">
                    {gap.severity.toUpperCase()}
                  </div>
                  <span className="text-[14px] font-semibold text-[#161916]">{gap.dimension.replace('_', ' ')}</span>
                </div>
              </div>
              <p className="text-[13px] text-[#494949] mb-2">{gap.message}</p>
              <p className="text-[12px] italic text-[#6D7069] mb-3">{gap.suggested_action}</p>
            </div>
          ))}

          {result.gaps.length === 0 && !loading && (
            <div className="bg-[#FDF8F4] border border-[#16A34A] border-l-4 rounded-lg p-4 mb-6">
              <p className="text-[13px] text-[#161916]">No major gaps found.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button className="h-11 px-8 border border-[#161916]/30 text-[#494949] text-[14px] font-medium rounded-lg hover:bg-[#161916]/5">
              Save Draft
            </button>
            <button
              onClick={onProceed}
              disabled={band === 'red'}
              className="flex-1 h-11 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-lg hover:bg-[#FD4E59]/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Proceed to Allocation →
            </button>
          </div>
          {band === 'amber' && (
            <p className="text-[12px] text-[#FFAB28] mt-2">
              Proceeding with caveats — some context is incomplete.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
