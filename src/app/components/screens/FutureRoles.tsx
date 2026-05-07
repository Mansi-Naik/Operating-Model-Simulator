import { useState } from 'react';
import { F3_0_PreRun } from './roles/F3_0_PreRun';
import { F3_1_RolesGrid } from './roles/F3_1_RolesGrid';
import { F3_2_RoleDetail } from './roles/F3_2_RoleDetail';
import { F3_3_EmergentRoleDetail } from './roles/F3_3_EmergentRoleDetail';

type RolesScreen = 'pre-run' | 'roles-grid' | 'role-detail' | 'emergent-role-detail';

interface FutureRolesProps {
  onBack?: () => void;
  onProceedToF4?: () => void;
}

export function FutureRoles({ onBack, onProceedToF4 }: FutureRolesProps) {
  const [currentScreen, setCurrentScreen] = useState<RolesScreen>('pre-run');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleGenerate = () => {
    setCurrentScreen('roles-grid');
  };

  const handleRoleClick = (roleName: string) => {
    setSelectedRole(roleName);
    setCurrentScreen('role-detail');
  };

  const handleEmergentRoleClick = () => {
    setCurrentScreen('emergent-role-detail');
  };

  const handleReRun = () => {
    setCurrentScreen('pre-run');
  };

  const handleBackToGrid = () => {
    setCurrentScreen('roles-grid');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return <F3_0_PreRun onGenerate={handleGenerate} onBack={onBack} />;
      case 'roles-grid':
        return (
          <F3_1_RolesGrid
            onRoleClick={handleRoleClick}
            onEmergentRoleClick={handleEmergentRoleClick}
            onReRun={handleReRun}
            onBack={() => setCurrentScreen('pre-run')}
            onProceedToF4={onProceedToF4}
          />
        );
      case 'role-detail':
        return <F3_2_RoleDetail onBack={handleBackToGrid} />;
      case 'emergent-role-detail':
        return <F3_3_EmergentRoleDetail onBack={handleBackToGrid} />;
    }
  };

  return <>{renderScreen()}</>;
}
