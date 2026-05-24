import { Settings, ArrowRight, TrendingUp, Check, Sparkles, Info, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PipelineReRunButton } from '../../PipelineReRunButton';
import { useEngagement } from '../../../../hooks/useEngagement';
import { formatBillingModelForDisplay } from '../../../../lib/intakePhaseADisplay';
import { normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { runFullEconomics } from '../../../../lib/economicsEngine';
import {
  buildF5EconomicsPayload,
  deterministicJsonEqual,
  f5IntakePreferencesSignature,
  mergePreferencesForF5Economics,
  readIntakePreferences,
  persistPipelineColumn,
  stableStringify,
} from '../../../../lib/pipelineDeterministicRefresh';
import { supabase } from '../../../../supabaseClient';

interface F5_1_EconomicsDashboardProps {
  onEditAssumptions: () => void;
  onBack?: () => void;
  onProceedToF6?: () => void;
  onMissingF4Selection?: () => void;
  onReRun?: () => void | Promise<void>;
  /** Opens F1 guided intake at Preferences (step 7) for billing model. */
  onGoToF1Preferences?: () => void;
  refreshKey?: number;
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseF4Pods(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function selectedVariantFromF4Pods(f4Pods: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!f4Pods) return null;
  const selected = typeof f4Pods.selected_variant_name === 'string' ? f4Pods.selected_variant_name.trim().toLowerCase() : '';
  const all = Array.isArray(f4Pods.all_variants) ? f4Pods.all_variants : [];
  if (!selected) return null;
  const found = all.find((row) => String(asObj(row).variant_name ?? '').trim().toLowerCase() === selected);
  return found ? asObj(found) : null;
}

function fmtCurrency(value: number, compact = true): string {
  if (!Number.isFinite(value)) return '$0';
  if (compact && Math.abs(value) >= 1000) return `$${Math.round(value / 1000).toLocaleString('en-US')}k`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function fmtCurrency2(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return `$${value.toFixed(2)}`;
}

function fmtPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(digits)}%`;
}

function fmtDelta(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1)}${suffix}`;
}

function roleHc(result: Record<string, unknown>, role: string): number {
  const rows = Array.isArray(result.role_breakdown) ? result.role_breakdown : [];
  const target = role.toLowerCase();
  const found = rows.find((r) => String(asObj(r).role ?? '').toLowerCase() === target);
  return toNum(asObj(found).headcount);
}

function frontlineHc(result: Record<string, unknown>): number {
  const rows = Array.isArray(result.role_breakdown) ? result.role_breakdown : [];
  const exact = roleHc(result, 'Agent');
  if (exact > 0) return exact;
  return toNum(asObj(rows[0]).headcount);
}

function capacityPerFteLabel(currentState: Record<string, unknown>, futureState: Record<string, unknown>): string {
  const currentItems = toNum(currentState.items_per_day);
  const currentHc = frontlineHc(currentState) || toNum(currentState.headcount_total);
  const futureHc = frontlineHc(futureState) || toNum(futureState.headcount_total);
  const currentRatio = currentHc > 0 ? currentItems / currentHc : 0;
  const futureRatio = futureHc > 0 ? currentItems / futureHc : 0;
  const pct = currentRatio > 0 ? ((futureRatio - currentRatio) / currentRatio) * 100 : 0;
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(0)}%`;
}

function readScaleTarget(engagement: Record<string, unknown> | null): number | null {
  const raw = engagement?.intake_data;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const intake = raw as Record<string, unknown>;
  const prefs = asObj(intake.preferences);
  const eng = asObj(intake.engagement);
  const goals = asObj(eng.goals);
  for (const candidate of [prefs.scale_target, intake.scale_target, goals.scale_target, eng.scale_target]) {
    const n = toNum(candidate);
    if (n > 0) return n;
  }
  return null;
}

function deltaColorClass(value: number, positiveIsGood: boolean): string {
  if (value === 0 || !Number.isFinite(value)) return 'text-[#6D7069]';
  const good = positiveIsGood ? value > 0 : value < 0;
  return good ? 'text-[#548235]' : 'text-[#FD4E59]';
}

function chartPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
}

function areaPath(points: { x: number; y: number; value: number }[], zeroY: number, positive: boolean): string {
  const filtered = points.filter((p) => (positive ? p.value >= 0 : p.value < 0));
  if (filtered.length === 0) return '';
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  return `${chartPath(filtered)} L ${last.x},${zeroY} L ${first.x},${zeroY} Z`;
}

function SensitivityBar({ driver }: { driver: Record<string, unknown> }) {
  const low = toNum(driver.low_pct);
  const base = toNum(driver.base_pct);
  const high = toNum(driver.high_pct);
  const min = Math.min(low, base, high);
  const max = Math.max(low, base, high);
  const pos = max > min ? ((base - min) / (max - min)) * 100 : 50;

  return (
    <div className="flex items-center gap-4">
      <div className="w-[200px] text-[14px] font-medium text-[#161916]">{String(driver.name ?? 'Driver')}</div>
      <div className="flex-1 relative">
        <div className="flex items-center justify-between text-[12px] text-[#6D7069] mb-2">
          <span>{fmtPct(low)}</span>
          <span>{fmtPct(high)}</span>
        </div>
        <div className="h-2 bg-[#FFF0DC] rounded-full relative">
          <div className="absolute inset-0 bg-[#FD4E59] rounded-full opacity-90" />
          <div
            className="absolute w-4 h-4 bg-[#FD4E59] border-2 border-white rounded-full shadow-md"
            style={{ left: `calc(${pos}% - 8px)`, top: '-4px' }}
          />
        </div>
        <div className="mt-2 relative h-6">
          <div
            className="absolute -translate-x-1/2 px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded whitespace-nowrap"
            style={{ left: `${pos}%` }}
          >
            BASE: {fmtPct(base)}
          </div>
        </div>
      </div>
      <div className="w-[60px] flex justify-center">
        <Info className="w-4 h-4 text-[#6D7069] cursor-help" />
      </div>
    </div>
  );
}

function SavingsCurveChart({ curve, paybackMonth }: { curve: Record<string, unknown>[]; paybackMonth: number }) {
  const width = 1100;
  const height = 280;
  const left = 60;
  const right = 40;
  const top = 28;
  const bottom = 35;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const values = curve.map((row) => toNum(row.cumulative_net));
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const pad = Math.max(1, (rawMax - rawMin) * 0.12);
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const yFor = (v: number) => top + ((maxV - v) / Math.max(1, maxV - minV)) * plotH;
  const xFor = (month: number) => left + ((month - 1) / 17) * plotW;
  const zeroY = yFor(0);
  const points = curve.map((row) => {
    const month = Math.max(1, Math.min(18, Math.round(toNum(row.month))));
    const value = paybackMonth === month ? 0 : toNum(row.cumulative_net);
    return { x: xFor(month), y: yFor(value), value, month };
  });
  const paybackX = paybackMonth > 0 ? xFor(paybackMonth) : null;

  return (
    <div className="relative h-[280px]">
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={left} y1={top} x2={width - right} y2={top} stroke="#6D7069" strokeWidth="0.5" opacity="0.2" />
        <line x1={left} y1={zeroY} x2={width - right} y2={zeroY} stroke="#6D7069" strokeWidth="1" strokeDasharray="4,4" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#6D7069" strokeWidth="0.5" opacity="0.2" />
        <text x={left - 12} y={zeroY + 4} fontSize="12" fill="#6D7069" textAnchor="end">$0</text>
        <text x={left - 12} y={height - bottom + 4} fontSize="12" fill="#6D7069" textAnchor="end">
          {fmtCurrency(minV, true)}
        </text>
        {[1, 3, 6, 9, 12, 15, 18].map((m) => (
          <text key={m} x={xFor(m)} y={height - 8} fontSize="12" fill="#6D7069" textAnchor="middle">
            M{m}
          </text>
        ))}
        <path d={areaPath(points, zeroY, false)} fill="#FCE4D6" opacity="0.3" />
        <path d={areaPath(points, zeroY, true)} fill="#E2EFDA" opacity="0.3" />
        <path d={chartPath(points)} fill="none" stroke="#FD4E59" strokeWidth="2.5" />
        {paybackX != null ? (
          <>
            <line x1={paybackX} y1={top} x2={paybackX} y2={height - bottom} stroke="#FFAB28" strokeWidth="1.5" strokeDasharray="4,4" />
            <rect x={Math.max(left, Math.min(width - right - 140, paybackX - 70))} y="5" width="140" height="24" fill="#FFF0DC" rx="4" />
            <text x={Math.max(left + 70, Math.min(width - right - 70, paybackX))} y="21" fontSize="11" fill="#FFAB28" fontWeight="600" textAnchor="middle">
              PAYBACK: M{paybackMonth}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}

export function F5_1_EconomicsDashboard({
  onEditAssumptions,
  onBack,
  onProceedToF6,
  onMissingF4Selection,
  onReRun,
  onGoToF1Preferences,
  refreshKey = 0,
}: F5_1_EconomicsDashboardProps) {
  void onBack;
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading: engagementLoading, error: engagementError, loadEngagement } = useEngagement(engagementIdFromUrl);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [f3Roles, setF3Roles] = useState<Record<string, unknown>[]>([]);
  const [f4Pods, setF4Pods] = useState<Record<string, unknown> | null>(null);
  const [assumptionsUsed, setAssumptionsUsed] = useState<Record<string, unknown>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasSavedEconomics, setHasSavedEconomics] = useState(false);
  const [cachedF5Payload, setCachedF5Payload] = useState<Record<string, unknown> | null>(null);
  const [sensitivityNarrative, setSensitivityNarrative] = useState('');
  const [narrativePending, setNarrativePending] = useState(false);
  const narrativeFetchedRef = useRef(false);
  const forceRecomputeRef = useRef(false);
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
      .select('id, f3_roles, f4_pods, f5_economics')
      .eq('engagement_id', engagementIdFromUrl)
      .maybeSingle();

    if (error) {
      setPipelineError(error.message);
      setPipelineId(null);
      setF3Roles([]);
      setF4Pods(null);
      setPipelineLoading(false);
      return;
    }

    setPipelineId(typeof data?.id === 'string' ? data.id : null);
    setF3Roles(normalizeF3Roles(data?.f3_roles).redesigns as Record<string, unknown>[]);
    setF4Pods(parseF4Pods(data?.f4_pods));
    const savedEconomics = asObj(data?.f5_economics);
    const hasSaved = Boolean(savedEconomics.economics_result);
    setCachedF5Payload(hasSaved ? savedEconomics : null);
    setAssumptionsUsed(hasSaved ? asObj(savedEconomics.assumptions_used) : {});
    setHasSavedEconomics(hasSaved);
    const cachedNarrative =
      typeof savedEconomics.sensitivity_narrative === 'string' ? savedEconomics.sensitivity_narrative : '';
    setSensitivityNarrative(cachedNarrative);
    narrativeFetchedRef.current = Boolean(cachedNarrative.trim());
    setPipelineLoading(false);
  }, [engagementIdFromUrl, refreshKey]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  useEffect(() => {
    if (!engagementIdFromUrl || refreshKey === 0) return;
    forceRecomputeRef.current = true;
    setCachedF5Payload(null);
    setAssumptionsUsed({});
    setHasSavedEconomics(false);
    narrativeFetchedRef.current = false;
    setSensitivityNarrative('');
    void (async () => {
      await loadEngagement(engagementIdFromUrl);
      await loadPipeline();
    })();
  }, [engagementIdFromUrl, refreshKey, loadEngagement, loadPipeline]);

  useEffect(() => {
    if (!engagementIdFromUrl) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadEngagement(engagementIdFromUrl);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [engagementIdFromUrl, loadEngagement]);

  const selectedVariant = useMemo(() => selectedVariantFromF4Pods(f4Pods), [f4Pods]);
  const selectedVariantName = typeof f4Pods?.selected_variant_name === 'string' ? f4Pods.selected_variant_name : '';

  useEffect(() => {
    if (pipelineLoading || pipelineError) return;
    if (!selectedVariant) {
      onMissingF4Selection?.();
    }
  }, [pipelineLoading, pipelineError, selectedVariant, onMissingF4Selection]);

  const intakePreferences = useMemo(
    () => readIntakePreferences(engagement as Record<string, unknown> | null),
    [engagement],
  );

  const intakeSignature = useMemo(
    () => f5IntakePreferencesSignature(engagement as Record<string, unknown> | null),
    [engagement],
  );

  const intakeChangedSinceLastSave = useMemo(() => {
    const cachedSig =
      typeof cachedF5Payload?.intake_signature_at_compute === 'string'
        ? cachedF5Payload.intake_signature_at_compute
        : null;
    return Boolean(cachedSig && intakeSignature && cachedSig !== intakeSignature);
  }, [cachedF5Payload, intakeSignature]);

  /** Billing model and other intake-owned fields always from live F1 intake_data.preferences. */
  const preferences = useMemo(
    () =>
      mergePreferencesForF5Economics(
        engagement as Record<string, unknown> | null,
        assumptionsUsed,
      ),
    [engagement, assumptionsUsed],
  );

  useEffect(() => {
    const cachedSig =
      typeof cachedF5Payload?.intake_signature_at_compute === 'string'
        ? cachedF5Payload.intake_signature_at_compute
        : null;
    if (cachedSig && intakeSignature && cachedSig !== intakeSignature) {
      forceRecomputeRef.current = true;
      narrativeFetchedRef.current = false;
      setSensitivityNarrative('');
    }
  }, [cachedF5Payload, intakeSignature]);

  const economicsResult = useMemo(() => {
    if (!engagement || !selectedVariant || engagementLoading || pipelineLoading) return null;
    return runFullEconomics(
      engagement as Record<string, unknown>,
      Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : [],
      selectedVariant,
      f3Roles,
      preferences,
    ) as Record<string, unknown>;
  }, [engagement, tasks, selectedVariant, f3Roles, preferences, engagementLoading, pipelineLoading]);

  const displayEconomics = economicsResult;

  const freshDeterministicSignature = useMemo(
    () => (economicsResult ? stableStringify(economicsResult) : ''),
    [economicsResult],
  );

  useEffect(() => {
    if (!economicsResult || !engagementIdFromUrl || pipelineLoading || engagementLoading) return;
    let cancelled = false;

    const forceRecompute = forceRecomputeRef.current;
    const cachedDeterministic = forceRecompute ? null : (cachedF5Payload?.economics_result ?? null);
    const deterministicChanged =
      forceRecompute || !deterministicJsonEqual(cachedDeterministic, economicsResult);

    if (!deterministicChanged) return;

    const payload = buildF5EconomicsPayload(
      forceRecompute ? null : cachedF5Payload,
      economicsResult,
      preferences,
      selectedVariantName,
      sensitivityNarrative,
      intakeSignature,
    );

    (async () => {
      setSaveError(null);
      const result = await persistPipelineColumn(engagementIdFromUrl, 'f5_economics', payload);
      if (cancelled) return;
      if (!result.ok) {
        setSaveError(result.error ?? 'Failed to save economics');
        return;
      }
      if (result.pipelineId) setPipelineId(result.pipelineId);
      setCachedF5Payload(payload);
      setHasSavedEconomics(true);
      forceRecomputeRef.current = false;
      console.log('[F5] Recomputed with new inputs — cache refreshed');
    })();

    return () => {
      cancelled = true;
    };
  }, [
    freshDeterministicSignature,
    economicsResult,
    engagementIdFromUrl,
    pipelineLoading,
    engagementLoading,
    preferences,
    intakeSignature,
    selectedVariantName,
    sensitivityNarrative,
    cachedF5Payload,
    refreshKey,
  ]);

  useEffect(() => {
    if (!economicsResult || !engagementIdFromUrl || pipelineLoading) return;
    if (narrativeFetchedRef.current) return;

    const sensitivityData = economicsResult.sensitivity;
    let cancelled = false;
    setNarrativePending(true);
    setSensitivityNarrative('Generating analysis...');

    (async () => {
      try {
        const res = await fetch('/api/generate-sensitivity-narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engagementId: engagementIdFromUrl,
            sensitivityData,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { narrative?: string };
        if (cancelled) return;
        const text =
          res.ok && typeof body.narrative === 'string' && body.narrative.trim()
            ? body.narrative.trim()
            : 'Sensitivity analysis could not be generated, but the range bars show the key drivers and modeled savings ranges.';
        setSensitivityNarrative(text);
        narrativeFetchedRef.current = true;

        const payload = buildF5EconomicsPayload(
          cachedF5Payload,
          economicsResult,
          preferences,
          selectedVariantName,
          text,
          intakeSignature,
        );
        const saveResult = await persistPipelineColumn(engagementIdFromUrl, 'f5_economics', payload);
        if (!cancelled && saveResult.ok) {
          setCachedF5Payload(payload);
          if (saveResult.pipelineId) setPipelineId(saveResult.pipelineId);
        }
      } catch {
        if (!cancelled) {
          setSensitivityNarrative(
            'Sensitivity analysis could not be generated, but the range bars show the key drivers and modeled savings ranges.',
          );
        }
      } finally {
        if (!cancelled) setNarrativePending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    economicsResult,
    engagementIdFromUrl,
    pipelineLoading,
    preferences,
    intakeSignature,
    selectedVariantName,
    cachedF5Payload,
  ]);

  const loading = engagementLoading || pipelineLoading;
  const error = engagementError ?? pipelineError;

  const currentState = asObj(displayEconomics?.current_state);
  const futureState = asObj(displayEconomics?.future_state);
  const savings = asObj(displayEconomics?.savings);
  const curve = Array.isArray(displayEconomics?.savings_curve)
    ? (displayEconomics.savings_curve as Record<string, unknown>[])
    : [];
  const sensitivity = asObj(displayEconomics?.sensitivity);
  const drivers = Array.isArray(sensitivity.drivers) ? (sensitivity.drivers as Record<string, unknown>[]) : [];
  const paybackMonth = Math.floor(toNum(displayEconomics?.payback_month));

  const genpactView = asObj(displayEconomics?.genpact_view);
  const billingRecommendation = asObj(displayEconomics?.billing_model_recommendation);
  const billingTypeLabel = String(asObj(intakePreferences.billing_model).type ?? '');

  const monthlySavingsPct = toNum(savings.monthly_savings_pct);
  const revenueCurrent = toNum(genpactView.revenue_current);
  const revenueFuture = toNum(genpactView.revenue_future);
  const revenueDeltaPct = toNum(genpactView.revenue_delta_pct);
  const costDeliverCurrent = toNum(genpactView.cost_to_deliver_current);
  const costDeliverFuture = toNum(genpactView.cost_to_deliver_future);
  const costDeltaPct = toNum(genpactView.cost_delta_pct);
  const grossMarginCurrent = toNum(genpactView.gross_margin_pct_current);
  const grossMarginFuture = toNum(genpactView.gross_margin_pct_future);
  const grossMarginDeltaPp = toNum(genpactView.gross_margin_delta_pp);
  const genpactHcCurrent = toNum(genpactView.headcount_current);
  const genpactHcFuture = toNum(genpactView.headcount_future);
  const genpactHcDelta = genpactHcFuture - genpactHcCurrent;
  const genpactHcDeltaPct = toNum(genpactView.headcount_delta_pct);
  const billingModelDisplay = String(genpactView.billing_model_display ?? 'Not specified');
  const genpactNarrative = String(genpactView.narrative ?? '');
  const showGainshareWarning =
    (billingTypeLabel === 'fte_based' || billingTypeLabel === 'hourly') && revenueDeltaPct < -10;

  const costPerItemReduction = toNum(savings.cost_per_item_reduction_pct);
  const itemsPerDay = toNum(currentState.items_per_day);
  const agentToday = frontlineHc(currentState);
  const agentFuture = frontlineHc(futureState);
  const qualityText = `95% target met`;
  const capacityLabel = capacityPerFteLabel(currentState, futureState);
  const scaleTarget = readScaleTarget(engagement as Record<string, unknown> | null);
  const capacityScaleLabel =
    scaleTarget != null && scaleTarget > 0 ? `1x → ${scaleTarget}x` : capacityLabel;

  if (loading) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[13px] text-[#161916] mb-6">ECONOMICS</div>
        <div className="text-[14px] text-[#494949]">Loading economics…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[13px] text-[#161916] mb-6">ECONOMICS</div>
        <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">{error}</div>
        <PipelineReRunButton feature="f5" onConfirmRerun={() => onReRun?.()} />
      </div>
    );
  }

  if (!displayEconomics || !selectedVariant) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[13px] text-[#161916] mb-6">ECONOMICS</div>
        <div className="text-[14px] text-[#494949]">Redirecting to F4 variant selection…</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Illustrative watermark - diagonal repeating text */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 200px,
            rgba(255, 171, 40, 0.05) 200px,
            rgba(255, 171, 40, 0.05) 400px
          )`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='600' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='0' y='50' font-family='Funnel Sans' font-size='48' fill='rgba(255,171,40,0.05)' transform='rotate(-45 300 100)'%3EILLUSTRATIVE%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="p-10 max-w-[1204px] mx-auto relative z-10">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[13px] text-[#161916]">ECONOMICS</div>
          <div className="flex items-center gap-2">
            <PipelineReRunButton feature="f5" onConfirmRerun={() => onReRun?.()} />
            <button type="button" className="h-9 px-3 border border-[#494949]/30 text-[#494949] rounded-md hover:bg-[#494949]/5">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title Row with ILLUSTRATIVE chip */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-[24px] font-bold text-[#161916]">Projected economics</h1>
            <div className="h-7 px-4 border-[1.5px] border-dashed border-[#FFAB28] rounded-full flex items-center">
              <span className="text-[12px] font-medium text-[#FFAB28] uppercase tracking-wider">
                ILLUSTRATIVE
              </span>
            </div>
          </div>
          <p className="text-[13px] text-[#6D7069]">
            All values are indicative. Adjust assumptions in the panel to explore alternatives.
          </p>
          <p className="text-[13px] text-[#494949] mt-2">
            Billing from intake:{' '}
            {formatBillingModelForDisplay(intakePreferences.billing_model) ?? 'not specified'}
          </p>
        </div>

        {intakeChangedSinceLastSave ? (
          <div className="mb-6 bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-[#FFAB28] shrink-0" />
              <span className="text-[14px] text-[#161916]">
                F1 intake changed since this economics run was saved. Numbers below are recalculated — click Re-run to
                refresh the saved snapshot and sensitivity narrative.
              </span>
            </div>
            {onReRun ? (
              <button
                type="button"
                onClick={() => void onReRun()}
                className="h-9 px-4 shrink-0 bg-[#FFAB28] text-[#161916] text-[13px] font-semibold rounded-md hover:bg-[#FFAB28]/90"
              >
                Re-run
              </button>
            ) : null}
          </div>
        ) : null}

        {saveError ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
            Economics computed, but saving to pipeline_runs.f5_economics failed: {saveError}
          </div>
        ) : null}

        {/* Genpact financials — primary stat tiles */}
        <div className="mb-4">
          <h2 className="text-[16px] font-bold text-[#161916] mb-1">GENPACT FINANCIALS</h2>
          <p className="text-[13px] text-[#6D7069]">
            Under {billingModelDisplay}, this engagement projects:
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Revenue from client
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtCurrency(revenueCurrent)}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtCurrency(revenueFuture)}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${deltaColorClass(revenueDeltaPct, true)}`}>
              {fmtDelta(revenueDeltaPct, '%')}
            </div>
            <div className="text-[12px] text-[#6D7069]">{billingModelDisplay}</div>
          </div>

          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Cost to deliver
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtCurrency(costDeliverCurrent)}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtCurrency(costDeliverFuture)}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${deltaColorClass(costDeltaPct, false)}`}>
              {fmtDelta(costDeltaPct, '%')}
            </div>
            <div className="text-[12px] text-[#6D7069]">Labor + overhead, fully loaded</div>
          </div>

          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Gross margin
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtPct(grossMarginCurrent, 0)}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtPct(grossMarginFuture, 0)}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${deltaColorClass(grossMarginDeltaPp, true)}`}>
              {fmtDelta(grossMarginDeltaPp, ' pp')}
            </div>
            <div className="text-[12px] text-[#6D7069]">Revenue minus cost</div>
          </div>

          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Headcount deployed
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{Math.round(genpactHcCurrent)}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{Math.round(genpactHcFuture)}</span>
            </div>
            <div className="text-[18px] font-bold text-[#6D7069] mb-1">
              {fmtDelta(genpactHcDelta)} ({fmtDelta(genpactHcDeltaPct, '%')})
            </div>
            <div className="text-[12px] text-[#6D7069]">Operational FTE</div>
          </div>
        </div>

        {billingRecommendation.recommended_type ? (
          <div className="bg-[#FFF8ED] border border-[#FFAB28]/35 border-l-[3px] border-l-[#FFAB28] rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-[15px] font-bold text-[#161916]">Recommended billing model</h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF0DC] text-[#6D7069] border border-[#161916]/10">
                Advisory
              </span>
            </div>
            <p className="text-[14px] text-[#161916] leading-relaxed mb-2">
              <span className="font-semibold">{String(billingRecommendation.recommended_label ?? '')}</span>
              {' · '}
              {String(billingRecommendation.rationale ?? '')}
            </p>
            {genpactNarrative ? (
              <p className="text-[13px] text-[#494949] leading-relaxed mb-2">{genpactNarrative}</p>
            ) : null}
            {showGainshareWarning ? (
              <div className="inline-flex items-start gap-2 rounded-md border border-[#FFAB28]/50 bg-[#FFF0DC] px-3 py-2 text-[12px] text-[#494949] max-w-full">
                <AlertTriangle className="w-4 h-4 text-[#FFAB28] shrink-0 mt-0.5" aria-hidden />
                <span>Consider proposing gainshare/hybrid pricing to align incentives when billable units shrink.</span>
              </div>
            ) : null}
            {onGoToF1Preferences ? (
              <button
                type="button"
                onClick={onGoToF1Preferences}
                className="mt-3 text-[13px] font-medium text-[#FD4E59] underline hover:text-[#FD4E59]/80"
              >
                Change billing model in F1
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#E2EFDA] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-[#548235]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#161916] mb-1">Quality projection: {qualityText}</div>
              <div className="inline-block px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                Target Met
              </div>
            </div>
          </div>

          <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FCE4D6] rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#FD4E59]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#161916] mb-1">Capacity per FTE: {capacityLabel}</div>
              <div className="inline-block px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Agent FTE {Math.round(agentToday)} → {Math.round(agentFuture)}
              </div>
            </div>
          </div>
        </div>

        {/* Cumulative Savings Chart */}
        <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-bold text-[#161916]">Cumulative savings over time</h2>
            <div className="flex items-center gap-4 text-[12px] text-[#6D7069]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#FD4E59]" />
                <span>Cumulative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-[#FFAB28]" />
                <span>Payback</span>
              </div>
            </div>
          </div>

          <SavingsCurveChart curve={curve} paybackMonth={paybackMonth} />
        </div>

        {/* Client-facing narrative (proposal metrics) */}
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-[16px] font-bold text-[#161916]">What we tell the client</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-[#6D7069] border border-[#161916]/10">
              Client-facing
            </span>
          </div>
          <p className="text-[13px] text-[#6D7069] mb-5">
            These are the metrics the client cares about. Use these in the proposal narrative.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/70 border border-[#161916]/8 rounded-lg p-4">
              <div className="text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                Cost reduction for client
              </div>
              <div className={`text-[24px] font-bold ${monthlySavingsPct > 0 ? 'text-[#548235]' : 'text-[#161916]'}`}>
                {fmtPct(monthlySavingsPct, 0)}
              </div>
              <div className="text-[12px] text-[#6D7069] mt-1">
                {fmtCurrency(toNum(currentState.monthly_cost_usd))} → {fmtCurrency(toNum(futureState.monthly_cost_usd))} / mo
              </div>
            </div>
            {itemsPerDay > 0 ? (
              <div className="bg-white/70 border border-[#161916]/8 rounded-lg p-4">
                <div className="text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                  Cost per item
                </div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[14px] font-medium text-[#6D7069]">{fmtCurrency2(toNum(currentState.cost_per_item))}</span>
                  <span className="text-[12px] text-[#6D7069]">→</span>
                  <span className="text-[18px] font-bold text-[#161916]">{fmtCurrency2(toNum(futureState.cost_per_item))}</span>
                </div>
                <div className={`text-[14px] font-bold ${costPerItemReduction > 0 ? 'text-[#548235]' : 'text-[#6D7069]'}`}>
                  {fmtDelta(-costPerItemReduction, '%')}
                </div>
              </div>
            ) : null}
            <div className="bg-white/70 border border-[#161916]/8 rounded-lg p-4">
              <div className="text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                Quality
              </div>
              <div className="text-[16px] font-bold text-[#161916] mb-1">Current → {qualityText}</div>
              <div className="inline-block px-2 py-0.5 bg-[#E2EFDA] text-[#548235] text-[10px] font-semibold uppercase tracking-wide rounded">
                Target met
              </div>
            </div>
            <div className="bg-white/70 border border-[#161916]/8 rounded-lg p-4">
              <div className="text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                Capacity
              </div>
              <div className="text-[20px] font-bold text-[#161916] mb-1">{capacityScaleLabel}</div>
              <div className="text-[12px] text-[#6D7069]">Agent FTE {Math.round(agentToday)} → {Math.round(agentFuture)}</div>
            </div>
          </div>
        </div>

        {/* Sensitivity Panel */}
        <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[16px] font-bold text-[#161916]">Sensitivity — top 3 drivers</h2>
            <span className="text-[12px] text-[#6D7069]">{drivers.length} modeled drivers</span>
          </div>
          <p className="text-[13px] text-[#6D7069] mb-4">
            How much do the savings change if each assumption is off?
          </p>

          <div className="space-y-4">
            {drivers.map((driver, idx) => (
              <SensitivityBar key={`${String(driver.name ?? 'driver')}-${idx}`} driver={driver} />
            ))}
          </div>
        </div>

        {/* Sensitivity Narrative Callout */}
        <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-5 mb-6 flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-[#FFAB28] flex-shrink-0 mt-0.5" />
          <p className="text-[14px] text-[#161916] leading-relaxed">
            {narrativePending ? 'Generating analysis...' : sensitivityNarrative}
          </p>
        </div>

        {/* Footer Action Row */}
        <div className="flex justify-end items-center gap-4">
          <button
            type="button"
            onClick={onEditAssumptions}
            className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            Edit assumptions
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onProceedToF6}
            disabled={!hasSavedEconomics}
            title={!hasSavedEconomics ? 'Compute economics first.' : undefined}
            className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            Proceed to Timeline
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
