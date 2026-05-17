import { Lock, Check, Circle } from 'lucide-react';
import { usePipelineRuns } from '../../hooks/usePipelineRuns';

type FeatureStatus = 'not-started' | 'in-progress' | 'complete' | 'stale';

interface Feature {
  id: string;
  number: string;
  name: string;
  status: FeatureStatus;
  locked: boolean;
  savedComplete: boolean;
}

interface NavigationRailProps {
  currentFeature: string;
  onFeatureClick: (featureId: string) => void;
  engagementId?: string | null;
}

export function NavigationRail({ currentFeature, onFeatureClick, engagementId }: NavigationRailProps) {
  const currentFeatureNum = parseInt(currentFeature.replace('f', ''), 10);
  const pipeline = usePipelineRuns(engagementId ?? null);

  const getFeatureStatus = (featureNum: number): FeatureStatus => {
    if (featureNum < currentFeatureNum) {
      return 'complete';
    }
    if (featureNum === currentFeatureNum) {
      return 'in-progress';
    }
    if (featureNum === currentFeatureNum + 1) {
      return 'in-progress';
    }
    return 'not-started';
  };

  const savedForFeature = (id: string): boolean => {
    if (id === 'f1') return Boolean(engagementId);
    if (pipeline.isLoading) return false;
    switch (id) {
      case 'f2':
        return pipeline.f2_exists;
      case 'f3':
        return pipeline.f3_exists;
      case 'f4':
        return pipeline.f4_exists;
      case 'f5':
        return pipeline.f5_exists;
      case 'f6':
        return pipeline.f6_exists;
      case 'f7':
        return false;
      default:
        return false;
    }
  };

  const features: Feature[] = [
    {
      id: 'f1',
      number: 'F1',
      name: 'Intake',
      status: getFeatureStatus(1),
      locked: false,
      savedComplete: savedForFeature('f1'),
    },
    {
      id: 'f2',
      number: 'F2',
      name: 'Allocation',
      status: getFeatureStatus(2),
      locked: currentFeatureNum < 2,
      savedComplete: savedForFeature('f2'),
    },
    {
      id: 'f3',
      number: 'F3',
      name: 'Roles',
      status: getFeatureStatus(3),
      locked: currentFeatureNum < 3,
      savedComplete: savedForFeature('f3'),
    },
    {
      id: 'f4',
      number: 'F4',
      name: 'Pods',
      status: getFeatureStatus(4),
      locked: currentFeatureNum < 4,
      savedComplete: savedForFeature('f4'),
    },
    {
      id: 'f5',
      number: 'F5',
      name: 'Economics',
      status: getFeatureStatus(5),
      locked: currentFeatureNum < 5,
      savedComplete: savedForFeature('f5'),
    },
    {
      id: 'f6',
      number: 'F6',
      name: 'Timeline',
      status: getFeatureStatus(6),
      locked: currentFeatureNum < 6,
      savedComplete: savedForFeature('f6'),
    },
    {
      id: 'f7',
      number: 'F7',
      name: 'Summary',
      status: getFeatureStatus(7),
      locked: currentFeatureNum < 7,
      savedComplete: savedForFeature('f7'),
    },
  ];

  const getPreviousFeatureName = (currentNumber: string) => {
    const featureIndex = parseInt(currentNumber.replace('F', ''), 10) - 1;
    if (featureIndex > 0) {
      return features[featureIndex - 1].name;
    }
    return 'previous step';
  };

  const getSavedStatusIcon = (savedComplete: boolean) => {
    if (savedComplete) {
      return <Check className="w-4 h-4 text-[#4CAF50]" strokeWidth={2.5} />;
    }
    return <Circle className="w-3.5 h-3.5 text-[#6D7069]" strokeWidth={1.5} />;
  };

  return (
    <nav className="w-[200px] h-full bg-[#FDF8F4] border-r border-[#161916]/8 flex flex-col justify-between">
      <div className="flex flex-col">
        {features.map((feature) => {
          const isActive = currentFeature === feature.id;

          return (
            <button
              key={feature.id}
              onClick={() => !feature.locked && onFeatureClick(feature.id)}
              disabled={feature.locked}
              className={`
                relative h-11 w-full px-4 flex items-center justify-between group
                ${isActive ? 'bg-[#FD4E59]/10' : 'hover:bg-[#FDF8F4]'}
                ${feature.locked ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FD4E59]" />}

              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium
                    ${isActive
                      ? 'bg-[#FD4E59] text-white'
                      : feature.locked
                        ? 'border border-dashed border-[#6D7069] text-[#6D7069]'
                        : 'border border-[#161916]/20 text-[#161916]'
                    }
                  `}
                >
                  {feature.number.replace('F', '')}
                </div>
                <span
                  className={`text-[11px] font-medium uppercase tracking-wide ${
                    isActive ? 'text-[#FD4E59] font-bold' : feature.locked ? 'text-[#6D7069]' : 'text-[#161916]'
                  }`}
                >
                  {feature.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {feature.locked ? (
                  <Lock className="w-3 h-3 text-[#6D7069]" />
                ) : (
                  getSavedStatusIcon(feature.savedComplete)
                )}
              </div>

              {feature.locked && (
                <div className="hidden group-hover:block absolute left-full ml-2 z-10 px-3 py-2 bg-white text-[#161916] text-[12px] rounded shadow-lg whitespace-nowrap border border-[#161916]/10">
                  Complete {getPreviousFeatureName(feature.number)} first
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
