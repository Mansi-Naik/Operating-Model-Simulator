import { X, Info, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { calibrateConfidence } from '../../../../lib/confidenceCalibration';
import { CAPABILITY_LIBRARY } from '../../../../lib/capabilityLibrary';

export type AllocationKey = 'human-only' | 'tech-assisted' | 'tech-automated';

interface F2_3_TaskDrawerProps {
  taskId: string | null;
  engagement: Record<string, unknown> | null;
  engagementId: string | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

const ALLOCATION_SEGMENTS: { value: AllocationKey; label: string }[] = [
  { value: 'human-only', label: 'Human-only' },
  { value: 'tech-assisted', label: 'Tech-assisted' },
  { value: 'tech-automated', label: 'Tech-automated' },
];

function isAllocationKey(v: string): v is AllocationKey {
  return v === 'human-only' || v === 'tech-assisted' || v === 'tech-automated';
}

function effectiveAllocation(task: Record<string, unknown> | null): AllocationKey {
  const u = task?.user_allocation;
  const a = task?.ai_allocation;
  const raw = typeof u === 'string' && u.trim() ? u : typeof a === 'string' ? a : '';
  const lower = raw.toLowerCase();
  if (isAllocationKey(lower)) return lower;
  return 'human-only';
}

function formatAllocationChip(alloc: AllocationKey): string {
  return alloc.toUpperCase().replace(/-/g, '-');
}

function formatVolume(n: unknown): string {
  if (n == null || n === '') return '—';
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString();
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }
    } catch {
      return [value];
    }
  }
  return [];
}

export function F2_3_TaskDrawer({ taskId, engagement, onClose, onSaved }: F2_3_TaskDrawerProps) {
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [overrideSelection, setOverrideSelection] = useState<AllocationKey>('tech-assisted');
  const [overrideReason, setOverrideReason] = useState('');
  const [showConfidenceBreakdown, setShowConfidenceBreakdown] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setLoadError(null);
      return;
    }
    setLoadingTask(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (error) {
        setTask(null);
        setLoadError(error.message || 'Failed to load task');
        return;
      }
      if (!data) {
        setTask(null);
        setLoadError('Task not found');
        return;
      }
      setTask(data as Record<string, unknown>);
    } catch (e) {
      setTask(null);
      setLoadError(e instanceof Error ? e.message : 'Failed to load task');
    } finally {
      setLoadingTask(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!task) return;
    setOverrideSelection(effectiveAllocation(task));
    const reason = task.user_override_reason;
    setOverrideReason(typeof reason === 'string' ? reason : '');
    setSaveError(null);
  }, [task]);

  const rawConf =
    typeof task?.ai_confidence_raw === 'number' && Number.isFinite(task.ai_confidence_raw)
      ? task.ai_confidence_raw
      : 0;

  const confidenceBreakdown = useMemo(() => {
    return calibrateConfidence(rawConf, task ?? {}, engagement ?? {}).breakdown;
  }, [rawConf, task, engagement]);

  const calibratedPct = useMemo(() => {
    const c = task?.ai_confidence_calibrated;
    const v = typeof c === 'number' && Number.isFinite(c) ? c : 0;
    return Math.round(Math.max(0, Math.min(1, v)) * 100);
  }, [task?.ai_confidence_calibrated]);

  const primaryCapId =
    typeof task?.ai_primary_capability === 'string' ? task.ai_primary_capability : null;
  const primaryCapName = useMemo(() => {
    if (!primaryCapId) return null;
    const cap = CAPABILITY_LIBRARY.find((c) => c.id === primaryCapId);
    return cap?.name ?? primaryCapId;
  }, [primaryCapId]);

  const rationale = typeof task?.ai_rationale === 'string' ? task.ai_rationale : null;
  const riskFactors = parseStringList(task?.ai_risk_factors);
  const prerequisites = parseStringList(task?.ai_prerequisites);

  const taskTitle = typeof task?.task_name === 'string' && task.task_name.trim() ? task.task_name : '—';
  const taskCode =
    typeof task?.task_id === 'string' && task.task_id.trim()
      ? task.task_id
      : typeof task?.id === 'string'
        ? task.id.slice(0, 8)
        : '—';
  const role = typeof task?.role_performing === 'string' ? task.role_performing : '—';
  const taskType = typeof task?.task_type === 'string' ? task.task_type : '—';
  const avgMin = task?.avg_time_minutes;
  const avgLabel =
    avgMin != null && avgMin !== '' && Number.isFinite(Number(avgMin))
      ? `${Number(avgMin)} min`
      : '—';

  const currentAlloc = task ? effectiveAllocation(task) : null;

  const handleSaveOverride = async () => {
    if (!taskId) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_allocation: overrideSelection,
          user_override_reason: overrideReason.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof body?.error === 'string' ? body.error : `Save failed (${res.status})`;
        setSaveError(msg);
        return;
      }
      await onSaved?.();
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-[480px] h-full bg-white border-l border-[#494949]/12 overflow-y-auto shadow-xl flex flex-col">
        <div className="p-6 flex-1">
          <div className="flex justify-end mb-6">
            <button type="button" onClick={onClose} className="text-[#6D7069] hover:text-[#161916]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loadingTask && (
            <p className="text-[14px] text-[#6D7069] mb-4">Loading task…</p>
          )}
          {loadError && (
            <p className="text-[14px] text-[#FD4E59] mb-4">{loadError}</p>
          )}

          {!loadingTask && !loadError && task && (
            <>
              <div className="mb-6">
                <div className="text-[11px] font-mono text-[#6D7069] mb-1">TASK {taskCode}</div>
                <h2 className="text-[20px] font-bold text-[#161916] mb-3">{taskTitle}</h2>
                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="px-3 py-1 bg-[#FFF0DC] rounded text-[13px] text-[#161916]">
                    Role: {role}
                  </div>
                  <div className="px-3 py-1 bg-[#FFF0DC] rounded text-[13px] text-[#161916]">
                    Type: {taskType}
                  </div>
                  <div className="px-3 py-1 bg-[#FFF0DC] rounded text-[13px] text-[#161916]">
                    Volume: {formatVolume(task.volume_per_day)}/day
                  </div>
                </div>
                <div className="text-[13px] text-[#6D7069]">Avg time per execution: {avgLabel}</div>
              </div>

              <div className="bg-[#FDF8F4] rounded-lg p-4 mb-6">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Current allocation
                </div>
                <div className="mb-3">
                  {currentAlloc && (
                    <div className="px-4 py-2 bg-[#FFF0DC] rounded-full text-[16px] font-medium text-[#161916] inline-flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FFAB28]" />
                      {formatAllocationChip(currentAlloc)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[13px] text-[#6D7069] mb-2">Confidence</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#FFF0DC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FFAB28] rounded-full transition-[width]"
                        style={{ width: `${calibratedPct}%` }}
                      />
                    </div>
                    <span className="text-[14px] font-mono text-[#161916] w-12 text-right">
                      {calibratedPct}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowConfidenceBreakdown(!showConfidenceBreakdown)}
                  className="flex items-center gap-2 text-[13px] font-medium text-[#494949] mb-3 hover:text-[#161916]"
                >
                  {showConfidenceBreakdown ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                  Confidence breakdown
                </button>
                {showConfidenceBreakdown && (
                  <div className="bg-[#FDF8F4] rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-[13px] font-mono">
                      <span className="text-[#494949]">LLM raw (ai_confidence_raw)</span>
                      <span className="text-[#161916]">{confidenceBreakdown.llm_raw.toFixed(2)}</span>
                    </div>
                    {confidenceBreakdown.adjustments.map((adj, i) => (
                      <div key={`${adj.reason}-${i}`} className="flex justify-between text-[13px] font-mono">
                        <span className="text-[#494949]">{adj.reason}</span>
                        <span className={adj.delta >= 0 ? 'text-[#4CAF50]' : 'text-[#FD4E59]'}>
                          {adj.delta >= 0 ? '+' : ''}
                          {adj.delta.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-[#494949]/12 pt-2 mt-2 flex justify-between text-[13px] font-mono">
                      <span className="text-[#161916] font-bold">Calibrated total</span>
                      <span className="text-[#161916] font-bold">{confidenceBreakdown.final.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
                  Primary capability
                </div>
                {primaryCapName ? (
                  <>
                    <div className="text-[16px] font-medium text-[#161916] mb-2">{primaryCapName}</div>
                    <a
                      href="#why-this-capability"
                      className="text-[13px] text-[#FD4E59] underline flex items-center gap-1 hover:text-[#FD4E59]/80"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Why this capability?
                    </a>
                  </>
                ) : (
                  <div className="text-[14px] text-[#6D7069]">—</div>
                )}
              </div>

              <div className="mb-6">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                  Rationale
                </div>
                <p className="text-[14px] text-[#161916] leading-relaxed whitespace-pre-wrap">
                  {rationale ?? '—'}
                </p>
              </div>

              <div className="mb-6">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                  Risk factors
                </div>
                {riskFactors.length ? (
                  <ul className="space-y-1">
                    {riskFactors.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-[#494949]">
                        <span className="text-[#FD4E59] mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#6D7069]">—</p>
                )}
              </div>

              <div className="mb-6">
                <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
                  Prerequisites
                </div>
                {prerequisites.length ? (
                  <ul className="space-y-1">
                    {prerequisites.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-[#494949]">
                        <span className="text-[#4CAF50] mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#6D7069]">—</p>
                )}
              </div>

              <div className="bg-[#FFF8EE] border-l-[3px] border-[#FFAB28] rounded-lg p-4 mb-6">
                <div className="text-[11px] font-bold text-[#161916] uppercase tracking-wide mb-3">
                  Override this recommendation
                </div>
                <div className="h-10 border border-[#494949]/12 rounded-lg overflow-hidden flex mb-3">
                  {ALLOCATION_SEGMENTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOverrideSelection(option.value)}
                      className={`
                        flex-1 text-[13px] font-medium transition-colors px-1
                        ${
                          overrideSelection === option.value
                            ? 'bg-[#FD4E59] text-white'
                            : 'bg-white text-[#494949] hover:bg-[#FDF8F4]'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[12px] text-[#6D7069] mb-1 block">Reason for override (optional)</label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Why are you changing this?"
                    rows={2}
                    className="w-full px-3 py-2 border border-[#494949]/30 rounded-md text-[13px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-2 focus:ring-[#FD4E59]/15"
                  />
                </div>
                {saveError && <p className="text-[13px] text-[#FD4E59] mt-2">{saveError}</p>}
              </div>
            </>
          )}
        </div>

        {!loadingTask && !loadError && task && (
          <div className="sticky bottom-0 bg-white border-t border-[#494949]/12 p-4 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 border border-[#494949]/30 text-[#494949] text-[14px] font-medium rounded-md hover:bg-[#494949]/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveOverride()}
              className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save override'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
