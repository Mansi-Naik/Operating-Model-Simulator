import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle, Edit2 } from 'lucide-react';

interface StepReviewProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepReview({ data, onNext, onBack, currentStep, totalSteps }: StepReviewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['engagement']);
  const [isValidating, setIsValidating] = useState(false);

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter((s) => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      onNext({});
    }, 2000);
  };

  const sections = [
    { id: 'engagement', name: 'Engagement', fields: 8, hasGap: false },
    { id: 'hierarchy', name: 'Hierarchy', fields: 2, hasGap: false },
    { id: 'tasks', name: 'Tasks', fields: 1, hasGap: true },
    { id: 'techstack', name: 'Tech Stack', fields: 3, hasGap: false },
    { id: 'governance', name: 'Governance', fields: 4, hasGap: false },
    { id: 'kpis', name: 'KPIs', fields: 15, hasGap: false },
  ];

  return (
    <div>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Review Your Submission</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        Check everything before we score your readiness. Click any field to edit inline.
      </p>

      <div className="space-y-4 mb-8">
        {sections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);

          return (
            <div key={section.id} className="bg-[#FDF8F4] border border-[#161916]/10 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#FDF8F4]/70"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-[#161916]">{section.name}</span>
                  <div className="px-2 py-0.5 bg-white border border-[#FFAB28] text-[#FFAB28] text-[11px] rounded-full">
                    {section.fields} fields
                  </div>
                  {section.hasGap && (
                    <div className="px-2 py-0.5 bg-[#FFAB28]/20 border border-[#FFAB28] text-[#FFAB28] text-[11px] rounded-full">
                      1 gap
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {section.hasGap ? (
                    <AlertTriangle className="w-4 h-4 text-[#FFAB28]" />
                  ) : (
                    <Check className="w-4 h-4 text-[#FD4E59]" />
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#161916]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#161916]" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {section.id === 'engagement' && (
                      <>
                        <div className="group">
                          <div className="text-[12px] text-[#6D7069]">Client Name</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[14px] text-[#161916]">Acme Corp</div>
                            <Edit2 className="w-3 h-3 text-[#FFAB28] opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                        <div className="group">
                          <div className="text-[12px] text-[#6D7069]">Industry</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[14px] text-[#161916]">Financial Services</div>
                            <Edit2 className="w-3 h-3 text-[#FFAB28] opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                        <div className="group">
                          <div className="text-[12px] text-[#6D7069]">Daily Volume</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[14px] text-[#161916]">38,000</div>
                            <Edit2 className="w-3 h-3 text-[#FFAB28] opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      </>
                    )}
                    {section.id === 'hierarchy' && (
                      <>
                        <div className="group col-span-2">
                          <div className="text-[12px] text-[#6D7069]">Roles Defined</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[14px] text-[#161916]">2 roles (Agent, Team Lead)</div>
                            <Edit2 className="w-3 h-3 text-[#FFAB28] opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleValidate}
        disabled={isValidating}
        className="w-full h-12 bg-[#FD4E59] text-white text-[16px] font-semibold rounded-lg hover:bg-[#FD4E59]/90 disabled:bg-[#6D7069] disabled:cursor-not-allowed"
      >
        {isValidating ? 'Scoring your context...' : 'Validate & Score'}
      </button>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-16 pt-8 border-t border-[#161916]/10">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-6 border border-[#161916]/30 text-[#494949] text-[14px] font-medium rounded hover:bg-[#161916]/5"
        >
          Back
        </button>
        <span className="text-[13px] text-[#6D7069]">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="w-40" />
      </div>
    </div>
  );
}
