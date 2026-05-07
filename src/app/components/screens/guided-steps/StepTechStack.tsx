import { useState } from 'react';
import { Plus, X, HelpCircle } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

/** Supabase JSONB may deserialize as object or string; spreading a string breaks merge → invalid payloads. */
function parseIntakeData(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (typeof p === 'object' && p !== null && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* ignore invalid JSON */
    }
    return {};
  }
  return {};
}

/** Ensures JSONB payload is serializable; on failure keeps the original object. */
function toJsonSafeRecord(value: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return value;
  }
}

interface StepTechStackProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepTechStack({ data, onNext, onBack, currentStep, totalSteps }: StepTechStackProps) {
  const [platforms, setPlatforms] = useState<string[]>(data?.platforms || []);
  const [aiCapabilities, setAiCapabilities] = useState<any[]>(data?.aiCapabilities || []);
  const [dataMaturity, setDataMaturity] = useState<string>(data?.dataMaturity || 'None');
  const [platformInput, setPlatformInput] = useState('');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = data?.engagementId ?? engagementIdFromUrl ?? null;

  const { engagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  const toMaturityEnum = (label: string) => {
    switch ((label ?? '').toLowerCase()) {
      case 'none':
        return 'none';
      case 'basic':
        return 'low';
      case 'intermediate':
        return 'medium';
      case 'advanced':
        return 'high';
      default:
        return 'none';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Read FormData synchronously — after any `await`, React clears `e.currentTarget` and FormData breaks.
    const form = e.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      setSaveError('Could not read form. Please try again.');
      return;
    }
    const privacyNotes = new FormData(form).get('data_privacy_constraints');

    if (!engagementId) {
      setSaveError('Missing engagement id. Please go back and save the Engagement step first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    let shouldAdvance = false;
    try {
      const loaded = await loadEngagement(engagementId);
      const existingIntakeData = parseIntakeData(
        loaded?.engagement?.intake_data ?? engagement?.intake_data,
      );

      const filteredAi = (aiCapabilities ?? [])
        .filter((c) => (c?.capability ?? '').trim().length > 0)
        .map((c) => ({
          capability: String(c.capability).trim(),
          vendor: '',
          coverage_pct: Number.isFinite(Number(c.coverage)) ? Number(c.coverage) : 0,
          notes: c?.status ? `status: ${String(c.status)}` : '',
        }));

      const newTechStackObject = {
        current_systems: {
          primary_work_platform: platforms[0] ?? '',
          qa_audit_tool: '',
          ticketing: '',
          knowledge_base: '',
          workforce_management: '',
          reporting_bi: '',
        },
        ai_in_use: filteredAi,
        data_logging_maturity: toMaturityEnum(dataMaturity),
        data_privacy_constraints: typeof privacyNotes === 'string' ? privacyNotes : '',
      };

      const mergedIntakeData = toJsonSafeRecord({
        ...existingIntakeData,
        tech_stack: newTechStackObject,
      });

      const { ok, error: updateErr } = await updateEngagement({ intake_data: mergedIntakeData });
      if (!ok) {
        setSaveError(
          updateErr && String(updateErr).trim()
            ? String(updateErr)
            : 'Failed to save tech stack. Please try again.',
        );
        return;
      }

      await loadEngagement(engagementId);
      shouldAdvance = true;
    } catch (err) {
      console.error('[Tech Stack Save] Caught exception:', err);
      setSaveError('Failed to save tech stack. Please try again.');
    } finally {
      setIsSaving(false);
    }

    if (shouldAdvance) {
      onNext({ platforms, aiCapabilities, dataMaturity });
    }
  };

  const addPlatform = () => {
    if (platformInput.trim()) {
      setPlatforms([...platforms, platformInput.trim()]);
      setPlatformInput('');
    }
  };

  const removePlatform = (platform: string) => {
    setPlatforms(platforms.filter((p) => p !== platform));
  };

  const addAiCapability = () => {
    setAiCapabilities([...aiCapabilities, { capability: '', coverage: 0, status: 'Deployed' }]);
  };

  const maturityLevels = ['None', 'Basic', 'Intermediate', 'Advanced'];

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Technology Stack</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        Capture the platforms and AI capabilities currently in use.
      </p>

      <div className="space-y-8">
        {/* Current Platforms */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Current Platforms
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={platformInput}
              onChange={(e) => setPlatformInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlatform())}
              placeholder="e.g. Salesforce, Genesys, Zendesk"
              className="flex-1 h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
            />
            <button
              type="button"
              onClick={addPlatform}
              className="h-11 px-4 bg-[#FD4E59] text-white rounded-md hover:bg-[#FD4E59]/90"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <div
                key={platform}
                className="px-3 py-1.5 bg-[#FFF0DC] border border-[#FFAB28] text-[#494949] text-[13px] rounded-full flex items-center gap-2"
              >
                {platform}
                <button type="button" onClick={() => removePlatform(platform)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Capabilities */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            AI In Use Today
          </label>
          <div className="space-y-3">
            {aiCapabilities.map((cap, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. Smart routing"
                  value={cap.capability}
                  onChange={(e) => {
                    const newCaps = [...aiCapabilities];
                    newCaps[index].capability = e.target.value;
                    setAiCapabilities(newCaps);
                  }}
                  className="flex-1 h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Coverage %"
                  value={Number.isFinite(Number(cap.coverage)) ? cap.coverage : ''}
                  onChange={(e) => {
                    const newCaps = [...aiCapabilities];
                    const v = e.target.value;
                    const n = parseInt(v, 10);
                    newCaps[index].coverage = v === '' || Number.isNaN(n) ? 0 : n;
                    setAiCapabilities(newCaps);
                  }}
                  className="w-32 h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                />
                <select
                  value={cap.status}
                  onChange={(e) => {
                    const newCaps = [...aiCapabilities];
                    newCaps[index].status = e.target.value;
                    setAiCapabilities(newCaps);
                  }}
                  className="w-40 h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                >
                  <option>Deployed</option>
                  <option>Piloting</option>
                  <option>Planned</option>
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAiCapability}
            className="mt-3 text-[#FFAB28] text-[13px] font-medium underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add AI Capability
          </button>
        </div>

        {/* Data & Logging Maturity */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Data & Logging Maturity
          </label>
          <div className="h-10 border border-[#161916]/15 rounded-md overflow-hidden flex">
            {maturityLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDataMaturity(level)}
                className={`
                  flex-1 text-[13px] font-semibold transition-colors
                  ${dataMaturity === level
                    ? 'bg-[#FD4E59] text-white'
                    : 'bg-[#FFF0DC] text-[#494949] hover:bg-[#FFF0DC]/70'
                  }
                `}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3 block">
            Additional notes on data logging or tooling
          </label>
          <textarea
            name="data_privacy_constraints"
            rows={3}
            defaultValue={data?.data_privacy_constraints || ''}
            placeholder="Optional notes..."
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
