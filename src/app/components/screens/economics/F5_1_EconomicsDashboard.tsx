import {
  RefreshCw,
  Settings,
  ArrowRight,
  TrendingUp,
  Check,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';

interface F5_1_EconomicsDashboardProps {
  onEditAssumptions: () => void;
  onBack?: () => void;
  onProceedToF6?: () => void;
}

export function F5_1_EconomicsDashboard({ onEditAssumptions, onBack, onProceedToF6 }: F5_1_EconomicsDashboardProps) {
  // Sensitivity parameters with base values
  const [classifierCoverage, setClassifierCoverage] = useState(23);
  const [agentCost, setAgentCost] = useState(23);
  const [rampSpeed, setRampSpeed] = useState(23);

  // Original values for reset
  const originalValues = {
    classifierCoverage: 23,
    agentCost: 23,
    rampSpeed: 23,
  };

  // Calculate economics based on sensitivity parameters
  const calculateEconomics = () => {
    // Base values at 23% for all parameters
    const baseSavings = 22.9;
    const baseMonthlyCost = 318;
    const baseCostPerItem = 0.21;

    // Impact factors for each parameter
    const classifierImpact = (classifierCoverage - 23) * 0.4; // Biggest driver
    const agentCostImpact = (agentCost - 23) * 0.25; // Second driver
    const rampSpeedImpact = (rampSpeed - 23) * 0.1; // Minor impact

    const totalImpact = classifierImpact + agentCostImpact + rampSpeedImpact;
    const newSavings = Math.max(0, Math.min(50, baseSavings + totalImpact));

    // Calculate new costs based on savings
    const savingsMultiplier = 1 - (newSavings / 100);
    const newMonthlyCost = Math.round(412 * savingsMultiplier);
    const newCostPerItem = (0.275 * savingsMultiplier).toFixed(2);

    return {
      savings: newSavings.toFixed(1),
      monthlyCost: newMonthlyCost,
      costPerItem: newCostPerItem,
      range: `${Math.max(0, Math.round(newSavings - 5))}–${Math.min(50, Math.round(newSavings + 5))}%`,
    };
  };

  const economics = calculateEconomics();

  const handleReset = () => {
    setClassifierCoverage(originalValues.classifierCoverage);
    setAgentCost(originalValues.agentCost);
    setRampSpeed(originalValues.rampSpeed);
  };

  const isModified =
    classifierCoverage !== originalValues.classifierCoverage ||
    agentCost !== originalValues.agentCost ||
    rampSpeed !== originalValues.rampSpeed;
  return (
    <div className="relative">
      {/* Illustrative watermark - diagonal repeating text */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 200px,
            rgba(255, 171, 40, 0.05) 200px,
            rgba(255, 171, 40, 0.05) 400px
          )`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='600' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='0' y='50' font-family='Funnel Sans' font-size='48' fill='rgba(255,171,40,0.05)' transform='rotate(-45 300 100)'%3EILLUSTRATIVE%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="p-10 max-w-[1204px] mx-auto relative z-10">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[13px] text-[#161916]">ECONOMICS</div>
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

        {/* Title Row with ILLUSTRATIVE chip */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-[24px] font-bold text-[#161916]">Projected economics</h1>
            <div className="h-7 px-4 border-[1.5px] border-dashed border-[#FFAB28] rounded-full flex items-center">
              <span className="text-[12px] font-medium text-[#FFAB28] uppercase tracking-wider">
                ILLUSTRATIVE
              </span>
            </div>
          </div>
          <p className="text-[13px] text-[#6D7069]">
            All values are indicative. Adjust assumptions in the panel to explore alternatives.
          </p>
        </div>

        {/* Primary Stat Tiles */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Tile 1 - Monthly Cost */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Monthly Cost
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">$412k</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">${economics.monthlyCost}k</span>
            </div>
            <div className="text-[18px] font-bold text-[#548235] mb-1">−{economics.savings}%</div>
            <div className="text-[12px] italic text-[#6D7069] mb-3">Range: {economics.range}</div>
            {/* Sparkline */}
            <div className="h-6 bg-[#FDF8F4] rounded-full overflow-hidden relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                <path
                  d="M 0,8 Q 25,6 40,10 T 70,12 T 100,16"
                  fill="none"
                  stroke="#FD4E59"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Tile 2 - Cost Per Item */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Cost Per Item
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">$0.275</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">${economics.costPerItem}</span>
            </div>
            <div className="text-[18px] font-bold text-[#548235] mb-1">−{economics.savings}%</div>
            <div className="text-[12px] italic text-[#6D7069]">Range: {economics.range}</div>
          </div>

          {/* Tile 3 - Headcount */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Headcount
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">113</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">116</span>
            </div>
            <div className="text-[18px] font-bold text-[#6D7069] mb-1">+3 (+2.7%)</div>
            <div className="text-[12px] text-[#6D7069]">Net change after redesign</div>
          </div>

          {/* Tile 4 - Supervisor Overhead */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
              Supervisor Overhead
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px] font-medium text-[#6D7069]">18.5%</span>
              <span className="text-[14px] text-[#6D7069]">→</span>
              <span className="text-[28px] font-bold text-[#161916]">12.0%</span>
            </div>
            <div className="text-[18px] font-bold text-[#548235] mb-1">−6.5pp</div>
            <div className="text-[12px] text-[#6D7069]">% of total cost</div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#E2EFDA] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-[#548235]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#161916] mb-1">Quality projection: 95%</div>
              <div className="inline-block px-3 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                Target Met
              </div>
            </div>
          </div>

          <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FCE4D6] rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#FD4E59]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#161916] mb-1">Items per FTE: +18%</div>
              <div className="inline-block px-3 py-1 bg-[#FFF0DC] text-[#6D7069] text-[11px] font-semibold uppercase tracking-wide rounded">
                VS Today
              </div>
            </div>
          </div>
        </div>

        {/* Cumulative Savings Chart */}
        <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-bold text-[#161916]">Cumulative savings over time</h2>
            <div className="flex items-center gap-4 text-[12px] text-[#6D7069]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#FD4E59]" />
                <span>Cumulative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-[#FFAB28]" />
                <span>Payback</span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative h-[280px]">
            <svg className="w-full h-full" viewBox="0 0 1100 280">
              {/* Grid lines */}
              <line x1="50" y1="70" x2="1050" y2="70" stroke="#6D7069" strokeWidth="0.5" opacity="0.2" />
              <line x1="50" y1="140" x2="1050" y2="140" stroke="#6D7069" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="50" y1="210" x2="1050" y2="210" stroke="#6D7069" strokeWidth="0.5" opacity="0.2" />

              {/* Y-axis labels */}
              <text x="40" y="145" fontSize="12" fill="#6D7069" textAnchor="end">
                $0
              </text>
              <text x="40" y="220" fontSize="12" fill="#6D7069" textAnchor="end">
                −$340k
              </text>

              {/* X-axis labels */}
              {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M9', 'M12'].map((label, i) => (
                <text key={label} x={100 + i * 120} y="270" fontSize="12" fill="#6D7069" textAnchor="middle">
                  {label}
                </text>
              ))}

              {/* Negative area fill */}
              <path
                d="M 100,240 Q 150,245 220,235 T 340,210 T 460,180 T 580,140 L 580,140 L 100,140 Z"
                fill="#FCE4D6"
                opacity="0.3"
              />

              {/* Positive area fill */}
              <path
                d="M 580,140 T 700,100 T 820,70 T 940,50 L 940,140 L 580,140 Z"
                fill="#E2EFDA"
                opacity="0.3"
              />

              {/* S-curve line */}
              <path
                d="M 100,240 Q 150,245 220,235 T 340,210 T 460,180 T 580,140 T 700,100 T 820,70 T 940,50"
                fill="none"
                stroke="#FD4E59"
                strokeWidth="2.5"
              />

              {/* Payback line */}
              <line x1="580" y1="50" x2="580" y2="260" stroke="#FFAB28" strokeWidth="1.5" strokeDasharray="4,4" />

              {/* Payback chip */}
              <rect x="510" y="25" width="140" height="24" fill="#FFF0DC" rx="4" />
              <text x="580" y="41" fontSize="11" fill="#FFAB28" fontWeight="600" textAnchor="middle">
                PAYBACK: M6
              </text>
            </svg>
          </div>
        </div>

        {/* Sensitivity Panel */}
        <div className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[16px] font-bold text-[#161916]">Sensitivity — top 3 drivers</h2>
            {isModified && (
              <button
                onClick={handleReset}
                className="h-8 px-4 text-[#FD4E59] text-[13px] hover:bg-[#FD4E59]/5 rounded-md flex items-center gap-2 border border-[#FD4E59]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to base
              </button>
            )}
          </div>
          <p className="text-[13px] text-[#6D7069] mb-4">
            How much do the savings change if each assumption is off?
          </p>

          <div className="space-y-4">
            {/* Sensitivity Bar 1 - Image classifier coverage */}
            <div className="flex items-center gap-4">
              <div className="w-[200px] text-[14px] font-medium text-[#161916]">
                Image classifier coverage
              </div>
              <div className="flex-1 relative">
                <div className="flex items-center justify-between text-[12px] text-[#6D7069] mb-2">
                  <span>13%</span>
                  <span>28%</span>
                </div>
                <div className="h-2 bg-[#FFF0DC] rounded-full relative">
                  <input
                    type="range"
                    min="13"
                    max="28"
                    step="1"
                    value={classifierCoverage}
                    onChange={(e) => setClassifierCoverage(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute h-full bg-[#FD4E59] rounded-full pointer-events-none"
                    style={{
                      left: '0%',
                      width: `${((classifierCoverage - 13) / (28 - 13)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 bg-[#FD4E59] border-2 border-white rounded-full shadow-md pointer-events-none"
                    style={{
                      left: `calc(${((classifierCoverage - 13) / (28 - 13)) * 100}% - 8px)`,
                      top: '-4px',
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded">
                    Current: {classifierCoverage}%
                  </div>
                </div>
              </div>
              <div className="w-[60px] flex justify-center">
                <Info className="w-4 h-4 text-[#6D7069] cursor-help" />
              </div>
            </div>

            {/* Sensitivity Bar 2 - Agent fully-loaded cost */}
            <div className="flex items-center gap-4">
              <div className="w-[200px] text-[14px] font-medium text-[#161916]">
                Agent fully-loaded cost
              </div>
              <div className="flex-1 relative">
                <div className="flex items-center justify-between text-[12px] text-[#6D7069] mb-2">
                  <span>18%</span>
                  <span>27%</span>
                </div>
                <div className="h-2 bg-[#FFF0DC] rounded-full relative">
                  <input
                    type="range"
                    min="18"
                    max="27"
                    step="1"
                    value={agentCost}
                    onChange={(e) => setAgentCost(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute h-full bg-[#FD4E59] rounded-full pointer-events-none"
                    style={{
                      left: '0%',
                      width: `${((agentCost - 18) / (27 - 18)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 bg-[#FD4E59] border-2 border-white rounded-full shadow-md pointer-events-none"
                    style={{
                      left: `calc(${((agentCost - 18) / (27 - 18)) * 100}% - 8px)`,
                      top: '-4px',
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded">
                    Current: {agentCost}%
                  </div>
                </div>
              </div>
              <div className="w-[60px] flex justify-center">
                <Info className="w-4 h-4 text-[#6D7069] cursor-help" />
              </div>
            </div>

            {/* Sensitivity Bar 3 - Ramp speed */}
            <div className="flex items-center gap-4">
              <div className="w-[200px] text-[14px] font-medium text-[#161916]">Ramp speed</div>
              <div className="flex-1 relative">
                <div className="flex items-center justify-between text-[12px] text-[#6D7069] mb-2">
                  <span>21%</span>
                  <span>25%</span>
                </div>
                <div className="h-2 bg-[#FFF0DC] rounded-full relative">
                  <input
                    type="range"
                    min="21"
                    max="25"
                    step="1"
                    value={rampSpeed}
                    onChange={(e) => setRampSpeed(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute h-full bg-[#FD4E59] rounded-full pointer-events-none"
                    style={{
                      left: '0%',
                      width: `${((rampSpeed - 21) / (25 - 21)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 bg-[#FD4E59] border-2 border-white rounded-full shadow-md pointer-events-none"
                    style={{
                      left: `calc(${((rampSpeed - 21) / (25 - 21)) * 100}% - 8px)`,
                      top: '-4px',
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase tracking-wide rounded">
                    Current: {rampSpeed}%
                  </div>
                </div>
              </div>
              <div className="w-[60px] flex justify-center">
                <Info className="w-4 h-4 text-[#6D7069] cursor-help" />
              </div>
            </div>
          </div>
        </div>

        {/* Sensitivity Narrative Callout */}
        <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-5 mb-6 flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-[#FFAB28] flex-shrink-0 mt-0.5" />
          <p className="text-[14px] text-[#161916] leading-relaxed">
            {isModified ? (
              <>
                Current sensitivity settings show projected savings of {economics.savings}%.
                Image classifier coverage at {classifierCoverage}% is the biggest driver.
                Agent cost at {agentCost}% is the second driver.
                Ramp speed at {rampSpeed}% has minor impact in the modeled range.
              </>
            ) : (
              <>
                The biggest driver of projected savings is image classifier coverage. If it lands at 60% instead of
                90%, savings shrink to 13%. Agent fully-loaded cost is the second driver. Ramp speed has minor impact
                in the modeled range.
              </>
            )}
          </p>
        </div>

        {/* Footer Action Row */}
        <div className="flex justify-between items-center">
          <button
            onClick={onEditAssumptions}
            className="h-11 px-6 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
          >
            Edit assumptions
            <ArrowRight className="w-5 h-5" />
          </button>

          {onProceedToF6 && (
            <button
              onClick={onProceedToF6}
              className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
            >
              Proceed to Timeline
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
