import { Check, Circle, Loader2, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { aggregateByRole } from '../../../../lib/roleAggregation';

interface F3_1_GenerationProps {
  onCancel: () => void;
  onBack?: () => void;
  engagementId?: string | null;
  onComplete?: (result: { failedRoles: string[]; roleNames: string[] }) => void;
}

function getHierarchyFromEngagement(engagement: Record<string, unknown> | null | undefined): unknown[] {
  const intake = engagement?.intake_data;
  if (!intake || typeof intake !== 'object' || Array.isArray(intake)) return [];
  const h = (intake as Record<string, unknown>).hierarchy;
  return Array.isArray(h) ? h : [];
}

function roleNamesToRedesign(
  tasks: Record<string, unknown>[],
  hierarchy: unknown[],
): string[] {
  const aggregates = aggregateByRole(tasks, hierarchy as Record<string, unknown>[]);
  return aggregates
    .filter((a) => a.total_tasks_today > 0)
    .map((a) => String(a.role_name ?? '').trim())
    .filter(Boolean);
}

export function F3_1_Generation({ onCancel, onBack, engagementId, onComplete }: F3_1_GenerationProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { loadEngagement } = useEngagement(activeEngagementId);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [totalRedesigns, setTotalRedesigns] = useState(0);
  const [completedRedesigns, setCompletedRedesigns] = useState(0);
  const [currentRoleName, setCurrentRoleName] = useState('');
  const [loadDone, setLoadDone] = useState(false);
  const [aggregateDone, setAggregateDone] = useState(false);
  const [emergentDone, setEmergentDone] = useState(false);
  const [finalizeDone, setFinalizeDone] = useState(false);

  const progressPercent =
    totalRedesigns > 0
      ? emergentDone
        ? 100
        : (completedRedesigns / totalRedesigns) * 100
      : emergentDone
        ? 100
        : 0;

  const progressLabel =
    totalRedesigns > 0 ? `Role ${completedRedesigns} of ${totalRedesigns}` : 'Role 0 of 0';

  const stages = useMemo(
    () => [
      {
        label: 'Loaded engagement, tasks, and hierarchy',
        meta: 'Fresh data from your workspace',
        status: loadDone ? 'complete' : 'pending',
      },
      {
        label: 'Aggregated roles from your allocation matrix',
        meta:
          totalRedesigns > 0
            ? `${totalRedesigns} ${totalRedesigns === 1 ? 'role' : 'roles'} queued for redesign`
            : 'No roles with tasks matched hierarchy rows',
        status: aggregateDone ? 'complete' : loadDone ? 'active' : 'pending',
      },
      {
        label: currentRoleName
          ? `Redesigning: ${currentRoleName}`
          : totalRedesigns > 0
            ? 'Redesigning roles…'
            : 'Redesigning roles',
        meta:
          totalRedesigns > 0
            ? `Role ${Math.min(completedRedesigns + 1, totalRedesigns)} of ${totalRedesigns}`
            : '',
        status:
          aggregateDone && !emergentDone
            ? totalRedesigns > 0 && completedRedesigns < totalRedesigns
              ? 'active'
              : totalRedesigns === 0 || completedRedesigns >= totalRedesigns
                ? 'complete'
                : 'pending'
            : emergentDone
              ? 'complete'
              : 'pending',
      },
      {
        label: 'Identifying emergent roles…',
        meta: 'Cross-role view of automation and redesigned roles',
        status: emergentDone ? 'complete' : aggregateDone && (totalRedesigns === 0 || completedRedesigns >= totalRedesigns) ? 'active' : 'pending',
      },
      {
        label: 'Finalizing',
        meta: 'Refreshing engagement data',
        status: finalizeDone ? 'complete' : emergentDone ? 'active' : 'pending',
      },
    ],
    [
      loadDone,
      aggregateDone,
      totalRedesigns,
      completedRedesigns,
      currentRoleName,
      emergentDone,
      finalizeDone,
    ],
  );

  useEffect(() => {
    cancelRef.current = false;
    const run = async () => {
      if (!activeEngagementId) {
        console.error('[F3.1] Missing engagement id');
        onCancel();
        return;
      }

      setLoadDone(false);
      setAggregateDone(false);
      setEmergentDone(false);
      setFinalizeDone(false);
      setTotalRedesigns(0);
      setCompletedRedesigns(0);
      setCurrentRoleName('');

      const loaded = await loadEngagement(activeEngagementId);
      if (cancelRef.current) return;

      setLoadDone(true);

      const engagement = loaded?.engagement as Record<string, unknown> | null | undefined;
      const rows = Array.isArray(loaded?.tasks) ? (loaded.tasks as Record<string, unknown>[]) : [];
      const hierarchy = getHierarchyFromEngagement(engagement);
      const roleNames = roleNamesToRedesign(rows, hierarchy);

      setTotalRedesigns(roleNames.length);
      setAggregateDone(true);

      const failedRoles: string[] = [];

      for (let i = 0; i < roleNames.length; i += 1) {
        if (cancelRef.current) return;
        const roleName = roleNames[i];
        setCurrentRoleName(roleName);

        abortRef.current = new AbortController();
        try {
          const response = await fetch('/api/redesign-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engagementId: activeEngagementId, roleName }),
            signal: abortRef.current.signal,
          });
          let responseBody: unknown = null;
          try {
            responseBody = await response.clone().json();
          } catch {
            responseBody = await response.text();
          }
          if (!response.ok) {
            console.error('[F3.1] /api/redesign-role failed:', { roleName, status: response.status, responseBody });
            failedRoles.push(roleName);
          }
        } catch (err) {
          if (!cancelRef.current) {
            console.error('[F3.1] redesign-role error:', { roleName, err });
            failedRoles.push(roleName);
          }
        } finally {
          abortRef.current = null;
          setCompletedRedesigns(i + 1);
        }
      }

      if (cancelRef.current) return;

      setCurrentRoleName('');

      abortRef.current = new AbortController();
      try {
        const response = await fetch('/api/detect-emergent-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engagementId: activeEngagementId }),
          signal: abortRef.current.signal,
        });
        let responseBody: unknown = null;
        try {
          responseBody = await response.clone().json();
        } catch {
          responseBody = await response.text();
        }
        if (!response.ok) {
          console.error('[F3.1] /api/detect-emergent-roles failed:', { status: response.status, responseBody });
        }
      } catch (err) {
        if (!cancelRef.current) {
          console.error('[F3.1] detect-emergent-roles error:', err);
        }
      } finally {
        abortRef.current = null;
      }

      if (cancelRef.current) return;

      setEmergentDone(true);

      await loadEngagement(activeEngagementId);
      if (cancelRef.current) return;

      setFinalizeDone(true);
      onComplete?.({ failedRoles, roleNames });
    };

    void run();

    return () => {
      cancelRef.current = true;
      abortRef.current?.abort();
    };
  }, [activeEngagementId, loadEngagement, onCancel, onComplete]);

  const handleCancel = () => {
    cancelRef.current = true;
    abortRef.current?.abort();
    onCancel();
  };

  const emergentPhaseActive =
    aggregateDone && (totalRedesigns === 0 || completedRedesigns >= totalRedesigns) && !emergentDone;

  const progressBarSuffix = emergentPhaseActive
    ? ' — Identifying emergent roles…'
    : emergentDone && !finalizeDone
      ? ' — Finalizing…'
      : totalRedesigns > 0 && currentRoleName && !emergentDone
        ? ` — Redesigning: ${currentRoleName}`
        : aggregateDone && totalRedesigns === 0 && !emergentDone
          ? ' — No roles with tasks to redesign'
          : '';

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[640px] w-full">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <h1 className="text-[28px] font-bold text-[#161916] mb-4">Generating future role definitions…</h1>

        <div className="mb-8">
          <div className="flex justify-end mb-2">
            <span className="text-[13px] font-mono text-[#161916]">
              {progressLabel}
              {progressBarSuffix}
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
            {stages.map((stage, index) => (
              <div key={index} className="flex items-start gap-4 min-h-[56px]">
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
                  {stage.meta ? <div className="text-[13px] text-[#6D7069] mt-1">{stage.meta}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
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
