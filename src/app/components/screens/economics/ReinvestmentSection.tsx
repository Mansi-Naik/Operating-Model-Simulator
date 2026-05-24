import { ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';

export interface ReinvestmentOpportunity {
  title: string;
  category: string;
  process_step?: string;
  project_stage?: string;
  summary?: string;
  rationale?: string;
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

function opportunitySummary(opp: ReinvestmentOpportunity): string {
  if (opp.summary?.trim()) return opp.summary.trim();
  if (opp.rationale?.trim()) return opp.rationale.trim();
  return '';
}

function OpportunityCard({ opp }: { opp: ReinvestmentOpportunity }) {
  const meta = CATEGORY_META[opp.category] ?? { label: opp.category, icon: '•' };
  const summary = opportunitySummary(opp);

  return (
    <article className="bg-white border border-[#494949]/12 rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6D7069]">
          <span className="text-[13px] leading-none">{meta.icon}</span>
          {meta.label}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${riskClass(opp.risk_level)}`}
        >
          {opp.risk_level}
        </span>
      </div>

      <h3 className="text-[15px] font-bold text-[#161916] mb-2 leading-snug">{opp.title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-[12px]">
        <div className="bg-[#FDF8F4] rounded-md px-2.5 py-1.5 border border-[#494949]/8">
          <span className="text-[#6D7069] font-medium">Process: </span>
          <span className="text-[#161916]">{opp.process_step || '—'}</span>
        </div>
        <div className="bg-[#FDF8F4] rounded-md px-2.5 py-1.5 border border-[#494949]/8">
          <span className="text-[#6D7069] font-medium">Stage: </span>
          <span className="text-[#161916]">{opp.project_stage || '—'}</span>
        </div>
      </div>

      {summary ? (
        <p className="text-[13px] text-[#494949] leading-snug mb-3">{summary}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] border-t border-[#494949]/10 pt-2">
        <div>
          <span className="text-[#6D7069]">Invest </span>
          <span className="font-semibold text-[#161916] tabular-nums">{opp.investment_required}</span>
        </div>
        <div>
          <span className="text-[#6D7069]">Revenue </span>
          <span className="font-semibold text-[#548235] tabular-nums">{opp.revenue_impact}</span>
        </div>
        <div>
          <span className="text-[#6D7069]">Cost </span>
          <span className="font-semibold text-[#161916] tabular-nums">{opp.cost_impact}</span>
        </div>
        <div>
          <span className="text-[#6D7069]">Timeline </span>
          <span className="font-semibold text-[#161916] tabular-nums">{opp.timeline_months} mo</span>
        </div>
      </div>

      {opp.first_step ? (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#494949]">
          <ArrowRight className="w-3 h-3 text-[#FD4E59] shrink-0 mt-0.5" aria-hidden />
          <span>{opp.first_step}</span>
        </div>
      ) : null}
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
      <header className="flex flex-wrap items-start justify-between gap-4 mb-2">
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
              Generate
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

      <p className="text-[12px] text-[#6D7069] mb-4">
        Reinvest {savingsLabel}/mo savings — by process step and rollout stage for {clientName}.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-[#494949]">
          <Loader2 className="w-5 h-5 animate-spin text-[#FD4E59]" />
          <span className="text-[13px]">Generating…</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 text-[13px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-3 bg-[#FCE4D6]/30">
          {error}
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          {data.headline ? (
            <p className="text-[14px] font-medium text-[#161916] mb-4">{data.headline}</p>
          ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {opportunities.map((opp, idx) => (
              <OpportunityCard key={`${opp.title}-${idx}`} opp={opp} />
            ))}
          </div>
          <div className="bg-[#FFF8ED] border border-[#FFAB28]/35 border-l-[3px] border-l-[#FFAB28] rounded-lg px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] text-[#494949]">
              <span className="font-semibold text-[#161916]">Start here: </span>
              {data.prioritization_note}
            </p>
            {data.total_potential_annual_uplift ? (
              <p className="text-[12px] text-[#161916] font-semibold tabular-nums shrink-0">
                {data.total_potential_annual_uplift}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
