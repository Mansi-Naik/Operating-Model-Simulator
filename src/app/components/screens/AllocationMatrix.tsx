import { useCallback, useMemo, useState } from 'react';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { clearF2SavedState } from '../../../lib/pipelineRerunClear';
import { tasksFullyAllocated, tasksMissingAiAllocation } from '../../../lib/pipelineCacheUtils';
import { toast } from 'sonner';
import { F2_0_PreRun } from './allocation/F2_0_PreRun';
import { F2_1_Generation } from './allocation/F2_1_Generation';
import { F2_2_MatrixView } from './allocation/F2_2_MatrixView';
import { F2_3_TaskDrawer } from './allocation/F2_3_TaskDrawer';
import { useEngagement } from '../../../hooks/useEngagement';
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
  const [generationRunKey, setGenerationRunKey] = useState(0);
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

  const handleGenerationComplete = useCallback(
    async (result: { processedTaskIds: string[]; failedTaskIds: string[]; total: number }) => {
      setGenerationResult(result);
      await refreshPipeline();
      if (activeEngagementId) {
        await loadEngagement(activeEngagementId);
      }
      if (result.failedTaskIds.length > 0) {
        toast.warning(
          `${result.failedTaskIds.length} task(s) could not be allocated. Click "Allocate remaining" on the matrix or re-run F2.`,
        );
      } else if (result.processedTaskIds.length > 0) {
        const filled = result.processedTaskIds.length;
        toast.success(
          filled === result.total
            ? `Allocation complete for all ${result.total} tasks.`
            : `Saved allocations for ${filled} task${filled === 1 ? '' : 's'}.`,
        );
      }
      setCurrentScreen('matrix-view');
    },
    [activeEngagementId, loadEngagement, refreshPipeline],
  );

  const startAllocationGeneration = (sourceTasks: Record<string, unknown>[]) => {
    setGenerationInput({
      engagementId: activeEngagementId,
      tasks: sourceTasks,
    });
    setGenerationResult(null);
    setGenerationRunKey((k) => k + 1);
    setCurrentScreen('generating');
  };

  const handleGenerate = (appetite: string) => {
    void appetite;
    const sourceTasks = Array.isArray(tasks) ? tasks : [];
    if (hasCachedResults && tasksFullyAllocated(sourceTasks)) {
      setCurrentScreen('matrix-view');
      return;
    }
    const missing = tasksMissingAiAllocation(sourceTasks);
    if (missing.length > 0 && missing.length < sourceTasks.length) {
      toast.info(`Allocating ${missing.length} remaining task${missing.length === 1 ? '' : 's'}…`);
    }
    startAllocationGeneration(sourceTasks);
  };

  const handleFillMissingAllocations = () => {
    const sourceTasks = Array.isArray(tasks) ? tasks : [];
    const missing = tasksMissingAiAllocation(sourceTasks);
    if (missing.length === 0) {
      toast.message('Every task already has a saved AI allocation.');
      return;
    }
    toast.info(`Allocating ${missing.length} remaining task${missing.length === 1 ? '' : 's'}…`);
    startAllocationGeneration(sourceTasks);
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
    const loaded = await loadEngagement(activeEngagementId);
    await refreshPipeline();
    setGenerationResult(null);
    const sourceTasks = Array.isArray(loaded?.tasks) ? loaded.tasks : [];
    setGenerationInput({
      engagementId: activeEngagementId,
      tasks: sourceTasks,
    });
    setGenerationRunKey((k) => k + 1);
    setCurrentScreen('generating');
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
            key={generationRunKey}
            generationRunKey={generationRunKey}
            onCancel={handleCancel}
            onBack={() => setCurrentScreen('pre-run')}
            engagementId={generationInput.engagementId}
            onComplete={handleGenerationComplete}
          />
        );
      case 'matrix-view':
        return (
          <>
            <F2_2_MatrixView
              onTaskClick={handleTaskClick}
              onReRun={handleReRunToPreRun}
              onFillMissing={handleFillMissingAllocations}
              onBack={() => setCurrentScreen('pre-run')}
              onProceedToF3={onProceedToF3}
              generationResult={generationResult}
              engagementId={generationInput.engagementId ?? activeEngagementId}
            />
          </>
        );
    }
  };

  if (pipelineLoading && currentScreen === 'pre-run') {
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
