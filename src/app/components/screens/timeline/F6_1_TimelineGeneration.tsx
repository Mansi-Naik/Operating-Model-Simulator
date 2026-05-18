import { ArrowLeft, Check, Circle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { usePipelineCacheEntry } from '../../../../hooks/usePipelineCacheEntry';
import { CAPABILITY_LIBRARY } from '../../../../lib/capabilityLibrary';
import {
  buildDependencyGraph,
  computeCriticalPath,
  computeTimelineSummary,
  groupNodesIntoPhases,
  identifyQuickWins,
} from '../../../../lib/timelineEngine';
import { supabase } from '../../../../supabaseClient';

type StageStatus = 'pending' | 'active' | 'complete';

interface F6_1_TimelineGenerationProps {
  onComplete: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

interface TimelineStage {
  key: string;
  label: string;
  meta: string;
}

const TIMELINE_STAGES: TimelineStage[] = [
  {
    key: 'graph',
    label: 'Building dependency graph...',
    meta: 'Mapping automated and assisted tasks into deployment units',
  },
  {
    key: 'criticalPath',
    label: 'Computing critical path...',
    meta: 'Sequencing dependencies and longest effort path',
  },
  {
    key: 'phases',
    label: 'Grouping into phases...',
    meta: 'Assigning work to Foundation, Pilot, Scale, and Optimize',
  },
  {
    key: 'quickWins',
    label: 'Identifying quick wins...',
    meta: 'Finding low-effort deployments with clean data and no prerequisites',
  },
  {
    key: 'narratives',
    label: 'Generating phase narratives...',
    meta: 'Drafting executive summaries for each phase',
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function persistF6Timeline(
  engagementId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: selErr } = await supabase
    .from('pipeline_runs')
    .select('id')
    .eq('engagement_id', engagementId)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  if (row?.id) {
    const { error } = await supabase.from('pipeline_runs').update({ f6_timeline: payload }).eq('id', row.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from('pipeline_runs').insert({
    engagement_id: engagementId,
    f6_timeline: payload,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function loadPipelinePrerequisites(
  engagementId: string,
): Promise<{ ok: true; f3Roles: Record<string, unknown> } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('f3_roles')
    .eq('engagement_id', engagementId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, f3Roles: asObj(data?.f3_roles) };
}

function mergePhaseNarratives(
  phases: Record<string, unknown>[],
  narratives: unknown,
): Record<string, unknown>[] {
  const rows = Array.isArray(narratives) ? narratives.map(asObj) : [];
  const byPhaseId = new Map(rows.map((row) => [Number(row.phase_id), String(row.narrative ?? '').trim()]));

  return phases.map((phase) => {
    const phaseId = Number(phase.phase_id);
    const narrative = byPhaseId.get(phaseId);
    return narrative ? { ...phase, narrative, description: narrative } : phase;
  });
}

export function F6_1_TimelineGeneration({ onComplete, onCancel, onBack }: F6_1_TimelineGenerationProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const { loadEngagement } = useEngagement(engagementIdFromUrl);
  const { hasCachedResults, isLoading: pipelineLoading } = usePipelineCacheEntry('f6', engagementIdFromUrl);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  const [activeStageKey, setActiveStageKey] = useState(TIMELINE_STAGES[0].key);
  const [completedStageKeys, setCompletedStageKeys] = useState<Set<string>>(new Set());
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState(TIMELINE_STAGES[0].label);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const stages = useMemo(
    () =>
      TIMELINE_STAGES.map((stage) => {
        const status: StageStatus = completedStageKeys.has(stage.key)
          ? 'complete'
          : activeStageKey === stage.key
            ? 'active'
            : 'pending';
        return { ...stage, status };
      }),
    [activeStageKey, completedStageKeys],
  );

  const markStage = useCallback((stageKey: string, progress: number) => {
    const stage = TIMELINE_STAGES.find((item) => item.key === stageKey);
    setActiveStageKey(stageKey);
    setProgressPercent(progress);
    setProgressLabel(stage?.label ?? 'Generating timeline...');
  }, []);

  const completeStage = useCallback((stageKey: string, progress: number) => {
    setCompletedStageKeys((prev) => new Set([...prev, stageKey]));
    setProgressPercent(progress);
  }, []);

  useEffect(() => {
    if (pipelineLoading) return;

    cancelledRef.current = false;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const run = async () => {
      try {
        if (!engagementIdFromUrl) throw new Error('Missing engagement id');

        if (hasCachedResults) {
          if (!cancelledRef.current && runIdRef.current === runId) onComplete();
          return;
        }

        setError(null);
        setCompletedStageKeys(new Set());
        markStage('graph', 0);

        const loaded = await loadEngagement(engagementIdFromUrl);
        if (cancelledRef.current || runIdRef.current !== runId) return;

        const engagement = asObj(loaded?.engagement);
        const tasks = Array.isArray(loaded?.tasks) ? (loaded.tasks as Record<string, unknown>[]) : [];
        const prereqs = await loadPipelinePrerequisites(engagementIdFromUrl);
        if (!prereqs.ok) throw new Error(`Failed to load F6 prerequisites: ${prereqs.error}`);

        const enrichedEngagement = {
          ...engagement,
          tasks,
          f3_roles: prereqs.f3Roles,
          pipeline_runs: { f3_roles: prereqs.f3Roles },
        };

        await sleep(150);
        const graph = buildDependencyGraph(tasks, CAPABILITY_LIBRARY, enrichedEngagement);
        completeStage('graph', 20);
        if (cancelledRef.current || runIdRef.current !== runId) return;

        markStage('criticalPath', 20);
        await sleep(150);
        const criticalPath = computeCriticalPath(graph);
        completeStage('criticalPath', 40);
        if (cancelledRef.current || runIdRef.current !== runId) return;

        markStage('phases', 40);
        await sleep(150);
        const phases = groupNodesIntoPhases(graph, criticalPath, enrichedEngagement);
        completeStage('phases', 60);
        if (cancelledRef.current || runIdRef.current !== runId) return;

        markStage('quickWins', 60);
        await sleep(150);
        const quickWins = identifyQuickWins(graph, enrichedEngagement);
        completeStage('quickWins', 80);
        if (cancelledRef.current || runIdRef.current !== runId) return;

        markStage('narratives', 80);
        abortRef.current = new AbortController();
        const response = await fetch('/api/generate-phase-narratives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engagementId: engagementIdFromUrl, phasesData: phases }),
          signal: abortRef.current.signal,
        });
        let responseBody: unknown = null;
        try {
          responseBody = await response.clone().json();
        } catch {
          responseBody = await response.text();
        } finally {
          abortRef.current = null;
        }
        if (!response.ok) {
          const body = asObj(responseBody);
          throw new Error(String(body.error ?? body.details ?? `Narrative generation failed (${response.status})`));
        }

        const phasesWithNarratives = mergePhaseNarratives(phases, asObj(responseBody).phase_narratives);
        const summary = computeTimelineSummary(phasesWithNarratives, criticalPath, enrichedEngagement);
        const payload = {
          graph,
          critical_path: criticalPath,
          phases: phasesWithNarratives,
          quick_wins: quickWins,
          summary,
          generated_at: new Date().toISOString(),
        };

        const persisted = await persistF6Timeline(engagementIdFromUrl, payload);
        if (!persisted.ok) throw new Error(`Failed to save timeline: ${persisted.error}`);

        completeStage('narratives', 100);
        setProgressLabel('Timeline generated');
        await sleep(250);
        if (!cancelledRef.current && runIdRef.current === runId) onComplete();
      } catch (err) {
        if (cancelledRef.current || runIdRef.current !== runId) return;
        const message = err instanceof Error ? err.message : 'Timeline generation failed';
        console.error('[F6.1] Timeline generation failed:', err);
        setError(message);
      }
    };

    void run();

    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, [
    completeStage,
    engagementIdFromUrl,
    loadEngagement,
    markStage,
    onComplete,
    retryNonce,
    pipelineLoading,
    hasCachedResults,
  ]);

  const handleCancel = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    onCancel();
  };

  const handleRetry = () => {
    abortRef.current?.abort();
    setRetryNonce((value) => value + 1);
  };

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[640px] w-full">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Generating implementation timeline…</h1>

        <div className="mb-8">
          <div className="flex justify-end mb-2">
            <span className="text-[13px] font-mono text-[#161916]">
              {Math.round(progressPercent)}% — {progressLabel}
            </span>
          </div>
          <div className="w-full h-2 bg-[#FFF0DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FD4E59] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            {stages.map((stage) => (
              <div key={stage.key} className="flex items-start gap-4 min-h-[56px]">
                <div className="flex-shrink-0 mt-1">
                  {stage.status === 'complete' ? (
                    <div className="w-5 h-5 rounded-full bg-[#4CAF50] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : stage.status === 'active' ? (
                    <Loader2 className="w-5 h-5 text-[#FD4E59] animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#6D7069]" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-[14px] ${
                      stage.status === 'active'
                        ? 'font-bold text-[#161916]'
                        : stage.status === 'complete'
                          ? 'text-[#161916]'
                          : 'text-[#6D7069]'
                    }`}
                  >
                    {stage.label}
                  </div>
                  <div className="text-[13px] text-[#6D7069] mt-1">{stage.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30">
            {error}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleRetry}
                className="h-9 px-4 bg-[#FD4E59] text-white text-[13px] font-semibold rounded-md hover:bg-[#FD4E59]/90"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleCancel}
            className="h-10 px-6 border border-[#494949]/30 text-[#494949] text-[14px] font-medium rounded-md hover:bg-[#494949]/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
