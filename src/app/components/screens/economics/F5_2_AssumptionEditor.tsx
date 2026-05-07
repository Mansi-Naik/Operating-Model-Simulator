import { X, RotateCcw, Check, Sparkles, ChevronDown } from 'lucide-react';

interface F5_2_AssumptionEditorProps {
  onClose: () => void;
}

export function F5_2_AssumptionEditor({ onClose }: F5_2_AssumptionEditorProps) {
  return (
    <div className="w-[480px] h-full bg-white border-l border-[#494949]/12 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#494949]/12">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-[20px] font-bold text-[#161916]">Assumptions</h2>
          <button onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[13px] text-[#494949]">
          Edit any input — the dashboard recomputes instantly.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Section 1 - Costs Per FTE Per Month */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Costs Per FTE Per Month
          </div>

          <div className="space-y-3">
            {/* Agent */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Agent</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="2,500"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                From F1
              </div>
            </div>

            {/* TL */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">TL</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="4,500"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                From F1
              </div>
            </div>

            {/* QA Officer */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">QA Officer</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="5,000"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                From F1
              </div>
            </div>

            {/* AI Output Auditor */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">AI Output Auditor</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="3,500"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Default
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#494949]/12 my-6" />

        {/* Section 2 - Transition */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Transition
          </div>

          <div className="space-y-3">
            {/* Ramp curve */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Ramp curve</div>
              <div className="flex-1 relative">
                <select className="w-full h-9 px-3 pr-8 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] appearance-none">
                  <option>S-curve</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6D7069] pointer-events-none" />
              </div>
              <div className="px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Default
              </div>
            </div>

            {/* Months to steady */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Months to steady</div>
              <div className="flex-1">
                <input
                  type="number"
                  defaultValue="9"
                  className="w-full h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#FCE4D6] text-[#FD4E59] text-[11px] font-semibold uppercase tracking-wide rounded">
                Modified
              </div>
            </div>

            {/* Tech build cost */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Tech build cost</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="180,000"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Default
              </div>
            </div>

            {/* Retraining / FTE */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Retraining / FTE</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="1,000"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Default
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#494949]/12 my-6" />

        {/* Section 3 - Tech */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
            Tech
          </div>

          <div className="space-y-3">
            {/* Image classifier coverage */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">Image classifier coverage</div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  defaultValue="90%"
                  className="w-full h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                From F1
              </div>
            </div>

            {/* LLM tooling cost / mo */}
            <div className="flex items-center gap-3">
              <div className="w-[140px] text-[14px] text-[#161916]">LLM tooling cost / mo</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">$</span>
                <input
                  type="text"
                  defaultValue="8,000"
                  className="w-full h-9 pl-7 pr-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916]"
                />
              </div>
              <div className="px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                Default
              </div>
            </div>
          </div>
        </div>

        {/* Recompute Indicator */}
        <div className="bg-[#FFF0DC] rounded p-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#FFAB28] flex-shrink-0" />
          <p className="text-[13px] text-[#161916]">Dashboard recomputed: −22.9% savings</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#494949]/12 flex items-center justify-between">
        <button className="h-10 px-5 text-[#FD4E59] text-[14px] hover:bg-[#FD4E59]/5 rounded-md flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset all
        </button>
        <button
          onClick={onClose}
          className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Apply & close
        </button>
      </div>
    </div>
  );
}
