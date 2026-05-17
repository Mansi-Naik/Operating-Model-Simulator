import { Settings, ChevronDown, Lock, Sparkles, Edit2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PipelineReRunButton } from '../../PipelineReRunButton';
import { useEngagement } from '../../../../hooks/useEngagement';
import { usePipelineRuns } from '../../../../hooks/usePipelineRuns';
import { generateAdvisories } from '../../../../lib/advisoryGeneration';
import { F2_4_Advisories } from './F2_4_Advisories';

interface Task {
  id: string;
  number: string;
  task: string;
  role: string;
  recommended: 'AUTO' | 'ASSIST' | 'HUMAN';
  confidence: number | null;
  confidenceText: string;
  source: 'AI' | 'USER' | 'LOCKED' | 'DEFAULT';
  isLocked?: boolean;
  allocationValue: 'tech-automated' | 'tech-assisted' | 'human-only';
}

interface F2_2_MatrixViewProps {
  onTaskClick: (taskId: string) => void;
  onReRun: () => void;
  onBack?: () => void;
  onProceedToF3?: () => void;
  engagementId?: string | null;
  generationResult?: { processedTaskIds: string[]; failedTaskIds: string[]; total: number } | null;
}

function finalAllocation(row: any): string {
  const user = typeof row?.user_allocation === 'string' ? row.user_allocation.trim() : '';
  if (user) return user;
  return typeof row?.ai_allocation === 'string' ? row.ai_allocation.trim() : '';
}

function effectiveAllocation(row: any): 'tech-automated' | 'tech-assisted' | 'human-only' {
  const alloc = finalAllocation(row).toLowerCase();
  if (alloc === 'tech-automated' || alloc === 'tech-assisted' || alloc === 'human-only') return alloc;
  return 'human-only';
}

export function F2_2_MatrixView({
  onTaskClick,
  onReRun,
  onBack,
  onProceedToF3,
  engagementId,
  generationResult,
}: F2_2_MatrixViewProps) {
  const engagementIdFromUrl =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('engagementId') : null;
  const activeEngagementId = engagementId ?? engagementIdFromUrl;
  const { engagement, tasks: dbTasks, loadEngagement, loading: engagementLoading } =
    useEngagement(activeEngagementId);
  const { f2_data, f2_exists, isLoading: pipelineLoading } = usePipelineRuns(activeEngagementId);

  useEffect(() => {
    if (pipelineLoading || !activeEngagementId) return;
    const hasLocalTasks = Array.isArray(dbTasks) && dbTasks.length > 0;
    if (!hasLocalTasks && f2_data?.tasks?.length) {
      void loadEngagement(activeEngagementId);
    }
  }, [pipelineLoading, activeEngagementId, dbTasks, f2_data, loadEngagement]);
  const automationAppetite = useMemo(() => {
    const intake = engagement?.intake_data;
    const pref =
      intake && typeof intake === 'object' && (intake as any).preferences && typeof (intake as any).preferences === 'object'
        ? (intake as any).preferences
        : null;
    return typeof pref?.automation_appetite === 'string' ? pref.automation_appetite : 'Balanced';
  }, [engagement?.intake_data]);
  const [roleFilter, setRoleFilter] = useState('All');
  const [confidenceFilter, setConfidenceFilter] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Overridden'>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'AI' | 'USER' | 'LOCKED'>('All');
  const [allocationFilter, setAllocationFilter] = useState<'All' | 'AUTO' | 'ASSIST' | 'HUMAN'>('All');
  const [showAdvisoriesExpanded, setShowAdvisoriesExpanded] = useState(false);

  const tasksForAdvisories = useMemo(() => {
    return (Array.isArray(dbTasks) ? dbTasks : []).filter((row: any) => finalAllocation(row));
  }, [dbTasks]);

  const advisories = useMemo(() => {
    if (tasksForAdvisories.length === 0) return [];
    return generateAdvisories(
      tasksForAdvisories as Record<string, unknown>[],
      (engagement ?? null) as Record<string, unknown> | null,
    );
  }, [tasksForAdvisories, engagement]);

  const advisoryTitlesPreview = useMemo(() => {
    if (advisories.length === 0) return '';
    return advisories.map((a) => a.title).join(', ');
  }, [advisories]);

  const tasks: Task[] = useMemo(() => {
    const source = Array.isArray(dbTasks) ? dbTasks : [];
    return source.map((row: any, index: number) => {
      const chosenAlloc = effectiveAllocation(row);
      const isLocked = row?.regulatory_constraint === true;
      const hasUserOverride = typeof row?.user_allocation === 'string' && row.user_allocation.trim().length > 0;
      const hasAiAllocation = typeof row?.ai_allocation === 'string' && row.ai_allocation.trim().length > 0;
      const recommended: Task['recommended'] =
        isLocked || chosenAlloc === 'human-only'
          ? 'HUMAN'
          : chosenAlloc === 'tech-assisted'
          ? 'ASSIST'
          : chosenAlloc === 'tech-automated'
          ? 'AUTO'
          : 'HUMAN';
      const confRaw =
        typeof row?.ai_confidence_calibrated === 'number'
          ? row.ai_confidence_calibrated
          : typeof row?.ai_confidence_raw === 'number'
          ? row.ai_confidence_raw
          : null;
      const confidence = hasUserOverride || confRaw == null ? null : Math.round(Math.max(0, Math.min(1, confRaw)) * 100);
      const sourceLabel: Task['source'] = isLocked
        ? 'LOCKED'
        : hasUserOverride
        ? 'USER'
        : hasAiAllocation
        ? 'AI'
        : 'DEFAULT';
      return {
        id: String(row?.id ?? `row-${index}`),
        number: String(index + 1).padStart(2, '0'),
        task: (row?.task_name ?? '').trim() || '(unnamed task)',
        role: row?.role_performing ?? '—',
        recommended,
        confidence,
        confidenceText: confidence == null ? '—' : `${confidence}%`,
        source: sourceLabel,
        isLocked,
        allocationValue: recommended === 'AUTO' ? 'tech-automated' : recommended === 'ASSIST' ? 'tech-assisted' : 'human-only',
      };
    });
  }, [dbTasks]);
  const allTaskRows = Array.isArray(dbTasks) ? dbTasks : [];
  const fallbackCount = allTaskRows.filter((row: any) => {
    if (finalAllocation(row)) return false;
    if (row?.regulatory_constraint === true) return false;
    return true;
  }).length;
  const savedAllocationCount = allTaskRows.length - fallbackCount;
  const generationHadResults = (generationResult?.processedTaskIds?.length ?? 0) > 0;
  const hasPersistedF2 = f2_exists || generationHadResults;
  const isLoadingData =
    engagementLoading || (pipelineLoading && allTaskRows.length === 0 && Boolean(f2_data?.tasks?.length));
  const canProceedToF3 =
    allTaskRows.length > 0 && !isLoadingData && (fallbackCount === 0 || hasPersistedF2);
  const roleOptions = useMemo(() => ['All', ...Array.from(new Set(tasks.map((t) => t.role)))], [tasks]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (roleFilter !== 'All' && t.role !== roleFilter) return false;
      if (sourceFilter !== 'All' && t.source !== sourceFilter) return false;
      if (allocationFilter !== 'All' && t.recommended !== allocationFilter) return false;
      if (confidenceFilter === 'High' && (t.confidence == null || t.confidence < 85)) return false;
      if (confidenceFilter === 'Medium' && (t.confidence == null || t.confidence < 70 || t.confidence >= 85)) return false;
      if (confidenceFilter === 'Low' && (t.confidence == null || t.confidence >= 70)) return false;
      if (confidenceFilter === 'Overridden' && t.confidence != null) return false;
      return true;
    });
  }, [tasks, roleFilter, sourceFilter, allocationFilter, confidenceFilter]);

  const getRecommendationChip = (rec: 'AUTO' | 'ASSIST' | 'HUMAN', isLocked?: boolean) => {
    const baseClass = 'px-3 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5';
    switch (rec) {
      case 'AUTO':
        return (
          <div className={`${baseClass} bg-[#E2EFDA] text-[#161916]`}>
            <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            {isLocked && <Lock className="w-3 h-3" />}
            AUTO
          </div>
        );
      case 'ASSIST':
        return (
          <div className={`${baseClass} bg-[#FFF0DC] text-[#161916]`}>
            <div className="w-2 h-2 rounded-full bg-[#FFAB28]" />
            {isLocked && <Lock className="w-3 h-3" />}
            ASSIST
          </div>
        );
      case 'HUMAN':
        return (
          <div className={`${baseClass} bg-[#FDF8F4] text-[#161916]`}>
            <div className="w-2 h-2 rounded-full bg-[#6D7069]" />
            {isLocked && <Lock className="w-3 h-3" />}
            HUMAN
          </div>
        );
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return 'text-[#4CAF50]';
    if (conf >= 70) return 'text-[#FFAB28]';
    return 'text-[#FD4E59]';
  };

  const getSourceIcon = (source: 'AI' | 'USER' | 'LOCKED' | 'DEFAULT') => {
    switch (source) {
      case 'AI':
        return (
          <div className="flex items-center gap-1 text-[#FFAB28]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[12px]">AI</span>
          </div>
        );
      case 'USER':
        return (
          <div className="flex items-center gap-1 text-[#FD4E59]">
            <Edit2 className="w-3.5 h-3.5" />
            <span className="text-[12px]">USER</span>
          </div>
        );
      case 'LOCKED':
        return (
          <div className="flex items-center gap-1 text-[#6D7069]">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[12px]">LOCKED</span>
          </div>
        );
      case 'DEFAULT':
        return (
          <div className="flex items-center gap-1 text-[#6D7069]">
            <span className="text-[12px]">DEFAULT</span>
          </div>
        );
    }
  };

  return (
    <div className="p-10">
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

      {/* Top Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] text-[#161916]">ALLOCATION MATRIX</div>
        <div className="flex items-center gap-2">
          <PipelineReRunButton onConfirmRerun={onReRun} />
          <button className="h-9 px-3 border border-[#494949]/30 text-[#494949] rounded-md hover:bg-[#494949]/5">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#161916]">Allocation matrix</h1>
        <p className="text-[13px] text-[#6D7069]">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} · Generated just now
        </p>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#FDF8F4] border border-[#494949]/12 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#6D7069]">Appetite:</span>
            <button className="h-9 px-3 bg-white border border-[#494949]/20 rounded-md text-[13px] text-[#161916] flex items-center gap-2 hover:bg-[#FDF8F4]">
              {String(automationAppetite).charAt(0).toUpperCase() + String(automationAppetite).slice(1)}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="w-px h-6 bg-[#494949]/20" />
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#6D7069]">Filters:</span>
            <button
              onClick={() => {
                const idx = roleOptions.indexOf(roleFilter);
                setRoleFilter(roleOptions[(idx + 1) % roleOptions.length]);
              }}
              className="h-8 px-3 bg-white border border-[#494949]/30 rounded text-[13px] text-[#161916] flex items-center gap-1.5 hover:bg-[#FDF8F4]"
            >
              Role: {roleFilter}
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const options: Array<'All' | 'High' | 'Medium' | 'Low' | 'Overridden'> = ['All', 'High', 'Medium', 'Low', 'Overridden'];
                const idx = options.indexOf(confidenceFilter);
                setConfidenceFilter(options[(idx + 1) % options.length]);
              }}
              className="h-8 px-3 bg-white border border-[#494949]/30 rounded text-[13px] text-[#161916] flex items-center gap-1.5 hover:bg-[#FDF8F4]"
            >
              Confidence: {confidenceFilter}
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const options: Array<'All' | 'AI' | 'USER' | 'LOCKED'> = ['All', 'AI', 'USER', 'LOCKED'];
                const idx = options.indexOf(sourceFilter);
                setSourceFilter(options[(idx + 1) % options.length]);
              }}
              className="h-8 px-3 bg-white border border-[#494949]/30 rounded text-[13px] text-[#161916] flex items-center gap-1.5 hover:bg-[#FDF8F4]"
            >
              Source: {sourceFilter}
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const options: Array<'All' | 'AUTO' | 'ASSIST' | 'HUMAN'> = ['All', 'AUTO', 'ASSIST', 'HUMAN'];
                const idx = options.indexOf(allocationFilter);
                setAllocationFilter(options[(idx + 1) % options.length]);
              }}
              className="h-8 px-3 bg-white border border-[#494949]/30 rounded text-[13px] text-[#161916] flex items-center gap-1.5 hover:bg-[#FDF8F4]"
            >
              Allocation: {allocationFilter}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
        <button className="text-[#494949]">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="h-12 border border-[#494949]/20 rounded-lg mb-4 flex divide-x divide-[#494949]/20">
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8F4]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="text-[18px] font-bold text-[#161916]">
              {tasks.filter((t) => t.recommended === 'AUTO').length}
            </span>
          </div>
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">Automated</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8F4]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FFAB28]" />
            <span className="text-[18px] font-bold text-[#161916]">
              {tasks.filter((t) => t.recommended === 'ASSIST').length}
            </span>
          </div>
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">Assisted</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8F4]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#6D7069]" />
            <span className="text-[18px] font-bold text-[#161916]">
              {tasks.filter((t) => t.recommended === 'HUMAN').length}
            </span>
          </div>
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">Human</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8F4]">
          <span className="text-[18px] font-bold text-[#161916]">
            {tasks.length > 0
              ? `${Math.round(
                  tasks.reduce((sum, t) => sum + (typeof t.confidence === 'number' ? t.confidence : 0), 0) /
                    Math.max(tasks.filter((t) => typeof t.confidence === 'number').length, 1),
                )}%`
              : '0%'}
          </span>
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">Avg Confidence</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8F4]">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#FFAB28]" />
            <span className="text-[18px] font-bold text-[#161916]">{advisories.length}</span>
          </div>
          <div className="text-[11px] text-[#6D7069] uppercase tracking-wide">Advisories</div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="border border-[#494949]/8 rounded-lg overflow-hidden mb-4 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-[#FDF8F4] border-b border-[#494949]/8">
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide w-16">#</th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide">Task</th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide w-32">Role</th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide w-40">Recommended</th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide w-32">Confidence</th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#6D7069] uppercase tracking-wide w-28">Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task, index) => (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={`border-b border-[#494949]/8 cursor-pointer hover:bg-[#FFF0DC] ${index % 2 === 1 ? 'bg-[#FDF8F4]' : 'bg-white'}`}
              >
                <td className="px-4 py-4 text-[14px] text-[#6D7069]">{task.number}</td>
                <td className="px-4 py-4 text-[14px] text-[#161916]">{task.task}</td>
                <td className="px-4 py-4">
                  <div className="px-3 py-1 bg-[#FFF0DC] rounded text-[13px] text-[#161916] inline-block">
                    {task.role}
                  </div>
                </td>
                <td className="px-4 py-4">{getRecommendationChip(task.recommended, task.isLocked)}</td>
                <td className="px-4 py-4">
                  <span
                    className={`text-[14px] font-semibold ${
                      typeof task.confidence === 'number' ? getConfidenceColor(task.confidence) : 'text-[#6D7069]'
                    }`}
                  >
                    {task.confidenceText}
                  </span>
                </td>
                <td className="px-4 py-4">{getSourceIcon(task.source)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Advisories Bar */}
      <div className="bg-[#FFF0DC] border-l-[3px] border-[#FFAB28] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <AlertTriangle className="w-5 h-5 text-[#FFAB28] shrink-0" />
          <div className="min-w-0">
            <span className="text-[14px] font-medium text-[#161916]">
              Advisories ({advisories.length})
            </span>
            {!showAdvisoriesExpanded && advisoryTitlesPreview ? (
              <span className="text-[13px] text-[#494949] ml-2">{advisoryTitlesPreview}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvisoriesExpanded((v) => !v)}
          className="h-8 px-4 border border-[#494949]/30 text-[#494949] text-[13px] rounded-md hover:bg-white flex items-center gap-2 shrink-0"
        >
          {showAdvisoriesExpanded ? 'Collapse' : 'Expand'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvisoriesExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showAdvisoriesExpanded ? (
        <F2_4_Advisories advisories={advisories} onCollapse={() => setShowAdvisoriesExpanded(false)} />
      ) : null}

      {/* Proceed to F3 */}
      {onProceedToF3 && (
        <div className="mt-8 flex flex-col items-end gap-2">
          {isLoadingData ? (
            <div className="text-[13px] text-[#6D7069]">
              Loading allocation results…
            </div>
          ) : !canProceedToF3 ? (
            <div className="text-[13px] text-[#6D7069]">
              Add tasks in intake before continuing to role redesign.
            </div>
          ) : fallbackCount > 0 ? (
            <div className="text-[13px] text-[#6D7069]">
              {fallbackCount} task{fallbackCount === 1 ? '' : 's'} show as HUMAN (default) with no saved AI allocation
              — you can continue or re-run to fill gaps. ({savedAllocationCount} of {allTaskRows.length}{' '}
              saved)
            </div>
          ) : null}
          <button
            onClick={onProceedToF3}
            disabled={!canProceedToF3}
            className="h-11 px-8 bg-[#FD4E59] text-white text-[15px] font-semibold rounded-lg hover:bg-[#FD4E59]/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            Proceed to Roles →
          </button>
        </div>
      )}
    </div>
  );
}
