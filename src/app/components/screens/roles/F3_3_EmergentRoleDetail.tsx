import { ChevronLeft, Edit, Plus, X, Check, TrendingUp, Repeat } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { updateF3RoleAcceptance } from '../../../../lib/f3AcceptanceClient';
import { getAcceptanceStatus, normalizeF3Roles } from '../../../../lib/f3RolesStorage';
import { supabase } from '../../../../supabaseClient';

interface F3_3_EmergentRoleDetailProps {
  onBack: () => void;
  roleName?: string | null;
  engagementId?: string | null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim()).map((s) => s.trim());
}

function formatHeadcountFte(n: number): string {
  if (Number.isInteger(n)) return `${n} FTE`;
  return `${Math.round(n * 10) / 10} FTE`;
}

export function F3_3_EmergentRoleDetail({ onBack, roleName, engagementId }: F3_3_EmergentRoleDetailProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeId = engagementId ?? engagementIdFromUrl;
  const resolvedName = roleName?.trim() || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadRole = useCallback(async () => {
    if (!activeId || !resolvedName) {
      setLoadError('Missing engagement or role name.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('f3_roles')
      .eq('engagement_id', activeId)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setRow(null);
      setLoading(false);
      return;
    }

    const bundle = normalizeF3Roles(data?.f3_roles);
    const key = resolvedName.toLowerCase();
    const found = (bundle.emergent_roles as Record<string, unknown>[]).find(
      (r) => typeof r.name === 'string' && r.name.trim().toLowerCase() === key,
    );
    if (!found) setLoadError('Emergent role not found in pipeline.');
    setRow(found ?? null);
    setLoading(false);
  }, [activeId, resolvedName]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  const handleStatus = async (status: 'accepted' | 'rejected' | 'pending') => {
    if (!activeId || !resolvedName || actionBusy) return;
    if (status === 'rejected') {
      const ok = window.confirm('Reject this role? It will be excluded from downstream features.');
      if (!ok) return;
    }
    setActionBusy(true);
    try {
      await updateF3RoleAcceptance(activeId, 'emergent', resolvedName, status);
      if (status === 'accepted') toast.success('Role accepted');
      else if (status === 'rejected') toast.success('Role rejected');
      else toast.message('Role moved back to pending');
      if (status === 'rejected') onBack();
      else await loadRole();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <p className="text-[14px] text-[#494949]">Loading emergent role…</p>
      </div>
    );
  }

  const name = typeof row?.name === 'string' ? row.name : resolvedName;
  const whyNeeded = typeof row?.why_needed === 'string' ? row.why_needed : '';
  const hc = typeof row?.headcount_estimate === 'number' ? row.headcount_estimate : Number(row?.headcount_estimate);
  const headcount = Number.isFinite(hc) ? hc : 0;
  const sitsUnder = typeof row?.sits_under === 'string' ? row.sits_under : '—';
  const skills = asStringArray(row?.skills);
  const sourcing = asStringArray(row?.sourcing_options);
  const status = getAcceptanceStatus(row);

  return (
    <div className="p-10 flex justify-center">
      <div className="max-w-[880px] w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to roles grid
        </button>

        {loadError ? <p className="text-[14px] text-[#FD4E59] mb-4">{loadError}</p> : null}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1 bg-[#FFAB28] text-white text-[11px] font-bold uppercase rounded">
              NEW ROLE
            </div>
            <h1 className="text-[28px] font-bold text-[#161916]">{name}</h1>
            {status === 'accepted' ? (
              <span className="text-[12px] font-semibold text-[#4CAF50] uppercase">Accepted</span>
            ) : null}
          </div>
          <button
            type="button"
            disabled
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="bg-[#FFF0DC] border-l-4 border-[#FFAB28] rounded-xl p-8 mb-6">
          <div className="mb-8">
            <div className="text-[11px] font-bold text-[#FFAB28] uppercase tracking-wide mb-2">
              Why This Role Is Needed
            </div>
            <p className="text-[16px] text-[#161916] leading-relaxed">{whyNeeded || '—'}</p>
          </div>

          <div className="mb-8 pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Headcount Estimate</div>
            <div className="text-[32px] font-bold text-[#161916] mb-3">{formatHeadcountFte(headcount)}</div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide w-24">Sits Under</div>
              <span className="text-[14px] font-medium text-[#161916]">{sitsUnder}</span>
            </div>
          </div>

          <div className="mb-8 pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Key Skills</div>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 bg-white border border-[#494949]/12 rounded-lg text-[13px] text-[#161916] flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FFAB28]" />
                    {skill}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">—</p>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-[#494949]/12">
            <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Could Be Filled From</div>
            <div className="space-y-2">
              {sourcing.length > 0 ? (
                sourcing.map((opt, idx) => (
                  <div key={idx} className="bg-white border border-[#494949]/12 rounded-lg p-4 flex items-start gap-3">
                    {idx % 2 === 0 ? (
                      <TrendingUp className="w-5 h-5 text-[#FD4E59] flex-shrink-0 mt-0.5" />
                    ) : (
                      <Repeat className="w-5 h-5 text-[#FD4E59] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="text-[14px] font-medium text-[#161916]">{opt}</div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">—</p>
              )}
            </div>
          </div>
        </div>

        {status !== 'rejected' ? (
          <div className="flex items-center justify-end gap-3">
            {status === 'accepted' ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleStatus('pending')}
                className="text-[14px] text-[#6D7069] font-medium hover:underline disabled:opacity-50"
              >
                Reconsider
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleStatus('rejected')}
                  className="text-[14px] text-[#FD4E59] font-medium hover:underline flex items-center gap-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject role
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleStatus('accepted')}
                  className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Accept role
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
