import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { NavigationRail } from './components/NavigationRail';
import { FooterStatusBar } from './components/FooterStatusBar';
import { ModeSelector } from './components/screens/ModeSelector';
import { GuidedForm } from './components/screens/GuidedForm';
import { UploadMode } from './components/screens/UploadMode';
import { Reconciliation } from './components/screens/Reconciliation';
import { ReadinessReview } from './components/screens/ReadinessReview';
import { AllocationMatrix } from './components/screens/AllocationMatrix';
import { FutureRoles } from './components/screens/FutureRoles';
import { PodStructure } from './components/screens/PodStructure';
import { Economics } from './components/screens/Economics';
import { Timeline } from './components/screens/Timeline';
import { Summary } from './components/screens/Summary';
import { Toaster } from './components/ui/sonner';

type Screen = 'mode-selector' | 'guided-form' | 'upload' | 'reconciliation' | 'readiness-review' | 'allocation-matrix' | 'future-roles' | 'pod-structure' | 'economics' | 'timeline' | 'summary' | 'locked';
type PodStartScreen = 'pre-run' | 'variant-selector' | 'org-rollup';
type TimelineStartScreen = 'pre-run' | 'loading' | 'implementation' | 'gantt' | 'dependencies' | 'scenarios';

function engagementIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('engagementId');
}

export default function App() {
  const [currentFeature, setCurrentFeature] = useState('f1');
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode-selector');
  const [podStartScreen, setPodStartScreen] = useState<PodStartScreen>('pre-run');
  const [podMessage, setPodMessage] = useState<string | null>(null);
  const [timelineStartScreen, setTimelineStartScreen] = useState<TimelineStartScreen | undefined>(undefined);
  const [activeEngagementId, setActiveEngagementId] = useState<string | null>(() => engagementIdFromUrl());
  const [guidedFormInitialStep, setGuidedFormInitialStep] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handlePopState = () => setActiveEngagementId(engagementIdFromUrl());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleFeatureClick = (featureId: string) => {
    setCurrentFeature(featureId);
    // Navigate to the appropriate screen based on feature
    if (featureId === 'f1') {
      setCurrentScreen('mode-selector');
    } else if (featureId === 'f2') {
      setCurrentScreen('allocation-matrix');
    } else if (featureId === 'f3') {
      setCurrentScreen('future-roles');
    } else if (featureId === 'f4') {
      setPodStartScreen('pre-run');
      setPodMessage(null);
      setCurrentScreen('pod-structure');
    } else if (featureId === 'f5') {
      setCurrentScreen('economics');
    } else if (featureId === 'f6') {
      setCurrentScreen('timeline');
    } else if (featureId === 'f7') {
      setCurrentScreen('summary');
    }
  };

  const handleModeSelect = (mode: 'upload' | 'guided') => {
    setGuidedFormInitialStep(undefined);
    if (mode === 'upload') {
      setCurrentScreen('upload');
    } else {
      setCurrentScreen('guided-form');
    }
  };

  const handleIntakeExtracted = (engagementId?: string) => {
    if (engagementId) setActiveEngagementId(engagementId);
    setGuidedFormInitialStep(undefined);
    setCurrentScreen('guided-form');
  };

  const handleStartGuidedEmpty = () => {
    setActiveEngagementId(null);
    setGuidedFormInitialStep(undefined);
    setCurrentScreen('guided-form');
  };

  const handleClientSwitch = (engagementId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('engagementId', engagementId);
    window.history.pushState({}, '', url.toString());
    setActiveEngagementId(engagementId);
    setCurrentFeature('f1');
    setGuidedFormInitialStep(undefined);
    setCurrentScreen('guided-form');
  };

  const handleFileUploaded = () => {
    setCurrentScreen('reconciliation');
  };

  const handleReconciliationComplete = () => {
    setCurrentScreen('readiness-review');
  };

  const handleGuidedFormComplete = () => {
    setGuidedFormInitialStep(undefined);
    setCurrentScreen('readiness-review');
  };

  const handleProceedToF2 = () => {
    setCurrentFeature('f2');
    setCurrentScreen('allocation-matrix');
  };

  const handleProceedToF4 = () => {
    setCurrentFeature('f4');
    setPodStartScreen('pre-run');
    setPodMessage(null);
    setCurrentScreen('pod-structure');
  };

  const handleProceedToF5 = () => {
    setCurrentFeature('f5');
    setCurrentScreen('economics');
  };

  const handleGoToF1PreferencesFromF5 = () => {
    setCurrentFeature('f1');
    setGuidedFormInitialStep(7);
    setCurrentScreen('guided-form');
  };

  const handleMissingF4Selection = () => {
    setCurrentFeature('f4');
    setPodStartScreen('variant-selector');
    setPodMessage('Select a pod variant in F4 first.');
    setCurrentScreen('pod-structure');
  };

  const handleProceedToF6 = () => {
    setCurrentFeature('f6');
    setCurrentScreen('timeline');
  };

  const handleProceedToF7 = () => {
    setCurrentFeature('f7');
    setCurrentScreen('summary');
  };

  const getVersionChips = () => {
    const featureNum = parseInt(currentFeature.replace('f', ''));
    const chips = [];

    chips.push({ name: 'CONTEXT', version: 'V2' });

    if (featureNum >= 2) {
      chips.push({ name: 'MATRIX', version: 'V1' });
    }

    if (featureNum >= 3) {
      chips.push({ name: 'ROLES', version: 'V1' });
    }

    if (featureNum >= 4) {
      chips.push({ name: 'PODS', version: 'V1' });
    }

    if (featureNum >= 5) {
      chips.push({ name: 'ECON', version: 'V1' });
    }

    if (featureNum >= 6) {
      chips.push({ name: 'TIMELINE', version: 'V1' });
    }

    if (featureNum >= 7) {
      chips.push({ name: 'SUMMARY', version: 'V0' });
    }

    chips.push({ name: '', version: 'V2.4.1-STABLE' });

    return chips;
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'mode-selector':
        return (
          <ModeSelector
            onModeSelect={handleModeSelect}
            onIntakeExtracted={handleIntakeExtracted}
            onStartGuidedEmpty={handleStartGuidedEmpty}
            hasDraft={false}
          />
        );
      case 'guided-form':
        return (
          <GuidedForm
            key={`${activeEngagementId ?? 'new'}-step-${guidedFormInitialStep ?? 1}`}
            initialStep={guidedFormInitialStep}
            onComplete={handleGuidedFormComplete}
            onBack={() => {
              setGuidedFormInitialStep(undefined);
              setCurrentScreen('mode-selector');
            }}
          />
        );
      case 'upload':
        return <UploadMode onFileUploaded={handleFileUploaded} onBack={() => setCurrentScreen('mode-selector')} />;
      case 'reconciliation':
        return <Reconciliation onComplete={handleReconciliationComplete} onBack={() => setCurrentScreen('upload')} />;
      case 'readiness-review':
        return <ReadinessReview onProceed={handleProceedToF2} onBack={() => setCurrentScreen('mode-selector')} />;
      case 'allocation-matrix':
        return (
          <AllocationMatrix
            key={`f2-${activeEngagementId ?? 'none'}`}
            engagementId={activeEngagementId}
            onBack={() => setCurrentScreen('readiness-review')}
            onProceedToF3={() => {
              setCurrentFeature('f3');
              setCurrentScreen('future-roles');
            }}
          />
        );
      case 'future-roles':
        return (
          <FutureRoles
            key={`f3-${activeEngagementId ?? 'none'}`}
            engagementId={activeEngagementId}
            onBack={() => setCurrentScreen('allocation-matrix')}
            onProceedToF4={handleProceedToF4}
            onGoToF2={() => {
              setCurrentFeature('f2');
              setCurrentScreen('allocation-matrix');
            }}
          />
        );
      case 'pod-structure':
        return (
          <PodStructure
            key={`f4-${activeEngagementId ?? 'none'}-${podStartScreen}-${podMessage ?? ''}`}
            onBack={() => setCurrentScreen('future-roles')}
            onProceedToF5={handleProceedToF5}
            onGoToF3={() => {
              setCurrentFeature('f3');
              setCurrentScreen('future-roles');
            }}
            initialScreen={podStartScreen}
            f4Message={podMessage}
            engagementId={activeEngagementId}
          />
        );
      case 'economics':
        return (
          <Economics
            onBack={() => setCurrentScreen('pod-structure')}
            onProceedToF6={handleProceedToF6}
            onMissingF4Selection={handleMissingF4Selection}
            onGoToF1Preferences={handleGoToF1PreferencesFromF5}
          />
        );
      case 'timeline':
        return (
          <Timeline
            key={`f6-${activeEngagementId ?? 'none'}-${timelineStartScreen ?? 'timeline-default'}`}
            initialScreen={timelineStartScreen}
            onBack={() => {
              setTimelineStartScreen(undefined);
              setCurrentScreen('economics');
            }}
            onGoToF3={() => {
              setTimelineStartScreen(undefined);
              setCurrentFeature('f3');
              setCurrentScreen('future-roles');
            }}
            onGoToF5={() => {
              setTimelineStartScreen(undefined);
              setCurrentScreen('economics');
            }}
            onProceedToF7={() => {
              setTimelineStartScreen(undefined);
              handleProceedToF7();
            }}
            engagementId={activeEngagementId}
          />
        );
      case 'summary':
        return (
          <Summary
            onBack={() => {
              setTimelineStartScreen('scenarios');
              setCurrentFeature('f6');
              setCurrentScreen('timeline');
            }}
            onNavigateToFeature={handleFeatureClick}
          />
        );
      default:
        return (
          <div className="p-10">
            <h1 className="text-[26px] font-bold text-[#161916]">Feature Coming Soon</h1>
            <p className="text-[14px] text-[#494949] mt-2">
              This feature will be unlocked after completing F1.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-white overflow-hidden">
      <Header activeEngagementId={activeEngagementId} onSelectEngagement={handleClientSwitch} />

      <div className="flex-1 flex overflow-hidden">
        <NavigationRail
          currentFeature={currentFeature}
          onFeatureClick={handleFeatureClick}
          engagementId={activeEngagementId}
        />

        <main className="flex-1 overflow-auto bg-white">
          {renderScreen()}
        </main>
      </div>

      <FooterStatusBar versions={getVersionChips()} />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
