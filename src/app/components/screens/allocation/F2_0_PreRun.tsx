import { Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface F2_0_PreRunProps {
  onGenerate: (appetite: string) => void | Promise<void>;
  onBack?: () => void;
  taskCount: number;
  readinessScore: number | null;
  readinessBand: string | null;
  initialAutomationAppetite?: string | null;
}

function toDisplayAppetite(value: string | null | undefined): 'Conservative' | 'Balanced' | 'Aggressive' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'conservative') return 'Conservative';
  if (normalized === 'aggressive') return 'Aggressive';
  return 'Balanced';
}

export function F2_0_PreRun({
  onGenerate,
  onBack,
  taskCount,
  readinessScore,
  readinessBand,
  initialAutomationAppetite,
}: F2_0_PreRunProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [appetite, setAppetite] = useState<'Conservative' | 'Balanced' | 'Aggressive'>(
    toDisplayAppetite(initialAutomationAppetite),
  );
  const selectedAppetite = appetite;
  const scoreText = typeof readinessScore === 'number' ? String(Math.round(readinessScore)) : 'N/A';
  const bandText = (readinessBand ?? 'N/A').toUpperCase();

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[720px] w-full">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Breadcrumb */}
        <div className="text-[13px] text-[#161916] mb-6">ALLOCATION MATRIX</div>

        {/* Title */}
        <h1 className="text-[28px] font-bold text-[#161916] mb-4">
          Generate allocation predictions
        </h1>

        {/* Description */}
        <p className="text-[15px] text-[#494949] mb-8">
          We'll analyze your {taskCount} {taskCount === 1 ? 'task' : 'tasks'} and recommend the optimal
          touchpoint — human-only, tech-assisted, or tech-automated — for each. Based on your context
          readiness {scoreText}/100 ({bandText}).
        </p>

        {/* Illustrative Graphic */}
        <div className="h-[240px] bg-[#FFF0DC] rounded-xl mb-8 flex items-center justify-center relative overflow-hidden">
          <div className="grid grid-cols-3 gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#FD4E59]/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#FD4E59]" />
              </div>
              <div className="text-[13px] font-medium text-[#161916]">Automated</div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#FFAB28]/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#FFAB28]" />
              </div>
              <div className="text-[13px] font-medium text-[#161916]">Assisted</div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#6D7069]/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#6D7069]" />
              </div>
              <div className="text-[13px] font-medium text-[#161916]">Human</div>
            </div>
          </div>
        </div>

        {/* Automation Appetite */}
        <div className="mb-6">
          <h3 className="text-[16px] font-bold text-[#161916] mb-4">Automation appetite</h3>
          <div className="h-12 border border-[#494949]/12 rounded-lg overflow-hidden flex mb-3">
            {(['Conservative', 'Balanced', 'Aggressive'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setAppetite(option)}
                className={`
                  flex-1 text-[14px] font-medium transition-colors
                  ${selectedAppetite === option
                    ? 'bg-[#FD4E59] text-white'
                    : 'bg-[#FDF8F4] text-[#494949] hover:bg-[#FDF8F4]/70'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-[#6D7069]">
            {selectedAppetite} — current preference for this engagement.
          </p>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center gap-2 text-[13px] text-[#6D7069] mb-8">
          <Clock className="w-4 h-4" />
          <span>Estimated generation time: ~45 seconds</span>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            disabled={isGenerating}
            onClick={async () => {
              if (isGenerating) return;
              setIsGenerating(true);
              try {
                await onGenerate(selectedAppetite);
              } catch {
                setIsGenerating(false);
              }
            }}
            className="h-12 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Generate matrix
          </button>
        </div>
      </div>
    </div>
  );
}
