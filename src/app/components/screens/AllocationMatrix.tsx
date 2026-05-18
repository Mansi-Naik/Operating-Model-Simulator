import { useCallback, useMemo, useState } from 'react';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { clearF2SavedState } from '../../../lib/pipelineRerunClear';
import { F2_0_PreRun } from './allocation/F2_0_PreRun';
import { F2_1_Generation } from './allocation/F2_1_Generation';
import { F2_2_MatrixView } from './allocation/F2_2_MatrixView';
import { F2_3_TaskDrawer } from './allocation/F2_3_TaskDrawer';
import { useEngagement } from '../../../hooks/useEngagement';
import { getFinalAllocation } from '../../../lib/roleAggregation';

type AllocationScreen = 'pre-run' | 'generating' | 'matrix-view';

interface AllocationMatrixProps {
  onBack?: () => void;
  onProceedToF3?: () => void;
  engagementId?: string | null;
}

export function AllocationMatrix({ onBack, onProceedToF3, engagementId: engagementIdProp }: AllocationMatrixProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementIdProp ?? engagementIdFromUrl;
  const { engagement, tasks, loadEngagement } = useEngagement(activeEngagementId);
  const { hasCachedResults, isLoading: pipelineLoading, refresh: refreshPipeline } = usePipelineCacheEntry(
    'f2',
    activeEngagementId,
  );
  const [currentScreen, setCurrentScreen] = useState<AllocationScreen>('pre-run');
  const goToMatrixView = useCallback(() => setCurrentScreen('matrix-view'), []);
  useMountPipelineCacheRedirect('f2', activeEngagementId, goToMatrixView, {
    enabled: currentScreen === 'pre-run',
  });
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [generationInput, setGenerationInput] = useState<{
    engagementId: string | null;
    tasks: any[];
  }>({
    engagementId: activeEngagementId,
    tasks: [],
  });
  const [generationResult, setGenerationResult] = useState<{
    processedTaskIds: string[];
    failedTaskIds: string[];
    total: number;
  } | null>(null);

  const taskCount = (tasks ?? []).length;
  const drawerEngagementId = generationInput.engagementId ?? activeEngagementId;
  const readinessScore =
    typeof engagement?.readiness_score === 'number' ? engagement.readiness_score : null;
  const readinessBand =
    typeof engagement?.readiness_band === 'string' ? engagement.readiness_band : null;
  const automationAppetite = useMemo(() => {
    const intakeData = engagement?.intake_data;
    if (!intakeData || typeof intakeData !== 'object') return null;
    const preferences = (intakeData as Record<string, any>).preferences;
    if (!preferences || typeof preferences !== 'object') return null;
    return typeof preferences.automation_appetite === 'string'
      ? preferences.automation_appetite
      : null;
  }, [engagement?.intake_data]);

  const handleGenerate = (appetite: string) => {
    void appetite;
    if (hasCachedResults) {
      setCurrentScreen('matrix-view');
      return;
    }
    const sourceTasks = Array.isArray(tasks) ? tasks : [];
    setGenerationInput({
      engagementId: activeEngagementId,
      tasks: sourceTasks,
    });
    setGenerationResult(null);
    setCurrentScreen('generating');
  };

  const handleCancel = () => {
    setCurrentScreen('pre-run');
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDrawer(true);
  };

  const handleReRunToPreRun = useCallback(async () => {
    if (!activeEngagementId) {
      throw new Error('Missing engagement');
    }
    await clearF2SavedState(activeEngagementId);
    await loadEngagement(activeEngagementId);
    await refreshPipeline();
    setGenerationResult(null);
    setCurrentScreen('pre-run');
  }, [activeEngagementId, loadEngagement, refreshPipeline]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <PipelinePreRunGate
            feature="f2"
            engagementId={activeEngagementId}
            onSkipToResults={goToMatrixView}
          >
            <F2_0_PreRun
              onGenerate={handleGenerate}
              onBack={onBack}
              taskCount={taskCount}
              readinessScore={readinessScore}
              readinessBand={readinessBand}
              initialAutomationAppetite={automationAppetite}
            />
          </PipelinePreRunGate>
        );
      case 'generating':
        return (
          <F2_1_Generation
            onCancel={handleCancel}
            onBack={() => setCurrentScreen('pre-run')}
            engagementId={generationInput.engagementId}
            onComplete={async (result) => {
              setGenerationResult(result);
              let loadedTasks: Record<string, unknown>[] = [];
              if (generationInput.engagementId) {
                const loaded = await loadEngagement(generationInput.engagementId);
                loadedTasks = Array.isArray(loaded?.tasks) ? (loaded.tasks as Record<string, unknown>[]) : [];
              }
              const allAllocated =
                loadedTasks.length > 0 &&
                loadedTasks.every((t) => getFinalAllocation(t).length > 0);
              if (allAllocated) {
                setCurrentScreen('matrix-view');
              } else {
                setCurrentScreen('pre-run');
              }
            }}
          />
        );
      case 'matrix-view':
        return (
          <>
            <F2_2_MatrixView
              onTaskClick={handleTaskClick}
              onReRun={handleReRunToPreRun}
              onBack={() => setCurrentScreen('pre-run')}
              onProceedToF3={onProceedToF3}
              generationResult={generationResult}
              engagementId={generationInput.engagementId ?? activeEngagementId}
            />
          </>
        );
    }
  };

  if (pipelineLoading && (currentScreen === 'pre-run' || currentScreen === 'generating')) {
    return <PipelineCacheLoading />;
  }

  return (
    <>
      {renderScreen()}
      {showTaskDrawer && selectedTaskId && (
        <F2_3_TaskDrawer
          taskId={selectedTaskId}
          engagementId={drawerEngagementId}
          engagement={engagement as Record<string, unknown> | null}
          onClose={() => {
            setShowTaskDrawer(false);
            setSelectedTaskId(null);
          }}
          onSaved={async () => {
            if (drawerEngagementId) {
              await loadEngagement(drawerEngagementId);
            }
          }}
        />
      )}
    </>
  );
}
