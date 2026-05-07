import { AlertTriangle, ChevronUp } from 'lucide-react';

export interface AdvisoryItem {
  id: string;
  severity: 'info' | 'warn';
  title: string;
  body: string;
  affected_items?: string[];
}

interface F2_4_AdvisoriesProps {
  advisories: AdvisoryItem[];
  onCollapse: () => void;
}

export function F2_4_Advisories({ advisories, onCollapse }: F2_4_AdvisoriesProps) {
  return (
    <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-xl p-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FFAB28]" />
          <h3 className="text-[16px] font-bold text-[#161916]">Advisories ({advisories.length})</h3>
        </div>
        <button
          onClick={onCollapse}
          className="h-8 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-white flex items-center gap-2"
        >
          Collapse
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Advisory Cards */}
      <div className="space-y-3">
        {advisories.map((advisory) => {
          const chipLabel = advisory.severity === 'warn' ? 'WARN' : 'INFO';
          return (
            <div
              key={advisory.id}
              className="bg-white border border-[#494949]/12 rounded-lg p-4 min-h-[64px]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase text-white ${
                        advisory.severity === 'warn' ? 'bg-[#FFAB28]' : 'bg-[#6D7069]'
                      }`}
                    >
                      {chipLabel}
                    </div>
                    <span className="text-[14px] font-medium text-[#161916]">{advisory.title}</span>
                  </div>
                  <p className="text-[13px] text-[#494949] leading-relaxed">{advisory.body}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    type="button"
                    className="h-8 px-3 border border-[#494949]/30 text-[#494949] text-[12px] rounded hover:bg-[#FDF8F4]"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="h-8 px-3 border border-[#494949]/30 text-[#494949] text-[12px] rounded hover:bg-[#FDF8F4] whitespace-nowrap"
                  >
                    Mark for follow-up
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
