import { ArrowRight, ChevronLeft, GitBranch, Info, Sparkles } from 'lucide-react';
import { PipelineReRunButton } from '../../PipelineReRunButton';
import { useEffect, useMemo, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import {
  deterministicJsonEqual,
  mergeF6TimelineWithCachedNarratives,
  persistPipelineColumn,
  recomputeF6TimelineDeterministic,
  stripTimelinePhaseNarratives,
} from '../../../../lib/pipelineDeterministicRefresh';
import { supabase } from '../../../../supabaseClient';
import { F6_4_PhaseDetailDrawer } from './F6_4_PhaseDetailDrawer';

interface F6_1_C_GanttViewProps {
  onBack: () => void;
  onViewDependencies?: () => void;
  onProceedToF7?: () => void;
  onMissingTimeline?: () => void;
  onGoToF3?: () => void;
  onReRunToPreRun?: () => void | Promise<void>;
}

type TimelineNode = Record<string, unknown>;
type TimelinePhase = Record<string, unknown>;
type GanttBar = {
  id: string;
  label: string;
  phaseId: number;
  start: number;
  end: number;
  effort: number;
  deploymentType: string;
  affectedTasks: string[];
  volume: number;
  priority: 'critical' | 'parallel' | 'optional';
};

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

function fmtMonths(value: unknown): string {
  const n = toNum(value);
  if (!Number.isFinite(n)) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function weekPct(week: number, totalWeeks: number): number {
  const span = Math.max(1, totalWeeks - 1);
  return Math.max(0, Math.min(100, ((week - 1) / span) * 100));
}

function phaseLabel(phase: TimelinePhase): string {
  const name = String(phase.phase_name ?? '').trim().toUpperCase() || 'PHASE';
  return `${name} (Wk ${fmtInt(phase.start_week)}-${fmtInt(phase.end_week)})`;
}

function deploymentIcon(type: string): string {
  return type === 'full' ? '🤖' : '⚡';
}

function weekMarkers(totalWeeks: number): number[] {
  const markers = [1];
  for (let week = 4; week <= totalWeeks; week += 4) markers.push(week);
  if (!markers.includes(totalWeeks)) markers.push(totalWeeks);
  return markers;
}

function barColor(priority: GanttBar['priority']): string {
  if (priority === 'critical') return '#FD4E59';
  if (priority === 'parallel') return '#FFAB28';
  return '#D9D9D9';
}

function buildBars(
  phases: TimelinePhase[],
  nodesById: Map<string, TimelineNode>,
  criticalSet: Set<string>,
): GanttBar[] {
  const bars: GanttBar[] = [];
  for (const phase of phases) {
    const ids = Array.isArray(phase.nodes) ? phase.nodes.map(String) : [];
    const phaseStart = toNum(phase.start_week, 1);
    const phaseEnd = Math.max(phaseStart + 1, toNum(phase.end_week, phaseStart + 1));
    const phaseSpan = Math.max(1, phaseEnd - phaseStart);

    ids.forEach((id, idx) => {
      const node = nodesById.get(id) ?? {};
      const effort = Math.max(1, toNum(node.effort_weeks, 1));
      const stagger = ids.length > 1 ? (idx / Math.max(1, ids.length - 1)) * Math.max(0, phaseSpan - effort) : 0;
      const start = Math.max(phaseStart, Math.min(phaseEnd - effort, phaseStart + stagger));
      const riskLevel = String(node.risk_level ?? '').toLowerCase();
      const priority = criticalSet.has(id) ? 'critical' : riskLevel === 'low' ? 'optional' : 'parallel';
      bars.push({
        id,
        label: String(node.display_name ?? id).trim() || id,
        phaseId: Math.round(toNum(phase.phase_id, 1)),
        start,
        end: start + effort,
        effort,
        deploymentType: String(node.deployment_type ?? 'assist'),
        affectedTasks: Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : [],
        volume: toNum(node.total_volume_affected),
        priority,
      });
    });
  }
  return bars;
}

export function F6_1_C_GanttView({
  onBack,
  onViewDependencies,
  onProceedToF7,
  onMissingTimeline,
  onGoToF3,
  onReRunToPreRun,
}: F6_1_C_GanttViewProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const { engagement, tasks, loadEngagement } = useEngagement(engagementIdFromUrl);

  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [expandedQuickWin, setExpandedQuickWin] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);

  useEffect(() => {
    if (!engagementIdFromUrl) return;
    void loadEngagement(engagementIdFromUrl);
  }, [engagementIdFromUrl, loadEngagement]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!engagementIdFromUrl) {
        setLoading(false);
        onMissingTimeline?.();
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
        setLoading(false);
        return;
      }

      const loadedTimeline = parseJsonObject(data?.f6_timeline);
      if (Object.keys(loadedTimeline).length === 0) {
        setLoading(false);
        onMissingTimeline?.();
        return;
      }

      let displayTimeline = loadedTimeline;

      if (engagement && Array.isArray(tasks) && tasks.length > 0) {
        const f3Bundle = normalizeF3Roles(data?.f3_roles);
        const deterministic = recomputeF6TimelineDeterministic(
          engagement as Record<string, unknown>,
          tasks as Record<string, unknown>[],
          f3Bundle,
        );
        const merged = mergeF6TimelineWithCachedNarratives(loadedTimeline, deterministic);
        if (
          !deterministicJsonEqual(
            stripTimelinePhaseNarratives(loadedTimeline),
            stripTimelinePhaseNarratives(merged),
          )
        ) {
          const result = await persistPipelineColumn(engagementIdFromUrl, 'f6_timeline', merged);
          if (result.ok) {
            displayTimeline = merged;
            console.log('[F6] Recomputed with new inputs — cache refreshed');
          }
        } else {
          displayTimeline = merged;
        }
      }

      setTimeline(displayTimeline);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl, onMissingTimeline, engagement, tasks]);

  const graph = asObj(timeline?.graph);
  const summary = asObj(timeline?.summary);
  const criticalPath = asObj(timeline?.critical_path);
  const phases = useMemo(
    () => (Array.isArray(timeline?.phases) ? (timeline?.phases as TimelinePhase[]) : []),
    [timeline],
  );
  const nodes = useMemo(
    () => (Array.isArray(graph.nodes) ? (graph.nodes as TimelineNode[]) : []),
    [graph.nodes],
  );
  const nodesById = useMemo(() => new Map(nodes.map((node) => [String(node.id), node])), [nodes]);
  const criticalIds = useMemo(
    () => (Array.isArray(criticalPath.critical_path) ? criticalPath.critical_path.map(String) : []),
    [criticalPath.critical_path],
  );
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds]);
  const bars = useMemo(
    () => buildBars(phases, nodesById, criticalSet),
    [phases, nodesById, criticalSet],
  );
  const quickWins = useMemo(
    () => (Array.isArray(timeline?.quick_wins) ? (timeline?.quick_wins as TimelineNode[]) : []).slice(0, 5),
    [timeline],
  );

  const totalWeeks = Math.max(1, Math.round(toNum(summary.total_duration_weeks, 30)));
  const markers = weekMarkers(totalWeeks);
  const chartHeight = Math.max(420, phases.length * 118);
  const laneHeight = phases.length > 0 ? chartHeight / phases.length : chartHeight;
  const criticalPoints = criticalIds
    .map((id) => {
      const bar = bars.find((item) => item.id === id);
      if (!bar) return null;
      const phaseIndex = Math.max(0, phases.findIndex((phase) => Math.round(toNum(phase.phase_id)) === bar.phaseId));
      const x = weekPct(bar.start + bar.effort / 2, totalWeeks);
      const y = ((phaseIndex * laneHeight + laneHeight / 2) / chartHeight) * 100;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[14px] text-[#494949]">Loading timeline…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 max-w-[720px] mx-auto">
        <div className="text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1204px] mx-auto">
      {selectedPhaseId != null ? (
        <F6_4_PhaseDetailDrawer
          phaseId={selectedPhaseId}
          onClose={() => setSelectedPhaseId(null)}
          onGoToF3={onGoToF3}
        />
      ) : null}

      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to timeline
        </button>
        <div className="flex items-center gap-2">
          {onReRunToPreRun ? <PipelineReRunButton feature="f6" onConfirmRerun={onReRunToPreRun} /> : null}
          <button
            type="button"
            onClick={() => setShowCriticalPath((value) => !value)}
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            {showCriticalPath ? 'Hide critical path' : 'Show critical path'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[24px] font-bold text-[#161916]">Implementation Timeline</h1>
          <span className="px-2.5 py-1 bg-[#FFF0DC] text-[#FFAB28] text-[11px] font-semibold uppercase tracking-wide rounded-full">
            Illustrative
          </span>
        </div>
        <p className="text-[13px] text-[#6D7069]">
          {fmtMonths(summary.total_duration_months)} months · 4 phases · {fmtInt(summary.deployments_count)} deployments
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6 mb-6">
        <div className="bg-white border border-[#494949]/12 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-[190px_1fr] border-b border-[#494949]/12 pb-3 mb-3">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">Phase</div>
            <div className="relative h-6">
              {markers.map((week) => (
                <div
                  key={week}
                  className="absolute top-0 -translate-x-1/2 text-[11px] text-[#6D7069]"
                  style={{ left: `${weekPct(week, totalWeeks)}%` }}
                >
                  W{week}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[190px_1fr]" style={{ height: `${chartHeight}px` }}>
            <div>
              {phases.map((phase) => (
                <button
                  type="button"
                  key={String(phase.phase_id)}
                  onClick={() => setSelectedPhaseId(Math.round(toNum(phase.phase_id, 1)))}
                  className="w-full text-left pr-4 border-r border-[#494949]/12 flex items-center hover:bg-[#FFF0DC]/30"
                  style={{ height: `${laneHeight}px` }}
                >
                  <div>
                    <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide">
                      {phaseLabel(phase)}
                    </div>
                    <div className="text-[12px] text-[#494949] mt-1">
                      {(Array.isArray(phase.nodes) ? phase.nodes : []).length} deployments
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="relative overflow-hidden">
              {phases.map((phase, idx) => (
                <button
                  type="button"
                  key={String(phase.phase_id)}
                  onClick={() => setSelectedPhaseId(Math.round(toNum(phase.phase_id, 1)))}
                  className="absolute left-0 right-0 bg-[#FDF8F4] border-b border-white hover:bg-[#FFF0DC]/50"
                  style={{ top: `${idx * laneHeight}px`, height: `${laneHeight}px` }}
                />
              ))}

              {markers.map((week) => (
                <div
                  key={week}
                  className="absolute top-0 bottom-0 w-px bg-[#494949] opacity-8"
                  style={{ left: `${weekPct(week, totalWeeks)}%` }}
                />
              ))}

              {phases.map((phase) => (
                <div
                  key={`marker-${String(phase.phase_id)}`}
                  className="absolute top-0 bottom-0 border-l border-dashed border-[#6D7069]/50"
                  style={{ left: `${weekPct(toNum(phase.start_week, 1), totalWeeks)}%` }}
                >
                  <div className="absolute top-1 left-1 text-[10px] font-semibold text-[#6D7069] uppercase tracking-wide whitespace-nowrap">
                    {String(phase.phase_name ?? '')}
                  </div>
                </div>
              ))}

              {showCriticalPath && criticalPoints ? (
                <svg className="absolute inset-0 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline points={criticalPoints} fill="none" stroke="#FD4E59" strokeWidth="0.6" strokeDasharray="2 1.4" />
                </svg>
              ) : null}

              {bars.map((bar) => {
                const phaseIndex = Math.max(0, phases.findIndex((phase) => Math.round(toNum(phase.phase_id)) === bar.phaseId));
                const samePhaseBars = bars.filter((item) => item.phaseId === bar.phaseId);
                const rowOffset = samePhaseBars.findIndex((item) => item.id === bar.id) % 2;
                const top = phaseIndex * laneHeight + 40 + rowOffset * 32;
                const left = weekPct(bar.start, totalWeeks);
                const width = Math.max(4, weekPct(bar.end, totalWeeks) - weekPct(bar.start, totalWeeks));
                return (
                  <div
                    key={bar.id}
                    className="absolute z-30 h-7 rounded px-2 flex items-center text-[12px] font-medium text-[#161916] shadow-sm group cursor-default"
                    style={{ top: `${top}px`, left: `${left}%`, width: `${width}%`, backgroundColor: barColor(bar.priority) }}
                  >
                    <span className="truncate">
                      {deploymentIcon(bar.deploymentType)} {bar.label}
                    </span>
                    <div className="hidden group-hover:block absolute left-0 top-8 w-56 bg-white border border-[#494949]/12 rounded-lg shadow-lg p-3 text-[12px] text-[#494949] z-50">
                      <div className="font-semibold text-[#161916] mb-1">{bar.label}</div>
                      <div>{bar.affectedTasks.length} affected tasks</div>
                      <div>{fmtInt(bar.volume)} volume affected</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#FFAB28]" />
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide">Quick Wins</div>
          </div>
          <div className="space-y-3">
            {quickWins.length > 0 ? (
              quickWins.map((node) => {
                const id = String(node.id ?? node.capability_id ?? node.display_name);
                const affected = Array.isArray(node.affected_tasks) ? node.affected_tasks.map(String) : [];
                const expanded = expandedQuickWin === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExpandedQuickWin(expanded ? null : id)}
                    className="w-full text-left bg-white border border-[#494949]/12 rounded-lg p-3 hover:bg-[#FFF0DC]/50"
                  >
                    <div className="text-[13px] font-semibold text-[#161916] mb-2">{String(node.display_name ?? id)}</div>
                    <div className="text-[12px] text-[#494949] mb-2">
                      Effort: {fmtInt(node.effort_weeks)} weeks · Volume: {fmtInt(node.total_volume_affected)}
                    </div>
                    <span className="inline-flex px-2 py-1 bg-[#E2EFDA] text-[#548235] text-[11px] font-semibold uppercase tracking-wide rounded">
                      Launch in Phase 1
                    </span>
                    {expanded ? (
                      <div className="mt-3 pt-3 border-t border-[#494949]/12 text-[12px] text-[#494949] space-y-1">
                        {affected.map((taskId) => (
                          <div key={taskId} className="truncate">
                            {taskId}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="text-[13px] text-[#6D7069] italic">No quick wins identified</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 py-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 bg-[#FD4E59] rounded" />
          <span className="text-[12px] text-[#494949]">Critical path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 bg-[#FFAB28] rounded" />
          <span className="text-[12px] text-[#494949]">Parallel branch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 bg-[#D9D9D9] rounded" />
          <span className="text-[12px] text-[#494949]">Low priority / optional</span>
        </div>
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#6D7069]" />
          <span className="text-[12px] text-[#494949]">Hover bars for task and volume details</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onViewDependencies}
          className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[13px] font-semibold rounded-md hover:bg-[#494949]/5"
        >
          View dependencies
        </button>
        <button
          type="button"
          onClick={() => setSelectedPhaseId(Math.round(toNum(phases[0]?.phase_id, 1)))}
          disabled={phases.length === 0}
          className="h-10 px-5 border border-[#494949]/30 text-[#494949] text-[13px] font-semibold rounded-md hover:bg-[#494949]/5"
        >
          View phase details
        </button>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onProceedToF7}
          disabled={!timeline || Object.keys(timeline).length === 0}
          title={!timeline || Object.keys(timeline).length === 0 ? 'Generate the timeline first.' : undefined}
          className="h-12 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          Proceed to Summary
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
