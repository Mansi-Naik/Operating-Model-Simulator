import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface Role {
  id: string;
  level: number;
  name: string;
  headcount: number;
  cost: number;
  span: number;
}

interface StepHierarchyProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepHierarchy({ data, onNext, onBack, currentStep, totalSteps }: StepHierarchyProps) {
  const [roles, setRoles] = useState<Role[]>(
    data?.roles || [
      { id: '1', level: 1, name: 'Agent', headcount: 100, cost: 45000, span: 10 },
      { id: '2', level: 2, name: 'Team Lead', headcount: 10, cost: 60000, span: 5 },
    ]
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { engagement, updateEngagement, loadEngagement } = useEngagement(data?.engagementId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const engagementId = data?.engagementId;
    if (!engagementId) {
      setSaveError('Missing engagement id. Please go back and save the Engagement step first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // 1) Load engagement first so we preserve other intake_data fields.
    const loaded = await loadEngagement(engagementId);
    const existingIntakeData = loaded?.engagement?.intake_data ?? engagement?.intake_data ?? {};

    // 2) Filter empty rows and map into the required hierarchy shape.
    const newHierarchyArray = (roles ?? [])
      .filter((r) => (r?.name ?? '').trim().length > 0)
      .map((r) => ({
        level: r.level,
        role: r.name,
        headcount: r.headcount,
        cost: r.cost,
        span: r.span ? `1:${r.span}` : null,
        attrition: null,
        notes: '',
      }));

    // 3) Merge intake_data.
    const mergedIntakeData = { ...existingIntakeData, hierarchy: newHierarchyArray };

    const { ok, error: updateErr } = await updateEngagement({ intake_data: mergedIntakeData });
    if (!ok) {
      setSaveError(updateErr ?? 'Failed to save hierarchy. Please try again.');
      setIsSaving(false);
      return;
    }

    await loadEngagement(engagementId);
    setIsSaving(false);
    onNext({ roles });
  };

  const addRole = () => {
    setRoles([
      ...roles,
      { id: Date.now().toString(), level: roles.length + 1, name: '', headcount: 0, cost: 0, span: 0 },
    ]);
  };

  const updateRole = (id: string, field: keyof Role, value: any) => {
    setRoles(roles.map((role) => (role.id === id ? { ...role, [field]: value } : role)));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Organisational Hierarchy</h2>
      <p className="text-[14px] text-[#494949] mb-8">Define the roles and their reporting structure.</p>

      <div className="mb-4 flex justify-end">
        <button type="button" className="text-[12px] text-[#6D7069] underline">
          Import from CSV
        </button>
      </div>

      <div className="border border-[#161916]/8 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FFF0DC]">
            <tr>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Level
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Role Name
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Headcount
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Cost (per FTE/year)
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Span of Control
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Time-Split
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, index) => (
              <tr
                key={role.id}
                className={`${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'} border-t border-[#161916]/8`}
              >
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={role.level}
                    onChange={(e) => updateRole(role.id, 'level', parseInt(e.target.value))}
                    className="w-16 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={role.name}
                    onChange={(e) => updateRole(role.id, 'name', e.target.value)}
                    className="w-full h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={role.headcount}
                    onChange={(e) => updateRole(role.id, 'headcount', parseInt(e.target.value))}
                    className="w-24 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={role.cost}
                    onChange={(e) => updateRole(role.id, 'cost', parseInt(e.target.value))}
                    className="w-28 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={role.span}
                    onChange={(e) => updateRole(role.id, 'span', parseInt(e.target.value))}
                    className="w-20 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-[12px] text-[#FFAB28] underline">
                    Edit Split
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRole}
        className="w-full h-9 mt-4 border border-dashed border-[#FFAB28] text-[#FFAB28] text-[13px] font-medium rounded-md hover:bg-[#FFAB28]/10 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Role Row
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
