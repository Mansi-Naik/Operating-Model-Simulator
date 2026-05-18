import { useCallback, useState } from 'react';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { clearF4SavedState } from '../../../lib/pipelineRerunClear';
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
  const { hasCachedResults, isLoading: pipelineLoading, refresh: refreshPipeline } = usePipelineCacheEntry(
    'f4',
    activeEngagementId,
  );

  const [currentScreen, setCurrentScreen] = useState<PodScreen>(initialScreen);
  const [showMathDrawer, setShowMathDrawer] = useState(false);
  const goToOrgRollup = useCallback(() => setCurrentScreen('org-rollup'), []);
  useMountPipelineCacheRedirect('f4', activeEngagementId, goToOrgRollup, {
    enabled: currentScreen === 'pre-run',
  });

  const handleReRunToPreRun = useCallback(async () => {
    if (!activeEngagementId) {
      throw new Error('Missing engagement');
    }
    await clearF4SavedState(activeEngagementId);
    await refreshPipeline();
    setCurrentScreen('pre-run');
  }, [activeEngagementId, refreshPipeline]);

  const handleGeneratePodVariants = () => {
    if (hasCachedResults) {
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

  if (pipelineLoading && currentScreen === 'pre-run') {
    return <PipelineCacheLoading />;
  }

  return (
    <div className="relative">
      {showMathDrawer && (
        <div className="absolute inset-0 bg-black/30 z-40" onClick={() => setShowMathDrawer(false)} />
      )}

      {renderScreen()}

      {showMathDrawer && <F4_3_ShowMathDrawer onClose={() => setShowMathDrawer(false)} />}
    </div>
  );
}
