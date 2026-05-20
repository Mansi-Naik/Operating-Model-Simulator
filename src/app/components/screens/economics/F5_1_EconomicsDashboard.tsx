import { Settings, ArrowRight, TrendingUp, Check, Sparkles, Info, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PipelineReRunButton } from '../../PipelineReRunButton';
import { useEngagement } from '../../../../hooks/useEngagement';
import { normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { runFullEconomics } from '../../../../lib/economicsEngine';
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

function sensitivityRangeLabel(basePct: number): string {
  if (!Number.isFinite(basePct)) return 'Range: n/a';
  return `Range: ${fmtPct(basePct - 5)}–${fmtPct(basePct + 5)}`;
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
  const [savedEconomicsSnapshot, setSavedEconomicsSnapshot] = useState<Record<string, unknown> | null>(
    null,
  );
  const [sensitivityNarrative, setSensitivityNarrative] = useState('Generating analysis...');
  const [narrativePending, setNarrativePending] = useState(false);
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
    setAssumptionsUsed(asObj(savedEconomics.assumptions_used));
    const hasSaved = Boolean(savedEconomics.economics_result);
    setHasSavedEconomics(hasSaved);
    if (hasSaved) {
      setSavedEconomicsSnapshot(asObj(savedEconomics.economics_result));
    } else {
      setSavedEconomicsSnapshot(null);
    }
    setPipelineLoading(false);
  }, [engagementIdFromUrl, refreshKey]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const selectedVariant = useMemo(() => selectedVariantFromF4Pods(f4Pods), [f4Pods]);
  const selectedVariantName = typeof f4Pods?.selected_variant_name === 'string' ? f4Pods.selected_variant_name : '';

  useEffect(() => {
    if (pipelineLoading || pipelineError) return;
    if (!selectedVariant) {
      onMissingF4Selection?.();
    }
  }, [pipelineLoading, pipelineError, selectedVariant, onMissingF4Selection]);

  const preferences = useMemo(
    () => ({
      ...asObj(asObj((engagement as Record<string, unknown> | null)?.intake_data).preferences),
      ...assumptionsUsed,
    }),
    [engagement, assumptionsUsed],
  );

  const economicsResult = useMemo(() => {
    if (!engagement || !selectedVariant) return null;
    return runFullEconomics(
      engagement as Record<string, unknown>,
      Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : [],
      selectedVariant,
      f3Roles,
      preferences,
    ) as Record<string, unknown>;
  }, [engagement, tasks, selectedVariant, f3Roles, preferences]);

  const displayEconomics = useMemo(() => {
    if (savedEconomicsSnapshot && hasSavedEconomics) {
      return savedEconomicsSnapshot;
    }
    return economicsResult;
  }, [savedEconomicsSnapshot, hasSavedEconomics, economicsResult]);

  const economicsSignature = useMemo(
    () =>
      economicsResult
        ? JSON.stringify({ selectedVariantName, assumptionsUsed, economicsResult })
        : '',
    [economicsResult, selectedVariantName, assumptionsUsed],
  );
  const sensitivitySignature = useMemo(
    () => (economicsResult ? JSON.stringify(economicsResult.sensitivity ?? {}) : ''),
    [economicsResult],
  );

  useEffect(() => {
    if (!economicsResult || !engagementIdFromUrl) return;
    let cancelled = false;
    const payload = {
      selected_variant_at_compute: selectedVariantName,
      assumptions_used: assumptionsUsed,
      economics_result: economicsResult,
      computed_at: new Date().toISOString(),
    };

    (async () => {
      setSaveError(null);
      if (pipelineId) {
        const { error } = await supabase.from('pipeline_runs').update({ f5_economics: payload }).eq('id', pipelineId);
        if (!cancelled && error) setSaveError(error.message);
        if (!cancelled && !error) setHasSavedEconomics(true);
        return;
      }
      const { error } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementIdFromUrl,
        f5_economics: payload,
      });
      if (!cancelled && error) setSaveError(error.message);
      if (!cancelled && !error) setHasSavedEconomics(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [economicsSignature, economicsResult, selectedVariantName, pipelineId, engagementIdFromUrl]);

  useEffect(() => {
    if (!economicsResult || !engagementIdFromUrl) return;
    const sensitivityData = economicsResult.sensitivity;
    let cancelled = false;
    setSensitivityNarrative('Generating analysis...');
    setNarrativePending(true);

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
        setSensitivityNarrative(
          res.ok && typeof body.narrative === 'string' && body.narrative.trim()
            ? body.narrative.trim()
            : 'Sensitivity analysis could not be generated, but the range bars show the key drivers and modeled savings ranges.',
        );
      } catch {
        if (!cancelled) {
          setSensitivityNarrative('Sensitivity analysis could not be generated, but the range bars show the key drivers and modeled savings ranges.');
        }
      } finally {
        if (!cancelled) setNarrativePending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sensitivitySignature, engagementIdFromUrl]);

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

  const genpact = asObj(displayEconomics?.genpact_revenue_impact);
  const genpactApplicable = genpact.applicable === true;
  const billingTypeLabel = String(genpact.billing_model_type ?? '');

  const monthlySavingsPct = toNum(savings.monthly_savings_pct);
  const monthlyCostDelta = toNum(futureState.monthly_cost_usd) - toNum(currentState.monthly_cost_usd);
  const monthlyCostDeltaPct =
    toNum(currentState.monthly_cost_usd) > 0
      ? (monthlyCostDelta / toNum(currentState.monthly_cost_usd)) * 100
      : 0;
  const revenueDeltaPct = genpactApplicable ? toNum(genpact.revenue_delta_pct) : 0;
  const grossMarginCurrent = genpactApplicable ? toNum(genpact.gross_margin_pct_current) : 0;
  const grossMarginFuture = genpactApplicable ? toNum(genpact.gross_margin_pct_future) : 0;
  const grossMarginDeltaPp = grossMarginFuture - grossMarginCurrent;
  const showGainshareWarning =
    genpactApplicable &&
    (billingTypeLabel === 'fte_based' || billingTypeLabel === 'hourly') &&
    revenueDeltaPct < -10;
  const costPerItemReduction = toNum(savings.cost_per_item_reduction_pct);
  const overheadDeltaPp = toNum(futureState.supervisor_overhead_pct) - toNum(currentState.supervisor_overhead_pct);
  const agentToday = frontlineHc(currentState);
  const agentFuture = frontlineHc(futureState);
  const qualityText = `95% target met`;
  const capacityLabel = capacityPerFteLabel(currentState, futureState);

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
        </div>

        {saveError ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
            Economics computed, but saving to pipeline_runs.f5_economics failed: {saveError}
          </div>
        ) : null}

        {/* Primary Stat Tiles */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Tile 1 - Monthly Cost */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Monthly Cost
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtCurrency(toNum(currentState.monthly_cost_usd))}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtCurrency(toNum(futureState.monthly_cost_usd))}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${monthlyCostDelta < 0 ? 'text-[#548235]' : 'text-[#161916]'}`}>
              {fmtDelta(monthlySavingsPct * -1, '%')}
            </div>
            <div className="text-[12px] italic text-[#6D7069] mb-3">{sensitivityRangeLabel(monthlySavingsPct)}</div>
            {/* Sparkline */}
            <div className="h-6 bg-[#FDF8F4] rounded-full overflow-hidden relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                <path
                  d="M 0,8 Q 25,6 40,10 T 70,12 T 100,16"
                  fill="none"
                  stroke="#FD4E59"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Tile 2 - Cost Per Item */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Cost Per Item
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtCurrency2(toNum(currentState.cost_per_item))}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtCurrency2(toNum(futureState.cost_per_item))}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${costPerItemReduction > 0 ? 'text-[#548235]' : 'text-[#161916]'}`}>
              {fmtDelta(costPerItemReduction * -1, '%')}
            </div>
            <div className="text-[12px] italic text-[#6D7069]">{sensitivityRangeLabel(costPerItemReduction)}</div>
          </div>

          {/* Tile 3 - Headcount */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Headcount
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{Math.round(toNum(currentState.headcount_total))}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{Math.round(toNum(futureState.headcount_total))}</span>
            </div>
            <div className="text-[18px] font-bold text-[#6D7069] mb-1">
              {fmtDelta(toNum(savings.headcount_delta))} ({fmtDelta(toNum(savings.headcount_delta_pct), '%')})
            </div>
            <div className="text-[12px] text-[#6D7069]">Net change after redesign</div>
          </div>

          {/* Tile 4 - Supervisor Overhead */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Supervisor Overhead
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">{fmtPct(toNum(currentState.supervisor_overhead_pct))}</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">{fmtPct(toNum(futureState.supervisor_overhead_pct))}</span>
            </div>
            <div className={`text-[18px] font-bold mb-1 ${overheadDeltaPp < 0 ? 'text-[#548235]' : 'text-[#161916]'}`}>
              {fmtDelta(overheadDeltaPp, 'pp')}
            </div>
            <div className="text-[12px] text-[#6D7069]">% of total cost</div>
          </div>
        </div>

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

        {/* Genpact Revenue Impact (internal) */}
        <div className="bg-[#FFF8ED] border border-[#FFAB28]/35 border-l-[3px] border-l-[#FFAB28] rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[16px] font-bold text-[#161916]">Genpact Revenue Impact</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF0DC] text-[#6D7069] border border-[#161916]/10">
              Internal
            </span>
          </div>

          {!genpactApplicable ? (
            <div className="flex flex-wrap items-center gap-2 text-[14px] text-[#494949]">
              <span>
                {typeof genpact.message === 'string' && genpact.message.trim()
                  ? genpact.message
                  : 'Add billing model in F1 Preferences to see Genpact-side impact.'}
              </span>
              {onGoToF1Preferences ? (
                <button
                  type="button"
                  onClick={onGoToF1Preferences}
                  className="text-[13px] font-medium text-[#FD4E59] underline hover:text-[#FD4E59]/80"
                >
                  Go to F1
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/80 border border-[#161916]/8 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                    Monthly revenue
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[16px] font-medium text-[#6D7069]">
                      {fmtCurrency(toNum(genpact.monthly_revenue_current), false)}
                    </span>
                    <span className="text-[13px] text-[#6D7069]">→</span>
                    <span className="text-[22px] font-bold text-[#161916]">
                      {fmtCurrency(toNum(genpact.monthly_revenue_future), false)}
                    </span>
                  </div>
                  <div
                    className={`text-[16px] font-bold mb-1 ${
                      revenueDeltaPct > 0 ? 'text-[#548235]' : revenueDeltaPct < 0 ? 'text-[#FD4E59]' : 'text-[#6D7069]'
                    }`}
                  >
                    {fmtDelta(revenueDeltaPct, '%')}
                  </div>
                  <div className="text-[12px] text-[#6D7069]">
                    Under {billingTypeLabel.replace(/_/g, ' ')} model
                  </div>
                </div>
                <div className="bg-white/80 border border-[#161916]/8 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                    Monthly cost
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[16px] font-medium text-[#6D7069]">
                      {fmtCurrency(toNum(currentState.monthly_cost_usd), false)}
                    </span>
                    <span className="text-[13px] text-[#6D7069]">→</span>
                    <span className="text-[22px] font-bold text-[#161916]">
                      {fmtCurrency(toNum(futureState.monthly_cost_usd), false)}
                    </span>
                  </div>
                  <div
                    className={`text-[16px] font-bold mb-1 ${
                      monthlyCostDeltaPct < 0 ? 'text-[#548235]' : monthlyCostDeltaPct > 0 ? 'text-[#FD4E59]' : 'text-[#6D7069]'
                    }`}
                  >
                    {fmtDelta(monthlyCostDeltaPct, '%')}
                  </div>
                  <div className="text-[12px] text-[#6D7069]">Operating cost (model)</div>
                </div>
                <div className="bg-white/80 border border-[#161916]/8 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                    Gross margin
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[16px] font-medium text-[#6D7069]">{fmtPct(grossMarginCurrent, 1)}</span>
                    <span className="text-[13px] text-[#6D7069]">→</span>
                    <span className="text-[22px] font-bold text-[#161916]">{fmtPct(grossMarginFuture, 1)}</span>
                  </div>
                  <div
                    className={`text-[16px] font-bold mb-1 ${
                      grossMarginDeltaPp > 0 ? 'text-[#548235]' : grossMarginDeltaPp < 0 ? 'text-[#FD4E59]' : 'text-[#6D7069]'
                    }`}
                  >
                    {fmtDelta(grossMarginDeltaPp, ' pp')}
                  </div>
                  <div className="text-[12px] text-[#6D7069]">vs modeled monthly cost</div>
                </div>
              </div>
              <p className="text-[14px] text-[#161916] leading-relaxed mb-3">{String(genpact.narrative ?? '')}</p>
              {showGainshareWarning ? (
                <div className="inline-flex items-start gap-2 rounded-md border border-[#FFAB28]/50 bg-[#FFF0DC] px-3 py-2 text-[12px] text-[#494949] max-w-full">
                  <AlertTriangle className="w-4 h-4 text-[#FFAB28] shrink-0 mt-0.5" aria-hidden />
                  <span>
                    Consider proposing gainshare/hybrid pricing to client to align incentives
                  </span>
                </div>
              ) : null}
            </>
          )}
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
