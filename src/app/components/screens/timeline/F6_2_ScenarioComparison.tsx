import { Bookmark, Download, Star, Check, Sparkles, ArrowLeft } from 'lucide-react';

interface Scenario {
  name: string;
  recommended: boolean;
  loaded: boolean;
  savedAgo: string;
  stats: {
    costSaving: string;
    headcountDelta: string;
    risk: { level: string; color: { bg: string; text: string } };
    payback: string;
    complexity: { level: string; color: { bg: string; text: string } };
  };
}

interface F6_2_ScenarioComparisonProps {
  onBack: () => void;
}

export function F6_2_ScenarioComparison({ onBack }: F6_2_ScenarioComparisonProps) {
  const scenarios: Scenario[] = [
    {
      name: 'Conservative',
      recommended: false,
      loaded: false,
      savedAgo: 'saved 2 days ago',
      stats: {
        costSaving: '13%',
        headcountDelta: '−2 (−1.7%)',
        risk: { level: 'LOW', color: { bg: '#E2EFDA', text: '#548235' } },
        payback: 'M9',
        complexity: { level: 'LOW', color: { bg: '#E2EFDA', text: '#548235' } },
      },
    },
    {
      name: 'Balanced',
      recommended: true,
      loaded: true,
      savedAgo: 'saved 1 day ago',
      stats: {
        costSaving: '23%',
        headcountDelta: '+3 (+2.7%)',
        risk: { level: 'MED', color: { bg: '#FFF0DC', text: '#FFAB28' } },
        payback: 'M6',
        complexity: { level: 'MED', color: { bg: '#FFF0DC', text: '#FFAB28' } },
      },
    },
    {
      name: 'Aggressive',
      recommended: false,
      loaded: false,
      savedAgo: 'saved today',
      stats: {
        costSaving: '31%',
        headcountDelta: '−8 (−7.0%)',
        risk: { level: 'MED-HIGH', color: { bg: '#FCE4D6', text: '#FD4E59' } },
        payback: 'M4',
        complexity: { level: 'HIGH', color: { bg: '#FCE4D6', text: '#FD4E59' } },
      },
    },
  ];

  return (
    <div className="p-10 max-w-[1204px] mx-auto">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-[13px] text-[#161916]">TIMELINE &gt; SCENARIO COMPARISON</div>
        <button className="h-10 px-5 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
          <Bookmark className="w-4 h-4" />
          + Save current as scenario
        </button>
      </div>

      {/* Title Row */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916] mb-2">Scenario comparison</h1>
        <p className="text-[13px] text-[#6D7069]">
          Compare saved pipeline runs side by side. Each scenario captures the full state from F1 through F6.
        </p>
      </div>

      {/* Three Scenario Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.name}
            className={`bg-[#FDF8F4] rounded-xl p-6 flex flex-col ${
              scenario.loaded ? 'border-2 border-[#FD4E59]' : 'border border-[#494949]/12'
            }`}
            style={{ height: '520px' }}
          >
            {/* Star Badge for recommended */}
            {scenario.recommended && (
              <div className="absolute top-6 right-6 w-8 h-8 bg-[#FD4E59] rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            )}

            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[18px] font-bold text-[#161916]">{scenario.name}</h3>
                {scenario.recommended && (
                  <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded-full">
                    Recommended
                  </div>
                )}
              </div>
              <div className="text-[12px] text-[#6D7069]">{scenario.savedAgo}</div>
            </div>

            {/* Stats Table */}
            <div className="space-y-3 mb-6 flex-1">
              {/* Cost Saving */}
              <div className="pb-3 border-b border-[#494949]/12">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Cost Saving
                </div>
                <div className="text-[18px] font-bold text-[#161916]">{scenario.stats.costSaving}</div>
              </div>

              {/* Headcount Delta */}
              <div className="pb-3 border-b border-[#494949]/12">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Headcount Delta
                </div>
                <div className="text-[18px] font-bold text-[#161916]">{scenario.stats.headcountDelta}</div>
              </div>

              {/* Risk */}
              <div className="pb-3 border-b border-[#494949]/12">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Risk</div>
                <div
                  className="inline-block px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: scenario.stats.risk.color.bg,
                    color: scenario.stats.risk.color.text,
                  }}
                >
                  {scenario.stats.risk.level}
                </div>
              </div>

              {/* Payback */}
              <div className="pb-3 border-b border-[#494949]/12">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Payback</div>
                <div className="text-[18px] font-bold text-[#161916]">{scenario.stats.payback}</div>
              </div>

              {/* Transition Complexity */}
              <div className="pb-3">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Transition Complexity
                </div>
                <div
                  className="inline-block px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: scenario.stats.complexity.color.bg,
                    color: scenario.stats.complexity.color.text,
                  }}
                >
                  {scenario.stats.complexity.level}
                </div>
              </div>
            </div>

            {/* Load Button */}
            <div className="mt-auto">
              <button
                className={`w-full h-10 rounded-md text-[14px] font-semibold flex items-center justify-center gap-2 ${
                  scenario.loaded
                    ? 'bg-[#FD4E59] text-white'
                    : 'border-[1.5px] border-[#FD4E59] text-[#FD4E59] bg-transparent'
                }`}
              >
                {scenario.loaded && <Check className="w-4 h-4" />}
                {scenario.loaded ? 'Loaded' : 'Load'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Radar Comparison Panel */}
      <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-4 shadow-sm">
        <h2 className="text-[16px] font-bold text-[#161916] mb-2">Radar comparison</h2>
        <p className="text-[13px] text-[#6D7069] mb-4">
          How each scenario performs across 6 dimensions, normalized 0–1.
        </p>

        <div className="grid grid-cols-2 gap-8">
          {/* Left: Radar Chart */}
          <div className="flex items-center justify-center">
            <svg width="320" height="320" viewBox="0 0 320 320">
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  points="160,40 247,100 247,220 160,280 73,220 73,100"
                  fill="none"
                  stroke="#6D7069"
                  strokeWidth="1"
                  opacity="0.2"
                  transform={`translate(${160 * (1 - scale)}, ${160 * (1 - scale)}) scale(${scale})`}
                />
              ))}

              {/* Axis lines */}
              <line x1="160" y1="160" x2="160" y2="40" stroke="#6D7069" strokeWidth="1" opacity="0.3" />
              <line x1="160" y1="160" x2="247" y2="100" stroke="#6D7069" strokeWidth="1" opacity="0.3" />
              <line x1="160" y1="160" x2="247" y2="220" stroke="#6D7069" strokeWidth="1" opacity="0.3" />
              <line x1="160" y1="160" x2="160" y2="280" stroke="#6D7069" strokeWidth="1" opacity="0.3" />
              <line x1="160" y1="160" x2="73" y2="220" stroke="#6D7069" strokeWidth="1" opacity="0.3" />
              <line x1="160" y1="160" x2="73" y2="100" stroke="#6D7069" strokeWidth="1" opacity="0.3" />

              {/* Conservative polygon */}
              <polygon
                points="160,76 210,115 210,205 160,244 110,205 110,115"
                fill="#E2EFDA"
                fillOpacity="0.3"
                stroke="#548235"
                strokeWidth="1.5"
              />

              {/* Balanced polygon */}
              <polygon
                points="160,64 229,106 229,214 160,256 91,214 91,106"
                fill="#FCE4D6"
                fillOpacity="0.3"
                stroke="#FD4E59"
                strokeWidth="1.5"
              />

              {/* Aggressive polygon */}
              <polygon
                points="160,52 238,100 220,226 160,262 100,226 82,100"
                fill="#FFF0DC"
                fillOpacity="0.3"
                stroke="#FFAB28"
                strokeWidth="1.5"
              />

              {/* Labels */}
              <text x="160" y="30" fontSize="11" fill="#6D7069" textAnchor="middle" fontWeight="500">
                Cost
              </text>
              <text x="260" y="105" fontSize="11" fill="#6D7069" textAnchor="start" fontWeight="500">
                Scale
              </text>
              <text x="260" y="225" fontSize="11" fill="#6D7069" textAnchor="start" fontWeight="500">
                Agility
              </text>
              <text x="160" y="305" fontSize="11" fill="#6D7069" textAnchor="middle" fontWeight="500">
                Complexity
              </text>
              <text x="60" y="225" fontSize="11" fill="#6D7069" textAnchor="end" fontWeight="500">
                Risk
              </text>
              <text x="60" y="105" fontSize="11" fill="#6D7069" textAnchor="end" fontWeight="500">
                Quality
              </text>
            </svg>
          </div>

          {/* Right: Legend + Key Differences */}
          <div>
            {/* Legend */}
            <div className="mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#E2EFDA] border border-[#548235] rounded" />
                  <span className="text-[14px] text-[#161916]">Conservative</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#FCE4D6] border border-[#FD4E59] rounded relative">
                    <Star className="w-2.5 h-2.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FD4E59] fill-[#FD4E59]" />
                  </div>
                  <span className="text-[14px] text-[#161916] font-medium">Balanced</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#FFF0DC] border border-[#FFAB28] rounded" />
                  <span className="text-[14px] text-[#161916]">Aggressive</span>
                </div>
              </div>
            </div>

            {/* Key Differences */}
            <div>
              <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                Key Differences
              </div>
              <div className="space-y-2 text-[13px] text-[#494949] leading-relaxed">
                <p>• Aggressive scores highest on cost & scale, lowest on safety.</p>
                <p>• Conservative best on transition simplicity & risk.</p>
                <p>• Balanced is the only scenario hitting all dimensions ≥ 0.5.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Callout */}
      <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-5 mb-6 flex items-start gap-4">
        <Sparkles className="w-5 h-5 text-[#FFAB28] flex-shrink-0 mt-0.5" />
        <p className="text-[14px] text-[#161916] leading-relaxed">
          Conservative optimizes safety at the cost of pace. Aggressive maximizes savings but demands a high-tempo
          transition with mature AI Ops. Balanced is the recommended starting point — meaningful savings with manageable
          risk and a 6-month payback.
        </p>
      </div>

      {/* Footer Action Row */}
      <div className="flex items-center justify-between pt-6 border-t border-[#494949]/12">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Timeline
          </button>
          <button className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md">
            Recommend Aggressive
          </button>
          <button className="h-10 px-5 text-[#494949] text-[14px] hover:bg-[#494949]/5 rounded-md">
            Recommend Conservative
          </button>
        </div>
        <button className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export comparison deck
        </button>
      </div>
    </div>
  );
}
