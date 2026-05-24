import { useState } from 'react';
import { recommendTechStackForTask } from '../../../../lib/techStackLibrary';
import { TechRecommendationPopover, type TechRecommendation } from './TechRecommendationPopover';
import { TechBrandLogo } from './TechBrandLogo';

function TechLogoButton({
  recommendation,
  stackSize,
  onOpen,
}: {
  recommendation: TechRecommendation;
  stackSize: number;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const fitLabel = recommendation.fit === 'complementary' ? 'Also fits' : 'Primary fit';

  return (
    <button
      type="button"
      className="tech-icon-button group relative w-8 h-8 rounded-lg bg-white border border-[#494949]/12 flex items-center justify-center hover:scale-105 hover:border-[#FD4E59]/40 hover:shadow-sm transition-all cursor-pointer shrink-0"
      title={`${recommendation.tech_name} — ${fitLabel}`}
      aria-label={`${recommendation.tech_name}, ${fitLabel}`}
      onClick={onOpen}
    >
      <TechBrandLogo
        name={recommendation.tech_name}
        logo={recommendation.logo}
        logoAlt={recommendation.logo_alt}
        brandAbbrev={recommendation.brand_abbrev}
      />
      {stackSize > 1 && recommendation.fit === 'primary' ? (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FD4E59] border border-white" aria-hidden />
      ) : null}
    </button>
  );
}

interface TechIconCellProps {
  taskRow: Record<string, unknown>;
}

export function TechIconCell({ taskRow }: TechIconCellProps) {
  const [popover, setPopover] = useState<{
    recommendation: TechRecommendation;
    anchorRect: DOMRect;
  } | null>(null);

  const recommendations = recommendTechStackForTask(taskRow);
  if (recommendations.length === 0) {
    return <td className="px-2 py-4 w-[120px]" onClick={(e) => e.stopPropagation()} />;
  }

  const openPopover = (recommendation: TechRecommendation) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ recommendation, anchorRect: rect });
  };

  return (
    <td className="px-2 py-4 w-[120px] align-middle" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-center gap-1 max-w-[112px] mx-auto">
        {recommendations.map((rec) => (
          <TechLogoButton
            key={rec.tech_id}
            recommendation={rec}
            stackSize={recommendations.length}
            onOpen={openPopover(rec)}
          />
        ))}
      </div>
      {recommendations.length > 1 ? (
        <p className="text-[10px] text-[#6D7069] text-center mt-1 leading-none">{recommendations.length} tools</p>
      ) : null}
      {popover ? (
        <TechRecommendationPopover
          recommendation={popover.recommendation}
          anchorRect={popover.anchorRect}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </td>
  );
}
