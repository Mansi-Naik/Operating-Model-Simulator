import { aggregateByRole, getFinalAllocation } from './roleAggregation';
import { generateAdvisories } from './advisoryGeneration';

export type RolePatternKey = 'minor_evolution' | 'meaningful_shift' | 'transformation' | 'redefinition';

const PATTERN_ORDER: RolePatternKey[] = ['redefinition', 'transformation', 'meaningful_shift', 'minor_evolution'];

const PATTERN_LABEL: Record<RolePatternKey, { singular: string; plural: string }> = {
  redefinition: { singular: 'redefinition', plural: 'redefinitions' },
  transformation: { singular: 'transformation', plural: 'transformations' },
  meaningful_shift: { singular: 'meaningful shift', plural: 'meaningful shifts' },
  minor_evolution: { singular: 'minor evolution', plural: 'minor evolutions' },
};

/** Dot colors aligned with F3.1 pattern badges */
export const PATTERN_DOT_COLOR: Record<RolePatternKey, string> = {
  minor_evolution: '#548235',
  meaningful_shift: '#2E75B6',
  transformation: '#FFAB28',
  redefinition: '#FD4E59',
};

function isRolePatternKey(p: string): p is RolePatternKey {
  return (
    p === 'minor_evolution' ||
    p === 'meaningful_shift' ||
    p === 'transformation' ||
    p === 'redefinition'
  );
}

/**
 * True when every task row has a non-empty final allocation (F2 complete).
 * User overrides count because F2 treats them as the source of truth.
 */
export function tasksHaveF2Predictions(taskList: unknown[] | null | undefined): boolean {
  if (!Array.isArray(taskList) || taskList.length === 0) return false;
  return taskList.every((t) => {
    return getFinalAllocation(t as Record<string, unknown>).trim().length > 0;
  });
}

function getHierarchy(engagement: Record<string, unknown> | null | undefined): unknown[] {
  const intake = engagement?.intake_data;
  if (!intake || typeof intake !== 'object' || Array.isArray(intake)) return [];
  const h = (intake as Record<string, unknown>).hierarchy;
  return Array.isArray(h) ? h : [];
}

/**
 * Human-readable counts, e.g. "1 transformation, 2 minor evolutions".
 */
export function formatPatternCountSentence(counts: Partial<Record<RolePatternKey, number>>): string {
  const parts: string[] = [];
  for (const key of PATTERN_ORDER) {
    const n = counts[key] ?? 0;
    if (n <= 0) continue;
    const lab = PATTERN_LABEL[key];
    parts.push(`${n} ${n === 1 ? lab.singular : lab.plural}`);
  }
  if (parts.length === 0) {
    return 'No roles with assigned tasks in the hierarchy yet.';
  }
  return parts.join(', ');
}

export interface F3PreRunPreviewRow {
  color: string;
  label: string;
}

export interface F3PreRunPreview {
  patternSummary: string;
  previewRows: F3PreRunPreviewRow[];
  emergentHint: string;
  hasF2Predictions: boolean;
  roleNamesToRedesign: string[];
}

/**
 * Preview data for F3.0 from live tasks + engagement intake hierarchy.
 */
export function computeF3PreRunPreview(
  tasks: unknown[] | null | undefined,
  engagement: Record<string, unknown> | null | undefined,
): F3PreRunPreview {
  const list = Array.isArray(tasks) ? tasks : [];
  const hasF2Predictions = tasksHaveF2Predictions(list);

  const hierarchy = getHierarchy(engagement);
  const aggregates = aggregateByRole(
    list as Record<string, unknown>[],
    hierarchy as Record<string, unknown>[],
  );

  const active = aggregates.filter((a) => a.total_tasks_today > 0);
  const counts: Partial<Record<RolePatternKey, number>> = {};
  for (const a of active) {
    const p = String(a.pattern ?? '');
    const key = isRolePatternKey(p) ? p : 'minor_evolution';
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const patternSummary = formatPatternCountSentence(counts);

  const previewRows: F3PreRunPreviewRow[] = active.map((a) => {
    const p = String(a.pattern ?? '');
    const key = isRolePatternKey(p) ? p : 'minor_evolution';
    const roleName = String(a.role_name ?? '').trim() || 'Role';
    return {
      color: PATTERN_DOT_COLOR[key],
      label: `${roleName}: ${key.replace(/_/g, ' ')}`,
    };
  });

  const advisories = generateAdvisories(list as Record<string, unknown>[], engagement ?? null);
  const hasCapConc = advisories.some((a) => a.id === 'capability-concentration');
  const hasRoleHollow = advisories.some((a) => String(a.id).startsWith('role-hollowing'));

  let emergentHint =
    'Emergent roles are unlikely unless the redesign surfaces genuinely unowned work.';
  if (hasCapConc && hasRoleHollow) {
    emergentHint =
      'Emergent roles are more likely — your matrix shows capability concentration and role hollowing.';
  } else if (hasCapConc) {
    emergentHint =
      'Emergent roles may appear — your matrix shows capability concentration across automated tasks.';
  } else if (hasRoleHollow) {
    emergentHint =
      'Emergent roles may appear — your matrix shows role hollowing (heavy automation in at least one role).';
  }

  const roleNamesToRedesign = active.map((a) => String(a.role_name ?? '').trim()).filter(Boolean);

  return {
    patternSummary,
    previewRows,
    emergentHint,
    hasF2Predictions,
    roleNamesToRedesign,
  };
}
