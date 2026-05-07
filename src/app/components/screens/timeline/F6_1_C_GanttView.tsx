import { ChevronLeft, Network, Download, Check } from 'lucide-react';

interface F6_1_C_GanttViewProps {
  onBack: () => void;
  onViewDependencies?: () => void;
}

export function F6_1_C_GanttView({ onBack, onViewDependencies }: F6_1_C_GanttViewProps) {
  const tasks = [
    { name: 'Image classifier retrain hookups', start: 1, end: 2, phase: 1, critical: true },
    { name: 'Data logging improvements', start: 1, end: 2.5, phase: 1, critical: true },
    { name: 'Compile daily report → auto', start: 1.5, end: 2, phase: 1, quickWin: true },
    { name: 'Auto-QA on spam', start: 1.5, end: 2, phase: 1, quickWin: true },
    { name: 'Auto-QA pilot in 1 pod', start: 3, end: 4, phase: 2, critical: true },
    { name: 'AI Output Auditor onboard', start: 3.5, end: 4, phase: 2 },
    { name: 'TL training cohort 1', start: 3, end: 4, phase: 2 },
    { name: 'LLM summarization rollout', start: 5, end: 6.5, phase: 3, critical: true },
    { name: 'Pod restructure', start: 5.5, end: 7, phase: 3, critical: true },
    { name: 'Span-of-control increase', start: 6.5, end: 7, phase: 3 },
    { name: 'Refine AI confidence + Reduce TL overhead', start: 8, end: 9, phase: 4 },
  ];

  const getPhaseColor = (phase: number) => {
    const colors = {
      1: { bg: '#E2EFDA', text: '#548235' },
      2: { bg: '#FFF0DC', text: '#FFAB28' },
      3: { bg: '#FCE4D6', text: '#FD4E59' },
      4: { bg: '#FD4E59', text: '#FFFFFF' },
    };
    return colors[phase as keyof typeof colors];
  };

  return (
    <div className="p-10 max-w-[1204px] mx-auto">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to timeline
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewDependencies}
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            View dependencies
          </button>
          <button className="h-9 px-4 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Gantt
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916] mb-1">Gantt view</h1>
        <p className="text-[13px] text-[#6D7069]">
          Each scope item plotted across the 9-month timeline. Critical path highlighted.
        </p>
      </div>

      {/* Gantt Container */}
      <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-4 shadow-sm" style={{ height: '580px' }}>
        {/* Phase Labels */}
        <div className="grid grid-cols-[280px_1fr] mb-2">
          <div />
          <div className="grid grid-cols-9">
            <div className="col-span-2 text-center text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">
              Phase 1
            </div>
            <div className="col-span-2 text-center text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">
              Phase 2
            </div>
            <div className="col-span-3 text-center text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">
              Phase 3
            </div>
            <div className="col-span-2 text-center text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">
              Phase 4
            </div>
          </div>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-[280px_1fr] border-b border-[#494949]/12 pb-2 mb-3">
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">Scope Item</div>
          <div className="grid grid-cols-9 gap-0 relative">
            {/* Month labels */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((month) => (
              <div key={month} className="text-center text-[11px] text-[#6D7069] relative">
                M{month}
                {/* Vertical gridline */}
                <div className="absolute left-0 top-full h-[500px] w-px bg-[#494949] opacity-8" />
              </div>
            ))}

            {/* Phase background shading */}
            <div
              className="absolute inset-0 grid grid-cols-9 pointer-events-none"
              style={{ top: '100%', height: '500px' }}
            >
              <div className="col-span-2 bg-[#E2EFDA] opacity-6" />
              <div className="col-span-2 bg-[#FFF0DC] opacity-6" />
              <div className="col-span-3 bg-[#FCE4D6] opacity-6" />
              <div className="col-span-2 bg-[#FD4E59] opacity-6" />
            </div>

            {/* Today marker at M2.5 */}
            <div className="absolute left-[27.8%] top-0 h-[500px] border-l-2 border-dashed border-[#FD4E59] pointer-events-none">
              <div className="absolute -top-5 -left-8 text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide">
                Today
              </div>
            </div>
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-0">
          {tasks.map((task, idx) => {
            const phaseColor = getPhaseColor(task.phase);
            const startPercent = ((task.start - 1) / 8) * 100;
            const widthPercent = ((task.end - task.start) / 8) * 100;

            return (
              <div
                key={idx}
                className={`grid grid-cols-[280px_1fr] h-9 items-center ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-[#FDF8F4]'
                }`}
              >
                <div className="text-[13px] text-[#161916] px-2">{task.name}</div>
                <div className="relative h-full flex items-center">
                  {/* Task bar */}
                  <div
                    className={`absolute h-5 rounded flex items-center px-2 ${
                      task.critical ? 'border-[1.5px] border-[#FD4E59]' : ''
                    }`}
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: phaseColor.bg,
                      color: task.phase === 4 ? phaseColor.text : '#161916',
                    }}
                  >
                    {/* Start dot */}
                    <div
                      className="absolute left-0 w-1 h-1 rounded-full -translate-x-1"
                      style={{ backgroundColor: phaseColor.text }}
                    />
                    {/* End chevron */}
                    <div
                      className="absolute right-0 translate-x-1"
                      style={{ color: phaseColor.text }}
                    >
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                        <path d="M1 0L6 5L1 10V0Z" />
                      </svg>
                    </div>
                    {/* Quick win check */}
                    {task.quickWin && (
                      <div className="absolute right-1">
                        <Check className="w-3 h-3 text-[#548235]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 border-[1.5px] border-[#FD4E59] bg-[#FCE4D6] rounded" />
          <span className="text-[12px] text-[#494949]">Critical path</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#548235]" />
          <span className="text-[12px] text-[#494949]">Quick win</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-[#FD4E59]" />
          <span className="text-[12px] text-[#494949]">Today marker</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-[#E2EFDA] rounded" />
            <div className="w-3 h-3 bg-[#FFF0DC] rounded" />
            <div className="w-3 h-3 bg-[#FCE4D6] rounded" />
            <div className="w-3 h-3 bg-[#FD4E59] rounded" />
          </div>
          <span className="text-[12px] text-[#494949]">Bar fill = phase</span>
        </div>
      </div>
    </div>
  );
}
