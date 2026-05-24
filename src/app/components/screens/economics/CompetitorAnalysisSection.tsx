import { AlertTriangle, Check, Loader2, RefreshCw, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { COMPETITOR_DIMENSIONS } from '../../../../lib/competitorLibrary';

export interface CompetitorAnalysisData {
  competitors?: Array<Record<string, unknown>>;
  dimensions?: Array<Record<string, unknown>>;
  summary?: string;
  key_differentiators?: string[];
  key_risks?: string[];
  generated_at?: string;
  model_used?: string;
  domain_used?: string;
  north_star_dimension?: string;
}

interface CompetitorAnalysisSectionProps {
  data: CompetitorAnalysisData | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate: () => void | Promise<void>;
}

function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return 'recently';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'recently';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function scorePillClass(score: number): string {
  if (score >= 5) return 'bg-[#E2EFDA] text-[#548235] border-[#548235]/30';
  if (score >= 4) return 'bg-[#E2EFDA]/80 text-[#548235] border-[#548235]/20';
  if (score >= 3) return 'bg-[#E8E8E8] text-[#494949] border-[#494949]/15';
  if (score >= 2) return 'bg-[#FCE4D6]/70 text-[#FD4E59]/90 border-[#FD4E59]/20';
  return 'bg-[#FCE4D6] text-[#FD4E59] border-[#FD4E59]/30';
}

function CompetitorLogo({
  logo,
  short,
  name,
}: {
  logo: string | null | undefined;
  short: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = short || name.slice(0, 3).toUpperCase();

  if (!logo || failed) {
    return (
      <div
        className="w-9 h-9 rounded-full bg-[#FDF8F4] border border-[#494949]/15 flex items-center justify-center text-[10px] font-bold text-[#6D7069]"
        title={name}
      >
        {label}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt=""
      className="w-9 h-9 rounded-full object-contain bg-white border border-[#494949]/10 p-0.5"
      onError={() => setFailed(true)}
    />
  );
}

function ScoreCell({
  score,
  rationale,
  isBest,
  isGenpactWin,
}: {
  score: number;
  rationale: string;
  isBest: boolean;
  isGenpactWin: boolean;
}) {
  const ring =
    isGenpactWin && isBest
      ? 'ring-2 ring-[#FFAB28] ring-offset-1'
      : isBest
        ? 'ring-2 ring-[#FFAB28]/60 ring-offset-1'
        : '';

  return (
    <td className="px-2 py-3 text-center align-middle">
      <div className="relative inline-flex group">
        <span
          className={`inline-flex min-w-[36px] h-8 items-center justify-center rounded-md border text-[14px] font-bold ${scorePillClass(score)} ${ring}`}
        >
          {score}
        </span>
        {rationale ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-md bg-[#161916] text-white text-[11px] leading-snug opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            {rationale}
          </div>
        ) : null}
      </div>
    </td>
  );
}

function CompetitorTable({ data }: { data: CompetitorAnalysisData }) {
  const dimensions =
    Array.isArray(data.dimensions) && data.dimensions.length > 0
      ? data.dimensions
      : (COMPETITOR_DIMENSIONS as unknown as Record<string, unknown>[]);

  const competitors = Array.isArray(data.competitors) ? data.competitors : [];

  const bestByDimension = useMemo(() => {
    /** @type {Record<string, number>} */
    const best = {}
    for (const dim of dimensions) {
      const id = String(dim.id ?? '')
      if (!id) continue
      let max = 0
      for (const row of competitors) {
        const scores = row.scores as Record<string, unknown> | undefined
        const s = toNum(scores?.[id])
        if (s > max) max = s
      }
      best[id] = max
    }
    return best
  }, [competitors, dimensions])

  return (
    <div className="overflow-x-auto -mx-1 px-1 mb-6">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#494949]/15">
            <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide w-12">
              Logo
            </th>
            <th className="text-left py-3 px-2 text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide min-w-[120px]">
              Provider
            </th>
            {dimensions.map((dim) => {
              const id = String(dim.id ?? '')
              const isNorthStar = dim.is_north_star === true || id === 'ai_automation'
              return (
                <th
                  key={id}
                  className="text-center py-3 px-2 text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide max-w-[100px]"
                  title={String(dim.description ?? '')}
                >
                  <span className="inline-flex items-center justify-center gap-0.5">
                    {isNorthStar ? <Star className="w-3 h-3 text-[#FFAB28] fill-[#FFAB28]" aria-hidden /> : null}
                    <span className="leading-tight">{String(dim.label ?? id)}</span>
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {competitors.map((row) => {
            const name = String(row.name ?? '')
            const isGenpact = row.is_genpact === true || name === 'Genpact'
            const scores = (row.scores as Record<string, unknown>) || {}
            const rationales = (row.rationales as Record<string, unknown>) || {}
            return (
              <tr
                key={name}
                className={
                  isGenpact
                    ? 'bg-[#FDF8F4] border-l-[3px] border-l-[#FD4E59]'
                    : 'bg-white border-b border-[#494949]/8'
                }
              >
                <td className="px-2 py-3">
                  <CompetitorLogo
                    logo={typeof row.logo === 'string' ? row.logo : null}
                    short={String(row.short ?? '')}
                    name={name}
                  />
                </td>
                <td className="px-2 py-3 font-semibold text-[#161916] whitespace-nowrap">{name}</td>
                {dimensions.map((dim) => {
                  const id = String(dim.id ?? '')
                  const score = toNum(scores[id])
                  const rationale = String(rationales[id] ?? '')
                  const isBest = score > 0 && score === bestByDimension[id]
                  return (
                    <ScoreCell
                      key={`${name}-${id}`}
                      score={score}
                      rationale={rationale}
                      isBest={isBest}
                      isGenpactWin={isGenpact && isBest}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StrategicSummary({ data }: { data: CompetitorAnalysisData }) {
  const differentiators = Array.isArray(data.key_differentiators) ? data.key_differentiators : []
  const risks = Array.isArray(data.key_risks) ? data.key_risks : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-3 bg-white/80 border border-[#494949]/12 rounded-xl p-5">
        <h3 className="text-[14px] font-bold text-[#161916] mb-2">Strategic summary</h3>
        <p className="text-[14px] text-[#494949] leading-relaxed">{String(data.summary ?? '')}</p>
      </div>
      <div className="bg-[#FDF8F4] border border-[#548235]/20 rounded-xl p-5">
        <h3 className="text-[14px] font-bold text-[#548235] mb-3">Key differentiators for Genpact</h3>
        <ul className="space-y-2">
          {differentiators.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[#161916]">
              <Check className="w-4 h-4 text-[#548235] shrink-0 mt-0.5" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#FDF8F4] border border-[#FD4E59]/20 rounded-xl p-5 lg:col-span-2">
        <h3 className="text-[14px] font-bold text-[#FD4E59] mb-3">Areas of risk</h3>
        <ul className="space-y-2">
          {risks.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[#161916]">
              <AlertTriangle className="w-4 h-4 text-[#FD4E59] shrink-0 mt-0.5" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function CompetitorAnalysisSection({
  data,
  isLoading,
  error,
  onRegenerate,
}: CompetitorAnalysisSectionProps) {
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!window.confirm('Re-generate competitor analysis? This uses 1 API call.')) return
    setRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <section className="bg-white border border-[#494949]/12 rounded-xl p-6 mb-6 shadow-sm">
      <header className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-[16px] font-bold text-[#161916]">Competitor Analysis</h2>
        <div className="h-6 px-3 border-[1.5px] border-dashed border-[#FFAB28] rounded-full flex items-center">
          <span className="text-[10px] font-medium text-[#FFAB28] uppercase tracking-wider">Illustrative</span>
        </div>
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={isLoading || regenerating}
          className="ml-auto h-8 px-3 border border-[#494949]/25 text-[#494949] text-[12px] font-medium rounded-md hover:bg-[#494949]/5 flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating || isLoading ? 'animate-spin' : ''}`} />
          Re-generate
        </button>
      </header>

      <p className="text-[13px] text-[#6D7069] mb-5">
        Scores synthesized from public information by AI. Verify before client use.
        {data?.generated_at ? ` Generated ${timeAgo(data.generated_at)}.` : ''}
        {data?.domain_used ? ` Domain set: ${data.domain_used}.` : ''}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-[#494949]">
          <Loader2 className="w-6 h-6 animate-spin text-[#FD4E59]" />
          <span className="text-[14px]">Generating competitor analysis…</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          {error}
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          <CompetitorTable data={data} />
          <StrategicSummary data={data} />
        </>
      ) : null}
    </section>
  )
}
