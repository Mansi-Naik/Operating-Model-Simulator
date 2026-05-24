import { ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';

export interface ReinvestmentOpportunity {
  title: string;
  category: string;
  rationale: string;
  investment_required: string;
  revenue_impact: string;
  cost_impact: string;
  timeline_months: number;
  risk_level: string;
  first_step: string;
}

export interface ReinvestmentData {
  headline?: string;
  opportunities?: ReinvestmentOpportunity[];
  prioritization_note?: string;
  total_potential_annual_uplift?: string;
  generated_at?: string;
  monthly_savings_basis?: number;
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  upsell: { label: 'Upsell', icon: '↑' },
  cross_sell: { label: 'Cross-sell', icon: '↔' },
  ai_deepening: { label: 'AI deepening', icon: '✦' },
  value_stack: { label: 'Value stack', icon: '▲' },
  delivery_economics: { label: 'Delivery economics', icon: '⊙' },
  retention: { label: 'Retention', icon: '◆' },
};

function riskClass(risk: string): string {
  const r = risk.toLowerCase();
  if (r === 'low') return 'bg-[#E2EFDA] text-[#548235] border-[#548235]/25';
  if (r === 'high') return 'bg-[#FCE4D6] text-[#FD4E59] border-[#FD4E59]/25';
  return 'bg-[#FFF0DC] text-[#6D7069] border-[#FFAB28]/30';
}

function fmtMonthly(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000).toLocaleString('en-US')}k`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function OpportunityCard({ opp }: { opp: ReinvestmentOpportunity }) {
  const meta = CATEGORY_META[opp.category] ?? { label: opp.category, icon: '•' };
  return (
    <article className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6D7069]">
          <span className="text-[14px] leading-none">{meta.icon}</span>
          {meta.label}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${riskClass(opp.risk_level)}`}
        >
          {opp.risk_level} risk
        </span>
      </div>
      <h3 className="text-[16px] font-bold text-[#161916] mb-2 leading-snug">{opp.title}</h3>
      <p className="text-[13px] text-[#494949] leading-relaxed mb-4">{opp.rationale}</p>
      <div className="border-t border-[#494949]/10 pt-3 space-y-1.5 text-[13px]">
        <div className="flex justify-between gap-2">
          <span className="text-[#6D7069]">Investment</span>
          <span className="font-semibold text-[#161916] tabular-nums text-right">{opp.investment_required}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#6D7069]">Revenue impact</span>
          <span className="font-semibold text-[#548235] tabular-nums text-right">{opp.revenue_impact}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#6D7069]">Cost impact</span>
          <span className="font-semibold text-[#161916] tabular-nums text-right">{opp.cost_impact}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#6D7069]">Timeline</span>
          <span className="font-semibold text-[#161916] tabular-nums">{opp.timeline_months} months</span>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 text-[12px] text-[#494949]">
        <ArrowRight className="w-3.5 h-3.5 text-[#FD4E59] shrink-0 mt-0.5" aria-hidden />
        <span>
          <span className="font-semibold text-[#161916]">First step:</span> {opp.first_step}
        </span>
      </div>
    </article>
  );
}

interface ReinvestmentSectionProps {
  clientName: string;
  monthlySavings: number;
  data: ReinvestmentData | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void | Promise<void>;
  onRegenerate: () => void | Promise<void>;
}

export function ReinvestmentSection({
  clientName,
  monthlySavings,
  data,
  isLoading,
  error,
  onGenerate,
  onRegenerate,
}: ReinvestmentSectionProps) {
  const [regenerating, setRegenerating] = useState(false);
  const savingsLabel = fmtMonthly(monthlySavings);
  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];

  const handleRegenerate = async () => {
    if (!window.confirm('Re-generate reinvestment opportunities? Uses 1 API call.')) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  if (monthlySavings <= 0) {
    return null;
  }

  return (
    <section className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[16px] font-bold text-[#161916]">Reinvestment Opportunities</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF0DC] text-[#6D7069] border border-[#161916]/10">
            Advisory
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!data && !isLoading ? (
            <button
              type="button"
              onClick={() => void onGenerate()}
              className="h-9 px-4 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate recommendations
            </button>
          ) : null}
          {data ? (
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isLoading || regenerating}
              className="h-9 px-3 border border-[#494949]/25 text-[#494949] text-[12px] font-medium rounded-md hover:bg-[#494949]/5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || regenerating ? 'animate-spin' : ''}`} />
              Re-generate
            </button>
          ) : null}
        </div>
      </header>

      <p className="text-[13px] text-[#6D7069] mb-5">
        Where to invest the {savingsLabel}/month in delivery cost savings to grow revenue from {clientName}.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-[#494949]">
          <Loader2 className="w-6 h-6 animate-spin text-[#FD4E59]" />
          <span className="text-[14px]">Generating reinvestment recommendations…</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          Could not generate recommendations: {error}
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          <p className="text-[15px] italic text-[#161916] leading-relaxed mb-5">{data.headline}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            {opportunities.map((opp, idx) => (
              <OpportunityCard key={`${opp.title}-${idx}`} opp={opp} />
            ))}
          </div>
          <div className="bg-[#FFF8ED] border border-[#FFAB28]/35 border-l-[3px] border-l-[#FFAB28] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#FFAB28]" />
              <h3 className="text-[14px] font-bold text-[#161916]">Where to start</h3>
            </div>
            <p className="text-[14px] text-[#494949] leading-relaxed mb-3">{data.prioritization_note}</p>
            <p className="text-[13px] text-[#161916]">
              <span className="font-semibold">Total annual uplift potential:</span>{' '}
              {data.total_potential_annual_uplift}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
