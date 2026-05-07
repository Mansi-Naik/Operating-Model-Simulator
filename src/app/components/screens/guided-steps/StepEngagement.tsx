import { useState } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface StepEngagementProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepEngagement({ data, onNext, onBack, currentStep, totalSteps }: StepEngagementProps) {
  const [formData, setFormData] = useState({
    clientName: data?.clientName || '',
    industry: data?.industry || '',
    geography: data?.geography || [],
    languages: data?.languages || [],
    channels: data?.channels || [],
    dailyVolume: data?.dailyVolume || '',
    painPoints: data?.painPoints || '',
    goals: data?.goals || '',
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = data?.engagementId ?? engagementIdFromUrl ?? null;

  const { engagement, createEngagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  const channels = ['Voice', 'Chat', 'Email', 'Back Office', 'Social'];

  const parseList = (value: string) =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const goalsObject =
      formData.goals && typeof formData.goals === 'object'
        ? formData.goals
        : {
            primary_priority: formData.goals || null,
          };

    const engagementIntakeData = {
      geography: formData.geography,
      languages: formData.languages,
      channels: formData.channels,
      volume_per_day: formData.dailyVolume ? Number(formData.dailyVolume) : null,
      // These fields may exist in the UI/state later; keep placeholders undefined unless present.
      volume_per_month: data?.volume_per_month ?? undefined,
      seasonality_notes: data?.seasonality_notes ?? undefined,
      pain_points: formData.painPoints,
      goals: goalsObject,
    };

    const nextIntakeData = {
      ...(engagement?.intake_data ?? {}),
      engagement: {
        ...((engagement?.intake_data && engagement.intake_data.engagement) || {}),
        ...engagementIntakeData,
      },
    };

    const payload = {
      client_name: formData.clientName,
      domain: formData.industry,
      values_are_illustrative: Boolean(data?.values_are_illustrative ?? data?.valuesAreIllustrative ?? false),
      intake_mode: 'form',
      intake_data: nextIntakeData,
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
      <p className="text-[14px] text-[#494949] mb-8">Tell us about your client's business context.</p>

      <div className="space-y-6">
        {/* Client Name */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Client Name <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            placeholder="e.g. Acme Corp"
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
            required
          />
        </div>

        {/* Industry Domain */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Industry Domain <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <select
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
            required
          >
            <option value="">Select industry</option>
            <option>Financial Services</option>
            <option>Insurance</option>
            <option>Telecom</option>
            <option>Retail</option>
            <option>Healthcare</option>
            <option>Other</option>
          </select>
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
        </div>

        {/* Geography */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Geography <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <input
            type="text"
            placeholder="Add countries or regions"
            value={(formData.geography ?? []).join(', ')}
            onChange={(e) => setFormData({ ...formData, geography: parseList(e.target.value) })}
            className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
        </div>

        {/* Daily Contact Volume */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Daily Contact Volume <span className="text-[#FD4E59]">*</span>
            <HelpCircle className="w-4 h-4 text-[#6D7069]" />
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.dailyVolume}
              onChange={(e) => setFormData({ ...formData, dailyVolume: e.target.value })}
              placeholder="e.g. 38000"
              className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">
              contacts/day
            </span>
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Channels <span className="text-[#FD4E59]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => {
                  const newChannels = formData.channels.includes(channel)
                    ? formData.channels.filter((c: string) => c !== channel)
                    : [...formData.channels, channel];
                  setFormData({ ...formData, channels: newChannels });
                }}
                className={`
                  px-4 py-2 rounded-full text-[13px] font-medium border transition-colors
                  ${formData.channels.includes(channel)
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

        {/* Pain Points */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Key Pain Points
          </label>
          <textarea
            value={formData.painPoints}
            onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
            placeholder="Describe the main operational challenges the client faces."
            rows={4}
            className="w-full px-4 py-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
          />
          <button type="button" className="flex items-center gap-1 text-[12px] text-[#FFAB28] underline mt-1">
            <Sparkles className="w-3 h-3" />
            Suggest with AI
          </button>
        </div>

        {/* Business Goals */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Business Goals
          </label>
          <textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
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
