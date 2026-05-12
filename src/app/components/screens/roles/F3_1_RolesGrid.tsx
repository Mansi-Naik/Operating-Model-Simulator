import { RefreshCw, Settings, ChevronDown, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dedupeLatestRedesignsByRole, normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { supabase } from '../../../../supabaseClient';

type PatternCard = 'minor-evolution' | 'meaningful-shift' | 'transformation' | 'redefinition';

interface RoleCard {
  name: string;
  pattern: PatternCard;
  timeFreed: number;
  feasibility: number;
  newTitleProposed?: boolean;
}

interface EmergentCard {
  id: string;
  name: string;
  whyNeeded: string;
  headcountEstimate: number;
  sitsUnder: string;
}

interface F3_1_RolesGridProps {
  engagementId?: string | null;
  onRoleClick: (roleName: string) => void;
  onEmergentRoleClick: (roleName: string) => void;
  onReRun: () => void;
  onBack?: () => void;
  onProceedToF4?: () => void;
}

function apiPatternToCardPattern(p: unknown): PatternCard {
  const x = String(p ?? '')
    .toLowerCase()
    .trim()
    .replace(/_/g, '-');
  if (x === 'minor-evolution' || x === 'meaningful-shift' || x === 'transformation' || x === 'redefinition') {
    return x;
  }
  return 'minor-evolution';
}

function toPct(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function pipelineRowToRoleCard(row: Record<string, unknown>): RoleCard | null {
  const name = typeof row.role_name === 'string' ? row.role_name.trim() : '';
  if (!name) return null;
  const patternRaw = row.pattern;
  const pattern = apiPatternToCardPattern(patternRaw);
  const pStr = String(patternRaw ?? '').toLowerCase();
  const newTitleProposed = pStr === 'transformation' || pStr === 'redefinition';
  return {
    name,
    pattern,
    timeFreed: toPct(row.time_freed_pct),
    feasibility: toPct(row.feasibility_score),
    newTitleProposed,
  };
}

function emergentRowToCard(row: Record<string, unknown>, index: number): EmergentCard | null {
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;
  const hc = typeof row.headcount_estimate === 'number' ? row.headcount_estimate : Number(row.headcount_estimate);
  const headcountEstimate = Number.isFinite(hc) ? hc : 0;
  return {
    id: `${name}-${index}`,
    name,
    whyNeeded: typeof row.why_needed === 'string' ? row.why_needed : '',
    headcountEstimate,
    sitsUnder: typeof row.sits_under === 'string' ? row.sits_under.trim() : '—',
  };
}

function formatHeadcountFte(n: number): string {
  if (Number.isInteger(n)) return `${n} FTE`;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded} FTE`;
}

export function F3_1_RolesGrid({
  engagementId,
  onRoleClick,
  onEmergentRoleClick,
  onReRun,
  onBack,
  onProceedToF4,
}: F3_1_RolesGridProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeId = engagementId ?? engagementIdFromUrl;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleCard[]>([]);
  const [emergentRoles, setEmergentRoles] = useState<EmergentCard[]>([]);

  const loadPipeline = useCallback(async () => {
    if (!activeId) {
      setLoadError('Missing engagement');
      setRoles([]);
      setEmergentRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('f3_roles')
      .eq('engagement_id', activeId)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setRoles([]);
      setEmergentRoles([]);
      setLoading(false);
      return;
    }

    const bundle = normalizeF3Roles(data?.f3_roles);
    const redesignRows = dedupeLatestRedesignsByRole(bundle.redesigns as Record<string, unknown>[]);
    const mapped = redesignRows
      .map((r) => pipelineRowToRoleCard(r))
      .filter((x): x is RoleCard => x != null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const emergent = (bundle.emergent_roles as Record<string, unknown>[])
      .map((r, i) => emergentRowToCard(r, i))
      .filter((x): x is EmergentCard => x != null);

    setRoles(mapped);
    setEmergentRoles(emergent);
    setLoading(false);
  }, [activeId]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const summaryLine = useMemo(() => {
    const x = roles.length;
    const y = emergentRoles.length;
    const roleWord = x === 1 ? 'role' : 'roles';
    const emergentWord = y === 1 ? 'role' : 'roles';
    return `${x} ${roleWord} redesigned · ${y} emergent ${emergentWord} suggested`;
  }, [roles.length, emergentRoles.length]);

  const getPatternBadge = (pattern: string) => {
    const configs = {
      'minor-evolution': { bg: '#E2EFDA', text: '#548235', label: 'MINOR EVOLUTION' },
      'meaningful-shift': { bg: '#DEEBF7', text: '#2E75B6', label: 'MEANINGFUL SHIFT' },
      transformation: { bg: '#FFF0DC', text: '#FFAB28', label: 'TRANSFORMATION' },
      redefinition: { bg: '#FCE4D6', text: '#FD4E59', label: 'REDEFINITION' },
    };
    const config = configs[pattern as keyof typeof configs] ?? configs['minor-evolution'];
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
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

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

      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916]">Future role definitions</h1>
        <p className="text-[13px] text-[#6D7069]">{loading ? 'Loading pipeline…' : loadError ? loadError : summaryLine}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-bold text-[#161916]">Existing roles, redesigned</h2>
        <button className="text-[13px] text-[#6D7069] hover:text-[#161916] flex items-center gap-1">
          Sort by impact
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#494949] mb-8">Loading role cards…</p>
      ) : (
        <div className="grid grid-cols-2 gap-8 mb-8">
          {roles.length === 0 ? (
            <p className="text-[14px] text-[#494949] col-span-2">
              No role redesigns in the pipeline yet. Run generation from the previous step.
            </p>
          ) : (
            roles.map((role) => (
              <div
                key={role.name}
                onClick={() => onRoleClick(role.name)}
                className="bg-[#FDF8F4] border border-[#494949]/12 hover:border-[#FD4E59] rounded-xl p-6 cursor-pointer transition-all shadow-sm"
                style={{ height: '220px' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-[20px] font-bold text-[#161916]">{role.name}</h3>
                  {getPatternBadge(role.pattern)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                      Time Freed
                    </div>
                    <div className="text-[32px] font-bold text-[#161916] leading-none mb-2">{role.timeFreed}%</div>
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
                    <div className="text-[32px] font-bold text-[#161916] leading-none mb-2">{role.feasibility}%</div>
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

                <div className="flex items-center justify-between mt-auto pt-4">
                  {role.newTitleProposed ? (
                    <div className="flex items-center gap-1 text-[12px] font-bold text-[#FFAB28]">
                      <Sparkles className="w-3 h-3" />
                      NEW TITLE PROPOSED
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="ml-auto">
                    <span className="text-[14px] text-[#FD4E59] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                      View redesign
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-bold text-[#161916]">Emergent roles</h2>
            <div className="px-2 py-0.5 bg-[#FFAB28] text-white text-[11px] font-semibold rounded-full">
              {emergentRoles.length}
            </div>
          </div>
          <p className="text-[13px] text-[#6D7069]">New roles suggested by the AI based on unowned future work.</p>
        </div>

        {!loading && emergentRoles.length === 0 ? (
          <p className="text-[14px] text-[#494949]">No emergent roles suggested.</p>
        ) : null}

        {!loading &&
          emergentRoles.map((er) => (
            <div key={er.id} className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-xl p-6 mb-4 last:mb-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 bg-[#FFAB28] text-white text-[11px] font-bold uppercase rounded">NEW</div>
                  <h3 className="text-[20px] font-bold text-[#161916]">{er.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded text-[13px] text-[#494949]">
                  Headcount: {formatHeadcountFte(er.headcountEstimate)}
                </div>
                <div className="w-px h-4 bg-[#494949]/20" />
                <div className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded text-[13px] text-[#494949]">
                  Sits under: {er.sitsUnder}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Why needed</div>
                <p className="text-[14px] text-[#161916] leading-relaxed">{er.whyNeeded || '—'}</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" className="text-[14px] text-[#FD4E59] font-medium hover:underline">
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onEmergentRoleClick(er.name)}
                  className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2"
                >
                  View detail
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {onProceedToF4 ? (
        <div className="mt-8 pt-6 border-t border-[#494949]/12">
          <button
            onClick={onProceedToF4}
            className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 shadow-sm"
          >
            Proceed to PODs
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
