import { useCallback, useState } from 'react';
import {
  useForceRerun,
  useMountPipelineCacheRedirect,
  usePipelineCacheEntry,
} from '../../../hooks/usePipelineCacheEntry';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { isForceRerun, setForceRerunFlag } from '../../../lib/pipelineCacheUtils';
import { F4_0_PreRun } from './pods/F4_0_PreRun';
import { F4_1_VariantSelector } from './pods/F4_1_VariantSelector';
import { F4_2_OrgRollup } from './pods/F4_2_OrgRollup';
import { F4_3_ShowMathDrawer } from './pods/F4_3_ShowMathDrawer';

type PodScreen = 'pre-run' | 'variant-selector' | 'org-rollup';

interface PodStructureProps {
  onBack?: () => void;
  onProceedToF5?: () => void;
  onGoToF3?: () => void;
  initialScreen?: PodScreen;
  f4Message?: string | null;
  engagementId?: string | null;
}

export function PodStructure({
  onBack,
  onProceedToF5,
  onGoToF3,
  initialScreen = 'pre-run',
  f4Message,
  engagementId,
}: PodStructureProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { hasCachedResults, isLoading: pipelineLoading } = usePipelineCacheEntry('f4', activeEngagementId);

  const [currentScreen, setCurrentScreen] = useState<PodScreen>(initialScreen);
  const [showMathDrawer, setShowMathDrawer] = useState(false);
  const goToOrgRollup = useCallback(() => setCurrentScreen('org-rollup'), []);
  const forceRerun = useForceRerun();
  useMountPipelineCacheRedirect('f4', activeEngagementId, goToOrgRollup, {
    enabled: currentScreen === 'pre-run' && !forceRerun,
  });

  const handleReRunToPreRun = useCallback(() => {
    setForceRerunFlag(true);
    setCurrentScreen('pre-run');
  }, []);

  const handleGeneratePodVariants = () => {
    if (!isForceRerun() && hasCachedResults) {
      setCurrentScreen('org-rollup');
      return;
    }
    setCurrentScreen('variant-selector');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <PipelinePreRunGate
            feature="f4"
            engagementId={activeEngagementId}
            onSkipToResults={() => setCurrentScreen('org-rollup')}
          >
            <F4_0_PreRun
              onGeneratePodVariants={handleGeneratePodVariants}
              onBack={onBack}
              onGoToF3={onGoToF3}
            />
          </PipelinePreRunGate>
        );
      case 'variant-selector':
        return (
          <F4_1_VariantSelector
            onViewOrgRollup={() => setCurrentScreen('org-rollup')}
            onShowMath={() => setShowMathDrawer(true)}
            message={f4Message}
            onReRunToPreRun={handleReRunToPreRun}
          />
        );
      case 'org-rollup':
        return (
          <F4_2_OrgRollup
            onBack={() => setCurrentScreen('variant-selector')}
            onShowMath={() => setShowMathDrawer(true)}
            onProceedToF5={onProceedToF5}
            onRedirectToVariants={() => setCurrentScreen('variant-selector')}
            onReRunToPreRun={handleReRunToPreRun}
          />
        );
    }
  };

  if (!isForceRerun() && pipelineLoading && currentScreen === 'pre-run') {
    return <PipelineCacheLoading />;
  }

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
