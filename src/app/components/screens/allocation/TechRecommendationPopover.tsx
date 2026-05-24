import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getConsiderationsForCategory } from '../../../../lib/techStackLibrary';
import { TechBrandLogo } from './TechBrandLogo';

export type TechRecommendation = {
  tech_id: string;
  tech_name: string;
  logo: string;
  logo_alt?: string;
  logo_domain?: string;
  brand_abbrev?: string;
  annual_cost_usd: number;
  category: string;
  setup_weeks: string;
  maintenance_hours_monthly: string;
  rationale: string;
  task_name: string;
  fit?: 'primary' | 'complementary';
};

interface TechRecommendationPopoverProps {
  recommendation: TechRecommendation;
  anchorRect: DOMRect;
  onClose: () => void;
}

function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function TechRecommendationPopover({
  recommendation,
  anchorRect,
  onClose,
}: TechRecommendationPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const width = 340;
    const margin = 8;
    const estimatedHeight = panel?.offsetHeight ?? 420;
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;

    if (top + estimatedHeight > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - estimatedHeight - margin);
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const considerations = getConsiderationsForCategory(recommendation.category);

  return (
    <>
      <div className="fixed inset-0 z-[60]" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tech-popover-title"
        className="fixed z-[61] w-[340px] bg-white border border-[#494949]/15 rounded-xl shadow-lg p-4 text-[#161916]"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <TechBrandLogo
            name={recommendation.tech_name}
            logo={recommendation.logo}
            logoAlt={recommendation.logo_alt}
            brandAbbrev={recommendation.brand_abbrev}
            size="md"
          />
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 id="tech-popover-title" className="text-[16px] font-bold text-[#161916] leading-tight pr-6">
              {recommendation.tech_name}
            </h3>
            <p className="text-[12px] text-[#6D7069]">{recommendation.category}</p>
            {recommendation.fit === 'complementary' ? (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#FFF0DC] text-[#6D7069]">
                Complementary fit
              </span>
            ) : (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#E2EFDA] text-[#548235]">
                Primary fit
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-[#6D7069] hover:text-[#161916] rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="border-t border-[#494949]/12 pt-3 mb-3">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Recommended for</div>
          <p className="text-[13px] text-[#161916] italic">&ldquo;{recommendation.task_name || 'This task'}&rdquo;</p>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Why it fits</div>
          <p className="text-[13px] text-[#494949] leading-relaxed">{recommendation.rationale}</p>
        </div>

        <div className="border-t border-[#494949]/12 pt-3 mb-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-4">
            <span className="text-[#6D7069]">Annual license cost</span>
            <span className="font-semibold text-[#161916] tabular-nums">{formatUsd(recommendation.annual_cost_usd)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6D7069]">Typical setup</span>
            <span className="font-medium text-[#161916]">{recommendation.setup_weeks} weeks</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#6D7069]">Maintenance</span>
            <span className="font-medium text-[#161916]">{recommendation.maintenance_hours_monthly} hrs/month</span>
          </div>
        </div>

        <div className="border-t border-[#494949]/12 pt-3">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Considerations</div>
          <ul className="space-y-1.5 text-[12px] text-[#494949] leading-snug list-none">
            {considerations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#FD4E59] shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
