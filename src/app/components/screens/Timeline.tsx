import { useState } from 'react';
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
}

export function Timeline({ onBack, onProceedToF7, onGoToF5, onGoToF3 }: TimelineProps) {
  const [currentScreen, setCurrentScreen] = useState<TimelineScreen>('pre-run');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pre-run':
        return (
          <F6_0_PreRun
            onGenerateTimeline={() => setCurrentScreen('loading')}
            onBack={onBack}
            onGoToF5={onGoToF5}
          />
        );
      case 'loading':
        return (
          <F6_1_TimelineGeneration
            onComplete={() => setCurrentScreen('gantt')}
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

  return <>{renderScreen()}</>;
}
