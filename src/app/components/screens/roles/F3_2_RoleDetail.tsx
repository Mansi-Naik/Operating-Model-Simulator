import { ChevronLeft, Eye, Download, Edit, Check, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

interface F3_2_RoleDetailProps {
  onBack: () => void;
}

export function F3_2_RoleDetail({ onBack }: F3_2_RoleDetailProps) {
  const todayTimeSplit = [
    { label: 'Coaching', percent: 35, color: '#FD4E59' },
    { label: 'Exception rev', percent: 30, color: '#FFAB28' },
    { label: 'Reporting', percent: 20, color: '#6D7069' },
    { label: 'Meetings', percent: 15, color: '#FFF0DC', outlined: true },
  ];

  const futureTimeSplit = [
    { label: 'Coaching', percent: 50, color: '#FD4E59', change: '+15', changeType: 'up' },
    { label: 'Exception rev', percent: 30, color: '#FFAB28', change: 'same', changeType: 'same' },
    { label: 'AI validation', percent: 15, color: '#FFAB28', change: 'NEW', changeType: 'new' },
    { label: 'Meetings', percent: 5, color: '#FFF0DC', change: '-10', changeType: 'down', outlined: true },
  ];

  const DonutChart = ({ segments, showChanges = false }: { segments: any[]; showChanges?: boolean }) => {
    let cumulativePercent = 0;

    return (
      <div className="flex flex-col items-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="mb-4">
          <circle cx="80" cy="80" r="70" fill="white" />
          {segments.map((segment, idx) => {
            const startAngle = (cumulativePercent / 100) * 360 - 90;
            const endAngle = ((cumulativePercent + segment.percent) / 100) * 360 - 90;
            cumulativePercent += segment.percent;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 80 + 70 * Math.cos(startRad);
            const y1 = 80 + 70 * Math.sin(startRad);
            const x2 = 80 + 70 * Math.cos(endRad);
            const y2 = 80 + 70 * Math.sin(endRad);

            const x1Inner = 80 + 45 * Math.cos(startRad);
            const y1Inner = 80 + 45 * Math.sin(startRad);
            const x2Inner = 80 + 45 * Math.cos(endRad);
            const y2Inner = 80 + 45 * Math.sin(endRad);

            const largeArc = segment.percent > 50 ? 1 : 0;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A 45 45 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`}
                fill={segment.outlined ? 'none' : segment.color}
                stroke={segment.outlined ? segment.color : 'none'}
                strokeWidth={segment.outlined ? 2 : 0}
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="space-y-2 w-full">
          {segments.map((segment, idx) => (
            <div key={idx} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: segment.outlined ? 'transparent' : segment.color, border: segment.outlined ? `2px solid ${segment.color}` : 'none' }}
                />
                <span className="text-[#161916]">{segment.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#161916]">{segment.percent}%</span>
                {showChanges && segment.change && (
                  <div
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      segment.changeType === 'up'
                        ? 'bg-[#4CAF50]/20 text-[#4CAF50]'
                        : segment.changeType === 'down'
                        ? 'bg-[#FD4E59]/20 text-[#FD4E59]'
                        : segment.changeType === 'new'
                        ? 'bg-[#FFAB28] text-white'
                        : 'bg-[#6D7069]/20 text-[#6D7069]'
                    }`}
                  >
                    {segment.changeType === 'up' && '↑ '}
                    {segment.changeType === 'down' && '↓ '}
                    {segment.changeType === 'new' && '+ '}
                    {segment.change}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-10">
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
          <h1 className="text-[28px] font-bold text-[#161916]">TL</h1>
          <div className="px-3 py-1 bg-[#DEEBF7] text-[#2E75B6] text-[11px] font-semibold uppercase rounded-full">
            MEANINGFUL SHIFT
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Show source data
          </button>
          <button className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export role spec
          </button>
          <button className="h-9 px-4 border border-[#FD4E59] text-[#FD4E59] text-[13px] font-medium rounded-md hover:bg-[#FD4E59]/5 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit redesign
          </button>
        </div>
      </div>

      {/* Two Column Comparison */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Left Column - TODAY */}
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-white text-[#6D7069] text-[11px] font-semibold uppercase rounded-full">
              TODAY
            </div>
            <span className="text-[12px] text-[#6D7069]">Current state</span>
          </div>

          <h3 className="text-[18px] font-bold text-[#161916] mb-6">TL</h3>

          {/* Time Split */}
          <div className="mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-4">
              Time split
            </div>
            <DonutChart segments={todayTimeSplit} />
          </div>

          {/* Top Tasks */}
          <div className="pt-6 border-t border-[#494949]/12 mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Top tasks
            </div>
            <div className="space-y-2">
              {['Coach agent on missed audit', 'Resolve agent escalation', 'Compile daily quality report'].map((task, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                  <span className="text-[#6D7069] mt-1">•</span>
                  {task}
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="pt-6 border-t border-[#494949]/12">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Skills
            </div>
            <div className="space-y-2">
              {['domain expertise', 'people management', 'policy knowledge'].map((skill, idx) => (
                <div key={idx} className="px-3 py-1.5 bg-[#FFF0DC] text-[#161916] text-[13px] rounded inline-block mr-2">
                  {skill}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - FUTURE */}
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase rounded-full">
              FUTURE
            </div>
            <span className="text-[12px] text-[#FD4E59]">Redesigned</span>
          </div>

          <h3 className="text-[18px] font-bold text-[#161916] mb-6">TL</h3>

          {/* Time Split */}
          <div className="mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-4">
              Time split
            </div>
            <DonutChart segments={futureTimeSplit} showChanges={true} />
          </div>

          {/* Tasks */}
          <div className="pt-6 border-t border-[#494949]/12 mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Tasks retained
            </div>
            <div className="space-y-2 mb-4">
              {['Coach with AI insights', 'Resolve agent escalation'].map((task, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                  <span className="text-[#6D7069] mt-1">•</span>
                  {task}
                </div>
              ))}
            </div>

            <div className="text-[13px] font-semibold text-[#FFAB28] uppercase tracking-wide mb-2">
              New tasks
            </div>
            <div className="space-y-2 mb-4">
              {['Validate AI-generated daily reports', 'Coach via AI-surfaced patterns'].map((task, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                  <Plus className="w-4 h-4 text-[#FFAB28] mt-0.5" />
                  {task}
                </div>
              ))}
            </div>

            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Tasks lost
            </div>
            <div className="flex items-start gap-2 text-[14px] text-[#6D7069] line-through">
              <X className="w-4 h-4 mt-0.5" />
              Compile daily quality report
            </div>
          </div>

          {/* Skills */}
          <div className="pt-6 border-t border-[#494949]/12">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Skills
            </div>
            <div className="space-y-2">
              {[
                { skill: 'domain expertise', status: 'retained' },
                { skill: 'people management', status: 'retained' },
                { skill: 'policy knowledge', status: 'retained' },
                { skill: 'interpreting AI confidence', status: 'new' },
                { skill: 'exception-pattern recognition', status: 'new' },
              ].map((item, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFF0DC] rounded mr-2 mb-2">
                  {item.status === 'new' ? (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#FFAB28]" />
                      <span className="text-[13px] text-[#FFAB28]">{item.skill}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4CAF50]" />
                      <span className="text-[13px] text-[#161916]">{item.skill}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Narrative */}
      <div className="bg-[#FFF0DC] border-l-[3px] border-[#FD4E59] rounded-xl p-5 mb-6">
        <div className="text-[11px] font-bold text-[#FD4E59] uppercase tracking-wide mb-2">
          Transition Narrative
        </div>
        <p className="text-[16px] text-[#161916] italic">
          TL shifts from report-compiler to coach-and-validator, with AI absorbing routine reporting work.
        </p>
      </div>

      {/* Day in the Life */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 mb-6">
        <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
          Day in the Life
        </div>
        <p className="text-[14px] text-[#494949] leading-relaxed">
          Morning starts with reviewing the AI-generated overnight quality report, focusing on flagged
          anomalies. Mid-morning: 30-min coaching session with two agents whose patterns surfaced in
          auto-QA. Afternoon: handle three policy escalations from agents (complex calls AI couldn't
          resolve), plus pod-level review.
        </p>
      </div>

      {/* Transition Feasibility */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[16px] font-bold text-[#161916]">Transition feasibility</span>
          <span className="text-[28px] font-bold text-[#161916]">72%</span>
          <div className="px-3 py-1 bg-[#FFF0DC] text-[#FFAB28] text-[11px] font-semibold uppercase rounded-full">
            MIXED
          </div>
        </div>
        <p className="text-[14px] text-[#494949] mb-3">
          Most TLs upskill in place; identify 2-3 needing deeper reskilling on AI validation.
        </p>
        <div>
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
            Key risks
          </div>
          <p className="text-[13px] text-[#494949]">
            Some TLs strongly identify with reporting work — change management needed.
          </p>
        </div>
      </div>
    </div>
  );
}
