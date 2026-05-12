import { Sparkles } from 'lucide-react';

type Confidence = 'high' | 'medium' | 'low';

interface IntakeAiBadgeProps {
  confidence: Confidence;
}

export function IntakeAiBadge({ confidence }: IntakeAiBadgeProps) {
  const label = confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low';
  return (
    <span
      title={`This value was extracted from your uploaded document with ${label.toLowerCase()} confidence. Click the field to edit.`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF0DC] text-[#FFAB28] border border-[#FFAB28]/40"
    >
      <Sparkles className="w-3 h-3 shrink-0" />
      AI extracted
    </span>
  );
}
