import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../hooks/useEngagement';
import { useMountPipelineCacheRedirect, usePipelineCacheEntry } from '../../../hooks/usePipelineCacheEntry';
import { PipelineCacheLoading, PipelinePreRunGate } from '../PipelinePreRunGate';
import { isForceRerun, setForceRerunFlag } from '../../../lib/pipelineCacheUtils';
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
  const { hasCachedResults, isLoading: pipelineLoading } = usePipelineCacheEntry('f3', activeEngagementId);

  const [currentScreen, setCurrentScreen] = useState<RolesScreen>('pre-run');
  const goToRolesGrid = useCallback(() => setCurrentScreen('roles-grid'), []);
  useMountPipelineCacheRedirect('f3', activeEngagementId, goToRolesGrid);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedEmergentRole, setSelectedEmergentRole] = useState<string | null>(null);

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
    if (!isForceRerun() && hasCachedResults) {
      setCurrentScreen('roles-grid');
      return;
    }
    setForceRerunFlag(false);
    setCurrentScreen('generating');
  }, [hasCachedResults]);

  const handleGenerationComplete = useCallback(() => {
    setForceRerunFlag(false);
    if (activeEngagementId) {
      void loadEngagement(activeEngagementId);
    }
    setCurrentScreen('roles-grid');
  }, [activeEngagementId, loadEngagement]);

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

  const handleReRunToPreRun = () => {
    setCurrentScreen('pre-run');
  };

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
            onCancel={() => setCurrentScreen('pre-run')}
            onBack={() => setCurrentScreen('pre-run')}
            engagementId={activeEngagementId}
            onComplete={handleGenerationComplete}
          />
        );
      case 'roles-grid':
        return (
          <F3_1_RolesGrid
            engagementId={activeEngagementId}
            onRoleClick={handleRoleClick}
            onEmergentRoleClick={handleEmergentRoleClick}
            onReRun={handleReRunToPreRun}
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

  if (
    !isForceRerun() &&
    pipelineLoading &&
    (currentScreen === 'pre-run' || currentScreen === 'generating')
  ) {
    return <PipelineCacheLoading />;
  }

  return <>{renderScreen()}</>;
}
