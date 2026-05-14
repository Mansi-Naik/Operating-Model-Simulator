import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { getFinalAllocation } from '../../../../lib/roleAggregation';
import { supabase } from '../../../../supabaseClient';

interface F6_0_PreRunProps {
  onGenerateTimeline: () => void;
  onBack?: () => void;
  onGoToF5?: () => void;
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asObj(parsed);
    } catch {
      return {};
    }
  }
  return asObj(raw);
}

function fmtInt(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function formatVariantLabel(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '—';
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function selectedVariantFromF4Pods(f4Pods: Record<string, unknown>): Record<string, unknown> {
  const selected = typeof f4Pods.selected_variant_name === 'string' ? f4Pods.selected_variant_name.trim().toLowerCase() : '';
  const all = Array.isArray(f4Pods.all_variants) ? f4Pods.all_variants : [];
  const found = all.find((row) => String(asObj(row).variant_name ?? '').trim().toLowerCase() === selected);
  return asObj(found);
}

function domainFromEngagement(engagement: Record<string, unknown> | null): string {
  if (!engagement) return '—';
  if (typeof engagement.domain === 'string' && engagement.domain.trim()) return engagement.domain.trim();
  const intake = asObj(engagement.intake_data);
  const eng = asObj(intake.engagement);
  return typeof eng.domain === 'string' && eng.domain.trim() ? eng.domain.trim() : '—';
}

export function F6_0_PreRun({ onGenerateTimeline, onBack, onGoToF5 }: F6_0_PreRunProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError, loadEngagement } =
    useEngagement(engagementIdFromUrl);

  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [f3Roles, setF3Roles] = useState<Record<string, unknown>>({});
  const [f4Pods, setF4Pods] = useState<Record<string, unknown>>({});
  const [f5Economics, setF5Economics] = useState<Record<string, unknown>>({});

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
      .select('f3_roles, f4_pods, f5_economics')
      .eq('engagement_id', engagementIdFromUrl)
      .maybeSingle();

    if (error) {
      setPipelineError(error.message);
      setF3Roles({});
      setF4Pods({});
      setF5Economics({});
      setPipelineLoading(false);
      return;
    }

    setF3Roles(parseJsonObject(data?.f3_roles));
    setF4Pods(parseJsonObject(data?.f4_pods));
    setF5Economics(parseJsonObject(data?.f5_economics));
    setPipelineLoading(false);
  }, [engagementIdFromUrl]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const engagementRecord = engagement as Record<string, unknown> | null;
  const taskRows = useMemo(() => (Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : []), [tasks]);
  const selectedVariant = useMemo(() => selectedVariantFromF4Pods(f4Pods), [f4Pods]);
  const orgRollup = asObj(selectedVariant.org_rollup);
  const hasF5Economics = Boolean(f5Economics.economics_result);
  const error = engagementError ?? pipelineError;

  const automatedTasksCount = taskRows.filter((task) => getFinalAllocation(task) === 'tech-automated').length;
  const assistedTasksCount = taskRows.filter((task) => getFinalAllocation(task) === 'tech-assisted').length;
  const canGenerate = hasF5Economics && !engagementLoading && !pipelineLoading && !error;

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[720px] w-full">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div className="text-[13px] text-[#161916] mb-6">TIMELINE</div>

        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Generate implementation timeline</h1>

        <p className="text-[15px] text-[#494949] mb-8">
          Turn the selected pod structure and economics output into a four-phase AI rollout plan with dependencies,
          quick wins, and executive-facing phase summaries.
        </p>

        {!pipelineLoading && !hasF5Economics && onGoToF5 ? (
          <div className="mb-6 bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <AlertTriangle className="w-5 h-5 text-[#FFAB28] shrink-0" />
              <span className="text-[14px] font-medium text-[#161916]">Compute economics first</span>
            </div>
            <button
              type="button"
              onClick={onGoToF5}
              className="h-9 px-4 shrink-0 bg-[#FFAB28] text-[#161916] text-[13px] font-semibold rounded-md hover:bg-[#FFAB28]/90"
            >
              Go to F5.1
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
            {error}
            {engagementIdFromUrl ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void loadEngagement(engagementIdFromUrl)}
                  className="text-[13px] font-semibold text-[#FD4E59] underline"
                >
                  Retry engagement
                </button>
                {' · '}
                <button
                  type="button"
                  onClick={() => void loadPipeline()}
                  className="text-[13px] font-semibold text-[#FD4E59] underline"
                >
                  Retry timeline prerequisites
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
          <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Engagement context
          </div>
          {engagementLoading || pipelineLoading ? (
            <div className="text-[14px] text-[#494949]">Loading engagement context…</div>
          ) : (
            <ul className="space-y-2 text-[14px] text-[#161916] leading-relaxed">
              <li>
                <span className="text-[#494949]">Domain: </span>
                <span className="font-medium">{domainFromEngagement(engagementRecord)}</span>
              </li>
              <li>
                <span className="text-[#494949]">Selected variant: </span>
                <span className="font-medium">
                  {formatVariantLabel(f4Pods.selected_variant_name ?? selectedVariant.display_name)}
                </span>
              </li>
              <li>
                <span className="text-[#494949]">Pod count and headcount: </span>
                <span className="font-medium">
                  {fmtInt(orgRollup.pod_count)} pods · {fmtInt(orgRollup.total_headcount)} FTE
                </span>
              </li>
              <li>
                <span className="text-[#494949]">Tech-automated tasks: </span>
                <span className="font-medium">{automatedTasksCount}</span>
              </li>
              <li>
                <span className="text-[#494949]">Tech-assisted tasks: </span>
                <span className="font-medium">{assistedTasksCount}</span>
              </li>
            </ul>
          )}
        </div>

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-8">
          <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            What this will produce
          </div>
          <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#161916] leading-relaxed">
            <li>4-phase deployment plan: Foundation → Pilot → Scale → Optimize</li>
            <li>Critical path identification</li>
            <li>Quick wins surfaced</li>
            <li>Phase narratives generated by AI</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onGenerateTimeline}
            disabled={!canGenerate}
            className="h-12 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            Generate timeline
          </button>
        </div>
      </div>
    </div>
  );
}
