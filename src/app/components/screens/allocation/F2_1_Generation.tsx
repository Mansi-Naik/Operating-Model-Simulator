import { Check, Circle, Loader2, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { isForceRerun, tasksFullyAllocated } from '../../../../lib/pipelineCacheUtils';

interface F2_1_GenerationProps {
  onCancel: () => void;
  onBack?: () => void;
  engagementId?: string | null;
  onComplete?: (result: { processedTaskIds: string[]; failedTaskIds: string[]; total: number }) => void | Promise<void>;
}

export function F2_1_Generation({ onCancel, onBack, engagementId, onComplete }: F2_1_GenerationProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { loadEngagement } = useEngagement(activeEngagementId);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [currentTaskName, setCurrentTaskName] = useState<string>('');
  const [constraintsDone, setConstraintsDone] = useState(false);
  const [capabilitiesDone, setCapabilitiesDone] = useState(false);
  const [calibrationDone, setCalibrationDone] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const progressLabel = totalTasks > 0 ? `Task ${completedTasks} of ${totalTasks}` : 'Task 0 of 0';

  const stages = useMemo(
    () => [
      {
        label: 'Applied hard constraints',
        meta: 'Regulatory locks and hard rules checked',
        status: constraintsDone ? 'complete' : 'pending',
      },
      {
        label: 'Matched candidate capabilities',
        meta: `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} evaluated against capability library`,
        status: capabilitiesDone ? 'complete' : 'pending',
      },
      {
        label: currentTaskName
          ? `Predicting allocation for: ${currentTaskName}`
          : 'Predicting allocation for: awaiting first task',
        meta: '',
        status: totalTasks > 0 && completedTasks < totalTasks ? 'active' : totalTasks > 0 ? 'complete' : 'pending',
      },
      {
        label: 'Calibrating confidence',
        meta: '',
        status: calibrationDone ? 'complete' : 'pending',
      },
      {
        label: 'Cross-task validation',
        meta: '',
        status: validationDone ? 'complete' : 'pending',
      },
    ],
    [constraintsDone, totalTasks, capabilitiesDone, currentTaskName, completedTasks, calibrationDone, validationDone],
  );

  useEffect(() => {
    cancelRef.current = false;
    const run = async () => {
      setGenerationError(null);
      if (!activeEngagementId) {
        console.error('[F2.1] Missing engagement id');
        onCancel();
        return;
      }

      const loaded = await loadEngagement(activeEngagementId);
      const rows = Array.isArray(loaded?.tasks) ? loaded.tasks : [];
      setTotalTasks(rows.length);
      setCompletedTasks(0);
      if (!rows || rows.length === 0) {
        console.warn('[F2.1] No tasks to process. Aborting loop.');
        setGenerationError('No tasks found for this engagement. Add tasks in intake before generating the matrix.');
        return;
      }

      if (!isForceRerun() && tasksFullyAllocated(rows)) {
        const allIds = rows
          .map((task) => (typeof task?.id === 'string' ? task.id : null))
          .filter((id): id is string => Boolean(id));
        setCompletedTasks(rows.length);
        setConstraintsDone(true);
        setCapabilitiesDone(true);
        setCalibrationDone(true);
        setValidationDone(true);
        await onComplete?.({ processedTaskIds: allIds, failedTaskIds: [], total: rows.length });
        return;
      }

      const processedTaskIds = [];
      const failedTaskIds = [];
      /** First failed request detail (same root cause often repeats for every task). */
      let firstFailureSummary: string | null = null;

      for (let i = 0; i < rows.length; i += 1) {
        if (cancelRef.current) return;
        const task = rows[i];
        const taskId = typeof task?.id === 'string' ? task.id : null;
        const taskName = (task?.task_name ?? '').trim() || '(unnamed task)';
        setCurrentTaskName(taskName);

        if (!taskId) {
          console.error('[F2.1] Missing task id for row:', task);
          failedTaskIds.push(String(task?.task_id ?? `index-${i}`));
          setCompletedTasks(i + 1);
          continue;
        }

        abortRef.current = new AbortController();
        try {
          const response = await fetch('/api/predict-allocation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engagementId: activeEngagementId, taskId }),
            signal: abortRef.current.signal,
          });
          let responseBody = null;
          try {
            responseBody = await response.clone().json();
          } catch {
            responseBody = await response.text();
          }
          if (!response.ok) {
            console.error('[F2.1] /api/predict-allocation failed:', { taskId, status: response.status, responseBody });
            if (!firstFailureSummary) {
              const obj =
                responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)
                  ? (responseBody as Record<string, unknown>)
                  : null;
              const errPart = obj?.error != null ? String(obj.error) : null;
              const detPart = obj?.details != null ? String(obj.details) : null;
              const combined = [errPart, detPart].filter(Boolean).join(' — ');
              const fallback =
                typeof responseBody === 'string'
                  ? responseBody.slice(0, 400)
                  : combined || JSON.stringify(responseBody).slice(0, 400);
              firstFailureSummary = `HTTP ${response.status}: ${fallback || 'No response body'}`;
            }
            failedTaskIds.push(taskId);
          } else {
            processedTaskIds.push(taskId);
          }
        } catch (err) {
          if (!cancelRef.current) {
            console.error('[F2.1] Caught error:', err);
            console.error('[F2.1] Task prediction error:', { taskId, err });
            if (!firstFailureSummary) {
              const msg = err instanceof Error ? err.message : String(err);
              const networkHint =
                /failed to fetch|networkerror|load failed|econnrefused|connection refused/i.test(msg)
                  ? ' Vite proxies `/api/*` to http://localhost:3000 — nothing was listening there, or use `npm run dev:vercel` so `/api` runs on the same origin.'
                  : '';
              firstFailureSummary = `${msg}.${networkHint}`;
            }
            failedTaskIds.push(taskId);
          }
        } finally {
          abortRef.current = null;
          setCompletedTasks(i + 1);
          if (i === 0) {
            setConstraintsDone(true);
            setCapabilitiesDone(true);
          }
        }
      }

      if (cancelRef.current) return;
      setCalibrationDone(true);
      setValidationDone(true);

      if (processedTaskIds.length === 0) {
        setGenerationError(
          failedTaskIds.length > 0
            ? [
                `Allocation failed for all ${rows.length} tasks.`,
                firstFailureSummary ? `First error: ${firstFailureSummary}` : '',
                '',
                'Gemini key issues usually show as HTTP 500 with "Missing GEMINI_API_KEY" or a model error in the response. If you only run `npm run dev` (Vite), the UI calls /api which must be served — prefer `npm run dev:vercel`, or run another process on port 3000 (Vite proxies /api there).',
                'Open DevTools → Network → predict-allocation → Response to see the exact JSON error.',
              ]
                .filter(Boolean)
                .join('\n')
            : 'No allocation results were saved.',
        );
        return;
      }

      if (failedTaskIds.length > 0) {
        console.warn('[F2.1] Partial allocation failures:', { failedTaskIds });
      }

      await onComplete?.({ processedTaskIds, failedTaskIds, total: rows.length });
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

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[640px] w-full">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Title */}
        <h1 className="text-[28px] font-bold text-[#161916] mb-4">
          Generating allocation predictions…
        </h1>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-end mb-2">
            <span className="text-[13px] font-mono text-[#161916]">
              {progressLabel}
              {currentTaskName ? ` — Predicting allocation for: ${currentTaskName}` : ''}
            </span>
          </div>
          <div className="w-full h-2 bg-[#FFF0DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FD4E59] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {generationError ? (
          <div className="mb-6 text-[14px] text-[#FD4E59] border border-[#FD4E59]/30 rounded-lg p-4 bg-[#FCE4D6]/30 whitespace-pre-wrap break-words">
            {generationError}
          </div>
        ) : null}

        {/* Pipeline Stages */}
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
                  <div className={`text-[14px] ${stage.status === 'active' ? 'font-bold text-[#161916]' : stage.status === 'complete' ? 'text-[#161916]' : 'text-[#6D7069]'}`}>
                    {stage.label}
                  </div>
                  {stage.meta && (
                    <div className="text-[13px] text-[#6D7069] mt-1">{stage.meta}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Button */}
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
