import { ChevronLeft, Edit, Plus, X, Check, TrendingUp, Repeat } from 'lucide-react';

interface F3_3_EmergentRoleDetailProps {
  onBack: () => void;
}

export function F3_3_EmergentRoleDetail({ onBack }: F3_3_EmergentRoleDetailProps) {
  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[880px] w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to roles grid
        </button>

        {/* Title Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-[#FFAB28] text-white text-[11px] font-bold uppercase rounded">
              NEW ROLE
            </div>
            <h1 className="text-[28px] font-bold text-[#161916]">AI Output Auditor</h1>
          </div>
          <button className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-xl p-8 mb-6">
          {/* Why This Role Is Needed */}
          <div className="mb-8">
            <div className="text-[11px] font-bold text-[#FFAB28] uppercase tracking-wide mb-2">
              Why This Role Is Needed
            </div>
            <p className="text-[16px] text-[#161916] leading-relaxed">
              Auto-QA covers 40% of audit volume but requires human validation on confidence &lt;85%
              cases. Currently unowned in your hierarchy.
            </p>
          </div>

          {/* Headcount */}
          <div className="mb-8 pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
              Headcount Estimate
            </div>
            <div className="text-[32px] font-bold text-[#161916] mb-3">1.5 FTE</div>
            <div>
              <span className="text-[12px] font-medium text-[#6D7069] mb-2 block">Math:</span>
              <div className="bg-white rounded p-2 text-[13px] font-mono text-[#494949] leading-relaxed">
                ~120 low-confidence flags/day × 5 min each = 10 hrs/day<br />
                ÷ 6.5 productive hrs per FTE = 1.5 FTE
              </div>
            </div>
          </div>

          {/* Placement */}
          <div className="mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide w-24">
                  Sits Under
                </div>
                <a href="#" className="text-[14px] font-medium text-[#161916] hover:text-[#FD4E59]">
                  QA Officer
                </a>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide w-24">
                  Reports To
                </div>
                <span className="text-[14px] font-medium text-[#161916]">QA Officer</span>
              </div>
            </div>
          </div>

          {/* Key Skills */}
          <div className="mb-8 pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Key Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {['QA rubric mastery', 'Interpreting AI confidence', 'Calibration'].map((skill, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded-lg text-[13px] text-[#161916] flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FFAB28]" />
                  {skill}
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing */}
          <div className="pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Could Be Filled From
            </div>
            <div className="space-y-2">
              <div className="bg-white border border-[#494949]/12 rounded-lg p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#FD4E59] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-medium text-[#161916] mb-1">
                    Promote senior agents
                  </div>
                  <div className="text-[13px] text-[#6D7069]">4-6 candidates expected</div>
                </div>
              </div>
              <div className="bg-white border border-[#494949]/12 rounded-lg p-4 flex items-start gap-3">
                <Repeat className="w-5 h-5 text-[#FD4E59] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-medium text-[#161916] mb-1">
                    Lateral move from QA Officer pool
                  </div>
                  <div className="text-[13px] text-[#6D7069]">Requires backfill plan</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3">
          <button className="text-[14px] text-[#FD4E59] font-medium hover:underline flex items-center gap-2">
            <X className="w-4 h-4" />
            Reject role
          </button>
          <button className="h-10 px-6 border border-[#494949]/30 text-[#494949] text-[14px] font-medium rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Accept role
          </button>
        </div>
      </div>
    </div>
  );
}
