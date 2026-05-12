import { Sparkles, Clock, ArrowLeft, AlertTriangle } from 'lucide-react';

export interface F3_0_PreRunPreviewRow {
  color: string;
  label: string;
}

interface F3_0_PreRunProps {
  onGenerate: () => void;
  onBack?: () => void;
  onGoToF2?: () => void;
  loading?: boolean;
  error?: string | null;
  needsF2Banner?: boolean;
  patternSummary?: string;
  previewRows?: F3_0_PreRunPreviewRow[];
  emergentHint?: string;
}

export function F3_0_PreRun({
  onGenerate,
  onBack,
  onGoToF2,
  loading,
  error,
  needsF2Banner,
  patternSummary,
  previewRows = [],
  emergentHint,
}: F3_0_PreRunProps) {
  const canGenerate = !needsF2Banner && !loading && !error;

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[720px] w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div className="text-[13px] text-[#161916] mb-6">ROLES</div>

        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Generate future role definitions</h1>

        <p className="text-[15px] text-[#494949] mb-8">
          Based on your allocation matrix, we'll redesign each role for the future state — what they keep, lose, gain —
          and identify any new roles needed.
        </p>

        {needsF2Banner && onGoToF2 ? (
          <div className="mb-6 bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <AlertTriangle className="w-5 h-5 text-[#FFAB28] shrink-0" />
              <span className="text-[14px] font-medium text-[#161916]">Generate F2 allocation matrix first</span>
            </div>
            <button
              type="button"
              onClick={onGoToF2}
              className="h-9 px-4 shrink-0 bg-[#FFAB28] text-[#161916] text-[13px] font-semibold rounded-md hover:bg-[#FFAB28]/90"
            >
              Go to F2
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
            {error}
          </div>
        ) : null}

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

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
          <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Preview from your matrix</div>

          {loading ? (
            <div className="text-[14px] text-[#494949] mb-4">Loading engagement and tasks…</div>
          ) : (
            <>
              {patternSummary ? (
                <p className="text-[14px] text-[#161916] mb-4 leading-relaxed">{patternSummary}</p>
              ) : null}
              <div className="space-y-2 mb-4">
                {previewRows.length === 0 && !patternSummary ? (
                  <div className="text-[14px] text-[#494949]">No preview yet — add hierarchy tasks or complete intake.</div>
                ) : (
                  previewRows.map((pred, idx) => (
                    <div key={idx} className="flex items-center gap-3 h-9">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pred.color }} />
                      <span className="text-[14px] text-[#161916]">{pred.label}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <div className="border-t border-[#494949]/12 pt-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFAB28] shrink-0" />
              <span className="text-[14px] text-[#161916] leading-relaxed">
                {loading ? 'Estimated emergent roles: …' : emergentHint ?? ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[13px] text-[#6D7069] mb-8 justify-center">
          <Clock className="w-4 h-4" />
          <span>Estimated generation time: ~30 seconds</span>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="h-12 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="w-5 h-5" />
            Generate redesigns
          </button>
        </div>
      </div>
    </div>
  );
}
