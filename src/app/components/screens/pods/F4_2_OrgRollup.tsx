import { ChevronLeft, Calculator, Download, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { computePodCount, readEngagementVolumePerDay } from '../../../../lib/podSizing';
import { supabase } from '../../../../supabaseClient';

interface F4_2_OrgRollupProps {
  onBack: () => void;
  onShowMath: () => void;
  onProceedToF5?: () => void;
  /** When F4 selection is missing or invalid — return user to F4.1 */
  onRedirectToVariants?: () => void;
}

function parseF4Pods(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw) as unknown;
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

function fmtCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function formatDelta(delta: number, deltaPct: number): string {
  const d = Number.isFinite(delta) ? delta : 0;
  const ds = d >= 0 ? `+${Math.round(d)}` : `${Math.round(d)}`;
  const p = Number.isFinite(deltaPct) ? deltaPct : 0;
  const ps = p >= 0 ? `+${p.toFixed(1)}` : `${p.toFixed(1)}`;
  return `${ds} (${ps}%)`;
}

function deltaClass(delta: number, deltaPct: number): string {
  if (delta < 0) return 'text-[#548235]';
  if (delta <= 3 && deltaPct <= 3) return 'text-[#6D7069]';
  return 'text-[#161916]';
}

function PodAgentDots({ agents }: { agents: number }) {
  const n = Math.min(Math.max(Math.floor(agents), 1), 24);
  const cols = n <= 8 ? 4 : n <= 12 ? 6 : 4;
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, auto))` }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="w-1 h-1 bg-[#6D7069] rounded-full" />
      ))}
    </div>
  );
}

interface OrgPodsVisualProps {
  podCount: number;
  agentsPerPod: number;
}

function F4OrgRollupPodsVisual({ podCount, agentsPerPod }: OrgPodsVisualProps) {
  const n = Math.max(0, Math.floor(podCount));
  const agents = Math.max(0, Math.floor(agentsPerPod));

  const explicit = n > 5 ? 4 : n;
  const rest = n > 5 ? n - 4 : 0;

  return (
    <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-8 mb-6">
      <div className="flex flex-col items-center mb-8">
        <div className="w-[120px] h-12 bg-[#FD4E59] text-white rounded-lg flex items-center justify-center text-[16px] font-medium">
          Unit Head
        </div>
        <div className="w-px h-8 bg-[#6D7069]" />
        <div className="h-px w-[800px] max-w-full bg-[#6D7069]" />
      </div>

      <div className="flex items-start justify-center gap-4 mb-8 flex-wrap">
        {Array.from({ length: explicit }).map((_, idx) => {
          const podNum = idx + 1;
          return (
            <div key={podNum} className="relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-[#6D7069]" />
              <div className="w-[100px] h-20 bg-[#FFF0DC] border border-[#FD4E59] rounded-lg p-2 flex flex-col items-center justify-between">
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">POD {podNum}</div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-2 bg-[#FD4E59] rounded-sm mb-1" />
                  <PodAgentDots agents={agents} />
                </div>
                <div className="text-[12px] text-[#161916] text-center leading-tight">
                  TL + {agents} + s
                </div>
              </div>
            </div>
          );
        })}
        {n > 5 && rest > 0 ? (
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-[#6D7069]" />
            <div className="w-[100px] h-20 bg-[#FDF8F4] border border-[#6D7069] border-dashed rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[11px] text-[#6D7069] text-center leading-tight">
                POD 5–{n}
                <br />(+{rest} more)
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function F4_2_OrgRollup({ onBack, onShowMath, onProceedToF5, onRedirectToVariants }: F4_2_OrgRollupProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError } = useEngagement(engagementIdFromUrl);
  void tasks;

  const [f4Loading, setF4Loading] = useState(true);
  const [f4Error, setF4Error] = useState<string | null>(null);
  const [f4Pods, setF4Pods] = useState<Record<string, unknown> | null>(null);

  const [volumeMultiplier, setVolumeMultiplier] = useState(1);

  const loadF4Pods = useCallback(async () => {
    if (!engagementIdFromUrl) {
      setF4Error('Missing engagement');
      setF4Loading(false);
      return;
    }
    setF4Loading(true);
    setF4Error(null);
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('f4_pods')
      .eq('engagement_id', engagementIdFromUrl)
      .maybeSingle();

    if (error) {
      setF4Error(error.message);
      setF4Pods(null);
      setF4Loading(false);
      return;
    }

    setF4Pods(parseF4Pods(data?.f4_pods));
    setF4Loading(false);
  }, [engagementIdFromUrl]);

  useEffect(() => {
    void loadF4Pods();
  }, [loadF4Pods]);

  const engagementRecord = engagement as Record<string, unknown> | null;

  const selectedName = typeof f4Pods?.selected_variant_name === 'string' ? f4Pods.selected_variant_name.trim().toLowerCase() : '';
  const allVariants = Array.isArray(f4Pods?.all_variants) ? (f4Pods.all_variants as Record<string, unknown>[]) : [];

  const selectedVariant = useMemo(() => {
    if (!selectedName) return null;
    return allVariants.find((v) => String(v.variant_name ?? '').toLowerCase() === selectedName) ?? null;
  }, [allVariants, selectedName]);

  const orgRollup = selectedVariant?.org_rollup as Record<string, unknown> | undefined;
  const podComposition = selectedVariant?.pod_composition as Record<string, unknown> | undefined;

  const podCount = Math.max(0, Math.floor(Number(orgRollup?.pod_count) || 0));
  const agentsPerPod = Math.max(0, Math.floor(Number(podComposition?.agents_per_pod) || 0));
  const podCapacityPerDay = Math.max(0, Number(podComposition?.pod_capacity_per_day) || 0);

  const totalHeadcount = Number(orgRollup?.total_headcount) || 0;
  const todayHeadcount = Number(orgRollup?.today_headcount) || 0;
  const headcountDelta = Number(orgRollup?.headcount_delta) || 0;
  const headcountDeltaPct = Number(orgRollup?.headcount_delta_pct) || 0;

  const totalCentralQa = Number(orgRollup?.total_central_qa) || 0;
  const totalAiOps = Number(orgRollup?.total_ai_ops) || 0;
  const totalWfm = Number(orgRollup?.total_wfm) || 0;

  const baseVolume = useMemo(() => {
    const agentDemandVolume = Number(podComposition?.agent_demand_volume_per_day) || 0;
    return agentDemandVolume > 0 ? agentDemandVolume : readEngagementVolumePerDay(engagementRecord);
  }, [engagementRecord, podComposition]);

  const podCountsByMultiplier = useMemo(() => {
    const mults = [0.5, 1, 1.5, 2] as const;
    if (!Number.isFinite(baseVolume) || baseVolume <= 0 || podCapacityPerDay <= 0) {
      return { mults: [...mults], counts: mults.map(() => 0) };
    }
    const counts = mults.map((m) => computePodCount(baseVolume * m, podCapacityPerDay));
    return { mults: [...mults], counts };
  }, [baseVolume, podCapacityPerDay]);

  const todayPods = useMemo(() => {
    if (!Number.isFinite(baseVolume) || baseVolume <= 0 || podCapacityPerDay <= 0) return 0;
    return computePodCount(baseVolume, podCapacityPerDay);
  }, [baseVolume, podCapacityPerDay]);

  const podsAt15x = useMemo(() => {
    if (!Number.isFinite(baseVolume) || baseVolume <= 0 || podCapacityPerDay <= 0) return 0;
    return computePodCount(baseVolume * 1.5, podCapacityPerDay);
  }, [baseVolume, podCapacityPerDay]);

  const pctOnTrack = ((volumeMultiplier - 0.5) / (2 - 0.5)) * 100;
  const todayLabelLeft = ((1 - 0.5) / (2 - 0.5)) * 100;
  const plus50LabelLeft = ((1.5 - 0.5) / (2 - 0.5)) * 100;

  const variantChipLabel = selectedName ? `${selectedName.toUpperCase()} VARIANT` : '—';

  const loading = engagementLoading || f4Loading;
  const error = engagementError ?? f4Error;

  const hasValidSelection = Boolean(
    f4Pods && selectedName && selectedVariant && orgRollup && typeof orgRollup === 'object',
  );

  useEffect(() => {
    if (loading || error) return;
    if (!hasValidSelection) {
      onRedirectToVariants?.();
    }
  }, [loading, error, hasValidSelection, onRedirectToVariants]);

  if (loading) {
    return (
      <div className="p-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to variants
        </button>
        <div className="text-[14px] text-[#494949]">Loading org rollup…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to variants
        </button>
        <div className="text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          {error}
        </div>
      </div>
    );
  }

  if (!hasValidSelection) {
    return (
      <div className="p-10">
        <div className="text-[14px] text-[#494949]">Returning to variant selector…</div>
      </div>
    );
  }

  return (
    <div className="p-10">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to variants
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-[#161916]">Org rollup</h1>
          <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded-full h-7 flex items-center">
            {variantChipLabel}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onShowMath}
            className="h-9 px-4 text-[#494949] text-[13px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Show math
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="h-9 px-4 bg-[#FD4E59]/40 text-white text-[13px] font-semibold rounded-md cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export org chart
          </button>
        </div>
      </div>

      <F4OrgRollupPodsVisual podCount={podCount} agentsPerPod={agentsPerPod} />

      <div className="mb-6">
        <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
          Support Layer (shared across pods)
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Central QA', display: `×${fmtCount(totalCentralQa)}` },
            { name: 'AI Ops', display: `×${fmtCount(totalAiOps)}` },
            { name: 'SME', display: '× shared', isShared: true },
            { name: 'WFM', display: `×${fmtCount(totalWfm)}` },
          ].map((role) => (
            <div
              key={role.name}
              className="bg-white border border-[#494949]/12 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="w-6 h-6 rounded-full bg-[#FFAB28] mb-2" />
                <div className="text-[14px] font-medium text-[#161916]">{role.name}</div>
              </div>
              <div
                className={`text-[24px] font-bold text-[#161916] ${role.isShared ? 'text-[16px] italic' : ''}`}
              >
                {role.display}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-[#494949]/20 rounded-lg overflow-hidden mb-6">
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Total Headcount</div>
          <div className="text-[32px] font-bold text-[#161916]">{Math.round(totalHeadcount)}</div>
        </div>
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Today</div>
          <div className="text-[24px] font-bold text-[#6D7069]">{Math.round(todayHeadcount)}</div>
        </div>
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Delta</div>
          <div className={`text-[24px] font-bold ${deltaClass(headcountDelta, headcountDeltaPct)}`}>
            {formatDelta(headcountDelta, headcountDeltaPct)}
          </div>
        </div>
      </div>

      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
        <h2 className="text-[16px] font-bold text-[#161916] mb-2">Volume sensitivity</h2>
        <p className="text-[13px] text-[#6D7069] mb-6">Adjust target volume to see how the pod count scales.</p>

        <div className="relative mb-4">
          <div className="relative w-[800px] max-w-full mx-auto">
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={volumeMultiplier}
              onChange={(e) => setVolumeMultiplier(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#FFF0DC] rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FD4E59 0%, #FD4E59 ${pctOnTrack}%, #FFF0DC ${pctOnTrack}%, #FFF0DC 100%)`,
              }}
            />
            <div
              className="absolute -top-6 text-[13px] font-medium text-[#161916] whitespace-nowrap -translate-x-1/2"
              style={{ left: `${todayLabelLeft}%` }}
            >
              Today: {todayPods} pods
            </div>
            <div
              className="absolute -top-6 text-[13px] font-medium text-[#161916] whitespace-nowrap -translate-x-1/2"
              style={{ left: `${plus50LabelLeft}%` }}
            >
              +50%: {podsAt15x} pods
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[13px] text-[#6D7069] w-[800px] max-w-full mx-auto">
          {podCountsByMultiplier.mults.map((m, i) => (
            <span key={m}>
              {m === 1 ? `${m}x (today)` : `${m}x`} | {podCountsByMultiplier.counts[i]} pods
            </span>
          ))}
        </div>
      </div>

      {onProceedToF5 && (
        <div className="pt-6 border-t border-[#494949]/12">
          <button
            type="button"
            onClick={onProceedToF5}
            className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            Proceed to Economics
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
