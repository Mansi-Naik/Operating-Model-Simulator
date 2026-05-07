import { useState } from 'react';
import { F6_1_ImplementationTimeline } from './timeline/F6_1_ImplementationTimeline';
import { F6_2_ScenarioComparison } from './timeline/F6_2_ScenarioComparison';

type TimelineScreen = 'implementation' | 'scenarios';

interface TimelineProps {
  onBack?: () => void;
  onProceedToF7?: () => void;
}

export function Timeline({ onBack, onProceedToF7 }: TimelineProps) {
  const [currentScreen, setCurrentScreen] = useState<TimelineScreen>('implementation');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'implementation':
        return (
          <F6_1_ImplementationTimeline
            onViewScenarios={() => setCurrentScreen('scenarios')}
            onBack={onBack}
            onProceedToF7={onProceedToF7}
          />
        );
      case 'scenarios':
        return <F6_2_ScenarioComparison onBack={() => setCurrentScreen('implementation')} />;
    }
  };

  return <>{renderScreen()}</>;
}
