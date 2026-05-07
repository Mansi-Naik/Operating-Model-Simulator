import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StepEngagement } from './guided-steps/StepEngagement';
import { StepHierarchy } from './guided-steps/StepHierarchy';
import { StepTasks } from './guided-steps/StepTasks';
import { StepTechStack } from './guided-steps/StepTechStack';
import { StepGovernance } from './guided-steps/StepGovernance';
import { StepKPIs } from './guided-steps/StepKPIs';
import { StepPreferences } from './guided-steps/StepPreferences';

interface GuidedFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function GuidedForm({ onComplete, onBack }: GuidedFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  const steps = [
    { number: 1, label: 'Engagement', component: StepEngagement },
    { number: 2, label: 'Hierarchy', component: StepHierarchy },
    { number: 3, label: 'Tasks', component: StepTasks },
    { number: 4, label: 'Tech Stack', component: StepTechStack },
    { number: 5, label: 'Governance', component: StepGovernance },
    { number: 6, label: 'KPIs', component: StepKPIs },
    { number: 7, label: 'Preferences', component: StepPreferences },
  ];

  const handleNext = (data: any) => {
    // Functional update avoids stale `formData` losing fields (e.g. `engagementId`) across steps.
    setFormData((prev) => ({ ...prev, ...data }));
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="p-10">
      {currentStep === 1 && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-center mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium
                    ${step.number < currentStep
                      ? 'bg-[#FD4E59] text-white'
                      : step.number === currentStep
                      ? 'bg-[#FD4E59] text-white'
                      : 'border-2 border-[#6D7069] text-[#6D7069]'
                    }
                  `}
                >
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <span
                  className={`text-[11px] mt-1 ${
                    step.number === currentStep ? 'text-[#FD4E59] font-bold' : 'text-[#6D7069]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mb-5 mx-2 ${
                    step.number < currentStep ? 'bg-[#FD4E59]' : 'bg-[#6D7069]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        <CurrentStepComponent
          data={formData}
          onNext={handleNext}
          onBack={handleBack}
          currentStep={currentStep}
          totalSteps={7}
        />
      </div>
    </div>
  );
}
