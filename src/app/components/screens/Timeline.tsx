import { useCallback, useEffect, useState } from 'react';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { isForceRerun, setForceRerunFlag } from '../../../lib/pipelineCacheUtils';
import { F6_0_PreRun } from './timeline/F6_0_PreRun';
import { F6_1_ImplementationTimeline } from './timeline/F6_1_ImplementationTimeline';
import { F6_1_B_DependenciesView } from './timeline/F6_1_B_DependenciesView';
import { F6_1_C_GanttView } from './timeline/F6_1_C_GanttView';
import { F6_1_TimelineGeneration } from './timeline/F6_1_TimelineGeneration';
import { F6_2_ScenarioComparison } from './timeline/F6_2_ScenarioComparison';

type TimelineScreen = 'pre-run' | 'loading' | 'implementation' | 'gantt' | 'dependencies' | 'scenarios';

interface TimelineProps {
  onBack?: () => void;
  onProceedToF7?: () => void;
  onGoToF5?: () => void;
  onGoToF3?: () => void;
  /** When set (e.g. returning from F7), opens this sub-screen once. */
  initialScreen?: TimelineScreen;
  engagementId?: string | null;
}

export function Timeline({ onBack, onProceedToF7, onGoToF5, onGoToF3, initialScreen, engagementId }: TimelineProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { hasCachedResults, isLoading: pipelineLoading } = usePipelineCacheEntry('f6', activeEngagementId);

  const [currentScreen, setCurrentScreen] = useState<TimelineScreen>(initialScreen ?? 'pre-run');
  const goToGantt = useCallback(() => {
    if (!initialScreen) setCurrentScreen('gantt');
  }, [initialScreen]);
  useMountPipelineCacheRedirect('f6', activeEngagementId, goToGantt, {
    enabled: !initialScreen,
  });

  useEffect(() => {
    if (initialScreen) setCurrentScreen(initialScreen);
  }, [initialScreen]);

  const handleGenerateTimeline = () => {
    if (!isForceRerun() && hasCachedResults) {
      setCurrentScreen('gantt');
      return;
    }
    setForceRerunFlag(false);
    setCurrentScreen('loading');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <PipelinePreRunGate
            feature="f6"
            engagementId={activeEngagementId}
            onSkipToResults={() => setCurrentScreen('gantt')}
          >
            <F6_0_PreRun
              onGenerateTimeline={handleGenerateTimeline}
              onBack={onBack}
              onGoToF5={onGoToF5}
            />
          </PipelinePreRunGate>
        );
      case 'loading':
        return (
          <F6_1_TimelineGeneration
            onComplete={() => {
              setForceRerunFlag(false);
              setCurrentScreen('gantt');
            }}
            onCancel={() => setCurrentScreen('pre-run')}
            onBack={() => setCurrentScreen('pre-run')}
          />
        );
      case 'implementation':
        return (
          <F6_1_ImplementationTimeline
            onViewScenarios={() => setCurrentScreen('scenarios')}
            onBack={onBack}
            onProceedToF7={onProceedToF7}
          />
        );
      case 'gantt':
        return (
          <F6_1_C_GanttView
            onBack={() => setCurrentScreen('pre-run')}
            onViewDependencies={() => setCurrentScreen('dependencies')}
            onProceedToF7={onProceedToF7}
            onMissingTimeline={() => setCurrentScreen('pre-run')}
            onGoToF3={onGoToF3}
            onReRunToPreRun={() => setCurrentScreen('pre-run')}
          />
        );
      case 'dependencies':
        return (
          <F6_1_B_DependenciesView
            onBack={() => setCurrentScreen('gantt')}
            onViewGantt={() => setCurrentScreen('gantt')}
            onMissingTimeline={() => setCurrentScreen('pre-run')}
          />
        );
      case 'scenarios':
        return <F6_2_ScenarioComparison onBack={() => setCurrentScreen('implementation')} />;
    }
  };

  if (
    !initialScreen &&
    !isForceRerun() &&
    pipelineLoading &&
    (currentScreen === 'pre-run' || currentScreen === 'loading')
  ) {
    return <PipelineCacheLoading />;
  }

  return <>{renderScreen()}</>;
}
