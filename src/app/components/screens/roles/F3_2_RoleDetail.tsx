import { ChevronLeft, Eye, Download, Edit, Check, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEngagement } from '../../../../hooks/useEngagement';
import { updateF3RoleAcceptance } from '../../../../lib/f3AcceptanceClient';
import { getAcceptanceStatus } from '../../../../lib/f3RolesStorage';
import {
  DonutSegment,
  feasibilityChipClasses,
  feasibilityNarrativeLine,
  findAggregateForRole,
  findHierarchyRowForRole,
  findLatestRedesignForRole,
  getHierarchyRows,
  patternToBadgeClass,
  skillsFromHierarchyRow,
  taskLabelsFromTaskObjects,
  timeSplitToDonutSegments,
  topTaskLabelsFromAggregate,
} from '../../../../lib/f3RoleDetailHelpers';
import { supabase } from '../../../../supabaseClient';
import { DailyTimeBreakdownSection } from './DailyTimeBreakdownSection';

export interface F3_2_RoleDetailProps {
  onBack: () => void;
  roleName: string | null | undefined;
  engagementId?: string | null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim()).map((s) => s.trim());
}

export function F3_2_RoleDetail({ onBack, roleName, engagementId }: F3_2_RoleDetailProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const resolvedRole =
    roleName?.trim() ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null) ||
    '';

  const { loadEngagement } = useEngagement(activeEngagementId);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<Record<string, unknown> | null>(null);
  const [hierarchyRow, setHierarchyRow] = useState<Record<string, unknown> | null>(null);
  const [redesign, setRedesign] = useState<Record<string, unknown> | null>(null);
  const [sourceTasks, setSourceTasks] = useState<Record<string, unknown>[]>([]);
  const [allTasks, setAllTasks] = useState<Record<string, unknown>[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [acceptanceStatus, setAcceptanceStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    if (!activeEngagementId || !resolvedRole) {
      setLoading(false);
      setLoadError('Missing engagement or role.');
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const loaded = await loadEngagement(activeEngagementId);
        if (cancelled) return;

        const eng = loaded?.engagement as Record<string, unknown> | null;
        const rows = (Array.isArray(loaded?.tasks) ? loaded.tasks : []) as Record<string, unknown>[];
        const hierarchy = getHierarchyRows(eng);

        const agg = findAggregateForRole(rows, hierarchy, resolvedRole);
        const hi = findHierarchyRowForRole(hierarchy, resolvedRole);

        const { data: pr, error: prErr } = await supabase
          .from('pipeline_runs')
          .select('f3_roles')
          .eq('engagement_id', activeEngagementId)
          .maybeSingle();

        if (prErr) throw new Error(prErr.message);
        const rd = findLatestRedesignForRole(pr?.f3_roles, resolvedRole);

        const roleKey = (agg?.role_name ?? resolvedRole) as string;
        const filtered = rows.filter((t) => String(t.role_performing ?? '').trim() === String(roleKey).trim());

        if (!rd) setLoadError('No redesign found for this role. Run generation first.');
        setAggregate(agg);
        setHierarchyRow(hi);
        setRedesign(rd);
        setAcceptanceStatus(getAcceptanceStatus(rd));
        setSourceTasks(filtered);
        setAllTasks(rows);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load role detail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeEngagementId, resolvedRole, loadEngagement]);

  const todaySkills = useMemo(() => skillsFromHierarchyRow(hierarchyRow), [hierarchyRow]);
  const todayDonut = useMemo(() => {
    const split = aggregate?.current_time_split as Record<string, unknown> | undefined;
    return timeSplitToDonutSegments(split);
  }, [aggregate]);

  const futureDonut = useMemo(() => {
    const split = redesign?.future_time_split as Record<string, unknown> | undefined;
    return timeSplitToDonutSegments(split);
  }, [redesign]);

  const topTasksToday = useMemo(() => {
    if (!aggregate) return [];
    return topTaskLabelsFromAggregate(aggregate, 12);
  }, [aggregate]);

  const retainedTaskLabels = useMemo(() => {
    if (!aggregate) return [];
    const rt = aggregate.retained_tasks;
    return Array.isArray(rt) ? taskLabelsFromTaskObjects(rt as Record<string, unknown>[]) : [];
  }, [aggregate]);

  const lostTaskLabels = useMemo(() => {
    if (!aggregate) return [];
    const lt = aggregate.lost_tasks;
    return Array.isArray(lt) ? taskLabelsFromTaskObjects(lt as Record<string, unknown>[]) : [];
  }, [aggregate]);

  const newTasks = useMemo(() => asStringArray(redesign?.new_tasks_added), [redesign]);
  const skillsRetained = useMemo(() => asStringArray(redesign?.skills_retained), [redesign]);
  const skillsAdded = useMemo(() => asStringArray(redesign?.skills_added), [redesign]);

  const displayRoleName =
    (typeof aggregate?.role_name === 'string' && aggregate.role_name.trim()) || resolvedRole || 'Role';
  const futureTitle = String(redesign?.future_role_name ?? displayRoleName);
  const patternStr = String(redesign?.pattern ?? aggregate?.pattern ?? 'minor_evolution');
  const badge = patternToBadgeClass(patternStr);

  const transitionNarrative = typeof redesign?.transition_narrative === 'string' ? redesign.transition_narrative : '';
  const dayInLife = typeof redesign?.day_in_the_life === 'string' ? redesign.day_in_the_life : '';
  const feasibilityScore = Math.round(
    typeof redesign?.feasibility_score === 'number' ? redesign.feasibility_score : Number(redesign?.feasibility_score) || 0,
  );
  const feasibilityStatus = String(redesign?.feasibility_status ?? 'mixed');
  const keyRisks = asStringArray(redesign?.key_transition_risks);

  const feasibilityNarrative = feasibilityNarrativeLine(feasibilityStatus, patternStr);
  const risksText = keyRisks.length > 0 ? keyRisks.join(' ') : '—';

  const handleAcceptance = useCallback(
    async (status: 'accepted' | 'rejected' | 'pending') => {
      if (!activeEngagementId || !resolvedRole || actionBusy) return;
      if (status === 'rejected') {
        const ok = window.confirm('Reject this role? It will be excluded from downstream features.');
        if (!ok) return;
      }
      setActionBusy(true);
      try {
        await updateF3RoleAcceptance(activeEngagementId, 'redesign', resolvedRole, status);
        setAcceptanceStatus(status);
        if (status === 'accepted') toast.success('Role accepted');
        else if (status === 'rejected') toast.success('Role rejected');
        else toast.message('Role moved back to pending');
        if (status === 'rejected') onBack();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update role');
      } finally {
        setActionBusy(false);
      }
    },
    [activeEngagementId, resolvedRole, actionBusy, onBack],
  );

  const DonutChart = ({ segments, showChanges = false }: { segments: DonutSegment[]; showChanges?: boolean }) => {
    let cumulativePercent = 0;

    return (
      <div className="flex flex-col items-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="mb-4">
          <circle cx="80" cy="80" r="70" fill="white" />
          {segments.map((segment, idx) => {
            const startAngle = (cumulativePercent / 100) * 360 - 90;
            const endAngle = ((cumulativePercent + segment.percent) / 100) * 360 - 90;
            cumulativePercent += segment.percent;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 80 + 70 * Math.cos(startRad);
            const y1 = 80 + 70 * Math.sin(startRad);
            const x2 = 80 + 70 * Math.cos(endRad);
            const y2 = 80 + 70 * Math.sin(endRad);

            const x1Inner = 80 + 45 * Math.cos(startRad);
            const y1Inner = 80 + 45 * Math.sin(startRad);
            const x2Inner = 80 + 45 * Math.cos(endRad);
            const y2Inner = 80 + 45 * Math.sin(endRad);

            const largeArc = segment.percent > 50 ? 1 : 0;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A 45 45 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`}
                fill={segment.outlined ? 'none' : segment.color}
                stroke={segment.outlined ? segment.color : 'none'}
                strokeWidth={segment.outlined ? 2 : 0}
              />
            );
          })}
        </svg>

        <div className="space-y-2 w-full">
          {segments.map((segment, idx) => (
            <div key={idx} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: segment.outlined ? 'transparent' : segment.color,
                    border: segment.outlined ? `2px solid ${segment.color}` : 'none',
                  }}
                />
                <span className="text-[#161916]">{segment.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#161916]">{segment.percent}%</span>
                {showChanges && segment.change && (
                  <div
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      segment.changeType === 'up'
                        ? 'bg-[#4CAF50]/20 text-[#4CAF50]'
                        : segment.changeType === 'down'
                          ? 'bg-[#FD4E59]/20 text-[#FD4E59]'
                          : segment.changeType === 'new'
                            ? 'bg-[#FFAB28] text-white'
                            : 'bg-[#6D7069]/20 text-[#6D7069]'
                    }`}
                  >
                    {segment.changeType === 'up' && '↑ '}
                    {segment.changeType === 'down' && '↓ '}
                    {segment.changeType === 'new' && '+ '}
                    {segment.change}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#494949] hover:text-[#161916] mb-4 text-[14px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to roles grid
        </button>
        <p className="text-[14px] text-[#494949]">Loading role detail…</p>
      </div>
    );
  }

  return (
    <div className="p-10">
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
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-[#161916]">{displayRoleName}</h1>
          <div
            className="px-3 py-1 text-[11px] font-semibold uppercase rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSourceModal(true)}
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Show source data
          </button>
          <button
            type="button"
            title="Coming soon"
            className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export role spec
          </button>
          <button
            type="button"
            disabled
            className="h-9 px-4 border border-[#FD4E59] text-[#FD4E59] text-[13px] font-medium rounded-md opacity-50 cursor-not-allowed flex items-center gap-2 pointer-events-none"
          >
            <Edit className="w-4 h-4" />
            Edit redesign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-white text-[#6D7069] text-[11px] font-semibold uppercase rounded-full">TODAY</div>
            <span className="text-[12px] text-[#6D7069]">Current state</span>
          </div>

          <h3 className="text-[18px] font-bold text-[#161916] mb-6">{displayRoleName}</h3>

          <div className="mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-4">Time split</div>
            {todayDonut.length > 0 ? (
              <DonutChart segments={todayDonut} />
            ) : (
              <p className="text-[13px] text-[#494949]">No time split data.</p>
            )}
          </div>

          <div className="pt-6 border-t border-[#494949]/12 mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Top tasks</div>
            <div className="space-y-2">
              {topTasksToday.length > 0 ? (
                topTasksToday.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                    <span className="text-[#6D7069] mt-1">•</span>
                    {task}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">No tasks for this role.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[#494949]/12">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Skills</div>
            <div className="space-y-2">
              {todaySkills.length > 0 ? (
                todaySkills.map((skill, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-[#FFF0DC] text-[#161916] text-[13px] rounded inline-block mr-2">
                    {skill}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">No skills listed on the hierarchy row for this role.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-[#FD4E59] text-white text-[11px] font-semibold uppercase rounded-full">FUTURE</div>
            <span className="text-[12px] text-[#FD4E59]">Redesigned</span>
          </div>

          <h3 className="text-[18px] font-bold text-[#161916] mb-6">{futureTitle}</h3>

          <div className="mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-4">Time split</div>
            {futureDonut.length > 0 ? (
              <DonutChart segments={futureDonut} showChanges={true} />
            ) : (
              <p className="text-[13px] text-[#494949]">No future time split.</p>
            )}
          </div>

          <div className="pt-6 border-t border-[#494949]/12 mb-6">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Tasks retained</div>
            <div className="space-y-2 mb-4">
              {retainedTaskLabels.length > 0 ? (
                retainedTaskLabels.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                    <span className="text-[#6D7069] mt-1">•</span>
                    {task}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">—</p>
              )}
            </div>

            <div className="text-[13px] font-semibold text-[#FFAB28] uppercase tracking-wide mb-2">New tasks</div>
            <div className="space-y-2 mb-4">
              {newTasks.length > 0 ? (
                newTasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[14px] text-[#161916]">
                    <Plus className="w-4 h-4 text-[#FFAB28] mt-0.5" />
                    {task}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#494949]">—</p>
              )}
            </div>

            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Tasks lost</div>
            {lostTaskLabels.length > 0 ? (
              <div className="space-y-2">
                {lostTaskLabels.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[14px] text-[#6D7069] line-through">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    {task}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#494949]">—</p>
            )}
          </div>

          <div className="pt-6 border-t border-[#494949]/12">
            <div className="text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide mb-3">Skills</div>
            <div className="space-y-2">
              {skillsRetained.map((skill, idx) => (
                <div key={`r-${idx}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFF0DC] rounded mr-2 mb-2">
                  <Check className="w-3.5 h-3.5 text-[#4CAF50]" />
                  <span className="text-[13px] text-[#161916]">{skill}</span>
                </div>
              ))}
              {skillsAdded.map((skill, idx) => (
                <div key={`a-${idx}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFF0DC] rounded mr-2 mb-2">
                  <Plus className="w-3.5 h-3.5 text-[#FFAB28]" />
                  <span className="text-[13px] text-[#FFAB28]">{skill}</span>
                </div>
              ))}
              {skillsRetained.length === 0 && skillsAdded.length === 0 ? (
                <p className="text-[13px] text-[#494949]">—</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#FFF0DC] border-l-[3px] border-[#FD4E59] rounded-xl p-5 mb-6">
        <div className="text-[11px] font-bold text-[#FD4E59] uppercase tracking-wide mb-2">Transition Narrative</div>
        <p className="text-[16px] text-[#161916] italic">{transitionNarrative || '—'}</p>
      </div>

      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-5 mb-6">
        <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-2">Day in the Life</div>
        <p className="text-[14px] text-[#494949] leading-relaxed">{dayInLife || '—'}</p>
        {redesign ? (
          <DailyTimeBreakdownSection
            role={{
              ...redesign,
              role_name: displayRoleName,
              headcount_current: aggregate?.current_headcount,
            }}
            tasks={allTasks}
            isEmergent={false}
          />
        ) : null}
      </div>

      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[16px] font-bold text-[#161916]">Transition feasibility</span>
          <span className="text-[28px] font-bold text-[#161916]">{feasibilityScore}%</span>
          <div className={`px-3 py-1 text-[11px] font-semibold uppercase rounded-full ${feasibilityChipClasses(feasibilityStatus)}`}>
            {feasibilityStatus.toUpperCase()}
          </div>
        </div>
        <p className="text-[14px] text-[#494949] mb-3">{feasibilityNarrative}</p>
        <div>
          <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">Key risks</div>
          <p className="text-[13px] text-[#494949]">{risksText}</p>
        </div>
      </div>

      {acceptanceStatus !== 'rejected' ? (
        <div className="flex items-center justify-end gap-3 mb-8 mt-6">
          {acceptanceStatus === 'accepted' ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleAcceptance('pending')}
              className="text-[14px] text-[#6D7069] font-medium hover:underline disabled:opacity-50"
            >
              Reconsider
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleAcceptance('rejected')}
                className="text-[14px] text-[#FD4E59] font-medium hover:underline flex items-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject role
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleAcceptance('accepted')}
                className="h-10 px-6 bg-[#FD4E59] text-white text-[14px] font-semibold rounded-md hover:bg-[#FD4E59]/90 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Accept role
              </button>
            </>
          )}
        </div>
      ) : null}

      {showSourceModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSourceModal(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl border border-[#494949]/12 max-w-[720px] w-full max-h-[85vh] overflow-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="f3-source-title"
          >
            <div className="p-6 border-b border-[#494949]/12 flex items-center justify-between">
              <h2 id="f3-source-title" className="text-[18px] font-bold text-[#161916]">
                F2 task allocations ({sourceTasks.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="h-9 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-[#494949]/5"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {sourceTasks.length === 0 ? (
                <p className="text-[14px] text-[#494949]">No tasks for this role.</p>
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-[#6D7069] border-b border-[#494949]/12">
                      <th className="py-2 pr-4 font-semibold">Task</th>
                      <th className="py-2 pr-4 font-semibold">AI allocation</th>
                      <th className="py-2 font-semibold">User override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceTasks.map((t) => (
                      <tr key={String(t.id ?? t.task_id)} className="border-b border-[#494949]/08 text-[#161916]">
                        <td className="py-2 pr-4">{String(t.task_name ?? t.task_id ?? '—')}</td>
                        <td className="py-2 pr-4">{String(t.ai_allocation ?? '—')}</td>
                        <td className="py-2">{String(t.user_allocation ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
