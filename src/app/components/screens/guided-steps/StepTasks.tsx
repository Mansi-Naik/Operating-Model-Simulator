import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Copy, Sparkles } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface Task {
  id: string;
  dbId?: string;
  name: string;
  role: string;
  type: string;
  volume: number;
  handleTime: number;
  source?: string;
  touched?: boolean;
}

interface StepTasksProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

function taskTypeLabel(tt: string | null | undefined): string {
  switch (String(tt || '').toLowerCase()) {
    case 'rule-based':
      return 'Rule-based';
    case 'judgment':
    case 'edge-case':
      return 'Judgment-based';
    case 'admin':
      return 'Relationship';
    case 'reporting':
      return 'Creative';
    default:
      return 'Rule-based';
  }
}

function mapDbTasksToRows(rows: Record<string, unknown>[]): Task[] {
  return rows.map((t, idx) => ({
    id: String(t.id ?? t.task_id ?? `row-${idx}`),
    dbId: t.id != null && t.id !== '' ? String(t.id) : undefined,
    name: String(t.task_name ?? ''),
    role: String(t.role_performing ?? ''),
    type: taskTypeLabel(t.task_type as string),
    volume: typeof t.volume_per_day === 'number' ? t.volume_per_day : Number(t.volume_per_day) || 0,
    handleTime: typeof t.avg_time_minutes === 'number' ? t.avg_time_minutes : Number(t.avg_time_minutes) || 0,
    source: typeof t.source === 'string' ? t.source : 'user_provided',
    touched: false,
  }));
}

export function StepTasks({ data, onNext, onBack, currentStep, totalSteps }: StepTasksProps) {
  const [tasks, setTasks] = useState<Task[]>(
    (data?.tasks as Task[]) || [
      { id: '1', name: 'Review post', role: 'Agent', type: 'Rule-based', volume: 38000, handleTime: 3 },
    ],
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hydratedForRef = useRef<string | null>(null);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = (data?.engagementId as string | undefined) ?? engagementIdFromUrl ?? null;

  const { saveTasks, loadEngagement } = useEngagement(engagementId);

  useEffect(() => {
    if (!engagementId) return;
    let cancelled = false;
    (async () => {
      const r = await loadEngagement(engagementId);
      if (cancelled) return;
      if (hydratedForRef.current === engagementId) return;
      const ts = r?.tasks ?? [];
      if (ts.length > 0) {
        hydratedForRef.current = engagementId;
        setTasks(mapDbTasksToRows(ts as Record<string, unknown>[]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId, loadEngagement]);

  const taskTypes = ['Rule-based', 'Judgment-based', 'Creative', 'Relationship'];
  const roles = (data?.roles as { name?: string }[] | undefined)?.map((r) => r.name).filter(Boolean) as string[];
  const roleOptions = roles?.length ? roles : ['Agent', 'Team Lead'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engagementId) {
      setSaveError('Missing engagement id. Please go back and save the Engagement step first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const toTaskType = (label: string) => {
      switch ((label ?? '').toLowerCase()) {
        case 'rule-based':
          return 'rule-based';
        case 'judgment-based':
          return 'judgment';
        case 'creative':
          return 'reporting';
        case 'relationship':
          return 'admin';
        default:
          return 'rule-based';
      }
    };

    const filtered = (tasks ?? []).filter((t) => (t?.name ?? '').trim().length > 0);
    if (filtered.length === 0) {
      setSaveError('Add at least one task to continue');
      setIsSaving(false);
      return;
    }

    const rows = filtered.map((t, idx) => {
      const n = String(idx + 1).padStart(3, '0');
      let source = t.source || 'user_provided';
      if (t.source === 'ai_extracted' && t.touched) source = 'ai_extracted_user_edited';
      if (t.source === 'ai_extracted_user_edited') source = 'ai_extracted_user_edited';
      if (!t.dbId) source = 'user_provided';
      return {
        task_id: `t_${n}`,
        task_name: (t.name ?? '').trim(),
        role_performing: t.role ? String(t.role) : null,
        task_type: toTaskType(t.type),
        volume_per_day: Number.isFinite(Number(t.volume)) ? Number(t.volume) : null,
        avg_time_minutes: Number.isFinite(Number(t.handleTime)) ? Number(t.handleTime) : null,
        input_data_type: null,
        consequence_of_error: null,
        data_logged: null,
        regulatory_constraint: false,
        source,
      };
    });

    const ok = await saveTasks(rows);
    if (!ok) {
      setSaveError('Failed to save tasks. Please try again.');
      setIsSaving(false);
      return;
    }

    await loadEngagement(engagementId);
    setIsSaving(false);
    onNext({ tasks });
  };

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: Date.now().toString(),
        name: '',
        role: '',
        type: 'Rule-based',
        volume: 0,
        handleTime: 0,
        source: 'user_provided',
        touched: false,
      },
    ]);
  };

  const updateTask = (id: string, field: keyof Task, value: string | number) => {
    setTasks(
      tasks.map((task) => {
        if (task.id !== id) return task;
        let touched = Boolean(task.touched);
        if (task.source === 'ai_extracted') touched = true;
        return { ...task, [field]: value, touched };
      }),
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const getTypeChipStyle = (type: string) => {
    switch (type) {
      case 'Rule-based':
        return 'bg-[#FFF0DC] text-[#FFAB28]';
      case 'Judgment-based':
        return 'bg-[#FD4E59]/10 text-[#FD4E59]';
      default:
        return 'bg-[#FDF8F4] text-[#494949]';
    }
  };

  const showAiChip = (t: Task) =>
    t.source === 'ai_extracted' || t.source === 'ai_extracted_user_edited';

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Task Inventory</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        List all tasks performed by each role. Every role added in Step 2 must have at least one task.
      </p>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="h-9 px-4 border border-[#FFAB28] text-[#FFAB28] text-[13px] font-medium rounded flex items-center gap-2 hover:bg-[#FFAB28]/10"
        >
          <Sparkles className="w-4 h-4" />
          Suggest tasks with AI
        </button>
      </div>

      <div className="border border-[#161916]/8 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FFF0DC]">
            <tr>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Task Name
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Role Performing
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Task Type
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Volume per Day
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Handle Time (mins)
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'} border-t border-[#161916]/8 group`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {showAiChip(task) && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFF0DC] text-[#FFAB28] border border-[#FFAB28]/40">
                        ✨ AI
                      </span>
                    )}
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                      className="w-full min-w-0 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.role}
                    onChange={(e) => updateTask(task.id, 'role', e.target.value)}
                    className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  >
                    <option value="">Select role</option>
                    {roleOptions.map((role: string) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.type}
                    onChange={(e) => updateTask(task.id, 'type', e.target.value)}
                    className={`w-full h-9 px-2 border-0 rounded text-[13px] font-medium ${getTypeChipStyle(task.type)}`}
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={task.volume}
                    onChange={(e) => updateTask(task.id, 'volume', parseInt(e.target.value, 10))}
                    className="w-24 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={task.handleTime}
                    onChange={(e) => updateTask(task.id, 'handleTime', parseInt(e.target.value, 10))}
                    className="w-20 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="w-4 h-4 text-[#6D7069] hover:text-[#FD4E59]" />
                    </button>
                    <button type="button">
                      <Copy className="w-4 h-4 text-[#6D7069] hover:text-[#FD4E59]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addTask}
        className="w-full h-9 mt-4 border border-dashed border-[#FFAB28] text-[#FFAB28] text-[13px] font-medium rounded-md hover:bg-[#FFAB28]/10 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Task Row
      </button>

      <div className="flex items-center justify-between mt-16 pt-8 border-t border-[#161916]/10">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-6 border border-[#161916]/30 text-[#494949] text-[14px] font-medium rounded hover:bg-[#161916]/5"
        >
          Back
        </button>
        <span className="text-[13px] text-[#6D7069]">
          Step {currentStep} of {totalSteps}
        </span>
        <button
          type="submit"
          disabled={isSaving}
          className="h-9 px-8 bg-[#FD4E59] text-white text-[14px] font-semibold rounded hover:bg-[#FD4E59]/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & continue'}
        </button>
      </div>
      {saveError && (
        <div className="mt-3 text-[13px] text-[#FD4E59]">
          {saveError}
        </div>
      )}
    </form>
  );
}
