import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dedupeLatestRedesignsByRole, normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { useEngagement } from '../../../../hooks/useEngagement';
import { supabase } from '../../../../supabaseClient';

const CONSEQUENCE_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function normalizeConsequence(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  return CONSEQUENCE_RANK[s] ? s : null;
}

function maxConsequenceFromTasks(tasks: Record<string, unknown>[]): string | null {
  let bestRank = 0;
  let bestLabel: string | null = null;
  for (const t of tasks) {
    const c = normalizeConsequence(t.consequence_of_error);
    if (!c) continue;
    const r = CONSEQUENCE_RANK[c] ?? 0;
    if (r > bestRank) {
      bestRank = r;
      bestLabel = c;
    }
  }
  return bestLabel;
}

function readIntakeRiskTolerance(engagement: Record<string, unknown> | null): string | null {
  if (!engagement?.intake_data || typeof engagement.intake_data !== 'object' || Array.isArray(engagement.intake_data)) {
    return null;
  }
  const intake = engagement.intake_data as Record<string, unknown>;
  const preferences =
    intake.preferences && typeof intake.preferences === 'object' && !Array.isArray(intake.preferences)
      ? (intake.preferences as Record<string, unknown>)
      : {};
  const raw = preferences.risk_tolerance ?? intake.risk_tolerance;
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high') return s;
  return null;
}

function formatRiskProfileLabel(
  engagement: Record<string, unknown> | null,
  tasks: Record<string, unknown>[],
): string {
  const pref = readIntakeRiskTolerance(engagement);
  if (pref) return pref.charAt(0).toUpperCase() + pref.slice(1);
  const maxCons = maxConsequenceFromTasks(tasks);
  if (maxCons) return `Max task consequence: ${maxCons}`;
  return 'Not set';
}

function formatDomain(engagement: Record<string, unknown> | null): string {
  if (!engagement) return '—';
  const d = engagement.domain;
  return typeof d === 'string' && d.trim() ? d.trim() : '—';
}

interface F4_0_PreRunProps {
  onGeneratePodVariants: () => void;
  onBack?: () => void;
  onGoToF3?: () => void;
}

export function F4_0_PreRun({ onGeneratePodVariants, onBack, onGoToF3 }: F4_0_PreRunProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError, loadEngagement } =
    useEngagement(engagementIdFromUrl);

  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [redesignCount, setRedesignCount] = useState(0);

  const loadF3Pipeline = useCallback(async () => {
    if (!engagementIdFromUrl) {
      setPipelineError('Missing engagement');
      setRedesignCount(0);
      setPipelineLoading(false);
      return;
    }
    setPipelineLoading(true);
    setPipelineError(null);
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('f3_roles')
      .eq('engagement_id', engagementIdFromUrl)
      .maybeSingle();

    if (error) {
      setPipelineError(error.message);
      setRedesignCount(0);
      setPipelineLoading(false);
      return;
    }

    const bundle = normalizeF3Roles(data?.f3_roles);
    const redesignRows = dedupeLatestRedesignsByRole(bundle.redesigns as Record<string, unknown>[]);
    setRedesignCount(redesignRows.length);
    setPipelineLoading(false);
  }, [engagementIdFromUrl]);

  useEffect(() => {
    void loadF3Pipeline();
  }, [loadF3Pipeline]);

  const engagementRecord = engagement as Record<string, unknown> | null;
  const taskRows = useMemo(() => (Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : []), [tasks]);

  const pipelineReady = !pipelineLoading && !pipelineError && Boolean(engagementIdFromUrl);
  const needsF3Banner = pipelineReady && redesignCount === 0;
  const showContextBlocks = pipelineReady && redesignCount > 0;

  const riskLabel = useMemo(
    () => formatRiskProfileLabel(engagementRecord, taskRows),
    [engagementRecord, taskRows],
  );

  const domainLabel = useMemo(() => formatDomain(engagementRecord), [engagementRecord]);

  const error = engagementError ?? pipelineError;

  const canProceed = Boolean(showContextBlocks && !engagementLoading && !error);

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

        <div className="text-[13px] text-[#161916] mb-6">PODS</div>

        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Size pods for your redesigned roles</h1>

        <p className="text-[15px] text-[#494949] mb-8">
          Turn F3 role outputs into three pod-structure variants (conservative, balanced, aggressive), then pick one to
          carry into org rollup and economics.
        </p>

        {needsF3Banner && onGoToF3 ? (
          <div className="mb-6 bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <AlertTriangle className="w-5 h-5 text-[#FFAB28] shrink-0" />
              <span className="text-[14px] font-medium text-[#161916]">Generate roles in F3 first</span>
            </div>
            <button
              type="button"
              onClick={onGoToF3}
              className="h-9 px-4 shrink-0 bg-[#FFAB28] text-[#161916] text-[13px] font-semibold rounded-md hover:bg-[#FFAB28]/90"
            >
              Go to F3.0
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
                  onClick={() => void loadF3Pipeline()}
                  className="text-[13px] font-semibold text-[#FD4E59] underline"
                >
                  Retry F3 status
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showContextBlocks ? (
          <>
            <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
              <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                Engagement context
              </div>
              {engagementLoading ? (
                <div className="text-[14px] text-[#494949]">Loading engagement details…</div>
              ) : (
                <ul className="space-y-2 text-[14px] text-[#161916] leading-relaxed">
                  <li>
                    <span className="text-[#494949]">Total roles redesigned: </span>
                    <span className="font-medium">{redesignCount}</span>
                  </li>
                  <li>
                    <span className="text-[#494949]">Risk profile: </span>
                    <span className="font-medium">{riskLabel}</span>
                  </li>
                  <li>
                    <span className="text-[#494949]">Domain: </span>
                    <span className="font-medium">{domainLabel}</span>
                  </li>
                </ul>
              )}
            </div>

            <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-8">
              <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                What this will produce
              </div>
              <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#161916] leading-relaxed">
                <li>Three pod variants with different spans of control</li>
                <li>One recommended variant (Balanced by default)</li>
                <li>Editable constraint controls on the main screen</li>
                <li>A show-math drawer on each variant</li>
              </ul>
            </div>
          </>
        ) : null}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onGeneratePodVariants}
            disabled={!canProceed}
            className="h-12 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            Generate pod variants
          </button>
        </div>
      </div>
    </div>
  );
}
