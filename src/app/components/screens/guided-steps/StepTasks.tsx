import { useState } from 'react';
import { Plus, Trash2, Copy, Sparkles } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface Task {
  id: string;
  name: string;
  role: string;
  type: string;
  volume: number;
  handleTime: number;
}

interface StepTasksProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepTasks({ data, onNext, onBack, currentStep, totalSteps }: StepTasksProps) {
  const [tasks, setTasks] = useState<Task[]>(
    data?.tasks || [
      { id: '1', name: 'Review post', role: 'Agent', type: 'Rule-based', volume: 38000, handleTime: 3 },
    ]
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { saveTasks, loadEngagement } = useEngagement(data?.engagementId);

  const taskTypes = ['Rule-based', 'Judgment-based', 'Creative', 'Relationship'];
  const roles = data?.roles?.map((r: any) => r.name) || ['Agent', 'Team Lead'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const engagementId = data?.engagementId;
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
        source: 'user_provided',
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
      { id: Date.now().toString(), name: '', role: '', type: 'Rule-based', volume: 0, handleTime: 0 },
    ]);
  };

  const updateTask = (id: string, field: keyof Task, value: any) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)));
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
                  <input
                    type="text"
                    value={task.name}
                    onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                    className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.role}
                    onChange={(e) => updateTask(task.id, 'role', e.target.value)}
                    className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  >
                    <option value="">Select role</option>
                    {roles.map((role: string) => (
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
                    onChange={(e) => updateTask(task.id, 'volume', parseInt(e.target.value))}
                    className="w-24 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={task.handleTime}
                    onChange={(e) => updateTask(task.id, 'handleTime', parseInt(e.target.value))}
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

      {/* Navigation */}
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
