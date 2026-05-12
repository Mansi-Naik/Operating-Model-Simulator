import { useState } from 'react';
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

type Screen = 'mode-selector' | 'guided-form' | 'upload' | 'reconciliation' | 'readiness-review' | 'allocation-matrix' | 'future-roles' | 'pod-structure' | 'economics' | 'timeline' | 'summary' | 'locked';

export default function App() {
  const [currentFeature, setCurrentFeature] = useState('f1');
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode-selector');


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
    if (mode === 'upload') {
      setCurrentScreen('upload');
    } else {
      setCurrentScreen('guided-form');
    }
  };

  const handleIntakeExtracted = () => {
    setCurrentScreen('guided-form');
  };

  const handleStartGuidedEmpty = () => {
    setCurrentScreen('guided-form');
  };

  const handleFileUploaded = () => {
    setCurrentScreen('reconciliation');
  };

  const handleReconciliationComplete = () => {
    setCurrentScreen('readiness-review');
  };

  const handleGuidedFormComplete = () => {
    setCurrentScreen('readiness-review');
  };

  const handleProceedToF2 = () => {
    setCurrentFeature('f2');
    setCurrentScreen('allocation-matrix');
  };

  const handleProceedToF4 = () => {
    setCurrentFeature('f4');
    setCurrentScreen('pod-structure');
  };

  const handleProceedToF5 = () => {
    setCurrentFeature('f5');
    setCurrentScreen('economics');
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
        return <GuidedForm onComplete={handleGuidedFormComplete} onBack={() => setCurrentScreen('mode-selector')} />;
      case 'upload':
        return <UploadMode onFileUploaded={handleFileUploaded} onBack={() => setCurrentScreen('mode-selector')} />;
      case 'reconciliation':
        return <Reconciliation onComplete={handleReconciliationComplete} onBack={() => setCurrentScreen('upload')} />;
      case 'readiness-review':
        return <ReadinessReview onProceed={handleProceedToF2} onBack={() => setCurrentScreen('mode-selector')} />;
      case 'allocation-matrix':
        return (
          <AllocationMatrix
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
            onBack={() => setCurrentScreen('allocation-matrix')}
            onProceedToF4={handleProceedToF4}
          />
        );
      case 'pod-structure':
        return <PodStructure onBack={() => setCurrentScreen('future-roles')} onProceedToF5={handleProceedToF5} />;
      case 'economics':
        return <Economics onBack={() => setCurrentScreen('pod-structure')} onProceedToF6={handleProceedToF6} />;
      case 'timeline':
        return <Timeline onBack={() => setCurrentScreen('economics')} onProceedToF7={handleProceedToF7} />;
      case 'summary':
        return <Summary onBack={() => setCurrentScreen('timeline')} />;
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
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <NavigationRail currentFeature={currentFeature} onFeatureClick={handleFeatureClick} />

        <main className="flex-1 overflow-auto bg-white">
          {renderScreen()}
        </main>
      </div>

      <FooterStatusBar versions={getVersionChips()} />
    </div>
  );
}
