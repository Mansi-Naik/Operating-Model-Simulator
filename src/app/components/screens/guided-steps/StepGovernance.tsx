import { useState } from 'react';
import { Plus, HelpCircle, Sparkles } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface Risk {
  id: string;
  category: string;
  severity: string;
  escalationPath: string;
}

interface StepGovernanceProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepGovernance({ data, onNext, onBack, currentStep, totalSteps }: StepGovernanceProps) {
  const [risks, setRisks] = useState<Risk[]>(
    data?.risks || [{ id: '1', category: '', severity: 'Low', escalationPath: '' }]
  );
  const [controls, setControls] = useState<string[]>(data?.controls || []);
  const [wellness, setWellness] = useState(data?.wellness || '');
  const [incidents, setIncidents] = useState(data?.incidents || '');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = data?.engagementId ?? engagementIdFromUrl ?? null;

  const { engagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  const controlOptions = [
    'QA audits',
    'Call recording',
    'Script adherence',
    'Regulatory reporting',
    'Access controls',
    'Other',
  ];

  const severityLevels = ['Low', 'Medium', 'High', 'Critical'];

  const toSeverityEnum = (label: string) => {
    switch ((label ?? '').toLowerCase()) {
      case 'low':
        return 'low';
      case 'medium':
        return 'medium';
      case 'high':
        return 'high';
      case 'critical':
        return 'critical';
      default:
        return 'low';
    }
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

    const riskCategories = (risks ?? [])
      .filter((r) => (r?.category ?? '').trim().length > 0)
      .map((r) => ({
        name: String(r.category).trim(),
        severity: toSeverityEnum(r.severity),
        zero_tolerance: false,
        regulatory: false,
        description: (r.escalationPath ?? '').trim(),
      }));

    if (riskCategories.length === 0) {
      setSaveError('Add at least one risk category to continue');
      setIsSaving(false);
      return;
    }

    const newGovernanceObject = {
      risk_categories: riskCategories,
      escalation_paths: [],
      controls_in_place: (controls ?? []).filter((c) => (c ?? '').trim().length > 0),
      wellness_support: (wellness ?? '').trim().length > 0,
      // Preserve free-text details even though the structured schema is boolean.
      ...(incidents ? { incidents_notes: String(incidents) } : {}),
      ...(wellness ? { wellness_notes: String(wellness) } : {}),
    };

    const mergedIntakeData = { ...existingIntakeData, governance: newGovernanceObject };
    const { ok, error: updateErr } = await updateEngagement({ intake_data: mergedIntakeData });
    if (!ok) {
      setSaveError(updateErr ?? 'Failed to save governance. Please try again.');
      setIsSaving(false);
      return;
    }

    await loadEngagement(engagementId);
    setIsSaving(false);
    onNext({ risks, controls, wellness, incidents });
  };

  const addRisk = () => {
    setRisks([...risks, { id: Date.now().toString(), category: '', severity: 'Low', escalationPath: '' }]);
  };

  const updateRisk = (id: string, field: keyof Risk, value: any) => {
    setRisks(risks.map((risk) => (risk.id === id ? { ...risk, [field]: value } : risk)));
  };

  const toggleControl = (control: string) => {
    if (controls.includes(control)) {
      setControls(controls.filter((c) => c !== control));
    } else {
      setControls([...controls, control]);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'border border-[#6D7069] text-[#6D7069] bg-white';
      case 'Medium':
        return 'bg-[#FFAB28]/20 text-[#FFAB28] border-0';
      case 'High':
        return 'bg-[#FD4E59]/20 text-[#FD4E59] border-0';
      case 'Critical':
        return 'bg-[#FD4E59] text-white border-0';
      default:
        return 'border border-[#6D7069] text-[#6D7069] bg-white';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Governance & Risk</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        Document risk categories, escalation paths, and operational controls.
      </p>

      <div className="space-y-8">
        {/* Risk Categories */}
        <div>
          <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3 block">
            Risk Categories
          </label>
          <div className="border border-[#161916]/8 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#FFF0DC]">
                <tr>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                    Risk Category
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                    Escalation Path
                  </th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk, index) => (
                  <tr
                    key={risk.id}
                    className={`${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'} border-t border-[#161916]/8`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={risk.category}
                        onChange={(e) => updateRisk(risk.id, 'category', e.target.value)}
                        placeholder="e.g. Data breach"
                        className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={risk.severity}
                        onChange={(e) => updateRisk(risk.id, 'severity', e.target.value)}
                        className={`w-full h-9 px-2 rounded text-[13px] font-medium ${getSeverityStyle(risk.severity)}`}
                      >
                        {severityLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={risk.escalationPath}
                        onChange={(e) => updateRisk(risk.id, 'escalationPath', e.target.value)}
                        placeholder="e.g. Security team > CISO"
                        className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addRisk}
            className="w-full h-9 mt-3 border border-dashed border-[#FFAB28] text-[#FFAB28] text-[13px] font-medium rounded-md hover:bg-[#FFAB28]/10 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Risk Row
          </button>
        </div>

        {/* Controls */}
        <div>
          <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3 block">
            Controls In Place
          </label>
          <div className="space-y-2">
            {controlOptions.map((control) => (
              <label key={control} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`
                    w-5 h-5 border rounded flex items-center justify-center
                    ${controls.includes(control)
                      ? 'bg-[#FD4E59] border-[#FD4E59]'
                      : 'border-[#6D7069] group-hover:border-[#FD4E59]'
                    }
                  `}
                  onClick={() => toggleControl(control)}
                >
                  {controls.includes(control) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[14px] text-[#161916]">{control}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Wellness Support */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Wellness Support
          </label>
          <textarea
            value={wellness}
            onChange={(e) => setWellness(e.target.value)}
            placeholder="Describe wellness programs or mental health support in place."
            rows={3}
            className="w-full px-4 py-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
        </div>

        {/* Recent Incidents */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Recent Incidents
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <textarea
            value={incidents}
            onChange={(e) => setIncidents(e.target.value)}
            placeholder="Note any relevant compliance incidents or regulatory concerns in the past 12 months."
            rows={3}
            className="w-full px-4 py-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
        </div>
      </div>

      {/* Navigation */}
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
