import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../hooks/useEngagement';
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
}

export function FutureRoles({ onBack, onProceedToF4, onGoToF2 }: FutureRolesProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const { engagement, tasks, loading, error, loadEngagement } = useEngagement(engagementIdFromUrl);

  const [currentScreen, setCurrentScreen] = useState<RolesScreen>('pre-run');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    if (engagementIdFromUrl) {
      void loadEngagement(engagementIdFromUrl);
    }
  }, [engagementIdFromUrl, loadEngagement]);

  const preview = useMemo(
    () => computeF3PreRunPreview(tasks, engagement as Record<string, unknown> | null),
    [tasks, engagement],
  );

  const handleGenerate = useCallback(() => {
    setCurrentScreen('generating');
  }, []);

  const handleGenerationComplete = useCallback(() => {
    if (engagementIdFromUrl) {
      void loadEngagement(engagementIdFromUrl);
    }
    setCurrentScreen('roles-grid');
  }, [engagementIdFromUrl, loadEngagement]);

  const handleRoleClick = (roleName: string) => {
    setSelectedRole(roleName);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', roleName);
      window.history.pushState({}, '', url.toString());
    }
    setCurrentScreen('role-detail');
  };

  const handleEmergentRoleClick = (_roleName: string) => {
    setCurrentScreen('emergent-role-detail');
  };

  const handleReRun = () => {
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
        );
      case 'generating':
        return (
          <F3_1_Generation
            onCancel={() => setCurrentScreen('pre-run')}
            onBack={() => setCurrentScreen('pre-run')}
            engagementId={engagementIdFromUrl}
            onComplete={handleGenerationComplete}
          />
        );
      case 'roles-grid':
        return (
          <F3_1_RolesGrid
            engagementId={engagementIdFromUrl}
            onRoleClick={handleRoleClick}
            onEmergentRoleClick={handleEmergentRoleClick}
            onReRun={handleReRun}
            onBack={() => setCurrentScreen('pre-run')}
            onProceedToF4={onProceedToF4}
          />
        );
      case 'role-detail':
        return (
          <F3_2_RoleDetail
            onBack={handleBackToGrid}
            roleName={selectedRole}
            engagementId={engagementIdFromUrl}
          />
        );
      case 'emergent-role-detail':
        return <F3_3_EmergentRoleDetail onBack={handleBackToGrid} />;
    }
  };

  return <>{renderScreen()}</>;
}
