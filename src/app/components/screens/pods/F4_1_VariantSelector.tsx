import { RefreshCw, Settings, Star, Check, ArrowRight, Calculator } from 'lucide-react';

interface Variant {
  name: string;
  isRecommended: boolean;
  isSelected: boolean;
  agents: number;
  support: { qa: number; auditor: number; sme: number };
  stats: {
    span: string;
    capacity: string;
    costIndex: string;
    risk: 'LOW' | 'MED' | 'MED-HIGH';
  };
  narrative: string;
}

interface F4_1_VariantSelectorProps {
  onViewOrgRollup: () => void;
  onShowMath: () => void;
  onBack?: () => void;
}

export function F4_1_VariantSelector({ onViewOrgRollup, onShowMath, onBack }: F4_1_VariantSelectorProps) {
  const variants: Variant[] = [
    {
      name: 'CONSERVATIVE',
      isRecommended: false,
      isSelected: false,
      agents: 8,
      support: { qa: 0.5, auditor: 0.25, sme: 0.2 },
      stats: { span: '1:8', capacity: '4,500', costIndex: '1.05', risk: 'LOW' },
      narrative: 'Tight span, high support density. Best when regulated or early in transition before AI maturity is proven.',
    },
    {
      name: 'BALANCED',
      isRecommended: true,
      isSelected: true,
      agents: 12,
      support: { qa: 0.4, auditor: 0.3, sme: 0.15 },
      stats: { span: '1:12', capacity: '6,800', costIndex: '1.00', risk: 'MED' },
      narrative: 'Industry benchmark midpoint for safety work. Recommended default — balances cost, risk, and supervisory load.',
    },
    {
      name: 'AGGRESSIVE',
      isRecommended: false,
      isSelected: false,
      agents: 18,
      support: { qa: 0.3, auditor: 0.4, sme: 0.1 },
      stats: { span: '1:18', capacity: '10,200', costIndex: '0.85', risk: 'MED-HIGH' },
      narrative: 'Wide span, lean support. Best when AI confidence is consistently high. Requires mature AI Ops to manage exception load.',
    },
  ];

  const getRiskChip = (risk: string) => {
    const configs = {
      LOW: { bg: '#E2EFDA', text: '#548235' },
      MED: { bg: '#FFF0DC', text: '#FFAB28' },
      'MED-HIGH': { bg: '#FCE4D6', text: '#FD4E59' },
    };
    const config = configs[risk as keyof typeof configs];
    return (
      <div
        className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide inline-block"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {risk}
      </div>
    );
  };

  const renderPodVisual = (variant: Variant) => {
    // Determine grid layout: 8 in one row, 12 as 6+6, 18 as 9+9
    const agentsPerRow = variant.agents === 8 ? 8 : variant.agents === 12 ? 6 : 9;
    const rows = Math.ceil(variant.agents / agentsPerRow);

    return (
      <div className="flex flex-col items-center">
        {/* TL Box - 64x32px */}
        <div className="w-16 h-8 bg-[#FD4E59] text-white rounded flex items-center justify-center text-[14px] font-medium">
          TL
        </div>

        {/* 16px vertical gap */}
        <div className="h-4" />

        {/* 2px grey vertical line, 16px tall */}
        <div className="w-0.5 h-4 bg-[#6D7069]" />

        {/* Agent boxes with number label to the right - 4px gaps */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex gap-1">
                {Array.from({
                  length: Math.min(agentsPerRow, variant.agents - rowIdx * agentsPerRow)
                }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className="w-5 h-6 bg-[#FDF8F4] border border-[#6D7069] rounded"
                  />
                ))}
              </div>
            ))}
          </div>
          <span className="text-[14px] font-medium text-[#161916]">{variant.agents}</span>
        </div>

        {/* 16px vertical gap below agent stack */}
        <div className="h-4" />

        {/* Support roles - horizontal pills, 8px gap between pills */}
        <div className="flex items-center gap-2">
          <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
            {variant.support.qa} QA
          </div>
          <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
            {variant.support.auditor} AI Aud
          </div>
          <div className="w-[92px] h-6 bg-[#FDF8F4] border border-dashed border-[#6D7069] rounded flex items-center justify-center text-[11px] text-[#161916]">
            {variant.support.sme} SME
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1204px] mx-auto">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-[13px] text-[#161916]">PODS</div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-run
          </button>
          <button className="h-9 px-3 border border-[#494949]/30 text-[#494949] rounded-md hover:bg-[#494949]/5">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title - 24px below top row */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916]">Pod structure</h1>
        <p className="text-[13px] text-[#6D7069]">
          AI-synthesized team shape and span of control. Adjust constraints to explore variants.
        </p>
      </div>

      {/* Constraints Bar - 24px padding, controls at 36px height */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
        <div className="flex items-end gap-6 flex-wrap">
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Risk profile</label>
            <select className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] min-w-[120px]">
              <option>HIGH</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Target span</label>
            <input
              type="text"
              defaultValue="<= 12"
              className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] w-[100px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Max pod size</label>
            <input
              type="number"
              defaultValue="20"
              className="h-9 px-3 bg-white border border-[#494949]/30 rounded-md text-[14px] text-[#161916] w-[100px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Must include</label>
            <div className="flex items-center gap-2 h-9">
              <div className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2">
                TL
                <button className="text-[#FD4E59]">×</button>
              </div>
              <div className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2">
                QA Officer
                <button className="text-[#FD4E59]">×</button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-[#494949] mb-1">Shared support</label>
            <div className="flex items-center gap-2 h-9">
              <div className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2">
                SME
                <button className="text-[#FD4E59]">×</button>
              </div>
              <div className="h-7 px-3 bg-white border border-[#FD4E59] rounded-full text-[13px] text-[#161916] flex items-center gap-2">
                AI Ops
                <button className="text-[#FD4E59]">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Grid - ~360px each card, 24px gap, 480px height */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {variants.map((variant) => (
          <div
            key={variant.name}
            className={`bg-[#FDF8F4] rounded-xl p-6 relative flex flex-col ${
              variant.isSelected ? 'border-2 border-[#FD4E59]' : 'border border-[#494949]/12'
            }`}
            style={{ height: '480px' }}
          >
            {/* Star Badge - positioned inside with proper padding */}
            {variant.isRecommended && (
              <div className="absolute top-6 right-6 w-8 h-8 bg-[#FD4E59] rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            )}

            {/* Section 1: Variant name - 16px bold caps */}
            <h3 className="text-[16px] font-bold text-[#161916] uppercase tracking-wide mb-4">
              {variant.name}
            </h3>

            {/* Section 2: Pod visual - centered, fixed height ~200px */}
            <div className="mb-4" style={{ height: '200px' }}>
              {renderPodVisual(variant)}
            </div>

            {/* Section 3: Stats grid - 2x2, 8px gap between cells */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Span</div>
                <div className="text-[18px] font-bold text-[#161916]">{variant.stats.span}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Capacity/Day</div>
                <div className="text-[18px] font-bold text-[#161916]">{variant.stats.capacity}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Cost Index</div>
                <div className="text-[18px] font-bold text-[#161916]">{variant.stats.costIndex}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6D7069] uppercase tracking-wide mb-1">Risk</div>
                <div>{getRiskChip(variant.stats.risk)}</div>
              </div>
            </div>

            {/* Section 5: Narrative - italic 13px, max 3 lines with ellipsis */}
            <p
              className="text-[13px] italic text-[#494949] mb-4 leading-relaxed overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {variant.narrative}
            </p>

            {/* Section 6: Select button - full width, 40px tall at bottom edge */}
            <div className="mt-auto">
              <button
                className={`w-full h-10 rounded-md text-[14px] font-semibold flex items-center justify-center gap-2 ${
                  variant.isSelected
                    ? 'bg-[#FD4E59] text-white'
                    : 'border-[1.5px] border-[#FD4E59] text-[#FD4E59] bg-transparent'
                }`}
              >
                {variant.isSelected && <Check className="w-4 h-4" />}
                {variant.isSelected ? 'Selected' : 'Select'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions - 32px gap above */}
      <div className="flex items-center justify-between pt-8">
        <button
          onClick={onShowMath}
          className="h-11 px-6 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Show math
        </button>
        <button
          onClick={onViewOrgRollup}
          className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
        >
          View org rollup
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
