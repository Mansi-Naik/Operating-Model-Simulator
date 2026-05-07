import { useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface StepPreferencesProps {
  data: any;
  onNext: (data: any) => void;
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

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = data?.engagementId ?? engagementIdFromUrl ?? null;

  const { engagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

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
    const existingIntakeData = loaded?.engagement?.intake_data ?? engagement?.intake_data ?? {};

    const newPreferencesObject = {
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

    const mergedIntakeData = { ...existingIntakeData, preferences: newPreferencesObject };
    const { ok, error: updateErr } = await updateEngagement({
      intake_data: mergedIntakeData,
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
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Automation appetite
            </label>
            <select
              value={automationAppetite}
              onChange={(e) => setAutomationAppetite(e.target.value)}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Pod design
            </label>
            <select
              value={podDesign}
              onChange={(e) => setPodDesign(e.target.value)}
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
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Risk tolerance
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value)}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
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
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferUpskilling}
              onChange={(e) => setPreferUpskilling(e.target.checked)}
            />
            <span className="text-[14px] text-[#161916]">Prefer upskilling existing roles</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeEmergentRoles}
              onChange={(e) => setIncludeEmergentRoles(e.target.checked)}
            />
            <span className="text-[14px] text-[#161916]">Include emergent roles</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Tech build cost estimate
            </label>
            <input
              type="number"
              value={techBuildCostEstimate}
              onChange={(e) => setTechBuildCostEstimate(e.target.value)}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Retraining cost / FTE
            </label>
            <input
              type="number"
              value={retrainingCostPerFte}
              onChange={(e) => setRetrainingCostPerFte(e.target.value)}
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2 block">
              Months to steady state
            </label>
            <input
              type="number"
              value={monthsToSteadyState}
              onChange={(e) => setMonthsToSteadyState(e.target.value)}
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

