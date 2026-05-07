import {
  BarChart3,
  Network,
  Download,
  Check,
  ChevronRight,
  Sparkles,
  Plus,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { useState } from 'react';
import { F6_1_A_AddCustomPhaseModal } from './F6_1_A_AddCustomPhaseModal';
import { F6_1_B_DependenciesView } from './F6_1_B_DependenciesView';
import { F6_1_C_GanttView } from './F6_1_C_GanttView';

type TimelineView = 'main' | 'dependencies' | 'gantt';

interface F6_1_ImplementationTimelineProps {
  onViewScenarios: () => void;
  onBack?: () => void;
  onProceedToF7?: () => void;
}

export function F6_1_ImplementationTimeline({ onViewScenarios, onBack, onProceedToF7 }: F6_1_ImplementationTimelineProps) {
  const [currentView, setCurrentView] = useState<TimelineView>('main');
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);

  // If viewing dependencies or gantt, show those views instead
  if (currentView === 'dependencies') {
    return (
      <F6_1_B_DependenciesView
        onBack={() => setCurrentView('main')}
        onViewGantt={() => setCurrentView('gantt')}
      />
    );
  }

  if (currentView === 'gantt') {
    return (
      <F6_1_C_GanttView
        onBack={() => setCurrentView('main')}
        onViewDependencies={() => setCurrentView('dependencies')}
      />
    );
  }
  const phases = [
    {
      number: 1,
      name: 'Foundation',
      duration: 'Months 1–2',
      color: { bg: '#E2EFDA', text: '#548235', stripe: '#E2EFDA' },
      items: [
        'Image classifier retrain hookups',
        'Data logging improvements',
        'Compile daily report → auto',
        'Auto-QA on spam',
      ],
      savings: '3%',
      icon: Check,
    },
    {
      number: 2,
      name: 'Pilot',
      duration: 'Months 3–4',
      color: { bg: '#FFF0DC', text: '#FFAB28', stripe: '#FFAB28' },
      items: ['Auto-QA pilot in 1 pod', 'AI Output Auditor onboard', 'TL training (cohort 1)'],
      savings: '9%',
      icon: ChevronRight,
    },
    {
      number: 3,
      name: 'Scale',
      duration: 'Months 5–7',
      color: { bg: '#FCE4D6', text: '#FD4E59', stripe: '#FCE4D6' },
      items: ['LLM summarization rollout', 'Pod restructure across all teams', 'Span-of-control increase'],
      savings: '18%',
      icon: ArrowRight,
    },
    {
      number: 4,
      name: 'Optimize',
      duration: 'Months 8–9',
      color: { bg: '#FD4E59', text: '#FFFFFF', stripe: '#FD4E59' },
      items: ['Refine AI confidence thresholds', 'Reduce TL overhead further', 'Backlog for v2'],
      savings: '23%',
      icon: Sparkles,
    },
  ];

  return (
    <>
      {/* Add Custom Phase Modal */}
      {showAddPhaseModal && <F6_1_A_AddCustomPhaseModal onClose={() => setShowAddPhaseModal(false)} />}

      <div className="p-10 max-w-[1204px] mx-auto">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[13px] text-[#161916]">TIMELINE</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('gantt')}
              className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View as Gantt
            </button>
            <button
              onClick={() => setCurrentView('dependencies')}
              className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
            >
              <Network className="w-4 h-4" />
              View dependencies
            </button>
            <button className="h-9 px-4 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

      {/* Title Row */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916] mb-2">Implementation timeline</h1>
        <p className="text-[13px] text-[#6D7069]">
          A phased rollout of the recommended operating model. Adjust phases or sequence to match your client's
          appetite.
        </p>
      </div>

      {/* Phase Summary Strip */}
      <div className="grid grid-cols-4 gap-0 mb-6">
        {phases.map((phase, idx) => (
          <div
            key={phase.number}
            className={`py-4 ${idx < phases.length - 1 ? 'border-r border-[#494949]/12' : ''}`}
          >
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Phase {phase.number}
            </div>
            <div className="text-[18px] font-bold text-[#161916] mb-1">{phase.name}</div>
            <div className="text-[12px] text-[#494949]">{phase.duration}</div>
          </div>
        ))}
      </div>

      {/* Phase Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {phases.map((phase) => {
          const Icon = phase.icon;
          return (
            <div
              key={phase.number}
              className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl overflow-hidden"
              style={{ height: '280px' }}
            >
              {/* Top stripe */}
              <div className="h-1" style={{ backgroundColor: phase.color.stripe }} />

              <div className="p-5 flex flex-col h-[calc(100%-4px)]">
                {/* Phase label */}
                <div
                  className="text-[11px] font-semibold uppercase tracking-wide mb-3"
                  style={{ color: phase.number === 4 ? phase.color.stripe : phase.color.text }}
                >
                  Phase {phase.number} · {phase.name}
                </div>

                {/* Scope items */}
                <div className="flex-1 space-y-2 mb-3">
                  {phase.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: phase.color.text }} />
                      <span className="text-[13px] text-[#161916] leading-tight">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Cumulative savings */}
                <div className="flex items-center gap-2 mt-auto">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color.text }} />
                  <span className="text-[12px] font-medium" style={{ color: phase.color.text }}>
                    Cumulative savings: {phase.savings}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Wins Callout */}
      <div className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-lg p-5 mb-6 flex items-start gap-4">
        <Sparkles className="w-5 h-5 text-[#FFAB28] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[#161916] mb-1">Quick wins (front-loaded into Phase 1)</div>
          <div className="text-[13px] text-[#494949]">
            • Compile daily report → auto • Auto-QA on spam
          </div>
        </div>
        <div className="px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded flex-shrink-0">
          +3% by Month 2
        </div>
      </div>

      {/* Savings Progression Chart */}
      <div className="bg-white border border-[#494949]/12 rounded-xl p-5 mb-6 shadow-sm">
        <div className="text-[14px] font-medium text-[#161916] mb-3">Cumulative savings by phase</div>

        {/* Stacked bar */}
        <div className="relative h-6 bg-[#FFF0DC] rounded-full overflow-hidden mb-2">
          <div className="absolute inset-y-0 left-0 bg-[#E2EFDA] flex items-center justify-center" style={{ width: '13%' }}>
            <span className="text-[11px] font-semibold text-[#548235]">3%</span>
          </div>
          <div className="absolute inset-y-0 bg-[#FFAB28] flex items-center justify-center" style={{ left: '13%', width: '26%' }}>
            <span className="text-[11px] font-semibold text-white">9%</span>
          </div>
          <div className="absolute inset-y-0 bg-[#FCE4D6] flex items-center justify-center" style={{ left: '39%', width: '39%' }}>
            <span className="text-[11px] font-semibold text-[#FD4E59]">18%</span>
          </div>
          <div className="absolute inset-y-0 bg-[#FD4E59] flex items-center justify-center" style={{ left: '78%', width: '22%' }}>
            <span className="text-[11px] font-semibold text-white">23%</span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-[12px] text-[#6D7069]">
          <span>P1: 3%</span>
          <span>P2: 9%</span>
          <span>P3: 18%</span>
          <span>P4: 23%</span>
        </div>
      </div>

      {/* Footer Action Row */}
      <div className="flex items-center justify-between pt-6 border-t border-[#494949]/12">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddPhaseModal(true)}
            className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add custom phase
          </button>
          <button
            onClick={() => setCurrentView('dependencies')}
            className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            View dependencies
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onProceedToF7}
            className="h-11 px-6 border border-[#FD4E59] text-[#FD4E59] text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/5 flex items-center gap-2"
          >
            Go to Summary
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onViewScenarios}
            className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            <Bookmark className="w-4 h-4" />
            Save as scenario
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
