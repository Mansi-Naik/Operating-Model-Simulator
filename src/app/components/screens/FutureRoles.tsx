import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEngagement } from '../../../hooks/useEngagement';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { clearF3SavedState } from '../../../lib/pipelineRerunClear';
import { computeF3PreRunPreview } from '../../../lib/f3PreRunPreview';
import { F3_0_PreRun } from './roles/F3_0_PreRun';
import { F3_1_Generation } from './roles/F3_1_Generation';
import { F3_1_RolesGrid } from './roles/F3_1_RolesGrid';
import { F3_2_RoleDetail } from './roles/F3_2_RoleDetail';
import { F3_3_EmergentRoleDetail } from './roles/F3_3_EmergentRoleDetail';

type RolesScreen = 'pre-run' | 'generating' | 'roles-grid' | 'role-detail' | 'emergent-role-detail';

interface FutureRolesProps {
  onBack?: () => void;
  onProceedToF4?: () => void;
  onGoToF2?: () => void;
  engagementId?: string | null;
}

export function FutureRoles({ onBack, onProceedToF4, onGoToF2, engagementId: engagementIdProp }: FutureRolesProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementIdProp ?? engagementIdFromUrl;

  const { engagement, tasks, loading, error, loadEngagement } = useEngagement(activeEngagementId);
  const { isLoading: pipelineLoading, refresh: refreshPipeline } = usePipelineCacheEntry(
    'f3',
    activeEngagementId,
  );

  const [currentScreen, setCurrentScreen] = useState<RolesScreen>('pre-run');
  const goToRolesGrid = useCallback(() => setCurrentScreen('roles-grid'), []);
  useMountPipelineCacheRedirect('f3', activeEngagementId, goToRolesGrid, {
    enabled: currentScreen === 'pre-run',
  });
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedEmergentRole, setSelectedEmergentRole] = useState<string | null>(null);
  const [generationRunKey, setGenerationRunKey] = useState(0);
  const [forceGeneration, setForceGeneration] = useState(false);

  useEffect(() => {
    if (activeEngagementId) {
      void loadEngagement(activeEngagementId);
    }
  }, [activeEngagementId, loadEngagement]);

  const preview = useMemo(
    () => computeF3PreRunPreview(tasks, engagement as Record<string, unknown> | null),
    [tasks, engagement],
  );

  const handleGenerate = useCallback(() => {
    setForceGeneration(false);
    setGenerationRunKey((k) => k + 1);
    setCurrentScreen('generating');
  }, []);

  const handleGenerationComplete = useCallback(
    async (result?: { failedRoles: string[]; roleNames: string[] }) => {
      setForceGeneration(false);
      if (activeEngagementId) {
        await loadEngagement(activeEngagementId);
        await refreshPipeline();
      }
      if (result?.failedRoles?.length) {
        toast.warning(
          `${result.failedRoles.length} role(s) could not be redesigned. Others are available on the grid.`,
        );
      }
      setCurrentScreen('roles-grid');
    },
    [activeEngagementId, loadEngagement, refreshPipeline],
  );

  const handleCancelGeneration = useCallback(() => {
    setForceGeneration(false);
    setCurrentScreen('pre-run');
  }, []);

  const handleRoleClick = (roleName: string) => {
    setSelectedRole(roleName);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', roleName);
      window.history.pushState({}, '', url.toString());
    }
    setCurrentScreen('role-detail');
  };

  const handleEmergentRoleClick = (roleName: string) => {
    setSelectedEmergentRole(roleName);
    setCurrentScreen('emergent-role-detail');
  };

  const handleReRunToPreRun = useCallback(async () => {
    if (!activeEngagementId) {
      throw new Error('Missing engagement');
    }
    await clearF3SavedState(activeEngagementId);
    await loadEngagement(activeEngagementId);
    await refreshPipeline();
    setForceGeneration(true);
    setGenerationRunKey((k) => k + 1);
    setCurrentScreen('generating');
  }, [activeEngagementId, loadEngagement, refreshPipeline]);

  const handleBackToGrid = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.pushState({}, '', url.toString());
    }
    setCurrentScreen('roles-grid');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <PipelinePreRunGate
            feature="f3"
            engagementId={activeEngagementId}
            onSkipToResults={goToRolesGrid}
          >
            <F3_0_PreRun
              onGenerate={handleGenerate}
              onBack={onBack}
              onGoToF2={onGoToF2}
              loading={loading}
              error={error}
              needsF2Banner={!preview.hasF2Predictions}
              patternSummary={preview.patternSummary}
              previewRows={preview.previewRows}
              emergentHint={preview.emergentHint}
            />
          </PipelinePreRunGate>
        );
      case 'generating':
        return (
          <F3_1_Generation
            key={generationRunKey}
            generationRunKey={generationRunKey}
            forceGenerate={forceGeneration}
            onCancel={handleCancelGeneration}
            onBack={handleCancelGeneration}
            engagementId={activeEngagementId}
            onComplete={handleGenerationComplete}
          />
        );
      case 'roles-grid':
        return (
          <F3_1_RolesGrid
            key={`roles-grid-${generationRunKey}`}
            engagementId={activeEngagementId}
            onRoleClick={handleRoleClick}
            onEmergentRoleClick={handleEmergentRoleClick}
            onReRun={handleReRunToPreRun}
            onRegenerate={() => {
              setForceGeneration(true);
              setGenerationRunKey((k) => k + 1);
              setCurrentScreen('generating');
            }}
            onBack={() => setCurrentScreen('pre-run')}
            onProceedToF4={onProceedToF4}
          />
        );
      case 'role-detail':
        return (
          <F3_2_RoleDetail
            onBack={handleBackToGrid}
            roleName={selectedRole}
            engagementId={activeEngagementId}
          />
        );
      case 'emergent-role-detail':
        return (
          <F3_3_EmergentRoleDetail
            onBack={handleBackToGrid}
            roleName={selectedEmergentRole}
            engagementId={activeEngagementId}
          />
        );
    }
  };

  if (pipelineLoading && (currentScreen === 'pre-run' || currentScreen === 'generating')) {
    return <PipelineCacheLoading />;
  }

  return <>{renderScreen()}</>;
}
