import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { IntakeAiBadge } from '../../intake/IntakeAiBadge';
import {
  cloneIntake,
  collectAiConfidenceByFieldPath,
  removeConfidenceAtFieldPath,
} from '../../../../lib/intakeAiUtils';

type Confidence = 'high' | 'medium' | 'low';

interface StepEngagementProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select industry' },
  { value: 'safety_security', label: 'Safety & Security' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'finance_ops', label: 'Finance Operations' },
  { value: 'hr_ops', label: 'HR Operations' },
  { value: 'sales_ops', label: 'Sales Operations' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'other', label: 'Other' },
];

function formatPainForForm(pain: unknown): string {
  if (pain == null) return '';
  if (Array.isArray(pain)) return pain.map((p) => String(p).trim()).filter(Boolean).join('\n');
  return String(pain);
}

function formatGoalsForForm(goals: unknown): string {
  if (goals == null) return '';
  if (typeof goals === 'string') return goals;
  if (typeof goals === 'object') {
    const o = goals as Record<string, unknown>;
    const lines: string[] = [];
    if (o.cost_reduction_target != null) lines.push(`Cost reduction target (%): ${String(o.cost_reduction_target)}`);
    if (o.quality_threshold != null) lines.push(`Quality threshold (%): ${String(o.quality_threshold)}`);
    if (o.scale_target != null) lines.push(`Scale target (multiplier): ${String(o.scale_target)}`);
    if (o.timeline_months != null) lines.push(`Timeline (months): ${String(o.timeline_months)}`);
    if (o.primary_priority != null) lines.push(`Primary priority: ${String(o.primary_priority)}`);
    if (lines.length) return lines.join('\n');
    try {
      return JSON.stringify(goals, null, 2);
    } catch {
      return '';
    }
  }
  return '';
}

function parsePainToStored(raw: string): string[] | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  return t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseGoalsFromForm(raw: string, previous: unknown): Record<string, unknown> {
  const t = String(raw ?? '').trim();
  if (!t) {
    return typeof previous === 'object' && previous !== null && !Array.isArray(previous)
      ? (previous as Record<string, unknown>)
      : { primary_priority: null };
  }
  try {
    const j = JSON.parse(t);
    if (typeof j === 'object' && j !== null && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  return { primary_priority: t };
}

export function StepEngagement({ data, onNext, onBack, currentStep, totalSteps }: StepEngagementProps) {
  const [formData, setFormData] = useState({
    clientName: (data?.clientName as string) || '',
    industry: (data?.industry as string) || '',
    geography: (data?.geography as string[]) || [],
    languages: (data?.languages as string[]) || [],
    channels: (data?.channels as string[]) || [],
    dailyVolume: (data?.dailyVolume as string) || '',
    painPoints: (data?.painPoints as string) || '',
    goals: (data?.goals as string) || '',
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPaths, setAiPaths] = useState(() => new Set<string>());
  const [confMap, setConfMap] = useState(() => new Map<string, Confidence>());
  const initialAiPathsRef = useRef(new Set<string>());
  const hydratedIdRef = useRef<string | null>(null);
  const [goalsDirty, setGoalsDirty] = useState(false);
  const [painDirty, setPainDirty] = useState(false);
  const [uploadBannerDismissed, setUploadBannerDismissed] = useState(false);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = (data?.engagementId as string | undefined) ?? engagementIdFromUrl ?? null;

  const { engagement, createEngagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  const channels = ['Voice', 'Chat', 'Email', 'Back Office', 'Social'];

  const parseList = (value: string) =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const stripAiPrefix = (prefix: string) => {
    setAiPaths((prev) => {
      const n = new Set(prev);
      for (const p of prev) {
        if (p === prefix || p.startsWith(`${prefix}.`)) n.delete(p);
      }
      return n;
    });
  };

  useEffect(() => {
    if (!engagement?.id || !engagement.intake_data) return;
    if (hydratedIdRef.current === engagement.id) return;
    hydratedIdRef.current = engagement.id;

    const intake = engagement.intake_data as Record<string, unknown>;
    const eng = (intake.engagement as Record<string, unknown>) || {};

    setFormData({
      clientName: typeof eng.client_name === 'string' ? eng.client_name : '',
      industry: typeof eng.domain === 'string' ? eng.domain : '',
      geography: Array.isArray(eng.geography) ? (eng.geography as string[]) : [],
      languages: Array.isArray(eng.languages) ? (eng.languages as string[]) : [],
      channels: Array.isArray(eng.channels) ? (eng.channels as string[]) : [],
      dailyVolume: eng.volume_per_day != null && eng.volume_per_day !== '' ? String(eng.volume_per_day) : '',
      painPoints: formatPainForForm(eng.pain_points),
      goals: formatGoalsForForm(eng.goals),
    });
    setGoalsDirty(false);
    setPainDirty(false);

    const m = collectAiConfidenceByFieldPath(intake);
    const step1 = new Set<string>();
    const cm = new Map<string, Confidence>();
    for (const [p, c] of m.entries()) {
      if (!p.startsWith('engagement.')) continue;
      step1.add(p);
      cm.set(p, c);
    }
    setAiPaths(step1);
    setConfMap(cm);
    initialAiPathsRef.current = new Set(step1);
  }, [engagement?.id, engagement?.intake_data]);

  const extractionMeta = (engagement?.extraction_metadata as Record<string, unknown> | undefined) || {};
  const extractionWarnings = Array.isArray(extractionMeta.warnings)
    ? (extractionMeta.warnings as string[])
    : [];
  const extractedFieldsCount =
    typeof extractionMeta.extracted_fields_count === 'number'
      ? extractionMeta.extracted_fields_count
      : null;
  const showUploadBanner =
    engagement?.intake_mode === 'upload' && !uploadBannerDismissed && extractedFieldsCount != null;

  const badgeFor = (path: string) => {
    if (!aiPaths.has(path)) return null;
    const c = confMap.get(path);
    return <IntakeAiBadge confidence={c ?? 'medium'} />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const next = cloneIntake((engagement?.intake_data as Record<string, unknown>) ?? {});
    for (const p of initialAiPathsRef.current) {
      if (!aiPaths.has(p)) removeConfidenceAtFieldPath(next, p);
    }

    const prevEng = (typeof next.engagement === 'object' && next.engagement !== null
      ? (next.engagement as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const goalsOut = goalsDirty
      ? parseGoalsFromForm(String(formData.goals), prevEng.goals)
      : typeof prevEng.goals === 'object' && prevEng.goals !== null && !Array.isArray(prevEng.goals)
        ? (prevEng.goals as Record<string, unknown>)
        : parseGoalsFromForm(String(formData.goals), prevEng.goals);

    const painOut = painDirty ? parsePainToStored(formData.painPoints) : prevEng.pain_points ?? parsePainToStored(formData.painPoints);

    const engagementIntakeData = {
      ...prevEng,
      client_name: formData.clientName,
      domain: formData.industry || null,
      geography: formData.geography,
      languages: formData.languages,
      channels: formData.channels,
      volume_per_day: formData.dailyVolume ? Number(formData.dailyVolume) : null,
      volume_per_month: (data?.volume_per_month as number | undefined) ?? prevEng.volume_per_month,
      seasonality_notes: (data?.seasonality_notes as string | undefined) ?? prevEng.seasonality_notes,
      pain_points: painOut,
      goals: goalsOut,
    };

    next.engagement = engagementIntakeData;

    const payload = {
      client_name: formData.clientName,
      domain: formData.industry || null,
      values_are_illustrative: Boolean(
        data?.values_are_illustrative ?? data?.valuesAreIllustrative ?? engagement?.values_are_illustrative ?? false,
      ),
      intake_mode: engagement?.intake_mode ?? 'form',
      intake_data: next,
    };

    const existingId = engagementId;
    const newId = existingId ? existingId : await createEngagement(payload);

    if (!newId) {
      setSaveError('Failed to save engagement. Please try again.');
      setIsSaving(false);
      return;
    }

    if (!existingId) {
      const url = new URL(window.location.href);
      url.searchParams.set('engagementId', newId);
      window.history.replaceState({}, '', url.toString());
    } else {
      const { ok, error: updateErr } = await updateEngagement(payload);
      if (!ok) {
        setSaveError(updateErr ?? 'Failed to save engagement. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    await loadEngagement(newId);
    setIsSaving(false);
    onNext({ ...formData, engagementId: newId });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Engagement Details</h2>
      <p className="text-[14px] text-[#494949] mb-8">Tell us about your client&apos;s business context.</p>

      {showUploadBanner && (
        <div className="mb-6 rounded-lg border-l-4 border-[#FFAB28] bg-[#FFF8ED] px-4 py-3 text-[14px] text-[#494949]">
          <div className="flex justify-between gap-3">
            <p>
              We extracted {extractedFieldsCount} fields from your uploaded document. Review each step and fill in any
              blanks.
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 text-[#6D7069] hover:text-[#161916]"
              onClick={() => setUploadBannerDismissed(true)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {extractionWarnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[13px] text-[#6D7069] space-y-1">
              {extractionWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Client Name <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            {badgeFor('engagement.client_name')}
          </label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => {
              setAiPaths((prev) => {
                const n = new Set(prev);
                n.delete('engagement.client_name');
                return n;
              });
              setFormData({ ...formData, clientName: e.target.value });
            }}
            placeholder="e.g. Acme Corp"
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
            required
          />
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Industry Domain <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            {badgeFor('engagement.domain')}
          </label>
          <select
            value={formData.industry}
            onChange={(e) => {
              setAiPaths((prev) => {
                const n = new Set(prev);
                n.delete('engagement.domain');
                return n;
              });
              setFormData({ ...formData, industry: e.target.value });
            }}
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
            required
          >
            {DOMAIN_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Geography <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            {badgeFor('engagement.geography')}
          </label>
          <input
            type="text"
            placeholder="Add countries or regions"
            value={(formData.geography ?? []).join(', ')}
            onChange={(e) => {
              setAiPaths((prev) => {
                const n = new Set(prev);
                n.delete('engagement.geography');
                return n;
              });
              setFormData({ ...formData, geography: parseList(e.target.value) });
            }}
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Languages supported
            {badgeFor('engagement.languages')}
          </label>
          <input
            type="text"
            placeholder="Comma-separated, e.g. English, Spanish"
            value={(formData.languages ?? []).join(', ')}
            onChange={(e) => {
              setAiPaths((prev) => {
                const n = new Set(prev);
                n.delete('engagement.languages');
                return n;
              });
              setFormData({ ...formData, languages: parseList(e.target.value) });
            }}
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Daily Contact Volume <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            {badgeFor('engagement.volume_per_day')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.dailyVolume}
              onChange={(e) => {
                setAiPaths((prev) => {
                  const n = new Set(prev);
                  n.delete('engagement.volume_per_day');
                  return n;
                });
                setFormData({ ...formData, dailyVolume: e.target.value });
              }}
              placeholder="e.g. 38000"
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">
              contacts/day
            </span>
          </div>
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Channels <span className="text-[#FD4E59]">*</span>
            {badgeFor('engagement.channels')}
          </label>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => {
                  setAiPaths((prev) => {
                    const n = new Set(prev);
                    n.delete('engagement.channels');
                    return n;
                  });
                  const newChannels = formData.channels.includes(channel)
                    ? formData.channels.filter((c: string) => c !== channel)
                    : [...formData.channels, channel];
                  setFormData({ ...formData, channels: newChannels });
                }}
                className={`
                  px-4 py-2 rounded-full text-[13px] font-medium border transition-colors
                  ${
                    formData.channels.includes(channel)
                      ? 'bg-[#FD4E59] text-white border-[#FD4E59]'
                      : 'bg-[#FFF0DC] text-[#494949] border-[#FFAB28] hover:bg-[#FFAB28]/20'
                  }
                `}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Key Pain Points
            {badgeFor('engagement.pain_points')}
          </label>
          <textarea
            value={formData.painPoints}
            onChange={(e) => {
              setPainDirty(true);
              stripAiPrefix('engagement.pain_points');
              setFormData({ ...formData, painPoints: e.target.value });
            }}
            placeholder="Describe the main operational challenges the client faces."
            rows={4}
            className="w-full px-4 py-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
        </div>

        <div>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Business Goals
            {(() => {
              const gPath = [...aiPaths].find((p) => p === 'engagement.goals' || p.startsWith('engagement.goals.'));
              if (!gPath) return null;
              return <IntakeAiBadge confidence={confMap.get(gPath) ?? confMap.get('engagement.goals') ?? 'medium'} />;
            })()}
          </label>
          <textarea
            value={formData.goals}
            onChange={(e) => {
              setGoalsDirty(true);
              stripAiPrefix('engagement.goals');
              setFormData({ ...formData, goals: e.target.value });
            }}
            placeholder="What does success look like for this engagement?"
            rows={3}
            className="w-full px-4 py-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
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
      {saveError && <div className="mt-3 text-[13px] text-[#FD4E59]">{saveError}</div>}
    </form>
  );
}
