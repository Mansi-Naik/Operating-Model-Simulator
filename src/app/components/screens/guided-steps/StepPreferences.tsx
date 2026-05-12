import { useEffect, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { IntakeAiBadge } from '../../intake/IntakeAiBadge';
import {
  cloneIntake,
  collectAiConfidenceByFieldPath,
  removeConfidenceAtFieldPath,
} from '../../../../lib/intakeAiUtils';

interface StepPreferencesProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepPreferences({ data, onNext, onBack, currentStep, totalSteps }: StepPreferencesProps) {
  const [automationAppetite, setAutomationAppetite] = useState<string>(data?.automation_appetite || 'balanced');
  const [podDesign, setPodDesign] = useState<string>(data?.pod_design || 'balanced');
  const [riskTolerance, setRiskTolerance] = useState<string>(data?.risk_tolerance || 'medium');
  const [preferUpskilling, setPreferUpskilling] = useState<boolean>(Boolean(data?.prefer_upskilling ?? true));
  const [includeEmergentRoles, setIncludeEmergentRoles] = useState<boolean>(Boolean(data?.include_emergent_roles ?? true));
  const [currency, setCurrency] = useState<string>(data?.currency || 'USD');
  const [techBuildCostEstimate, setTechBuildCostEstimate] = useState<string>(data?.tech_build_cost_estimate ?? '');
  const [retrainingCostPerFte, setRetrainingCostPerFte] = useState<string>(data?.retraining_cost_per_fte ?? '');
  const [monthsToSteadyState, setMonthsToSteadyState] = useState<string>(data?.months_to_steady_state ?? '');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPaths, setAiPaths] = useState(() => new Set<string>());
  const [confMap, setConfMap] = useState(() => new Map<string, 'high' | 'medium' | 'low'>());
  const initialAiPathsRef = useRef(new Set<string>());
  const hydratedIdRef = useRef<string | null>(null);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = (data?.engagementId as string | undefined) ?? engagementIdFromUrl ?? null;

  const { engagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  useEffect(() => {
    if (!engagement?.id || !engagement.intake_data) return;
    if (hydratedIdRef.current === engagement.id) return;
    hydratedIdRef.current = engagement.id;

    const intake = engagement.intake_data as Record<string, unknown>;
    const p = (intake.preferences as Record<string, unknown>) || {};
    if (typeof p.automation_appetite === 'string') setAutomationAppetite(p.automation_appetite);
    if (typeof p.pod_design === 'string') setPodDesign(p.pod_design);
    if (typeof p.risk_tolerance === 'string') setRiskTolerance(p.risk_tolerance);
    if (typeof p.prefer_upskilling === 'boolean') setPreferUpskilling(p.prefer_upskilling);
    if (typeof p.include_emergent_roles === 'boolean') setIncludeEmergentRoles(p.include_emergent_roles);
    if (typeof p.currency === 'string') setCurrency(p.currency);
    if (p.tech_build_cost_estimate != null) setTechBuildCostEstimate(String(p.tech_build_cost_estimate));
    if (p.retraining_cost_per_fte != null) setRetrainingCostPerFte(String(p.retraining_cost_per_fte));
    if (p.months_to_steady_state != null) setMonthsToSteadyState(String(p.months_to_steady_state));

    const m = collectAiConfidenceByFieldPath(intake);
    const pref = new Set<string>();
    const cm = new Map<string, 'high' | 'medium' | 'low'>();
    for (const [path, c] of m.entries()) {
      if (!path.startsWith('preferences.')) continue;
      pref.add(path);
      cm.set(path, c);
    }
    setAiPaths(pref);
    setConfMap(cm);
    initialAiPathsRef.current = new Set(pref);
  }, [engagement?.id, engagement?.intake_data]);

  const clearPath = (path: string) => {
    setAiPaths((prev) => {
      const n = new Set(prev);
      n.delete(path);
      return n;
    });
  };

  const badge = (path: string) => {
    if (!aiPaths.has(path)) return null;
    return <IntakeAiBadge confidence={confMap.get(path) ?? 'medium'} />;
  };

  const parseNullableNumber = (value: string) => {
    const v = String(value ?? '').trim();
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engagementId) {
      setSaveError('Missing engagement id. Please go back and save the Engagement step first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const loaded = await loadEngagement(engagementId);
    const existingIntakeData = (loaded?.engagement?.intake_data ??
      engagement?.intake_data ??
      {}) as Record<string, unknown>;

    const next = cloneIntake(existingIntakeData);
    for (const path of initialAiPathsRef.current) {
      if (!aiPaths.has(path)) removeConfidenceAtFieldPath(next, path);
    }

    const prevPref =
      typeof next.preferences === 'object' && next.preferences !== null
        ? (next.preferences as Record<string, unknown>)
        : {};

    const newPreferencesObject = {
      ...prevPref,
      automation_appetite: automationAppetite,
      pod_design: podDesign,
      risk_tolerance: riskTolerance,
      prefer_upskilling: preferUpskilling,
      include_emergent_roles: includeEmergentRoles,
      currency,
      tech_build_cost_estimate: parseNullableNumber(techBuildCostEstimate),
      retraining_cost_per_fte: parseNullableNumber(retrainingCostPerFte),
      months_to_steady_state: parseNullableNumber(monthsToSteadyState),
    };

    next.preferences = newPreferencesObject;

    const { ok, error: updateErr } = await updateEngagement({
      intake_data: next,
      status: 'in_progress',
    });
    if (!ok) {
      setSaveError(updateErr ?? 'Failed to save preferences. Please try again.');
      setIsSaving(false);
      return;
    }

    await loadEngagement(engagementId);
    setIsSaving(false);
    onNext({
      automation_appetite: automationAppetite,
      pod_design: podDesign,
      risk_tolerance: riskTolerance,
      prefer_upskilling: preferUpskilling,
      include_emergent_roles: includeEmergentRoles,
      currency,
      tech_build_cost_estimate: parseNullableNumber(techBuildCostEstimate),
      retraining_cost_per_fte: parseNullableNumber(retrainingCostPerFte),
      months_to_steady_state: parseNullableNumber(monthsToSteadyState),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Preferences</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        Set scenario preferences for automation appetite, risk tolerance, and cost assumptions.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Automation appetite
              {badge('preferences.automation_appetite')}
            </label>
            <select
              value={automationAppetite}
              onChange={(e) => {
                clearPath('preferences.automation_appetite');
                setAutomationAppetite(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Pod design
              {badge('preferences.pod_design')}
            </label>
            <select
              value={podDesign}
              onChange={(e) => {
                clearPath('preferences.pod_design');
                setPodDesign(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Risk tolerance
              {badge('preferences.risk_tolerance')}
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => {
                clearPath('preferences.risk_tolerance');
                setRiskTolerance(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Currency
              {badge('preferences.currency')}
            </label>
            <select
              value={currency}
              onChange={(e) => {
                clearPath('preferences.currency');
                setCurrency(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-wrap items-center gap-3">
            <input
              type="checkbox"
              checked={preferUpskilling}
              onChange={(e) => {
                clearPath('preferences.prefer_upskilling');
                setPreferUpskilling(e.target.checked);
              }}
            />
            <span className="text-[14px] text-[#161916]">Prefer upskilling existing roles</span>
            {badge('preferences.prefer_upskilling')}
          </label>
          <label className="flex flex-wrap items-center gap-3">
            <input
              type="checkbox"
              checked={includeEmergentRoles}
              onChange={(e) => {
                clearPath('preferences.include_emergent_roles');
                setIncludeEmergentRoles(e.target.checked);
              }}
            />
            <span className="text-[14px] text-[#161916]">Include emergent roles</span>
            {badge('preferences.include_emergent_roles')}
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Tech build cost estimate
              {badge('preferences.tech_build_cost_estimate')}
            </label>
            <input
              type="number"
              value={techBuildCostEstimate}
              onChange={(e) => {
                clearPath('preferences.tech_build_cost_estimate');
                setTechBuildCostEstimate(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            />
          </div>
          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Retraining cost / FTE
              {badge('preferences.retraining_cost_per_fte')}
            </label>
            <input
              type="number"
              value={retrainingCostPerFte}
              onChange={(e) => {
                clearPath('preferences.retraining_cost_per_fte');
                setRetrainingCostPerFte(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            />
          </div>
          <div>
            <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Months to steady state
              {badge('preferences.months_to_steady_state')}
            </label>
            <input
              type="number"
              value={monthsToSteadyState}
              onChange={(e) => {
                clearPath('preferences.months_to_steady_state');
                setMonthsToSteadyState(e.target.value);
              }}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-16 pt-8 border-t border-[#161916]/10">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-6 border border-[#161916]/30 text-[#494949] text-[14px] font-medium rounded hover:bg-[#161916]/5"
        >
          Back
        </button>
        <span className="text-[13px] text-[#6D7069]">
          Step {currentStep} of {totalSteps}
        </span>
        <button
          type="submit"
          disabled={isSaving}
          className="h-9 px-8 bg-[#FD4E59] text-white text-[14px] font-semibold rounded hover:bg-[#FD4E59]/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & continue'}
        </button>
      </div>

      {saveError && (
        <div className="mt-3 text-[13px] text-[#FD4E59]">
          {saveError}
        </div>
      )}
    </form>
  );
}

