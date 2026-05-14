import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { supabase } from '../../../../supabaseClient';

interface F6_4_PhaseDetailDrawerProps {
  phaseId: number;
  onClose: () => void;
  onGoToF3?: () => void;
}

type TimelineNode = Record<string, unknown>;
type TimelinePhase = Record<string, unknown>;

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return asObj(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return asObj(raw);
}

function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmtInt(value: unknown): string {
  return Math.round(toNum(value)).toLocaleString('en-US');
}

function fmtSigned(value: unknown): string {
  const n = toNum(value);
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-US')}`;
}

function riskChipClass(risk: unknown): string {
  const key = String(risk ?? '').toLowerCase();
  if (key === 'high' || key === 'critical') return 'bg-[#FCE4D6] text-[#FD4E59]';
  if (key === 'low') return 'bg-[#E2EFDA] text-[#548235]';
  return 'bg-[#FFF0DC] text-[#FFAB28]';
}

function riskTextClass(riskText: unknown): string {
  const text = String(riskText ?? '').toLowerCase();
  if (text.includes('high') || text.includes('weak') || text.includes('rollback')) return 'text-[#FD4E59]';
  if (text.includes('unclear') || text.includes('slow')) return 'text-[#FFAB28]';
  return 'text-[#494949]';
}

function taskId(task: Record<string, unknown>): string {
  return String(task.task_id ?? task.id ?? task.task_name ?? '').trim();
}

function taskIdsFromNode(node: TimelineNode): string[] {
  return Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String).filter(Boolean) : [];
}

function taskIdsFromRedesign(row: Record<string, unknown>): string[] {
  return [
    ...(Array.isArray(row.retained_tasks) ? row.retained_tasks : []),
    ...(Array.isArray(row.lost_tasks) ? row.lost_tasks : []),
    ...(Array.isArray(row.source_tasks) ? row.source_tasks : []),
  ]
    .map((task) => taskId(asObj(task)))
    .filter(Boolean);
}

function roleNameFromRedesign(row: Record<string, unknown>): string {
  return String(row.future_role_name ?? row.role_name ?? '').trim();
}

export function F6_4_PhaseDetailDrawer({ phaseId, onClose, onGoToF3 }: F6_4_PhaseDetailDrawerProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>>({});
  const [f3RolesRaw, setF3RolesRaw] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!engagementIdFromUrl) {
        setError('Missing engagement id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const { data, error: loadError } = await supabase
        .from('pipeline_runs')
        .select('f6_timeline, f3_roles')
        .eq('engagement_id', engagementIdFromUrl)
        .maybeSingle();

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        setTimeline({});
        setF3RolesRaw(null);
      } else {
        setTimeline(parseJsonObject(data?.f6_timeline));
        setF3RolesRaw(data?.f3_roles ?? null);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl, phaseId]);

  const graph = asObj(timeline.graph);
  const phases = Array.isArray(timeline.phases) ? (timeline.phases as TimelinePhase[]) : [];
  const phase = phases.find((row) => Math.round(toNum(row.phase_id)) === phaseId) ?? null;
  const nodes = Array.isArray(graph.nodes) ? (graph.nodes as TimelineNode[]) : [];
  const nodesById = useMemo(() => new Map(nodes.map((node) => [String(node.id), node])), [nodes]);
  const phaseNodeIds = Array.isArray(phase?.nodes) ? phase.nodes.map(String) : [];
  const phaseNodes = phaseNodeIds.map((id) => nodesById.get(id)).filter(Boolean) as TimelineNode[];
  const phaseTaskIds = new Set(phaseNodes.flatMap(taskIdsFromNode));

  const impactedRoles = useMemo(() => {
    const bundle = normalizeF3Roles(f3RolesRaw);
    const roles = new Set<string>();
    for (const row of bundle.redesigns) {
      const ids = taskIdsFromRedesign(row as Record<string, unknown>);
      if (ids.some((id) => phaseTaskIds.has(id))) {
        const role = roleNameFromRedesign(row as Record<string, unknown>);
        if (role) roles.add(role);
      }
    }
    return [...roles];
  }, [f3RolesRaw, phaseTaskIds]);

  const narrative = typeof phase?.narrative === 'string' ? phase.narrative : String(phase?.description ?? '');
  const headcountChange = toNum(phase?.headcount_change);
  const showHeadcount = Math.abs(headcountChange) > 0.01;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="flex-1 bg-black/30" onClick={onClose} aria-label="Close phase details" />

      <div className="w-[520px] h-full bg-white border-l border-[#494949]/12 overflow-y-auto shadow-xl flex flex-col animate-slide-in-right">
        <div className="px-6 py-4 border-b border-[#494949]/12">
          <div className="flex items-start justify-between mb-2">
            <div className="pr-4">
              <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">F6.4 Phase Detail</div>
              <h2 className="text-[20px] font-bold text-[#161916]">
                {phase ? `${String(phase.phase_name ?? '').toUpperCase()} · Wk ${fmtInt(phase.start_week)}-${fmtInt(phase.end_week)}` : 'Phase details'}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="text-[#6D7069] hover:text-[#161916] shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          {phase && narrative ? <p className="text-[13px] text-[#494949] leading-relaxed">{narrative}</p> : null}
        </div>

        <div className="p-6 flex-1">
          {loading ? <div className="text-[14px] text-[#494949]">Loading phase details...</div> : null}
          {error ? (
            <div className="text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
              {error}
            </div>
          ) : null}
          {!loading && !error && !phase ? (
            <div className="text-[14px] text-[#6D7069]">Phase not found in the saved timeline.</div>
          ) : null}

          {!loading && !error && phase ? (
            <>
              <section className="mb-6">
                <div className="text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">
                  Deployments in this phase
                </div>
                <div className="space-y-3">
                  {phaseNodes.map((node) => {
                    const paths = Array.isArray(node.implementation_paths) ? node.implementation_paths.map(String) : [];
                    return (
                      <div key={String(node.id)} className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="text-[14px] font-semibold text-[#161916]">{String(node.display_name ?? node.id)}</div>
                          <span className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide ${riskChipClass(node.risk_level)}`}>
                            {String(node.risk_level ?? 'medium')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[13px] text-[#494949] mb-3">
                          <div>Effort: {fmtInt(node.effort_weeks)} weeks</div>
                          <div>Affected tasks: {taskIdsFromNode(node).length}</div>
                        </div>
                        {paths.length > 0 ? (
                          <div>
                            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                              Implementation path
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {paths.map((path) => (
                                <span key={path} className="px-2 py-1 bg-white border border-[#494949]/12 rounded text-[12px] text-[#494949]">
                                  {path}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {phaseNodes.length === 0 ? (
                    <div className="text-[13px] text-[#6D7069] italic">No deployment nodes assigned to this phase.</div>
                  ) : null}
                </div>
              </section>

              <section className="mb-6">
                <div className="text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Deliverables</div>
                <ul className="list-disc pl-5 space-y-2 text-[13px] text-[#161916]">
                  {(Array.isArray(phase.deliverables) ? phase.deliverables : []).map((item) => (
                    <li key={String(item)}>{String(item)}</li>
                  ))}
                </ul>
              </section>

              <section className="mb-6">
                <div className="text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Risks</div>
                {(Array.isArray(phase.risks) ? phase.risks : []).length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-[13px]">
                    {(phase.risks as unknown[]).map((risk) => (
                      <li key={String(risk)} className={riskTextClass(risk)}>
                        {String(risk)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[13px] text-[#6D7069] italic">No material phase risks identified.</div>
                )}
              </section>

              {showHeadcount ? (
                <section className="mb-6 bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-4">
                  <div className="text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                    Headcount impact
                  </div>
                  <div className="text-[20px] font-bold text-[#161916] mb-2">{fmtSigned(headcountChange)} FTE</div>
                  <div className="text-[13px] text-[#494949] mb-3">
                    Impacted roles: {impactedRoles.length > 0 ? impactedRoles.join(', ') : 'Review F3 redesign outputs'}
                  </div>
                  {onGoToF3 ? (
                    <button type="button" onClick={onGoToF3} className="text-[13px] font-semibold text-[#FD4E59] hover:underline">
                      View impacted roles in F3
                    </button>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-[#494949]/12 flex items-center justify-between">
          <button
            type="button"
            disabled
            className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[13px] font-semibold rounded-md opacity-50 cursor-not-allowed"
          >
            Edit phase
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
