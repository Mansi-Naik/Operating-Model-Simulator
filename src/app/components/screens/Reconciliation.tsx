import { useState } from 'react';
import { Check, ArrowLeft } from 'lucide-react';

interface ReconciliationProps {
  onComplete: () => void;
  onBack?: () => void;
}

interface ColumnMapping {
  userColumn: string;
  mapsTo: string;
  sampleValue: string;
  status: 'matched' | 'enum-mismatch' | 'skipped';
}

export function Reconciliation({ onComplete, onBack }: ReconciliationProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([
    { userColumn: 'Activity name', mapsTo: 'task_name', sampleValue: 'Review post', status: 'matched' },
    { userColumn: 'Doer', mapsTo: 'role_performing', sampleValue: 'Agent', status: 'matched' },
    { userColumn: 'Cat', mapsTo: 'task_type', sampleValue: 'rule', status: 'enum-mismatch' },
    { userColumn: 'Daily count', mapsTo: 'volume_per_day', sampleValue: '38000', status: 'matched' },
    { userColumn: '(unknown column)', mapsTo: '-- skip --', sampleValue: 'n/a', status: 'skipped' },
  ]);

  const schemaFields = [
    '-- skip --',
    'task_name',
    'role_performing',
    'task_type',
    'volume_per_day',
    'handle_time',
    'cost_per_fte',
  ];

  const getStatusChip = (status: ColumnMapping['status']) => {
    switch (status) {
      case 'matched':
        return (
          <div className="px-3 py-1 bg-[#FD4E59]/10 text-[#FD4E59] border border-[#FD4E59]/30 text-[12px] font-medium rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Matched
          </div>
        );
      case 'enum-mismatch':
        return (
          <div className="px-3 py-1 bg-[#FFAB28]/15 text-[#FFAB28] border border-[#FFAB28]/30 text-[12px] font-medium rounded-full">
            Enum mismatch
          </div>
        );
      case 'skipped':
        return (
          <div className="px-3 py-1 bg-[#F0F0F0] text-[#6D7069] text-[12px] font-medium rounded-full">
            Skipped
          </div>
        );
    }
  };

  const updateMapping = (index: number, field: string) => {
    const newMappings = [...mappings];
    newMappings[index].mapsTo = field;
    setMappings(newMappings);
  };

  const handleAutoFix = () => {
    const newMappings = mappings.map((m) =>
      m.status === 'enum-mismatch' ? { ...m, status: 'matched' as const } : m
    );
    setMappings(newMappings);
  };

  return (
    <div className="p-10">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6D7069] hover:text-[#161916] mb-6 text-[14px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <h1 className="text-[24px] font-bold text-[#161916] mb-2">Reconcile Your Upload</h1>
      <p className="text-[14px] text-[#494949] mb-8">
        Match your file's columns to the fields we need.
      </p>

      <div className="border border-[#161916]/8 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FFF0DC]">
            <tr>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Your Column
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Maps To
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Sample Value
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => (
              <tr
                key={index}
                className={`${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'} border-t border-[#161916]/8`}
              >
                <td className="px-4 py-3 text-[14px] text-[#161916]">{mapping.userColumn}</td>
                <td className="px-4 py-3">
                  <select
                    value={mapping.mapsTo}
                    onChange={(e) => updateMapping(index, e.target.value)}
                    className="w-52 h-9 px-3 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none"
                  >
                    {schemaFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-[14px] text-[#494949]">{mapping.sampleValue}</td>
                <td className="px-4 py-3">{getStatusChip(mapping.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issue Summary */}
      <div className="mt-6 bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-r-md p-4 flex items-center justify-between">
        <div>
          <div className="text-[13px] text-[#161916] mb-2">
            Issues found: 2 enum mismatches (e.g., 'rule' → 'rule-based')
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoFix}
              className="text-[#FFAB28] text-[13px] underline font-medium"
            >
              Auto-fix all enum mismatches
            </button>
            <button className="h-8 px-5 bg-[#FFAB28] text-[#161916] text-[13px] font-semibold rounded-md hover:bg-[#FFAB28]/90">
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={onComplete}
          className="h-9 px-8 bg-[#FD4E59] text-white text-[14px] font-semibold rounded hover:bg-[#FD4E59]/90"
        >
          Import
        </button>
      </div>
    </div>
  );
}
