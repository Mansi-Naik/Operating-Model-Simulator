import { Settings, Star, Check, ArrowRight, Calculator } from 'lucide-react';
import { PipelineReRunButton } from '../../PipelineReRunButton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import {
  generateThreeVariants,
  getF4SpanDefaultsFromEngagement,
  getOperationalRiskProfileFromIntakeRisk,
  getSpanCapacityForIntakeRisk,
} from '../../../../lib/podSizing';
import { supabase } from '../../../../supabaseClient';

type RiskProfile = 'low' | 'medium' | 'high';
type VariantKey = 'conservative' | 'balanced' | 'aggressive';
type RiskChip = 'LOW' | 'MED' | 'MED-HIGH';

interface F4_1_VariantSelectorProps {
  onViewOrgRollup: () => void;
  onShowMath: () => void;
  message?: string | null;
  onReRunToPreRun?: () => void | Promise<void>;
}

function variantKeyToRiskChip(key: string): RiskChip {
  if (key === 'conservative') return 'LOW';
  if (key === 'aggressive') return 'MED-HIGH';
  return 'MED';
}

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function formatCostIndex(n: number): string {
  if (!Number.isFinite(n)) return '1.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

function agentsGridLayout(agentCount: number): { perRow: number; rows: number } {
  const n = Math.max(0, Math.floor(agentCount));
  if (n <= 0) return { perRow: 1, rows: 1 };
  if (n <= 8) return { perRow: n, rows: 1 };
  if (n <= 12) return { perRow: 6, rows: Math.ceil(n / 6) };
  return { perRow: 9, rows: Math.ceil(n / 9) };
}

function fmtSupport(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

interface PodVisualProps {
  agents: number;
  support: { qa: number; auditor: number; sme: number };
}

function F4PodVisual({ agents, support }: PodVisualProps) {
  const { perRow, rows } = agentsGridLayout(agents);

  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-8 bg-[#FD4E59] text-white rounded flex items-center justify-center text-[14px] font-medium">
        TL
      </div>
      <div className="h-4" />
      <div className="w-0.5 h-4 bg-[#6D7069]" />
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {Array.from({
                length: Math.min(perRow, agents - rowIdx * perRow),
              }).map((_, colIdx) => (
                <div key={colIdx} className="w-5 h-6 bg-[#FDF8F4] border border-[#6D7069] rounded" />
              ))}
            </div>
          ))}
        </div>
        <span className="text-[14px] font-medium text-[#161916]">{agents}</span>
      </div>
      <div className="h-4" />
      <div className="flex items-center gap-2">
        <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
          {fmtSupport(support.qa)} QA
        </div>
        <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
          {fmtSupport(support.auditor)} AI Aud
        </div>
        <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
          {fmtSupport(support.sme)} SME
        </div>
      </div>
    </div>
  );
}

async function persistF4PodsSelection(
  engagementId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: row, error: selErr } = await supabase
    .from('pipeline_runs')
    .select('id')
    .eq('engagement_id', engagementId)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  if (row?.id) {
    const { error } = await supabase.from('pipeline_runs').update({ f4_pods: payload }).eq('id', row.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error: insErr } = await supabase.from('pipeline_runs').insert({
    engagement_id: engagementId,
    f4_pods: payload,
  });
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}

export function F4_1_VariantSelector({ onViewOrgRollup, onShowMath, message, onReRunToPreRun }: F4_1_VariantSelectorProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError, loadEngagement } =
    useEngagement(engagementIdFromUrl);

  const [pipelineLoaded, setPipelineLoaded] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [riskProfile, setRiskProfile] = useState<RiskProfile>('medium');
  const [targetSpan, setTargetSpan] = useState<number>(15);
  const [maxPodSize, setMaxPodSize] = useState<number>(20);
  const [mustInclude] = useState<string[]>(['TL', 'QA Officer']);
  const [sharedSupport] = useState<string[]>(['SME', 'AI Ops']);

  const [constraintsHydrated, setConstraintsHydrated] = useState(false);

  const [selectedVariantName, setSelectedVariantName] = useState<VariantKey | null>(null);
  const [persistOk, setPersistOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSelection, setSavingSelection] = useState(false);

  const [narrativeByKey, setNarrativeByKey] = useState<Record<string, string>>({});
  const [narrativePending, setNarrativePending] = useState<Record<string, boolean>>({});

  const narrativeFetchGen = useRef(0);

  useEffect(() => {
    if (!engagement || constraintsHydrated) return;
    const { intake_risk_tolerance, span } = getF4SpanDefaultsFromEngagement(engagement as Record<string, unknown>);
    setRiskProfile(intake_risk_tolerance);
    setTargetSpan(span.recommended);
    setMaxPodSize(20);
    setConstraintsHydrated(true);
  }, [engagement, constraintsHydrated]);

  useEffect(() => {
    if (!engagementIdFromUrl) {
      setPipelineError('Missing engagement');
      setPipelineLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { error } = await supabase.from('pipeline_runs').select('id, f3_roles').eq('engagement_id', engagementIdFromUrl).maybeSingle();
      if (cancelled) return;
      if (error) setPipelineError(error.message);
      setPipelineLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl]);

  const engagementRecord = engagement as Record<string, unknown> | null;
  const taskRows = useMemo(() => (Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : []), [tasks]);

  const sizingVariants = useMemo(() => {
    if (!engagementRecord) return [];
    return generateThreeVariants(engagementRecord, taskRows, {
      overrideConstraints: {
        risk_profile: riskProfile,
        target_span: targetSpan,
        max_pod_size: maxPodSize,
      },
    }) as Record<string, unknown>[];
  }, [engagementRecord, taskRows, riskProfile, targetSpan, maxPodSize]);

  const variantSignature = useMemo(() => JSON.stringify(sizingVariants), [sizingVariants]);

  useEffect(() => {
    if (!engagementIdFromUrl || sizingVariants.length !== 3) return;

    const gen = ++narrativeFetchGen.current;
    const keys: VariantKey[] = ['conservative', 'balanced', 'aggressive'];

    setNarrativePending({ conservative: true, balanced: true, aggressive: true });
    setNarrativeByKey({});

    for (const key of keys) {
      const variantData = sizingVariants.find(
        (v) => String((v as Record<string, unknown>).variant_name ?? '').toLowerCase() === key,
      ) as Record<string, unknown> | undefined;

      if (!variantData) {
        setNarrativeByKey((prev) => ({ ...prev, [key]: 'Industry-typical configuration' }));
        setNarrativePending((prev) => ({ ...prev, [key]: false }));
        continue;
      }

      void (async () => {
        try {
          const res = await fetch('/api/generate-variant-narrative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              engagementId: engagementIdFromUrl,
              variantName: key,
              variantData,
            }),
          });
          const body = (await res.json().catch(() => ({}))) as { narrative?: string; error?: string };
          if (narrativeFetchGen.current !== gen) return;
          if (!res.ok || typeof body.narrative !== 'string' || !body.narrative.trim()) {
            setNarrativeByKey((prev) => ({ ...prev, [key]: 'Industry-typical configuration' }));
          } else {
            const text = body.narrative.trim();
            setNarrativeByKey((prev) => ({ ...prev, [key]: text }));
          }
        } catch {
          if (narrativeFetchGen.current !== gen) return;
          setNarrativeByKey((prev) => ({ ...prev, [key]: 'Industry-typical configuration' }));
        } finally {
          if (narrativeFetchGen.current !== gen) return;
          setNarrativePending((prev) => ({ ...prev, [key]: false }));
        }
      })();
    }
  }, [variantSignature, engagementIdFromUrl]);

  const constraintsHydratedRef = useRef(false);
  useEffect(() => {
    if (!constraintsHydrated) return;
    if (!constraintsHydratedRef.current) {
      constraintsHydratedRef.current = true;
      return;
    }
    setSelectedVariantName(null);
    setPersistOk(false);
  }, [riskProfile, targetSpan, maxPodSize, constraintsHydrated]);

  const handleRiskChange = (next: RiskProfile) => {
    setRiskProfile(next);
    const span = getSpanCapacityForIntakeRisk(next);
    setTargetSpan(span.recommended);
  };

  const getRiskChip = (risk: string) => {
    const configs = {
      LOW: { bg: '#E2EFDA', text: '#548235' },
      MED: { bg: '#FFF0DC', text: '#FFAB28' },
      'MED-HIGH': { bg: '#FCE4D6', text: '#FD4E59' },
    };
    const config = configs[risk as keyof typeof configs];
    return (
      <div
        className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide inline-block"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {risk}
      </div>
    );
  };

  const loading = engagementLoading || !pipelineLoaded;
  const error = engagementError ?? pipelineError;

  const canViewOrgRollup = persistOk && selectedVariantName != null && !savingSelection;

  const handleSelectVariant = async (key: VariantKey) => {
    setSelectedVariantName(key);
    setPersistOk(false);
    setSaveError(null);
    if (!engagementIdFromUrl) {
      setSaveError('Missing engagement id');
      return;
    }

    const constraintsSnapshot = {
      risk_profile: getOperationalRiskProfileFromIntakeRisk(riskProfile),
      intake_risk_tolerance: riskProfile,
      target_span: targetSpan,
      max_pod_size: maxPodSize,
      must_include: mustInclude,
      shared_support: sharedSupport,
    };

    const allVariants = sizingVariants.map((raw) => {
      const v = raw as Record<string, unknown>;
      const name = String(v.variant_name ?? '').toLowerCase();
      const narrative =
        typeof narrativeByKey[name] === 'string' && narrativeByKey[name]
          ? narrativeByKey[name]
          : 'Industry-typical configuration';
      return { ...v, narrative };
    });

    const payload = {
      selected_variant_name: key,
      all_variants: allVariants,
      constraints_used: constraintsSnapshot,
      selected_at: new Date().toISOString(),
    };

    setSavingSelection(true);
    const result = await persistF4PodsSelection(engagementIdFromUrl, payload);
    setSavingSelection(false);
    if (!result.ok) {
      setSaveError(result.error ?? 'Save failed');
      setPersistOk(false);
    } else {
      setPersistOk(true);
    }
  };

  return (
    <div className="p-8 max-w-[1204px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="text-[13px] text-[#161916]">PODS</div>
        <div className="flex items-center gap-2">
          {onReRunToPreRun ? <PipelineReRunButton feature="f4" onConfirmRerun={onReRunToPreRun} /> : null}
          <button
            type="button"
            className="h-9 px-3 border border-[#494949]/30 text-[#494949] rounded-md hover:bg-[#494949]/5"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916]">Pod structure</h1>
        <p className="text-[13px] text-[#6D7069]">
          AI-synthesized team shape and span of control. Adjust constraints to explore variants.
        </p>
      </div>

      {message ? (
        <div className="mb-6 bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 text-[14px] font-medium text-[#161916]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          {error}
        </div>
      ) : null}
      {saveError ? (
        <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          {saveError}
        </div>
      ) : null}

      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
        <div className="flex items-end gap-6 flex-wrap">
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Risk profile</label>
            <select
              className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] min-w-[120px]"
              value={riskProfile}
              onChange={(e) => handleRiskChange(e.target.value as RiskProfile)}
            >
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Target span</label>
            <input
              type="number"
              min={1}
              max={99}
              value={targetSpan}
              onChange={(e) => setTargetSpan(Number(e.target.value) || 0)}
              className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] w-[100px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Max pod size</label>
            <input
              type="number"
              min={1}
              max={99}
              value={maxPodSize}
              onChange={(e) => setMaxPodSize(Number(e.target.value) || 0)}
              className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] w-[100px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Must include</label>
            <div className="flex items-center gap-2 h-9">
              {mustInclude.map((label) => (
                <div
                  key={label}
                  className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Shared support</label>
            <div className="flex items-center gap-2 h-9">
              {sharedSupport.map((label) => (
                <div
                  key={label}
                  className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {loading || sizingVariants.length !== 3
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-[#FDF8F4] rounded-xl p-6 border border-[#494949]/12 flex items-center justify-center"
                style={{ height: '480px' }}
              >
                <span className="text-[14px] text-[#494949]">Loading variants…</span>
              </div>
            ))
          : sizingVariants.map((raw) => {
              const v = raw as Record<string, unknown>;
              const key = String(v.variant_name ?? '').toLowerCase() as VariantKey;
              const pod = (v.pod_composition as Record<string, unknown>) ?? {};
              const agents = Math.max(0, Math.floor(Number(pod.agents_per_pod) || 0));
              const qa = Number(pod.qa_per_pod) || 0;
              const auditor = Number(pod.ai_auditor_per_pod) || 0;
              const sme = Number(pod.sme_per_pod) || 0;
              const cap = Number(pod.pod_capacity_per_day) || 0;
              const costIdx = Number(v.cost_index) || 0;
              const isRecommended = Boolean(v.is_recommended);
              const isSelected = selectedVariantName === key;
              const riskChip = variantKeyToRiskChip(key);
              const narrativeText = narrativeByKey[key];
              const narrativeLoading = Boolean(narrativePending[key]);
              const narrativeDisplay = narrativeLoading
                ? 'Loading recommendation...'
                : narrativeText || 'Industry-typical configuration';

              return (
                <div
                  key={key}
                  className={`bg-[#FDF8F4] rounded-xl p-6 relative flex flex-col ${
                    isSelected ? 'border-2 border-[#FD4E59]' : 'border border-[#494949]/12'
                  }`}
                  style={{ height: '480px' }}
                >
                  {isRecommended && (
                    <div className="absolute top-6 right-6 w-8 h-8 bg-[#FD4E59] rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}

                  <h3 className="text-[16px] font-bold text-[#161916] uppercase tracking-wide mb-4">
                    {String(v.display_name ?? key).toUpperCase()}
                  </h3>

                  <div className="mb-4" style={{ height: '200px' }}>
                    <F4PodVisual agents={agents} support={{ qa, auditor, sme }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Span</div>
                      <div className="text-[18px] font-bold text-[#161916]">{`1:${agents}`}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Capacity/Day</div>
                      <div className="text-[18px] font-bold text-[#161916]">{formatInt(cap)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Cost Index</div>
                      <div className="text-[18px] font-bold text-[#161916]">{formatCostIndex(costIdx)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Risk</div>
                      <div>{getRiskChip(riskChip)}</div>
                    </div>
                  </div>

                  <p
                    className="text-[13px] italic text-[#494949] mb-4 leading-relaxed overflow-hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {narrativeDisplay}
                  </p>

                  <div className="mt-auto">
                    <button
                      type="button"
                      onClick={() => void handleSelectVariant(key)}
                      className={`w-full h-10 rounded-md text-[14px] font-semibold flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-[#FD4E59] text-white'
                          : 'border-[1.5px] border-[#FD4E59] text-[#FD4E59] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      <div className="flex items-center justify-between pt-8">
        <button
          type="button"
          onClick={onShowMath}
          className="h-11 px-6 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Show math
        </button>
        <button
          type="button"
          disabled={!canViewOrgRollup}
          onClick={() => canViewOrgRollup && onViewOrgRollup()}
          className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          View org rollup
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
