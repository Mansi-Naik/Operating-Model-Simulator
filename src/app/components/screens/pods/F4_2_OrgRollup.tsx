import { ChevronLeft, Calculator, Download, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface F4_2_OrgRollupProps {
  onBack: () => void;
  onShowMath: () => void;
  onProceedToF5?: () => void;
}

export function F4_2_OrgRollup({ onBack, onShowMath, onProceedToF5 }: F4_2_OrgRollupProps) {
  const [volumeMultiplier, setVolumeMultiplier] = useState(1);

  const getPodCount = (multiplier: number) => {
    if (multiplier <= 0.5) return 4;
    if (multiplier <= 1) return 8;
    if (multiplier <= 1.5) return 12;
    return 16;
  };

  const currentPods = getPodCount(volumeMultiplier);

  return (
    <div className="p-10">
      {/* Back Link */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to variants
      </button>

      {/* Title Row */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-[#161916]">Org rollup</h1>
          <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded-full h-7">
            BALANCED VARIANT
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowMath}
            className="h-9 px-4 text-[#494949] text-[13px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Show math
          </button>
          <button className="h-9 px-4 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export org chart
          </button>
        </div>
      </div>

      {/* Org Visual */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-8 mb-6">
        {/* Unit Head */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-[120px] h-12 bg-[#FD4E59] text-white rounded-lg flex items-center justify-center text-[16px] font-medium">
            Unit Head
          </div>

          {/* Connector */}
          <div className="w-px h-8 bg-[#6D7069]" />
          <div className="h-px w-[800px] bg-[#6D7069]" />
        </div>

        {/* Pod Row */}
        <div className="flex items-start justify-center gap-4 mb-8">
          {[1, 2, 3, 4].map((podNum) => (
            <div key={podNum} className="relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-[#6D7069]" />
              <div className="w-[100px] h-20 bg-[#FFF0DC] border border-[#FD4E59] rounded-lg p-2 flex flex-col items-center justify-between">
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">POD {podNum}</div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-2 bg-[#FD4E59] rounded-sm mb-1" />
                  <div className="grid grid-cols-4 gap-0.5">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 bg-[#6D7069] rounded-full" />
                    ))}
                  </div>
                </div>
                <div className="text-[12px] text-[#161916]">TL + 12 + s</div>
              </div>
            </div>
          ))}
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-[#6D7069]" />
            <div className="w-[100px] h-20 bg-[#FDF8F4] border border-[#6D7069] border-dashed rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-[11px] text-[#6D7069] text-center leading-tight">
                POD 5–8<br />(+4 more)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Layer */}
      <div className="mb-6">
        <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
          Support Layer (shared across pods)
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Central QA', count: '2' },
            { name: 'AI Ops', count: '3' },
            { name: 'SME', count: 'shared' },
            { name: 'WFM', count: '1' },
          ].map((role) => (
            <div
              key={role.name}
              className="bg-white border border-[#494949]/12 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="w-6 h-6 rounded-full bg-[#FFAB28] mb-2" />
                <div className="text-[14px] font-medium text-[#161916]">{role.name}</div>
              </div>
              <div className={`text-[24px] font-bold text-[#161916] ${role.count === 'shared' ? 'text-[16px] italic' : ''}`}>
                {role.count === 'shared' ? role.count : `×${role.count}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-px bg-[#494949]/20 rounded-lg overflow-hidden mb-6">
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Total Headcount</div>
          <div className="text-[32px] font-bold text-[#161916]">116</div>
        </div>
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Today</div>
          <div className="text-[24px] font-bold text-[#6D7069]">113</div>
        </div>
        <div className="bg-white p-6 text-center">
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-2">Delta</div>
          <div className="text-[24px] font-bold text-[#548235]">+3 (+2.7%)</div>
        </div>
      </div>

      {/* Volume Sensitivity */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
        <h2 className="text-[16px] font-bold text-[#161916] mb-2">Volume sensitivity</h2>
        <p className="text-[13px] text-[#6D7069] mb-6">
          Adjust target volume to see how the pod count scales.
        </p>

        <div className="relative mb-4">
          {/* Slider Track */}
          <div className="relative w-[800px] mx-auto">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={volumeMultiplier}
              onChange={(e) => setVolumeMultiplier(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#FFF0DC] rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FD4E59 0%, #FD4E59 ${(volumeMultiplier / 2) * 100}%, #FFF0DC ${(volumeMultiplier / 2) * 100}%, #FFF0DC 100%)`,
              }}
            />

            {/* Annotations */}
            <div className="absolute -top-6 left-0 text-[13px] font-medium text-[#161916]">
              Today: 8 pods
            </div>
            <div className="absolute -top-6 left-[62%] text-[13px] font-medium text-[#161916]">
              +50%: 12 pods
            </div>
          </div>
        </div>

        {/* Tick Labels */}
        <div className="flex justify-between text-[13px] text-[#6D7069] w-[800px] mx-auto">
          <span>0.5x | 4 pods</span>
          <span>1x (today) | 8 pods</span>
          <span>1.5x | 12 pods</span>
          <span>2x | 16 pods</span>
        </div>
      </div>

      {/* Proceed to Economics Button */}
      {onProceedToF5 && (
        <div className="pt-6 border-t border-[#494949]/12">
          <button
            onClick={onProceedToF5}
            className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            Proceed to Economics
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
