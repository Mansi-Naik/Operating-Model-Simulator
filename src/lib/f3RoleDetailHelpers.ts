import { aggregateByRole } from './roleAggregation';
import { dedupeLatestRedesignsByRole, normalizeF3Roles } from './f3RolesStorage';

const DONUT_COLORS = ['#FD4E59', '#FFAB28', '#6D7069', '#548235', '#2E75B6'];

export interface DonutSegment {
  label: string;
  percent: number;
  color: string;
  outlined?: boolean;
  change?: string;
  changeType?: 'up' | 'down' | 'same' | 'new';
}

function hierarchyRoleName(row: Record<string, unknown>): string {
  const n = row.role ?? row.name ?? row.role_name;
  return typeof n === 'string' ? n.trim() : '';
}

export function getHierarchyRows(engagement: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
  const intake = engagement?.intake_data;
  if (!intake || typeof intake !== 'object' || Array.isArray(intake)) return [];
  const h = (intake as Record<string, unknown>).hierarchy;
  return Array.isArray(h) ? (h as Record<string, unknown>[]) : [];
}

export function findHierarchyRowForRole(
  hierarchy: Record<string, unknown>[],
  roleName: string,
): Record<string, unknown> | null {
  const target = roleName.trim().toLowerCase();
  for (const row of hierarchy) {
    if (hierarchyRoleName(row).toLowerCase() === target) return row;
  }
  return null;
}

/**
 * Best-effort skills / responsibilities from a hierarchy row.
 */
export function skillsFromHierarchyRow(row: Record<string, unknown> | null): string[] {
  if (!row) return [];
  const keys = ['skills', 'responsibilities', 'current_responsibilities', 'role_skills'] as const;
  for (const key of keys) {
    const v = row[key];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      return (v as string[]).map((s) => s.trim()).filter(Boolean);
    }
    if (typeof v === 'string' && v.trim()) return [v.trim()];
  }
  return [];
}

export function taskLabel(task: Record<string, unknown>): string {
  const tn = task.task_name;
  const tid = task.task_id;
  if (typeof tn === 'string' && tn.trim()) return tn.trim();
  if (typeof tid === 'string' && tid.trim()) return tid.trim();
  return 'Task';
}

function taskMinutes(task: Record<string, unknown>): number {
  const vol = task.volume_per_day;
  const avg = task.avg_time_minutes;
  const v = typeof vol === 'number' ? vol : Number(vol);
  const a = typeof avg === 'number' ? avg : Number(avg);
  const vn = Number.isFinite(v) && v >= 0 ? v : 0;
  const an = Number.isFinite(a) && a >= 0 ? a : 0;
  return vn * an;
}

export function topTaskLabelsFromAggregate(aggregate: Record<string, unknown>, limit = 8): string[] {
  const retained = Array.isArray(aggregate.retained_tasks) ? (aggregate.retained_tasks as Record<string, unknown>[]) : [];
  const lost = Array.isArray(aggregate.lost_tasks) ? (aggregate.lost_tasks as Record<string, unknown>[]) : [];
  const all = [...retained, ...lost].filter((t) => t && typeof t === 'object');
  all.sort((a, b) => taskMinutes(b) - taskMinutes(a));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of all) {
    const lab = taskLabel(t);
    if (seen.has(lab)) continue;
    seen.add(lab);
    out.push(lab);
    if (out.length >= limit) break;
  }
  return out;
}

export function taskLabelsFromTaskObjects(tasks: Record<string, unknown>[]): string[] {
  return tasks.map((t) => taskLabel(t));
}

export function timeSplitToDonutSegments(split: Record<string, unknown> | null | undefined): DonutSegment[] {
  if (!split || typeof split !== 'object') return [];
  const entries = Object.entries(split).filter(([, p]) => {
    const n = typeof p === 'number' ? p : Number(p);
    return Number.isFinite(n) && n > 0;
  });
  if (entries.length === 0) return [];
  return entries.map(([label, pct], i) => {
    const n = typeof pct === 'number' ? pct : Number(pct);
    const percent = Math.round(n * 10) / 10;
    return {
      label,
      percent,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      outlined: i === entries.length - 1 && entries.length > 1,
    };
  });
}

export function findAggregateForRole(
  tasks: Record<string, unknown>[],
  hierarchy: Record<string, unknown>[],
  roleName: string,
): Record<string, unknown> | null {
  const list = aggregateByRole(tasks, hierarchy);
  const target = roleName.trim().toLowerCase();
  const hit =
    list.find((a) => String(a.role_name).trim().toLowerCase() === target) ??
    list.find((a) => String(a.role_name).trim() === roleName.trim());
  return hit ? (hit as unknown as Record<string, unknown>) : null;
}

export function findLatestRedesignForRole(
  f3RolesRaw: unknown,
  roleName: string,
): Record<string, unknown> | null {
  const bundle = normalizeF3Roles(f3RolesRaw);
  const rows = dedupeLatestRedesignsByRole(bundle.redesigns as Record<string, unknown>[]);
  const target = roleName.trim().toLowerCase();
  const row = rows.find((r) => String(r.role_name ?? '').trim().toLowerCase() === target);
  return row ? (row as Record<string, unknown>) : null;
}

export function patternToBadgeClass(pattern: string): { bg: string; text: string; label: string } {
  const p = String(pattern || '')
    .toLowerCase()
    .replace(/-/g, '_');
  const map: Record<string, { bg: string; text: string; label: string }> = {
    minor_evolution: { bg: '#E2EFDA', text: '#548235', label: 'MINOR EVOLUTION' },
    meaningful_shift: { bg: '#DEEBF7', text: '#2E75B6', label: 'MEANINGFUL SHIFT' },
    transformation: { bg: '#FFF0DC', text: '#FFAB28', label: 'TRANSFORMATION' },
    redefinition: { bg: '#FCE4D6', text: '#FD4E59', label: 'REDEFINITION' },
  };
  return map[p] ?? map.minor_evolution;
}

export function feasibilityChipClasses(status: string): string {
  const s = String(status || '').toLowerCase();
  if (s === 'high') return 'bg-[#E2EFDA] text-[#548235]';
  if (s === 'low') return 'bg-[#FCE4D6] text-[#FD4E59]';
  return 'bg-[#FFF0DC] text-[#FFAB28]';
}

export function feasibilityNarrativeLine(status: string, pattern: string): string {
  const st = String(status || 'mixed').toLowerCase();
  const pat = String(pattern || 'minor_evolution').replace(/-/g, '_');
  return `Readiness is ${st} given a ${pat.replace(/_/g, ' ')} pattern and the skill mix in the redesign.`;
}
