import { X, RotateCcw, Check, Sparkles, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { runFullEconomics } from '../../../../lib/economicsEngine';
import { supabase } from '../../../../supabaseClient';

interface F5_2_AssumptionEditorProps {
  onClose: () => void;
  onApplied?: () => void;
  onSaved?: () => void;
}

type RampCurve = 'S-curve' | 'Linear' | 'Front-loaded';

interface AssumptionsState {
  agent_fully_loaded_cost: number;
  tl_cost_per_fte: number;
  qa_cost_per_fte: number;
  ai_auditor_cost_per_fte: number;
  ramp_curve: RampCurve;
  months_to_steady_state: number;
  tech_build_cost_estimate: number;
  retraining_cost_per_fte: number;
  image_classifier_coverage_pct: number;
  llm_tooling_monthly_cost: number;
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,%\s,]/g, ''));
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
  const found = all.find((row) => String(asObj(row).variant_name ?? '').trim().toLowerCase() === selected);
  return found ? asObj(found) : null;
}

function hierarchyRows(engagement: Record<string, unknown> | null): Record<string, unknown>[] {
  const h = asObj(engagement?.intake_data).hierarchy;
  return Array.isArray(h) ? h.filter((x) => x && typeof x === 'object').map((x) => x as Record<string, unknown>) : [];
}

function roleCostByLevel(hierarchy: Record<string, unknown>[], level: number): number {
  const row = hierarchy.find((r) => Math.round(toNum(r.level)) === level);
  return toNum(row?.cost ?? row?.cost_per_fte ?? row?.monthly_cost_per_fte);
}

function techCoverageDefault(engagement: Record<string, unknown> | null): number {
  const tech = asObj(asObj(engagement?.intake_data).tech_stack);
  return toNum(tech.image_classifier_coverage_pct ?? tech.image_classifier_coverage) || 70;
}

function preferenceNum(engagement: Record<string, unknown> | null, key: string, fallback: number): number {
  const prefs = asObj(asObj(engagement?.intake_data).preferences);
  return toNum(prefs[key]) || fallback;
}

function normalizeRampCurve(value: unknown): RampCurve {
  return value === 'Linear' || value === 'Front-loaded' || value === 'S-curve' ? value : 'S-curve';
}

function defaultsFromEngagement(engagement: Record<string, unknown> | null): AssumptionsState {
  const hierarchy = hierarchyRows(engagement);
  return {
    agent_fully_loaded_cost: roleCostByLevel(hierarchy, 1),
    tl_cost_per_fte: roleCostByLevel(hierarchy, 2),
    qa_cost_per_fte: roleCostByLevel(hierarchy, 3),
    ai_auditor_cost_per_fte: 3500,
    ramp_curve: 'S-curve',
    months_to_steady_state: preferenceNum(engagement, 'months_to_steady_state', 6),
    tech_build_cost_estimate: 180000,
    retraining_cost_per_fte: preferenceNum(engagement, 'retraining_cost_per_fte', 1500),
    image_classifier_coverage_pct: techCoverageDefault(engagement),
    llm_tooling_monthly_cost: 8000,
  };
}

function assumptionsFromSaved(defaults: AssumptionsState, saved: Record<string, unknown>): AssumptionsState {
  return {
    agent_fully_loaded_cost: toNum(saved.agent_fully_loaded_cost) || defaults.agent_fully_loaded_cost,
    tl_cost_per_fte: toNum(saved.tl_cost_per_fte) || defaults.tl_cost_per_fte,
    qa_cost_per_fte: toNum(saved.qa_cost_per_fte) || defaults.qa_cost_per_fte,
    ai_auditor_cost_per_fte: toNum(saved.ai_auditor_cost_per_fte) || defaults.ai_auditor_cost_per_fte,
    ramp_curve: normalizeRampCurve(saved.ramp_curve ?? defaults.ramp_curve),
    months_to_steady_state: toNum(saved.months_to_steady_state) || defaults.months_to_steady_state,
    tech_build_cost_estimate: toNum(saved.tech_build_cost_estimate) || defaults.tech_build_cost_estimate,
    retraining_cost_per_fte: toNum(saved.retraining_cost_per_fte) || defaults.retraining_cost_per_fte,
    image_classifier_coverage_pct: toNum(saved.image_classifier_coverage_pct) || defaults.image_classifier_coverage_pct,
    llm_tooling_monthly_cost: toNum(saved.llm_tooling_monthly_cost) || defaults.llm_tooling_monthly_cost,
  };
}

function formatInput(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n));
}

function sourceChip(source: 'FROM F1' | 'DEFAULT' | 'MODIFIED') {
  const cls =
    source === 'FROM F1'
      ? 'bg-[#E2EFDA] text-[#548235]'
      : source === 'MODIFIED'
        ? 'bg-[#FCE4D6] text-[#FD4E59]'
        : 'bg-[#FFF0DC] text-[#6D7069]';
  return <div className={`px-3 py-1 ${cls} text-[11px] font-semibold uppercase tracking-wide rounded`}>{source}</div>;
}

interface MoneyInputRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  source: 'FROM F1' | 'DEFAULT' | 'MODIFIED';
}

function MoneyInputRow({ label, value, onChange, source }: MoneyInputRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[140px] text-[14px] text-[#161916]">{label}</div>
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
        <input
          type="number"
          value={formatInput(value)}
          onChange={(e) => onChange(toNum(e.target.value))}
          className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
        />
      </div>
      {sourceChip(source)}
    </div>
  );
}

export function F5_2_AssumptionEditor({ onClose, onApplied, onSaved }: F5_2_AssumptionEditorProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const { engagement, tasks, loading: engagementLoading, error: engagementError } = useEngagement(engagementIdFromUrl);

  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [f3Roles, setF3Roles] = useState<Record<string, unknown>[]>([]);
  const [f4Pods, setF4Pods] = useState<Record<string, unknown> | null>(null);
  const [savedAssumptions, setSavedAssumptions] = useState<Record<string, unknown>>({});
  const [assumptions, setAssumptions] = useState<AssumptionsState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!engagementIdFromUrl) {
      setPipelineError('Missing engagement');
      setPipelineLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setPipelineLoading(true);
      setPipelineError(null);
      const { data, error } = await supabase
        .from('pipeline_runs')
        .select('id, f3_roles, f4_pods, f5_economics')
        .eq('engagement_id', engagementIdFromUrl)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setPipelineError(error.message);
        setPipelineId(null);
        setF3Roles([]);
        setF4Pods(null);
        setSavedAssumptions({});
      } else {
        setPipelineId(typeof data?.id === 'string' ? data.id : null);
        setF3Roles(normalizeF3Roles(data?.f3_roles).redesigns as Record<string, unknown>[]);
        setF4Pods(parseF4Pods(data?.f4_pods));
        setSavedAssumptions(asObj(asObj(data?.f5_economics).assumptions_used));
      }
      setPipelineLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl]);

  const engagementRecord = engagement as Record<string, unknown> | null;
  const defaults = useMemo(() => defaultsFromEngagement(engagementRecord), [engagementRecord]);
  const selectedVariant = useMemo(() => selectedVariantFromF4Pods(f4Pods), [f4Pods]);
  const selectedVariantName = typeof f4Pods?.selected_variant_name === 'string' ? f4Pods.selected_variant_name : '';

  useEffect(() => {
    if (!engagementRecord || pipelineLoading || assumptions) return;
    setAssumptions(assumptionsFromSaved(defaults, savedAssumptions));
  }, [engagementRecord, pipelineLoading, defaults, savedAssumptions, assumptions]);

  const computed = useMemo(() => {
    if (!engagementRecord || !selectedVariant || !assumptions) return null;
    return runFullEconomics(
      engagementRecord,
      Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : [],
      selectedVariant,
      f3Roles,
      assumptions,
    ) as Record<string, unknown>;
  }, [engagementRecord, tasks, selectedVariant, f3Roles, assumptions]);

  const updateAssumption = <K extends keyof AssumptionsState,>(key: K, value: AssumptionsState[K]) => {
    setAssumptions((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveEconomics = useCallback(
    async (nextAssumptions: AssumptionsState, nextResult: Record<string, unknown>) => {
      if (!engagementIdFromUrl) {
        setSaveError('Missing engagement');
        return false;
      }
      const payload = {
        selected_variant_at_compute: selectedVariantName,
        assumptions_used: nextAssumptions,
        economics_result: nextResult,
        computed_at: new Date().toISOString(),
      };
      setSaveError(null);
      if (pipelineId) {
        const { error } = await supabase.from('pipeline_runs').update({ f5_economics: payload }).eq('id', pipelineId);
        if (error) {
          setSaveError(error.message);
          return false;
        }
        return true;
      }
      const { error } = await supabase.from('pipeline_runs').insert({
        engagement_id: engagementIdFromUrl,
        f5_economics: payload,
      });
      if (error) {
        setSaveError(error.message);
        return false;
      }
      return true;
    },
    [engagementIdFromUrl, pipelineId, selectedVariantName],
  );

  const handleApply = async () => {
    if (!assumptions || !computed) return;
    const ok = await saveEconomics(assumptions, computed);
    if (ok) {
      onApplied?.();
      if (!onApplied) onClose();
    }
  };

  const handleReset = async () => {
    if (!engagementRecord || !selectedVariant) return;
    const reset = defaultsFromEngagement(engagementRecord);
    setAssumptions(reset);
    const result = runFullEconomics(
      engagementRecord,
      Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : [],
      selectedVariant,
      f3Roles,
      reset,
    ) as Record<string, unknown>;
    const ok = await saveEconomics(reset, result);
    if (ok) onSaved?.();
  };

  const loading = engagementLoading || pipelineLoading || !assumptions;
  const error = engagementError ?? pipelineError;
  const savingsPct = toNum(asObj(computed?.savings).monthly_savings_pct);

  const f1Chip = 'FROM F1' as const;
  const modified = 'MODIFIED' as const;
  const defaultChip = 'DEFAULT' as const;

  return (
    <div className="w-[480px] h-full bg-white border-l border-[#494949]/12 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#494949]/12">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-[20px] font-bold text-[#161916]">Assumptions</h2>
          <button onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[13px] text-[#494949]">
          Edit any input — the dashboard recomputes instantly.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-[14px] text-[#494949]">Loading assumptions…</div>
        ) : error ? (
          <div className="text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">{error}</div>
        ) : !selectedVariant ? (
          <div className="text-[14px] text-[#494949]">Select a pod variant in F4 first.</div>
        ) : (
          <>
        {/* Section 1 - Costs Per FTE Per Month */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Costs Per FTE Per Month
          </div>

          <div className="space-y-3">
            <MoneyInputRow label="Agent" value={assumptions.agent_fully_loaded_cost} onChange={(v) => updateAssumption('agent_fully_loaded_cost', v)} source={assumptions.agent_fully_loaded_cost === defaults.agent_fully_loaded_cost ? f1Chip : modified} />
            <MoneyInputRow label="TL" value={assumptions.tl_cost_per_fte} onChange={(v) => updateAssumption('tl_cost_per_fte', v)} source={assumptions.tl_cost_per_fte === defaults.tl_cost_per_fte ? f1Chip : modified} />
            <MoneyInputRow label="QA Officer" value={assumptions.qa_cost_per_fte} onChange={(v) => updateAssumption('qa_cost_per_fte', v)} source={assumptions.qa_cost_per_fte === defaults.qa_cost_per_fte ? f1Chip : modified} />
            <MoneyInputRow label="AI Output Auditor" value={assumptions.ai_auditor_cost_per_fte} onChange={(v) => updateAssumption('ai_auditor_cost_per_fte', v)} source={assumptions.ai_auditor_cost_per_fte === defaults.ai_auditor_cost_per_fte ? defaultChip : modified} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#494949]/12 my-6" />

        {/* Section 2 - Transition */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Transition
          </div>

          <div className="space-y-3">
            {/* Ramp curve */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Ramp curve</div>
              <div className="flex-1 relative">
                <select
                  value={assumptions.ramp_curve}
                  onChange={(e) => updateAssumption('ramp_curve', normalizeRampCurve(e.target.value))}
                  className="w-full h-9 px-3 pr-8 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] appearance-none"
                >
                  <option>S-curve</option>
                  <option>Linear</option>
                  <option>Front-loaded</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6D7069] pointer-events-none" />
              </div>
              {sourceChip(assumptions.ramp_curve === defaults.ramp_curve ? defaultChip : modified)}
            </div>

            {/* Months to steady */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Months to steady</div>
              <div className="flex-1">
                <input
                  type="number"
                  value={formatInput(assumptions.months_to_steady_state)}
                  onChange={(e) => updateAssumption('months_to_steady_state', toNum(e.target.value))}
                  className="w-full h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              {sourceChip(assumptions.months_to_steady_state === defaults.months_to_steady_state ? defaultChip : modified)}
            </div>

            <MoneyInputRow label="Tech build cost" value={assumptions.tech_build_cost_estimate} onChange={(v) => updateAssumption('tech_build_cost_estimate', v)} source={assumptions.tech_build_cost_estimate === defaults.tech_build_cost_estimate ? defaultChip : modified} />
            <MoneyInputRow label="Retraining / FTE" value={assumptions.retraining_cost_per_fte} onChange={(v) => updateAssumption('retraining_cost_per_fte', v)} source={assumptions.retraining_cost_per_fte === defaults.retraining_cost_per_fte ? defaultChip : modified} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#494949]/12 my-6" />

        {/* Section 3 - Tech */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Tech
          </div>

          <div className="space-y-3">
            {/* Image classifier coverage */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Image classifier coverage</div>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={formatInput(assumptions.image_classifier_coverage_pct)}
                  onChange={(e) => updateAssumption('image_classifier_coverage_pct', toNum(e.target.value))}
                  className="w-full h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">%</span>
              </div>
              {sourceChip(assumptions.image_classifier_coverage_pct === defaults.image_classifier_coverage_pct ? f1Chip : modified)}
            </div>

            <MoneyInputRow label="LLM tooling cost / mo" value={assumptions.llm_tooling_monthly_cost} onChange={(v) => updateAssumption('llm_tooling_monthly_cost', v)} source={assumptions.llm_tooling_monthly_cost === defaults.llm_tooling_monthly_cost ? defaultChip : modified} />
          </div>
        </div>

        {saveError ? (
          <div className="mb-4 text-[13px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-3 bg-[#FCE4D6]/30">{saveError}</div>
        ) : null}

        {/* Recompute Indicator */}
        <div className="bg-[#FFF0DC] rounded p-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#FFAB28] flex-shrink-0" />
          <p className="text-[13px] text-[#161916]">Dashboard recomputed: {savingsPct.toFixed(1)}% savings</p>
        </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#494949]/12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={loading || Boolean(error) || !selectedVariant}
          className="h-10 px-5 text-[#FD4E59] text-[14px] hover:bg-[#FD4E59]/5 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <RotateCcw className="w-4 h-4" />
          Reset all
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={loading || Boolean(error) || !computed}
          className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Check className="w-4 h-4" />
          Apply & close
        </button>
      </div>
    </div>
  );
}
