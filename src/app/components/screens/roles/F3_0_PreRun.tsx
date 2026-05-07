import { Sparkles, Clock, ArrowLeft } from 'lucide-react';

interface F3_0_PreRunProps {
  onGenerate: () => void;
  onBack?: () => void;
}

export function F3_0_PreRun({ onGenerate, onBack }: F3_0_PreRunProps) {
  const predictions = [
    { color: '#548235', label: 'Agent: minor_evolution' },
    { color: '#2E75B6', label: 'TL: meaningful_shift' },
    { color: '#FFAB28', label: 'QA Officer: transformation' },
    { color: '#548235', label: 'Unit Head: minor_evolution' },
  ];

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
        <div className="text-[13px] text-[#161916] mb-6">ROLES</div>

        {/* Title */}
        <h1 className="text-[28px] font-bold text-[#161916] mb-4">
          Generate future role definitions
        </h1>

        {/* Description */}
        <p className="text-[15px] text-[#494949] mb-8">
          Based on your allocation matrix, we'll redesign each role for the future state — what they
          keep, lose, gain — and identify any new roles needed.
        </p>

        {/* Illustrative Graphic */}
        <div className="h-[200px] bg-[#FDF8F4] rounded-xl mb-8 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 w-[400px]">
            {[0, 1, 2, 3].map((idx) => {
              const colors = ['#E2EFDA', '#DEEBF7', '#FFF0DC', '#E2EFDA'];
              return (
                <div
                  key={idx}
                  className="h-24 bg-white rounded-lg border border-[#494949]/12 p-3 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-full bg-[#FDF8F4]" />
                    <div
                      className="px-2 py-0.5 rounded-full text-[9px]"
                      style={{ backgroundColor: colors[idx] }}
                    >
                      •
                    </div>
                  </div>
                  <div className="h-2 bg-[#FFF0DC] rounded-full w-3/4" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
          <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Preview from your matrix
          </div>
          <div className="space-y-2 mb-4">
            {predictions.map((pred, idx) => (
              <div key={idx} className="flex items-center gap-3 h-9">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pred.color }} />
                <span className="text-[14px] text-[#161916]">{pred.label}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#494949]/12 pt-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFAB28]" />
              <span className="text-[14px] text-[#161916]">Estimated emergent roles: 1</span>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center gap-2 text-[13px] text-[#6D7069] mb-8 justify-center">
          <Clock className="w-4 h-4" />
          <span>Estimated generation time: ~30 seconds</span>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={onGenerate}
            className="h-12 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Generate redesigns
          </button>
        </div>
      </div>
    </div>
  );
}
