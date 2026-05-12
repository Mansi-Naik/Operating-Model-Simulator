import { X, Copy, Link2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeSpanCapacity } from '../../../../lib/podSizing';
import { supabase } from '../../../../supabaseClient';

interface F4_3_ShowMathDrawerProps {
  onClose: () => void;
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

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtVol(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtDec(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '0';
  const m = 10 ** digits;
  return (Math.round(n * m) / m).toString();
}

const SPAN_LOOKUP_ROWS: { operational: 'low' | 'medium' | 'high'; line: string }[] = [
  { operational: 'low', line: 'low operational risk → span 1:18 to 1:25 (recommended 1:22)' },
  { operational: 'medium', line: 'medium operational risk → span 1:12 to 1:18 (recommended 1:15)' },
  { operational: 'high', line: 'high operational risk → span 1:8 to 1:12 (recommended 1:10)' },
];

function buildMathPlaintext(ctx: {
  variantTitle: string;
  agents: Record<string, unknown>;
  qa: Record<string, unknown>;
  spanOp: string;
  intakeRisk: string;
  recSpan: number;
  pod: Record<string, unknown>;
  inputs: { label: string; value: string }[];
}): string {
  const ai = ctx.agents;
  const qi = ctx.qa;
  const pi = ctx.pod;
  const lines = [
    ctx.variantTitle,
    '',
    '1. POD COMPOSITION',
    'Agents per pod = min(target_span, max_pod_size, derived_from_volume)',
    `= min(${ai.target_span}, ${ai.max_pod_size}, ${fmtDec(toNum(ai.derived_from_volume), 4)})`,
    `→ ${Math.floor(toNum(ai.agents_per_pod))} agents`,
    '',
    '2. QA SAMPLING MATH',
    `= (${fmtDec(toNum(qi.audits_per_day), 2)} audits × ${toNum(qi.audit_minutes)} min) / (6.5 hrs × 60 min)`,
    `= ${fmtDec(toNum(qi.raw_fte), 4)} FTE → ${fmtDec(toNum(qi.rounded_fte), 2)} QA`,
    '',
    '3. SPAN OF CONTROL',
    `Operational band used: ${ctx.spanOp}; intake risk shown: ${ctx.intakeRisk}`,
    `Recommended span 1:${ctx.recSpan}`,
    '',
    '4. POD COUNT',
    `= ${fmtVol(toNum(pi.total_volume))} / ${fmtDec(toNum(pi.pod_capacity), 2)} = ${fmtDec(toNum(pi.raw_count), 2)} → ceil = ${Math.floor(toNum(pi.final_count))}`,
    '',
    '5. INPUTS USED',
    ...ctx.inputs.map((r) => `${r.label}: ${r.value}`),
  ];
  return lines.join('\n');
}

function F1Link() {
  return <Link2 className="w-3.5 h-3.5 text-[#6D7069] shrink-0" aria-hidden title="Sourced from intake" />;
}

export function F4_3_ShowMathDrawer({ onClose }: F4_3_ShowMathDrawerProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [f4Pods, setF4Pods] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!engagementIdFromUrl) {
      setError('Missing engagement id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: supaErr } = await supabase
        .from('pipeline_runs')
        .select('f4_pods')
        .eq('engagement_id', engagementIdFromUrl)
        .maybeSingle();
      if (cancelled) return;
      if (supaErr) {
        setError(supaErr.message);
        setF4Pods(null);
      } else {
        setF4Pods(parseF4Pods(data?.f4_pods));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl]);

  const selectedName =
    typeof f4Pods?.selected_variant_name === 'string' ? f4Pods.selected_variant_name.trim().toLowerCase() : '';
  const allVariants = Array.isArray(f4Pods?.all_variants) ? (f4Pods.all_variants as Record<string, unknown>[]) : [];
  const constraintsUsed =
    f4Pods?.constraints_used && typeof f4Pods.constraints_used === 'object' && !Array.isArray(f4Pods.constraints_used)
      ? (f4Pods.constraints_used as Record<string, unknown>)
      : {};

  const selectedVariant = useMemo(() => {
    if (!selectedName) return null;
    return allVariants.find((v) => String(v.variant_name ?? '').toLowerCase() === selectedName) ?? null;
  }, [allVariants, selectedName]);

  const podComposition =
    selectedVariant?.pod_composition && typeof selectedVariant.pod_composition === 'object'
      ? (selectedVariant.pod_composition as Record<string, unknown>)
      : null;

  const trace =
    podComposition?.calculation_trace && typeof podComposition.calculation_trace === 'object'
      ? (podComposition.calculation_trace as Record<string, unknown>)
      : null;

  const agentsIn = (trace?.agents_inputs as Record<string, unknown>) ?? {};
  const qaIn = (trace?.qa_inputs as Record<string, unknown>) ?? {};
  const podIn = (trace?.pod_count_inputs as Record<string, unknown>) ?? {};
  const spanUsed = (trace?.span_lookup_used as Record<string, unknown>) ?? {};
  const recRange = spanUsed.recommended_range as Record<string, unknown> | undefined;

  const operationalRisk =
    typeof spanUsed.risk_profile === 'string' ? spanUsed.risk_profile.trim().toLowerCase() : 'medium';
  const opKey: 'low' | 'medium' | 'high' =
    operationalRisk === 'low' || operationalRisk === 'high' ? operationalRisk : 'medium';

  const intakeRiskRaw = constraintsUsed.risk_profile;
  const intakeRisk =
    typeof intakeRiskRaw === 'string' ? intakeRiskRaw.trim().toLowerCase() : operationalRisk;
  const intakeLabel = (intakeRisk || 'medium').toUpperCase();

  const recommendedN = Math.floor(toNum(recRange?.recommended) || computeSpanCapacity(opKey).recommended);

  const variantTitle =
    typeof selectedVariant?.display_name === 'string' && selectedVariant.display_name.trim()
      ? `Show math — ${selectedVariant.display_name}`
      : 'Show math';

  const volumePerDay = toNum(podIn.total_volume);
  const agentsPerPod = Math.floor(
    toNum(podComposition?.agents_per_pod) || toNum(qaIn.agents_per_pod),
  );
  const targetSpan = toNum(agentsIn.target_span);
  const maxPodSize = toNum(agentsIn.max_pod_size);
  const derivedFromVol = toNum(agentsIn.derived_from_volume);

  const auditsPerDay = toNum(qaIn.audits_per_day);
  const auditMinutes = toNum(qaIn.audit_minutes) || 6;
  const samplingPct = toNum(qaIn.sampling_rate_pct);
  const rawFte = toNum(qaIn.raw_fte);
  const roundedFte = toNum(qaIn.rounded_fte);

  const podCapacity = toNum(podIn.pod_capacity);
  const rawCount = toNum(podIn.raw_count);
  const finalCount = Math.floor(toNum(podIn.final_count));

  const itemsPerAgent = toNum(agentsIn.items_per_agent_per_day);

  const inputsRows = useMemo(
    () => [
      { label: 'Volume / day', value: `${fmtVol(volumePerDay)}`, f1: true },
      { label: 'Risk profile', value: intakeLabel, f1: true },
      { label: 'QA sampling rate', value: `${fmtDec(samplingPct, 2)}%`, f1: true },
      { label: 'Items per agent', value: `~${Math.round(itemsPerAgent)}/day`, f1: false },
      { label: 'Coaching capacity (TL)', value: '6.5 hrs/wk per agent (default)', f1: false },
    ],
    [volumePerDay, intakeLabel, samplingPct, itemsPerAgent],
  );

  const copyText = useMemo(() => {
    if (!trace || !selectedVariant) return '';
    return buildMathPlaintext({
      variantTitle: variantTitle.replace(/^Show math — /, ''),
      agents: {
        target_span: targetSpan,
        max_pod_size: maxPodSize,
        derived_from_volume: derivedFromVol,
        agents_per_pod: agentsPerPod,
      },
      qa: qaIn,
      spanOp: opKey,
      intakeRisk: intakeLabel,
      recSpan: recommendedN,
      pod: podIn,
      inputs: inputsRows.map((r) => ({ label: r.label, value: r.value })),
    });
  }, [
    trace,
    selectedVariant,
    variantTitle,
    targetSpan,
    maxPodSize,
    derivedFromVol,
    agentsPerPod,
    qaIn,
    opKey,
    intakeLabel,
    recommendedN,
    podIn,
    inputsRows,
  ]);

  const handleCopy = useCallback(async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      /* optional */
    }
  }, [copyText]);

  const missingData = !loading && !error && (!f4Pods || !selectedVariant || !trace);

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-[#494949]/12 shadow-2xl flex flex-col z-50">
      <div className="px-6 py-4 border-b border-[#494949]/12">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-[20px] font-bold text-[#161916] pr-4">{variantTitle}</h2>
          <button type="button" onClick={onClose} className="text-[#6D7069] hover:text-[#161916] shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[13px] text-[#494949]">
          Every calculation that produced this pod structure, traceable back to your inputs.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-[14px] text-[#494949]">Loading math…</div>
        ) : error ? (
          <div className="text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">{error}</div>
        ) : missingData ? (
          <div className="text-[14px] text-[#494949]">
            No saved variant math found. Select a variant in F4.1 and save, then open Show math again.
          </div>
        ) : (
          <>
            {/* 1. POD COMPOSITION */}
            <div>
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
                1. POD COMPOSITION
              </div>
              <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
                <div className="text-[13px] font-medium text-[#161916]">Agents per pod</div>
                <div className="text-[12px] font-mono text-[#494949] leading-relaxed">
                  Agents per pod = min(target_span, max_pod_size, derived_from_volume)
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  = min({fmtDec(targetSpan, 2)}, {fmtDec(maxPodSize, 2)}, {fmtDec(derivedFromVol, 4)})
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  → <span className="font-bold text-[#FD4E59]">{agentsPerPod} agents</span>
                </div>
                <div className="text-[12px] italic text-[#494949] leading-relaxed">
                  ↳ Driven by your engagement volume of {fmtVol(volumePerDay)} items/day and TL coaching capacity
                  assumptions.
                </div>
              </div>
            </div>

            {/* 2. QA SAMPLING */}
            <div>
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
                2. QA SAMPLING MATH
              </div>
              <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
                <div className="text-[12px] font-mono text-[#494949] leading-relaxed">
                  QA per pod = (audits/day × time per audit) / QA capacity
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  = ({fmtDec(auditsPerDay, 2)} audits × {auditMinutes} min) / (6.5 hrs × 60 min)
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  = {fmtDec(rawFte, 4)} FTE →{' '}
                  <span className="font-bold text-[#FD4E59]">{fmtDec(roundedFte, 2)} QA</span>
                </div>
                <div className="text-[12px] italic text-[#494949] leading-relaxed">
                  ↳ Sampling rate {fmtDec(samplingPct, 2)}% from your KPI sheet × {agentsPerPod} agents.
                </div>
              </div>
            </div>

            {/* 3. SPAN OF CONTROL */}
            <div>
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
                3. SPAN OF CONTROL DERIVATION
              </div>
              <div className="bg-[#FDF8F4] rounded-lg p-4">
                <div className="text-[13px] font-medium text-[#161916] mb-3">Risk profile lookup:</div>
                <div className="space-y-1 text-[12px] font-mono">
                  {SPAN_LOOKUP_ROWS.map((row) => {
                    const active = row.operational === opKey;
                    return (
                      <div
                        key={row.operational}
                        className={
                          active
                            ? 'bg-[#FFF0DC] border-l-2 border-[#FFAB28] px-2 py-1 text-[#161916] font-medium'
                            : 'text-[#494949] px-2 py-1'
                        }
                      >
                        {row.line}
                      </div>
                    );
                  })}
                </div>
                <div className="text-[12px] italic text-[#494949] mt-3 leading-relaxed">
                  Your risk profile is {intakeLabel} → recommended span 1:{recommendedN}
                </div>
              </div>
            </div>

            {/* 4. POD COUNT */}
            <div>
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
                4. POD COUNT
              </div>
              <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
                <div className="text-[12px] font-mono text-[#494949] leading-relaxed">
                  Pods needed = total volume / pod capacity
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  = {fmtVol(volumePerDay)} items/day / {fmtDec(podCapacity, 2)} items/day per pod
                </div>
                <div className="text-[12px] font-mono text-[#161916] leading-relaxed">
                  = {fmtDec(rawCount, 2)} → ceiling ={' '}
                  <span className="font-bold text-[#FD4E59]">{finalCount} pods</span>
                </div>
              </div>
            </div>

            {/* 5. INPUTS USED */}
            <div className="pt-6 border-t border-[#494949]/12">
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
                5. INPUTS USED
              </div>
              <div className="space-y-2">
                {inputsRows.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="text-[#494949] flex items-center gap-1.5 min-w-0">
                      {item.f1 ? <F1Link /> : <span className="w-3.5 shrink-0" />}
                      {item.label}
                    </span>
                    <span className="font-medium text-[#161916] text-right shrink-0">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t border-[#494949]/12 flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!copyText}
          className="h-10 px-4 text-[#494949] text-[14px] hover:text-[#161916] flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Copy className="w-4 h-4" />
          Copy math to clipboard
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
