import { Check, Circle, Loader2, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEngagement } from '../../../../hooks/useEngagement';
import { tasksFullyAllocated, tasksMissingAiAllocation } from '../../../../lib/pipelineCacheUtils';

/** Read fetch body once (avoids "body stream already read" from json() then text()). */
async function readFetchBodyAsJson(response: Response): Promise<{
  data: Record<string, unknown> | null;
  errorMessage: string;
}> {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return { data: null, errorMessage: 'No response body' };
  }
  try {
    const data = JSON.parse(responseText) as Record<string, unknown>;
    const errorMessage =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : responseText;
    return { data, errorMessage };
  } catch {
    return { data: { error: responseText }, errorMessage: responseText };
  }
}

interface F2_1_GenerationProps {
  onCancel: () => void;
  onBack?: () => void;
  engagementId?: string | null;
  generationRunKey?: number;
  onComplete?: (result: { processedTaskIds: string[]; failedTaskIds: string[]; total: number }) => void | Promise<void>;
}

export function F2_1_Generation({
  onCancel,
  onBack,
  engagementId,
  generationRunKey = 0,
  onComplete,
}: F2_1_GenerationProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { loadEngagement } = useEngagement(activeEngagementId);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const onCancelRef = useRef(onCancel);
  const onCompleteRef = useRef(onComplete);
  onCancelRef.current = onCancel;
  onCompleteRef.current = onComplete;

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
          ? `Predicting allocations: ${currentTaskName}`
          : totalTasks > 0
            ? 'Predicting allocations for all tasks…'
            : 'Predicting allocations',
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
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      setGenerationError(null);
      setConstraintsDone(false);
      setCapabilitiesDone(false);
      setCalibrationDone(false);
      setValidationDone(false);
      setCurrentTaskName('');

      if (!activeEngagementId) {
        console.error('[F2.1] Missing engagement id');
        onCancelRef.current();
        return;
      }

      const loaded = await loadEngagement(activeEngagementId);
      if (cancelRef.current) return;

      const allRows = Array.isArray(loaded?.tasks) ? loaded.tasks : [];
      if (!allRows || allRows.length === 0) {
        console.warn('[F2.1] No tasks to process. Aborting loop.');
        setGenerationError('No tasks found for this engagement. Add tasks in intake before generating the matrix.');
        return;
      }

      if (tasksFullyAllocated(allRows)) {
        const allIds = allRows
          .map((task) => (typeof task?.id === 'string' ? task.id : null))
          .filter((id): id is string => Boolean(id));
        setTotalTasks(allRows.length);
        setCompletedTasks(allRows.length);
        setConstraintsDone(true);
        setCapabilitiesDone(true);
        setCalibrationDone(true);
        setValidationDone(true);
        await onCompleteRef.current?.({ processedTaskIds: allIds, failedTaskIds: [], total: allRows.length });
        return;
      }

      const rows = tasksMissingAiAllocation(allRows);
      if (rows.length === 0) {
        setGenerationError('All tasks already have saved allocations.');
        return;
      }

      if (rows.length < allRows.length) {
        console.log(
          `[F2.1] Filling ${rows.length} task(s) missing AI allocation (${allRows.length - rows.length} already saved)`,
        );
      }

      setTotalTasks(rows.length);
      setCompletedTasks(0);
      setConstraintsDone(true);
      setCapabilitiesDone(true);
      setCurrentTaskName(`${rows.length} task${rows.length === 1 ? '' : 's'} (server-paced batch)`);

      const queueLength = rows.length;
      progressTimer = setInterval(() => {
        setCompletedTasks((prev) => Math.min(prev + 1, Math.max(0, queueLength - 1)));
      }, 2500);

      abortRef.current = new AbortController();
      let responseBody: Record<string, unknown> | null = null;
      try {
        const response = await fetch('/api/predict-allocation-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engagementId: activeEngagementId }),
          signal: abortRef.current.signal,
        });

        const { data, errorMessage } = await readFetchBodyAsJson(response);
        responseBody = data;

        if (!response.ok) {
          const processedSoFar = Array.isArray(data?.processedTaskIds)
            ? (data.processedTaskIds as string[]).length
            : 0;
          const failedAt = processedSoFar + 1;
          const detPart = data?.details != null ? String(data.details) : '';

          if (response.status === 429) {
            setGenerationError(
              [
                `Rate limit hit on task ${failedAt} of ${queueLength}.`,
                processedSoFar > 0
                  ? `${processedSoFar} task${processedSoFar === 1 ? '' : 's'} completed successfully and are saved.`
                  : 'No tasks were saved in this run.',
                'Wait a minute and click Re-run or "Allocate remaining" on the matrix to resume.',
              ].join(' '),
            );
            if (processedSoFar > 0) {
              await onCompleteRef.current?.({
                processedTaskIds: data?.processedTaskIds as string[],
                failedTaskIds: Array.isArray(data?.failedTaskIds)
                  ? (data.failedTaskIds as string[])
                  : [],
                total: allRows.length,
              });
            }
            return;
          }

          const combined = [errorMessage, detPart].filter(Boolean).join(' — ');
          setGenerationError(
            [
              `F2 prediction failed (HTTP ${response.status}): ${combined}`,
              processedSoFar > 0
                ? `${processedSoFar} of ${queueLength} tasks were saved before this error. Use "Allocate remaining" on the matrix.`
                : '',
              '',
              'Use `npm run dev:vercel` so `/api` is available. Check DevTools → Network → predict-allocation-batch.',
            ]
              .filter(Boolean)
              .join('\n'),
          );
          if (processedSoFar > 0) {
            await onCompleteRef.current?.({
              processedTaskIds: data?.processedTaskIds as string[],
              failedTaskIds: Array.isArray(data?.failedTaskIds)
                ? (data.failedTaskIds as string[])
                : [],
              total: allRows.length,
            });
          }
          return;
        }
      } catch (err) {
        if (!cancelRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          const networkHint =
            /failed to fetch|networkerror|load failed|econnrefused|connection refused/i.test(msg)
              ? ' Use `npm run dev:vercel` so `/api` runs on the same origin.'
              : '';
          setGenerationError(`${msg}.${networkHint}`);
        }
        return;
      } finally {
        abortRef.current = null;
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      }

      if (cancelRef.current) return;

      const processedTaskIds = Array.isArray(responseBody?.processedTaskIds)
        ? (responseBody.processedTaskIds as string[])
        : [];
      const failedTaskIds = Array.isArray(responseBody?.failedTaskIds)
        ? (responseBody.failedTaskIds as string[])
        : [];
      const total =
        typeof responseBody?.total === 'number' ? responseBody.total : allRows.length;

      setCompletedTasks(rows.length);
      setCalibrationDone(true);
      setValidationDone(true);

      if (processedTaskIds.length === 0 && failedTaskIds.length > 0) {
        const failures = Array.isArray(responseBody?.failures) ? responseBody.failures : [];
        const first =
          failures[0] && typeof failures[0] === 'object'
            ? (failures[0] as Record<string, unknown>)
            : null;
        const firstErr = first?.error != null ? String(first.error) : '';
        const rateLimited = /429|rate limit|rpm|quota/i.test(firstErr);
        setGenerationError(
          [
            rateLimited
              ? `Rate limit hit during allocation (task 1 of ${rows.length}). Wait and use "Allocate remaining" on the matrix.`
              : `Allocation failed for all ${rows.length} task(s) in this run.`,
            firstErr ? `First error: ${firstErr}` : '',
            '',
            'Check DevTools → Network → predict-allocation-batch for details.',
          ]
            .filter(Boolean)
            .join('\n'),
        );
        return;
      }

      if (failedTaskIds.length > 0) {
        console.warn('[F2.1] Partial allocation failures:', { failedTaskIds, responseBody });
      }

      await onCompleteRef.current?.({ processedTaskIds, failedTaskIds, total });
    };

    void run();

    return () => {
      cancelRef.current = true;
      abortRef.current?.abort();
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [activeEngagementId, generationRunKey, loadEngagement]);

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
