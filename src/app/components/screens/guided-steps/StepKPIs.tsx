import { useState } from 'react';
import { Plus, HelpCircle } from 'lucide-react';
import { useEngagement } from '../../../../hooks/useEngagement';

interface KPI {
  name: string;
  current: string;
  target: string;
}

interface StepKPIsProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

export function StepKPIs({ data, onNext, onBack, currentStep, totalSteps }: StepKPIsProps) {
  const [productivityKPIs, setProductivityKPIs] = useState<KPI[]>(
    data?.productivityKPIs || [
      { name: 'Average Handle Time', current: '', target: '' },
      { name: 'First Contact Resolution', current: '', target: '' },
      { name: 'Calls Per Hour', current: '', target: '' },
    ]
  );

  const [qualityKPIs, setQualityKPIs] = useState<KPI[]>(
    data?.qualityKPIs || [
      { name: 'Quality Score %', current: '', target: '' },
      { name: 'CSAT Score', current: '', target: '' },
      { name: 'Error Rate %', current: '', target: '' },
    ]
  );

  const [customerKPIs, setCustomerKPIs] = useState<KPI[]>(
    data?.customerKPIs || [
      { name: 'NPS', current: '', target: '' },
      { name: 'Repeat Contact Rate', current: '', target: '' },
      { name: 'Escalation Rate', current: '', target: '' },
    ]
  );

  const [shrinkage, setShrinkage] = useState(data?.shrinkage || '');
  const [utilisation, setUtilisation] = useState(data?.utilisation || '');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const engagementId = data?.engagementId ?? engagementIdFromUrl ?? null;

  const { engagement, updateEngagement, loadEngagement } = useEngagement(engagementId);

  const find = (arr: KPI[], name: string) => arr.find((k) => k.name === name);

  const parseOptionalNumber = (value: string) => {
    const v = String(value ?? '').trim();
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const addKpi = (obj: any, key: string, actualStr: string, targetStr: string, unit: string) => {
    const actual = parseOptionalNumber(actualStr);
    const target = parseOptionalNumber(targetStr);
    if (actual === undefined && target === undefined) return;
    obj[key] = {
      ...(actual !== undefined ? { actual } : {}),
      ...(target !== undefined ? { target } : {}),
      unit,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engagementId) {
      setSaveError('Missing engagement id. Please go back and save the Engagement step first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const loaded = await loadEngagement(engagementId);
    const existingIntakeData = loaded?.engagement?.intake_data ?? engagement?.intake_data ?? {};

    const kpis: any = {};

    const aht = find(productivityKPIs, 'Average Handle Time');
    addKpi(kpis, 'turnaround_time', aht?.current ?? '', aht?.target ?? '', 'mins');

    const fcr = find(productivityKPIs, 'First Contact Resolution');
    addKpi(kpis, 'first_contact_resolution', fcr?.current ?? '', fcr?.target ?? '', '%');

    const cph = find(productivityKPIs, 'Calls Per Hour');
    addKpi(kpis, 'productivity', cph?.current ?? '', cph?.target ?? '', 'calls/hr');

    const qScore = find(qualityKPIs, 'Quality Score %');
    addKpi(kpis, 'quality_score', qScore?.current ?? '', qScore?.target ?? '', '%');

    const csat = find(qualityKPIs, 'CSAT Score');
    const nps = find(customerKPIs, 'NPS');
    // Prefer CSAT if present, else NPS, else omit.
    addKpi(
      kpis,
      'csat_or_nps',
      (csat?.current ?? nps?.current ?? '') as string,
      (csat?.target ?? nps?.target ?? '') as string,
      csat ? 'score' : 'nps',
    );

    addKpi(kpis, 'shrinkage', shrinkage, '', '%');
    addKpi(kpis, 'utilization', utilisation, '', '%');

    // Optional: keep JSON clean; if nothing filled, save an empty object (or omit).
    const mergedIntakeData = { ...existingIntakeData, kpis };
    const { ok, error: updateErr } = await updateEngagement({ intake_data: mergedIntakeData });
    if (!ok) {
      setSaveError(updateErr ?? 'Failed to save KPIs. Please try again.');
      setIsSaving(false);
      return;
    }

    await loadEngagement(engagementId);
    setIsSaving(false);
    onNext({ productivityKPIs, qualityKPIs, customerKPIs, shrinkage, utilisation });
  };

  const updateKPI = (section: 'productivity' | 'quality' | 'customer', index: number, field: keyof KPI, value: string) => {
    const setter = section === 'productivity' ? setProductivityKPIs : section === 'quality' ? setQualityKPIs : setCustomerKPIs;
    const kpis = section === 'productivity' ? productivityKPIs : section === 'quality' ? qualityKPIs : customerKPIs;
    const newKPIs = [...kpis];
    newKPIs[index] = { ...newKPIs[index], [field]: value };
    setter(newKPIs);
  };

  const KPITable = ({ kpis, section, title }: { kpis: KPI[]; section: 'productivity' | 'quality' | 'customer'; title: string }) => (
    <div>
      <h3 className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">{title}</h3>
      <div className="border border-[#161916]/8 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FFF0DC]">
            <tr>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                KPI Name
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Current Actual
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6D7069] uppercase tracking-wide">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi, index) => (
              <tr
                key={index}
                className={`${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'} border-t border-[#161916]/8`}
              >
                <td className="px-4 py-3 text-[14px] text-[#161916]">{kpi.name}</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={kpi.current}
                    onChange={(e) => updateKPI(section, index, 'current', e.target.value)}
                    className="w-20 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] text-right focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={kpi.target}
                    onChange={(e) => updateKPI(section, index, 'target', e.target.value)}
                    className="w-20 h-9 px-2 border border-[#161916]/20 rounded text-[14px] text-[#161916] text-right focus:border-[#FD4E59] focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="mt-2 text-[#FFAB28] text-[13px] font-medium underline flex items-center gap-1"
      >
        <Plus className="w-4 h-4" />
        Add KPI
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[22px] font-bold text-[#161916] mb-2">Key Performance Indicators</h2>
      <p className="text-[14px] text-[#494949] mb-8">
        Capture current actual and target values for the KPIs that matter most.
      </p>

      <div className="space-y-8">
        <KPITable kpis={productivityKPIs} section="productivity" title="Productivity KPIs" />
        <KPITable kpis={qualityKPIs} section="quality" title="Quality KPIs" />
        <KPITable kpis={customerKPIs} section="customer" title="Customer KPIs" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Shrinkage Rate
              <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            </label>
            <div className="relative">
              <input
                type="number"
                value={shrinkage}
                onChange={(e) => setShrinkage(e.target.value)}
                className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">%</span>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">
              Utilisation Rate
              <HelpCircle className="w-4 h-4 text-[#6D7069]" />
            </label>
            <div className="relative">
              <input
                type="number"
                value={utilisation}
                onChange={(e) => setUtilisation(e.target.value)}
                className="w-full h-11 px-4 border border-[#161916]/20 rounded-md text-[14px] text-[#161916] focus:border-[#FD4E59] focus:outline-none focus:ring-4 focus:ring-[#FD4E59]/15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6D7069]">%</span>
            </div>
          </div>
        </div>
      </div>

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
