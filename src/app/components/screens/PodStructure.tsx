import { useState } from 'react';
import { F4_0_PreRun } from './pods/F4_0_PreRun';
import { F4_1_VariantSelector } from './pods/F4_1_VariantSelector';
import { F4_2_OrgRollup } from './pods/F4_2_OrgRollup';
import { F4_3_ShowMathDrawer } from './pods/F4_3_ShowMathDrawer';

type PodScreen = 'pre-run' | 'variant-selector' | 'org-rollup';

interface PodStructureProps {
  onBack?: () => void;
  onProceedToF5?: () => void;
  onGoToF3?: () => void;
}

export function PodStructure({ onBack, onProceedToF5, onGoToF3 }: PodStructureProps) {
  const [currentScreen, setCurrentScreen] = useState<PodScreen>('pre-run');
  const [showMathDrawer, setShowMathDrawer] = useState(false);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <F4_0_PreRun
            onGeneratePodVariants={() => setCurrentScreen('variant-selector')}
            onBack={onBack}
            onGoToF3={onGoToF3}
          />
        );
      case 'variant-selector':
        return (
          <F4_1_VariantSelector
            onViewOrgRollup={() => setCurrentScreen('org-rollup')}
            onShowMath={() => setShowMathDrawer(true)}
          />
        );
      case 'org-rollup':
        return (
          <F4_2_OrgRollup
            onBack={() => setCurrentScreen('variant-selector')}
            onShowMath={() => setShowMathDrawer(true)}
            onProceedToF5={onProceedToF5}
            onRedirectToVariants={() => setCurrentScreen('variant-selector')}
          />
        );
    }
  };

  return (
    <div className="relative">
      {/* Dimmed overlay when drawer is open */}
      {showMathDrawer && (
        <div className="absolute inset-0 bg-black/30 z-40" onClick={() => setShowMathDrawer(false)} />
      )}

      {renderScreen()}

      {/* Show Math Drawer */}
      {showMathDrawer && <F4_3_ShowMathDrawer onClose={() => setShowMathDrawer(false)} />}
    </div>
  );
}
