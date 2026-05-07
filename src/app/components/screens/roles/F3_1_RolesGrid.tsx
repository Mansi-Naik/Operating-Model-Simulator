import { RefreshCw, Settings, ChevronDown, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';

interface RoleCard {
  name: string;
  pattern: 'minor-evolution' | 'meaningful-shift' | 'transformation' | 'redefinition';
  timeFreed: number;
  feasibility: number;
  newTitleProposed?: boolean;
}

interface F3_1_RolesGridProps {
  onRoleClick: (roleName: string) => void;
  onEmergentRoleClick: () => void;
  onReRun: () => void;
  onBack?: () => void;
  onProceedToF4?: () => void;
}

export function F3_1_RolesGrid({ onRoleClick, onEmergentRoleClick, onReRun, onBack, onProceedToF4 }: F3_1_RolesGridProps) {
  const roles: RoleCard[] = [
    { name: 'Agent', pattern: 'minor-evolution', timeFreed: 12, feasibility: 88 },
    { name: 'TL', pattern: 'meaningful-shift', timeFreed: 32, feasibility: 72 },
    { name: 'QA Officer', pattern: 'transformation', timeFreed: 62, feasibility: 45, newTitleProposed: true },
    { name: 'Unit Head', pattern: 'minor-evolution', timeFreed: 8, feasibility: 95 },
  ];

  const getPatternBadge = (pattern: string) => {
    const configs = {
      'minor-evolution': { bg: '#E2EFDA', text: '#548235', label: 'MINOR EVOLUTION' },
      'meaningful-shift': { bg: '#DEEBF7', text: '#2E75B6', label: 'MEANINGFUL SHIFT' },
      'transformation': { bg: '#FFF0DC', text: '#FFAB28', label: 'TRANSFORMATION' },
      'redefinition': { bg: '#FCE4D6', text: '#FD4E59', label: 'REDEFINITION' },
    };
    const config = configs[pattern as keyof typeof configs];
    return (
      <div
        className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {config.label}
      </div>
    );
  };

  const getBarColor = (value: number, isTimeFreed: boolean) => {
    if (isTimeFreed) {
      if (value < 20) return '#4CAF50';
      if (value < 40) return '#FFAB28';
      return '#FD4E59';
    } else {
      if (value >= 80) return '#4CAF50';
      if (value >= 60) return '#FFAB28';
      return '#FD4E59';
    }
  };

  return (
    <div className="p-10">
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

      {/* Top Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] text-[#161916]">ROLES</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReRun}
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-run
          </button>
          <button className="h-9 px-3 border border-[#494949]/30 text-[#494949] rounded-md hover:bg-[#494949]/5">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916]">Future role definitions</h1>
        <p className="text-[13px] text-[#6D7069]">4 roles redesigned · 1 emergent role suggested</p>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-bold text-[#161916]">Existing roles, redesigned</h2>
        <button className="text-[13px] text-[#6D7069] hover:text-[#161916] flex items-center gap-1">
          Sort by impact
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {roles.map((role, idx) => (
          <div
            key={role.name}
            onClick={() => onRoleClick(role.name)}
            className={`bg-[#FDF8F4] border rounded-xl p-6 cursor-pointer transition-all shadow-sm ${
              idx === 1 ? 'border-[#FD4E59]' : 'border-[#494949]/12 hover:border-[#FD4E59]'
            }`}
            style={{ height: '220px' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#161916]">{role.name}</h3>
              {getPatternBadge(role.pattern)}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Time Freed
                </div>
                <div className="text-[32px] font-bold text-[#161916] leading-none mb-2">
                  {role.timeFreed}%
                </div>
                <div className="h-1 bg-[#FFF0DC] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${role.timeFreed}%`,
                      backgroundColor: getBarColor(role.timeFreed, true),
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Feasibility
                </div>
                <div className="text-[32px] font-bold text-[#161916] leading-none mb-2">
                  {role.feasibility}%
                </div>
                <div className="h-1 bg-[#FFF0DC] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${role.feasibility}%`,
                      backgroundColor: getBarColor(role.feasibility, false),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-4">
              {role.newTitleProposed && (
                <div className="flex items-center gap-1 text-[12px] font-bold text-[#FFAB28]">
                  <Sparkles className="w-3 h-3" />
                  NEW TITLE PROPOSED
                </div>
              )}
              <div className="ml-auto">
                <span className="text-[14px] text-[#FD4E59] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  View redesign
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Emergent Roles Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-bold text-[#161916]">Emergent roles</h2>
            <div className="px-2 py-0.5 bg-[#FFAB28] text-white text-[11px] font-semibold rounded-full">
              1
            </div>
          </div>
          <p className="text-[13px] text-[#6D7069]">
            New roles suggested by the AI based on unowned future work.
          </p>
        </div>

        {/* Emergent Role Card */}
        <div className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-xl p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="px-2 py-1 bg-[#FFAB28] text-white text-[11px] font-bold uppercase rounded">
                NEW
              </div>
              <h3 className="text-[20px] font-bold text-[#161916]">AI Output Auditor</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded text-[13px] text-[#494949]">
              Headcount: 1.5 FTE
            </div>
            <div className="w-px h-4 bg-[#494949]/20" />
            <div className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded text-[13px] text-[#494949]">
              Sits under: QA Officer
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Why needed
            </div>
            <p className="text-[14px] text-[#161916] leading-relaxed">
              Auto-QA covers 40% of audit volume but requires human validation on low-confidence
              flags. Currently unowned in your hierarchy.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button className="text-[14px] text-[#FD4E59] font-medium hover:underline">
              Reject
            </button>
            <button
              onClick={onEmergentRoleClick}
              className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
            >
              View detail
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Proceed to PODs Button */}
      <div className="mt-8 pt-6 border-t border-[#494949]/12">
        <button
          onClick={onProceedToF4}
          className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 shadow-sm"
        >
          Proceed to PODs
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
