import { BarChart3, ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';

interface F6_1_B_DependenciesViewProps {
  onBack: () => void;
  onViewGantt?: () => void;
  onMissingTimeline?: () => void;
}

type TimelineNode = Record<string, unknown>;
type TimelineEdge = { from: string; to: string; reason?: string };
type TimelinePhase = Record<string, unknown>;
type NodePosition = {
  id: string;
  node: TimelineNode;
  phaseId: number;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
};

const SVG_WIDTH = 980;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 70;
const LEFT_LABEL_WIDTH = 150;
const TOP_PADDING = 52;
const ROW_HEIGHT = 132;

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

function wrapLabel(label: unknown): string[] {
  const words = String(label ?? '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 18 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === 2) break;
  }
  if (current && lines.length < 2) lines.push(current);
  return lines.length > 0 ? lines : ['Capability'];
}

function edgePath(from: NodePosition, to: NodePosition): string {
  const startX = from.centerX;
  const startY = to.centerY >= from.centerY ? from.y + NODE_HEIGHT : from.y;
  const endX = to.centerX;
  const endY = to.centerY >= from.centerY ? to.y : to.y + NODE_HEIGHT;
  const midY = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function phaseName(phase: TimelinePhase): string {
  return String(phase.phase_name ?? 'Phase').trim() || 'Phase';
}

function buildPositions(phases: TimelinePhase[], nodesById: Map<string, TimelineNode>): NodePosition[] {
  const positions: NodePosition[] = [];
  const availableWidth = SVG_WIDTH - LEFT_LABEL_WIDTH - 48;

  phases.forEach((phase, phaseIdx) => {
    const ids = Array.isArray(phase.nodes) ? phase.nodes.map(String) : [];
    const visibleIds = ids.filter((id) => nodesById.has(id));
    const spacing = availableWidth / Math.max(1, visibleIds.length + 1);
    const rowY = TOP_PADDING + phaseIdx * ROW_HEIGHT;

    visibleIds.forEach((id, nodeIdx) => {
      const x = LEFT_LABEL_WIDTH + spacing * (nodeIdx + 1) - NODE_WIDTH / 2;
      const y = rowY + 30;
      positions.push({
        id,
        node: nodesById.get(id) ?? {},
        phaseId: Math.round(toNum(phase.phase_id, phaseIdx + 1)),
        x,
        y,
        centerX: x + NODE_WIDTH / 2,
        centerY: y + NODE_HEIGHT / 2,
      });
    });
  });

  return positions;
}

export function F6_1_B_DependenciesView({
  onBack,
  onViewGantt,
  onMissingTimeline,
}: F6_1_B_DependenciesViewProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;

  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .select('f6_timeline')
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

      setTimeline(loadedTimeline);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [engagementIdFromUrl, onMissingTimeline]);

  const graph = asObj(timeline?.graph);
  const criticalPath = asObj(timeline?.critical_path);
  const phases = useMemo(
    () => (Array.isArray(timeline?.phases) ? (timeline.phases as TimelinePhase[]) : []),
    [timeline],
  );
  const nodes = useMemo(
    () => (Array.isArray(graph.nodes) ? (graph.nodes as TimelineNode[]) : []),
    [graph.nodes],
  );
  const edges = useMemo(
    () =>
      Array.isArray(graph.edges)
        ? (graph.edges as Record<string, unknown>[]).map((edge) => ({
            from: String(edge.from ?? ''),
            to: String(edge.to ?? ''),
            reason: String(edge.reason ?? ''),
          }))
        : [],
    [graph.edges],
  );
  const nodesById = useMemo(() => new Map(nodes.map((node) => [String(node.id), node])), [nodes]);
  const positions = useMemo(() => buildPositions(phases, nodesById), [phases, nodesById]);
  const positionsById = useMemo(() => new Map(positions.map((pos) => [pos.id, pos])), [positions]);
  const criticalIds = useMemo(
    () => (Array.isArray(criticalPath.critical_path) ? criticalPath.critical_path.map(String) : []),
    [criticalPath.critical_path],
  );
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds]);
  const criticalEdgeSet = useMemo(() => {
    const pairs = new Set<string>();
    for (let i = 0; i < criticalIds.length - 1; i += 1) {
      pairs.add(`${criticalIds[i]}->${criticalIds[i + 1]}`);
    }
    return pairs;
  }, [criticalIds]);
  const svgHeight = TOP_PADDING + phases.length * ROW_HEIGHT + 48;
  const visibleEdges = edges.filter((edge) => positionsById.has(edge.from) && positionsById.has(edge.to));
  const criticalLabels = criticalIds.map((id) => String(nodesById.get(id)?.display_name ?? id));

  if (loading) {
    return (
      <div className="p-10 max-w-[1204px] mx-auto">
        <div className="text-[14px] text-[#494949]">Loading dependencies...</div>
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
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to timeline
        </button>
        <button
          type="button"
          onClick={onViewGantt}
          className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          View as Gantt
        </button>
      </div>

      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#161916] mb-1">Capability deployment dependencies</h1>
          <p className="text-[13px] text-[#6D7069]">
            Node-link view of deployment units, prerequisites, and the critical path.
          </p>
        </div>
        <div className="bg-white border border-[#494949]/12 rounded-xl p-4 shadow-sm min-w-[260px]">
          <div className="grid grid-cols-2 gap-3 text-[12px] text-[#494949]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FD4E59]" />
              Critical path
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#D9D9D9]" />
              Parallel/optional
            </div>
            <div className="flex items-center gap-2">
              <svg width="34" height="12" viewBox="0 0 34 12">
                <path d="M2 10 C 10 2, 22 2, 32 10" stroke="#6D7069" strokeWidth="1.5" fill="none" />
              </svg>
              Prerequisite
            </div>
            <div className="flex items-center gap-2">
              <svg width="34" height="12" viewBox="0 0 34 12">
                <path d="M2 10 C 10 2, 22 2, 32 10" stroke="#6D7069" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
              </svg>
              Related capability
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 relative overflow-x-auto">
          <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`} className="min-w-[900px]">
            <defs>
              <marker id="arrow-coral" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#FD4E59" />
              </marker>
              <marker id="arrow-grey" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#6D7069" />
              </marker>
            </defs>

            {phases.map((phase, idx) => {
              const y = TOP_PADDING + idx * ROW_HEIGHT;
              return (
                <g key={String(phase.phase_id)}>
                  <rect x="0" y={y} width={SVG_WIDTH} height={ROW_HEIGHT - 10} fill="white" opacity="0.45" rx="10" />
                  <text x="18" y={y + 48} fontSize="12" fontWeight="700" fill="#6D7069">
                    {phaseName(phase).toUpperCase()}
                  </text>
                  <text x="18" y={y + 66} fontSize="11" fill="#6D7069">
                    Wk {fmtInt(phase.start_week)}-{fmtInt(phase.end_week)}
                  </text>
                </g>
              );
            })}

            {visibleEdges.map((edge) => {
              const from = positionsById.get(edge.from);
              const to = positionsById.get(edge.to);
              if (!from || !to) return null;
              const isCritical = criticalEdgeSet.has(`${edge.from}->${edge.to}`);
              const stroke = isCritical ? '#FD4E59' : '#6D7069';
              const dash = edge.reason === 'related_capability' ? '5 4' : undefined;
              const labelX = (from.centerX + to.centerX) / 2;
              const labelY = (from.centerY + to.centerY) / 2 - 8;
              return (
                <g key={`${edge.from}-${edge.to}-${edge.reason}`}>
                  <path
                    d={edgePath(from, to)}
                    stroke={stroke}
                    strokeWidth={isCritical ? 2.2 : 1.5}
                    strokeDasharray={dash}
                    fill="none"
                    markerEnd={isCritical ? 'url(#arrow-coral)' : 'url(#arrow-grey)'}
                  />
                  {edge.reason ? (
                    <text x={labelX} y={labelY} fontSize="10" fill="#6D7069" textAnchor="middle">
                      {edge.reason.replace(/_/g, ' ')}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {positions.map((pos) => {
              const isCritical = criticalSet.has(pos.id);
              const lines = wrapLabel(pos.node.display_name ?? pos.id);
              return (
                <g key={pos.id}>
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="9"
                    fill="white"
                    stroke={isCritical ? '#FD4E59' : '#D9D9D9'}
                    strokeWidth={isCritical ? 2 : 1.25}
                  />
                  <rect x={pos.x + NODE_WIDTH - 43} y={pos.y + 8} width="34" height="17" rx="8" fill="#FFF0DC" />
                  <text x={pos.x + NODE_WIDTH - 26} y={pos.y + 20} fontSize="10" fontWeight="700" fill="#FFAB28" textAnchor="middle">
                    {fmtInt(pos.node.effort_weeks)}w
                  </text>
                  {lines.map((line, idx) => (
                    <text
                      key={line}
                      x={pos.x + NODE_WIDTH / 2}
                      y={pos.y + 38 + idx * 15}
                      fontSize="12"
                      fontWeight="600"
                      fill="#161916"
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bg-white border border-[#494949]/12 rounded-xl p-5 h-fit">
          <h3 className="text-[14px] font-bold text-[#161916] mb-2">Critical path summary</h3>
          <p className="text-[13px] text-[#494949] mb-4">
            {criticalLabels.length} nodes form the critical path. Delays on these nodes can push the full rollout.
          </p>
          <div className="space-y-2">
            {criticalLabels.map((label, idx) => (
              <div key={`${label}-${idx}`} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FD4E59] text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-[12px] text-[#161916]">{label}</span>
              </div>
            ))}
            {criticalLabels.length === 0 ? (
              <div className="text-[13px] text-[#6D7069] italic">No critical path nodes found</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
