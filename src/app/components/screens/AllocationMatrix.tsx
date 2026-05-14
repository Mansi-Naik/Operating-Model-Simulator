import { useMemo, useState } from 'react';
import { F2_0_PreRun } from './allocation/F2_0_PreRun';
import { F2_1_Generation } from './allocation/F2_1_Generation';
import { F2_2_MatrixView } from './allocation/F2_2_MatrixView';
import { F2_3_TaskDrawer } from './allocation/F2_3_TaskDrawer';
import { F2_5_BulkModal } from './allocation/F2_5_BulkModal';
import { useEngagement } from '../../../hooks/useEngagement';

type AllocationScreen = 'pre-run' | 'generating' | 'matrix-view';

interface AllocationMatrixProps {
  onBack?: () => void;
  onProceedToF3?: () => void;
}

export function AllocationMatrix({ onBack, onProceedToF3 }: AllocationMatrixProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const { engagement, tasks, loadEngagement } = useEngagement(engagementIdFromUrl);
  const [currentScreen, setCurrentScreen] = useState<AllocationScreen>('pre-run');
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showReRunModal, setShowReRunModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [generationInput, setGenerationInput] = useState<{
    engagementId: string | null;
    tasks: any[];
  }>({
    engagementId: engagementIdFromUrl,
    tasks: [],
  });
  const [generationResult, setGenerationResult] = useState<{
    processedTaskIds: string[];
    failedTaskIds: string[];
    total: number;
  } | null>(null);

  const taskCount = (tasks ?? []).length;
  const activeEngagementId = generationInput.engagementId ?? engagementIdFromUrl;
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
    const sourceTasks = Array.isArray(tasks) ? tasks : [];
    setGenerationInput({
      engagementId: engagementIdFromUrl,
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

  const handleReRun = () => {
    setShowReRunModal(true);
  };

  const handleConfirmReRun = () => {
    setShowReRunModal(false);
    setGenerationResult(null);
    setCurrentScreen('generating');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <F2_0_PreRun
            onGenerate={handleGenerate}
            onBack={onBack}
            taskCount={taskCount}
            readinessScore={readinessScore}
            readinessBand={readinessBand}
            initialAutomationAppetite={automationAppetite}
          />
        );
      case 'generating':
        return (
          <F2_1_Generation
            onCancel={handleCancel}
            onBack={() => setCurrentScreen('pre-run')}
            engagementId={generationInput.engagementId}
            onComplete={async (result) => {
              setGenerationResult(result);
              if (generationInput.engagementId) {
                await loadEngagement(generationInput.engagementId);
              }
              setCurrentScreen('matrix-view');
            }}
          />
        );
      case 'matrix-view':
        return (
          <>
            <F2_2_MatrixView
              onTaskClick={handleTaskClick}
              onReRun={handleReRun}
              onBack={() => setCurrentScreen('pre-run')}
              onProceedToF3={onProceedToF3}
              generationResult={generationResult}
              engagementId={generationInput.engagementId}
            />
          </>
        );
    }
  };

  return (
    <>
      {renderScreen()}
      {showTaskDrawer && selectedTaskId && (
        <F2_3_TaskDrawer
          taskId={selectedTaskId}
          engagementId={activeEngagementId}
          engagement={engagement as Record<string, unknown> | null}
          onClose={() => {
            setShowTaskDrawer(false);
            setSelectedTaskId(null);
          }}
          onSaved={async () => {
            if (activeEngagementId) {
              await loadEngagement(activeEngagementId);
            }
            // Engagement F3–F7 refresh flag: set via engagements.status or stale marker (follow-up).
          }}
        />
      )}
      {showReRunModal && (
        <F2_5_BulkModal
          onClose={() => setShowReRunModal(false)}
          onReRun={handleConfirmReRun}
        />
      )}
    </>
  );
}
