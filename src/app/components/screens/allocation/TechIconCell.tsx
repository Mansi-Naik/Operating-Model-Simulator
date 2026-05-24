import { useState } from 'react';
import { recommendTechForTask } from '../../../../lib/techStackLibrary';
import { TechRecommendationPopover, type TechRecommendation } from './TechRecommendationPopover';

function TechLogoButton({
  recommendation,
  onOpen,
}: {
  recommendation: TechRecommendation;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initial = recommendation.tech_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <button
      type="button"
      className="tech-icon-button w-9 h-9 rounded-full bg-[#FFF0DC] border border-[#494949]/10 flex items-center justify-center hover:scale-105 hover:shadow-md transition-transform cursor-pointer mx-auto"
      title={recommendation.tech_name}
      onClick={onOpen}
    >
      {logoFailed ? (
        <span className="w-7 h-7 rounded-full bg-[#FD4E59] text-white text-[12px] font-bold flex items-center justify-center">
          {initial}
        </span>
      ) : (
        <img
          src={recommendation.logo}
          alt={recommendation.tech_name}
          className="w-7 h-7 rounded object-contain"
          onError={() => setLogoFailed(true)}
        />
      )}
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

  const recommendation = recommendTechForTask(taskRow);
  if (!recommendation) {
    return <td className="px-2 py-4 w-[72px]" onClick={(e) => e.stopPropagation()} />;
  }

  const openPopover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ recommendation, anchorRect: rect });
  };

  return (
    <td className="px-2 py-4 w-[72px] text-center" onClick={(e) => e.stopPropagation()}>
      <TechLogoButton recommendation={recommendation} onOpen={openPopover} />
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
