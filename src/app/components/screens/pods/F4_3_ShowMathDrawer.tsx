import { X, Copy } from 'lucide-react';

interface F4_3_ShowMathDrawerProps {
  onClose: () => void;
}

export function F4_3_ShowMathDrawer({ onClose }: F4_3_ShowMathDrawerProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-[#494949]/12 shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#494949]/12">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-[20px] font-bold text-[#161916]">Show math — Balanced variant</h2>
          <button onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[13px] text-[#494949]">
          Every calculation that produced this pod structure, traceable back to your inputs.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Section 1 - Pod Composition */}
        <div>
          <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
            1. Pod Composition
          </div>
          <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
            <div className="text-[13px] font-medium text-[#161916]">Agents per pod</div>
            <div className="text-[12px] font-mono text-[#494949]">
              = min(target_span, max_pod_size, derived_from_volume)
            </div>
            <div className="text-[13px] font-mono text-[#161916]">
              = min(12, 20, 12.4) → <span className="font-bold text-[#FD4E59]">12 agents</span>
            </div>
            <div className="text-[12px] italic text-[#494949] leading-relaxed">
              ↳ Driven by your engagement volume of 50,000/day and TL coaching capacity of 6.5 hrs/agent/week.
            </div>
          </div>
        </div>

        {/* Section 2 - QA Sampling */}
        <div>
          <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
            2. QA Sampling Math
          </div>
          <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
            <div className="text-[12px] font-mono text-[#494949]">
              QA per pod = (audits/day × time per audit) / QA capacity
            </div>
            <div className="text-[13px] font-mono text-[#161916]">
              = (24 audits × 6 min) / (6.5 hrs × 60 min)
            </div>
            <div className="text-[13px] font-mono text-[#161916]">
              = 0.37 FTE → <span className="font-bold text-[#FD4E59]">0.4 QA</span>
            </div>
            <div className="text-[12px] italic text-[#494949] leading-relaxed">
              ↳ Sampling rate 10% from your KPI sheet × 12 agents × items/agent.
            </div>
          </div>
        </div>

        {/* Section 3 - Span of Control */}
        <div>
          <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
            3. Span of Control
          </div>
          <div className="bg-[#FDF8F4] rounded-lg p-4">
            <div className="text-[13px] font-medium text-[#161916] mb-3">Risk profile lookup:</div>
            <div className="space-y-1 text-[12px] font-mono">
              <div className="text-[#494949]">low risk → 1:18 to 1:25</div>
              <div className="text-[#494949]">medium risk → 1:12 to 1:18</div>
              <div className="bg-[#FFF0DC] border-l-2 border-[#FFAB28] px-2 py-1 text-[#161916] font-medium">
                high risk → 1:8 to 1:12
              </div>
            </div>
            <div className="text-[12px] italic text-[#494949] mt-3">
              Your risk profile is HIGH → recommended span 1:12 (max)
            </div>
          </div>
        </div>

        {/* Section 4 - Pod Count */}
        <div>
          <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-3">
            4. Pod Count
          </div>
          <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
            <div className="text-[12px] font-mono text-[#494949]">
              Pods needed = total volume / pod capacity
            </div>
            <div className="text-[13px] font-mono text-[#161916]">
              = 50,000 items/day / 6,800 items/day per pod
            </div>
            <div className="text-[13px] font-mono text-[#161916]">
              = 7.35 → ceiling = <span className="font-bold text-[#FD4E59]">8 pods</span>
            </div>
          </div>
        </div>

        {/* Inputs Used */}
        <div className="pt-6 border-t border-[#494949]/12">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
            Inputs Used
          </div>
          <div className="space-y-2">
            {[
              { label: 'Volume / day', value: '50,000' },
              { label: 'Risk profile', value: 'HIGH' },
              { label: 'QA sampling rate', value: '10%' },
              { label: 'Items per agent (derived)', value: '~340/day' },
              { label: 'Coaching capacity (TL)', value: '6.5 hrs/wk per agent' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-[13px]">
                <span className="text-[#494949]">{item.label}</span>
                <span className="font-medium text-[#161916]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#494949]/12 flex items-center justify-between bg-white">
        <button className="h-10 px-4 text-[#494949] text-[14px] hover:text-[#161916] flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Copy math to clipboard
        </button>
        <button
          onClick={onClose}
          className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
