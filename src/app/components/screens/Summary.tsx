import {
  Download,
  Star,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Check,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface SummaryProps {
  onBack?: () => void;
}

export function Summary({ onBack }: SummaryProps) {
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  return (
    <div className="p-10 max-w-[1204px] mx-auto">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-[13px] text-[#161916] uppercase tracking-wide">Summary</div>
        <button className="h-11 px-6 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export final deck
        </button>
      </div>

      {/* Section 1 - Recommendation Hero */}
      <div className="bg-[#FDF8F4] border-l-[6px] border-[#FD4E59] rounded-2xl p-10 mb-6" style={{ minHeight: '200px' }}>
        <div className="flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-[#FFAB28] uppercase tracking-widest mb-2">
            Recommended Operating Model · ACME CORP
          </div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[48px] font-bold text-[#161916]">Balanced</h1>
            <div className="w-7 h-7 bg-[#FD4E59] rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          <p className="text-[16px] italic text-[#494949] mb-4">
            Industry-benchmark span, meaningful cost reduction, manageable transition risk.
          </p>
          <div className="text-[12px] text-[#6D7069]">
            Synthesized from 6 pipeline stages · Generated today · Acme Corp moderation engagement
          </div>
        </div>
      </div>

      {/* Section 2 - The Proof */}
      <div className="mb-6">
        <h2 className="text-[14px] font-medium text-[#6D7069] uppercase tracking-widest mb-3">
          The case for Balanced
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {/* Tile 1 - Cost Saving */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-6" style={{ minHeight: '140px' }}>
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Cost Saving
            </div>
            <div className="text-[32px] font-bold text-[#548235] mb-1">−22.9%</div>
            <div className="text-[12px] italic text-[#6D7069]">range 18–28%</div>
          </div>

          {/* Tile 2 - Payback */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-6" style={{ minHeight: '140px' }}>
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Payback</div>
            <div className="text-[32px] font-bold text-[#161916] mb-1">Month 6</div>
            <div className="text-[12px] italic text-[#6D7069]">full ramp by M9</div>
          </div>

          {/* Tile 3 - Headcount */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-6" style={{ minHeight: '140px' }}>
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Headcount Δ
            </div>
            <div className="text-[32px] font-bold text-[#6D7069] mb-1">+3 (+2.7%)</div>
            <div className="text-[12px] italic text-[#6D7069]">116 vs 113 today</div>
          </div>

          {/* Tile 4 - Risk Profile */}
          <div className="bg-white border border-[#494949]/12 rounded-xl p-6" style={{ minHeight: '140px' }}>
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Risk Profile
            </div>
            <div className="inline-block px-4 py-2 bg-[#FFF0DC] text-[#FFAB28] text-[13px] font-semibold uppercase tracking-wide rounded mb-1" style={{ height: '28px', lineHeight: '12px' }}>
              MED
            </div>
            <div className="text-[12px] italic text-[#6D7069]">manageable, controls strong</div>
          </div>
        </div>
      </div>

      {/* Section 3 - How We Get There */}
      <div className="mb-6">
        <h2 className="text-[14px] font-medium text-[#6D7069] uppercase tracking-widest mb-3">
          How we get there
        </h2>
        <div className="bg-white border border-[#494949]/12 rounded-xl p-7" style={{ minHeight: '280px' }}>
          {/* Block A - Journey Strip */}
          <div className="mb-3" style={{ minHeight: '80px' }}>
            {/* Three milestones */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 text-center">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Today
                </div>
                <div className="text-[13px] text-[#161916]">113 FTE · 100% human</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#6D7069] mx-4" />
              <div className="flex-1 text-center">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  9-Month Rollout
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#6D7069] mx-4" />
              <div className="flex-1 text-center">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Future State
                </div>
                <div className="text-[13px] text-[#161916]">116 FTE · 62% AI-augmented</div>
              </div>
            </div>

            {/* Phase markers */}
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#E2EFDA]" />
                  <span className="text-[11px] font-medium text-[#548235] uppercase">P1 Foundation</span>
                </div>
                <div className="text-[12px] font-medium text-[#6D7069]">3%</div>
              </div>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#FFAB28]" />
                  <span className="text-[11px] font-medium text-[#FFAB28] uppercase">P2 Pilot</span>
                </div>
                <div className="text-[12px] font-medium text-[#6D7069]">9%</div>
              </div>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#FCE4D6]" />
                  <span className="text-[11px] font-medium text-[#FD4E59] uppercase">P3 Scale</span>
                </div>
                <div className="text-[12px] font-medium text-[#6D7069]">18%</div>
              </div>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#FD4E59]" />
                  <span className="text-[11px] font-medium text-[#FD4E59] uppercase">P4 Optimize</span>
                </div>
                <div className="text-[12px] font-medium text-[#6D7069]">23%</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#494949]/12 my-3" />

          {/* Block B - Allocation Shift */}
          <div style={{ minHeight: '120px' }}>
            <h3 className="text-[13px] font-medium text-[#161916] mb-2">Where the work goes</h3>

            {/* Bar 1 - TODAY */}
            <div className="flex items-center gap-4 mb-4">
              <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide w-[60px]">
                Today
              </div>
              <div className="flex-1 h-6 bg-[#6D7069] rounded-full flex items-center justify-center">
                <span className="text-[12px] font-medium text-white">100% Human</span>
              </div>
            </div>

            {/* Bar 2 - FUTURE */}
            <div className="flex items-center gap-4 mb-2">
              <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide w-[60px]">
                Future
              </div>
              <div className="flex-1 h-6 rounded-full overflow-hidden flex">
                <div className="bg-[#6D7069] flex items-center justify-center" style={{ width: '38%' }}>
                  <span className="text-[11px] font-medium text-white">Human 38%</span>
                </div>
                <div className="bg-[#FFAB28] flex items-center justify-center" style={{ width: '42%' }}>
                  <span className="text-[11px] font-medium text-white">Assisted 42%</span>
                </div>
                <div className="bg-[#548235] flex items-center justify-center" style={{ width: '20%' }}>
                  <span className="text-[11px] font-medium text-white">Automated 20%</span>
                </div>
              </div>
            </div>

            <p className="text-[13px] italic text-[#494949] mt-2">
              62% of work-hours shifted to AI-assisted or automated. Human time refocused on judgment, coaching, and
              exception handling.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4 - Risk & Escalation Evidence */}
      <div className="mb-4">
        <div className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-xl p-6 flex items-center justify-between" style={{ minHeight: '64px' }}>
          <div className="flex items-center gap-4">
            <Shield className="w-5 h-5 text-[#FFAB28] flex-shrink-0" />
            <div>
              <span className="text-[14px] font-medium text-[#161916]">Risk & Escalation evidence</span>
              <span className="text-[13px] text-[#494949] ml-3">
                Governance score: STRONG · 1 advisory
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowRiskDetails(!showRiskDetails)}
            className="h-9 px-5 border border-[#FD4E59] text-[#FD4E59] text-[13px] font-medium rounded-md hover:bg-[#FD4E59]/5 flex items-center gap-2"
          >
            Show details {showRiskDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Risk Details */}
        {showRiskDetails && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Risk × Control Matrix */}
            <div className="bg-white border border-[#494949]/12 rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-[#161916] mb-3">Risk × Control matrix</h4>

              {/* KPI Strip */}
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-[#548235] uppercase tracking-wide">Preventive</div>
                  <div className="text-[18px] font-bold text-[#548235]">100%</div>
                </div>
                <div className="w-px bg-[#494949]/12" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-[#FFAB28] uppercase tracking-wide">Detective</div>
                  <div className="text-[18px] font-bold text-[#FFAB28]">92%</div>
                </div>
                <div className="w-px bg-[#494949]/12" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-[#548235] uppercase tracking-wide">Regulatory</div>
                  <div className="text-[18px] font-bold text-[#548235]">100%</div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="border border-[#494949]/12 rounded overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#FDF8F4]">
                      <th className="text-left p-2 text-[11px] font-semibold text-[#6D7069] uppercase">Risk</th>
                      <th className="text-left p-2 text-[11px] font-semibold text-[#6D7069] uppercase">Prev</th>
                      <th className="text-left p-2 text-[11px] font-semibold text-[#6D7069] uppercase">Det</th>
                      <th className="text-left p-2 text-[11px] font-semibold text-[#6D7069] uppercase">Corr</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#494949]/12">
                      <td className="p-2">
                        CSAM{' '}
                        <span className="inline-block px-2 py-0.5 bg-[#FCE4D6] text-[#FD4E59] text-[10px] font-semibold uppercase rounded">
                          CRIT
                        </span>
                      </td>
                      <td className="p-2">✓ 2</td>
                      <td className="p-2">✓ 1+1 NEW</td>
                      <td className="p-2">✓ 1</td>
                    </tr>
                    <tr className="border-t border-[#494949]/12">
                      <td className="p-2">
                        Violent extremism{' '}
                        <span className="inline-block px-2 py-0.5 bg-[#FCE4D6] text-[#FD4E59] text-[10px] font-semibold uppercase rounded">
                          CRIT
                        </span>
                      </td>
                      <td className="p-2">✓ 2</td>
                      <td className="p-2">✓ 1</td>
                      <td className="p-2">✓ 1</td>
                    </tr>
                    <tr className="border-t border-[#494949]/12">
                      <td className="p-2">
                        Self-harm{' '}
                        <span className="inline-block px-2 py-0.5 bg-[#FFF0DC] text-[#FFAB28] text-[10px] font-semibold uppercase rounded">
                          HIGH
                        </span>
                      </td>
                      <td className="p-2">✓ 1</td>
                      <td className="p-2">✓ 1</td>
                      <td className="p-2">—</td>
                    </tr>
                    <tr className="border-t border-[#494949]/12 bg-[#FCE4D6]/20">
                      <td className="p-2">
                        Hate speech{' '}
                        <span className="inline-block px-2 py-0.5 bg-[#FFF0DC] text-[#FFAB28] text-[10px] font-semibold uppercase rounded">
                          HIGH
                        </span>
                      </td>
                      <td className="p-2">✓ 1</td>
                      <td className="p-2 text-[#FD4E59]">⚠ 1 only</td>
                      <td className="p-2">—</td>
                    </tr>
                    <tr className="border-t border-[#494949]/12">
                      <td className="p-2">
                        Spam{' '}
                        <span className="inline-block px-2 py-0.5 bg-[#E2EFDA] text-[#548235] text-[10px] font-semibold uppercase rounded">
                          LOW
                        </span>
                      </td>
                      <td className="p-2">✓ 1 AUTO</td>
                      <td className="p-2">✓ 1 AUTO</td>
                      <td className="p-2">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Escalation Flow */}
            <div className="bg-white border border-[#494949]/12 rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-[#161916] mb-3">Escalation flow — today vs future</h4>

              <div className="grid grid-cols-2 gap-4">
                {/* Today */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Today</div>
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] text-[#161916]">Item</div>
                    <div className="text-[11px] text-[#6D7069]">↓</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      Agent
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓ 15m</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      TL
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓ 60m</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      QA Off
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      Unit Head
                    </div>
                  </div>
                </div>

                {/* Future */}
                <div>
                  <div className="text-[11px] font-semibold text-[#FD4E59] uppercase tracking-wide mb-2">Future</div>
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] text-[#161916]">Item</div>
                    <div className="text-[11px] text-[#6D7069]">↓</div>
                    <div className="px-2 py-1 bg-[#FDF8F4] border border-[#FD4E59] rounded text-[11px] text-center flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FD4E59]" />
                      AI pre-triage
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓ 5m</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      Agent
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓ 15m</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      TL
                    </div>
                    <div className="text-[11px] text-[#6D7069]">↓ 60m</div>
                    <div className="px-2 py-1 bg-[#FFF0DC] border border-[#6D7069] rounded text-[11px] text-center">
                      QA Off
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-[#494949] mt-3">
                1 new AI pre-triage node · 1 new role (AI Output Auditor) handling low-confidence flags.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 5 - What This Analysis Assumes */}
      <div className="bg-[#FFF0DC] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#6D7069]" />
          <h2 className="text-[13px] font-medium text-[#6D7069] uppercase tracking-widest">
            What this analysis assumes
          </h2>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] text-[#494949]">
            • Numbers are illustrative; real engagement values may differ
          </p>
          <p className="text-[13px] text-[#494949]">
            • Transition costs include tech build, retraining, and change management — but not severance by geography
          </p>
          <p className="text-[13px] text-[#494949]">
            • Billing model impact is not yet modeled — coordinate with commercial before final pricing
          </p>
          <p className="text-[13px] text-[#494949]">
            • Client tech readiness and procurement timelines may extend the 9-month rollout
          </p>
        </div>
      </div>

      {/* Section 6 - Final CTA */}
      <div className="flex items-center justify-end pt-6">
        <button className="h-12 px-7 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 shadow-lg">
          <Download className="w-5 h-5" />
          Export final deck
        </button>
      </div>
    </div>
  );
}
