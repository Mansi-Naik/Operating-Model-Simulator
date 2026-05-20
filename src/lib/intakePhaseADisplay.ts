import { domainLabelFromValue } from './intakeEngagementConstants';

const MS_PER_DAY = 86400000;
const DAYS_30 = 30 * MS_PER_DAY;

export function parseISODateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Ceiling of (end - today) / 30 days, minimum 0. */
export function remainingMonthsFromTodayToEnd(endIso: string): number | null {
  const end = parseISODateLocal(endIso);
  if (!end) return null;
  const today = startOfTodayLocal();
  const diff = end.getTime() - today.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAYS_30);
}

export function contractDatesOrderInvalid(startIso: string, endIso: string): boolean {
  const a = parseISODateLocal(startIso);
  const b = parseISODateLocal(endIso);
  if (!a || !b) return false;
  return b.getTime() <= a.getTime();
}

export function formatMonthYear(iso: string): string {
  const d = parseISODateLocal(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function formatMarginProfileForDisplay(code: string | null | undefined): string | null {
  if (!code || code === 'not_disclosed') return null;
  if (code === 'low') return 'Low margin';
  if (code === 'medium') return 'Medium margin';
  if (code === 'high') return 'High margin';
  return null;
}

export function formatDomainSubfunctionLine(
  domain: string | null | undefined,
  subFunction: string | null | undefined,
): string | null {
  const dom = String(domain ?? '').trim();
  const sub = String(subFunction ?? '').trim();
  if (!dom && !sub) return null;
  const dl = dom ? domainLabelFromValue(dom) : '';
  if (dl && sub) return `${dl} · ${sub}`;
  if (dl) return dl;
  if (sub) return sub;
  return null;
}

/** Short label for F7 headline chips, e.g. "14mo remaining". */
export function remainingMonthsChipLabel(endIso: string | null | undefined): string | null {
  const e = String(endIso ?? '').trim();
  if (!e) return null;
  const m = remainingMonthsFromTodayToEnd(e);
  if (m == null) return null;
  return `${m}mo remaining`;
}

export function formatContractPeriodSummary(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string | null {
  const s = String(startIso ?? '').trim();
  const e = String(endIso ?? '').trim();
  if (!s && !e) return null;
  const remaining = e ? remainingMonthsFromTodayToEnd(e) : null;
  const remPart = remaining != null ? ` · ${remaining} month${remaining === 1 ? '' : 's'} remaining` : '';

  if (s && e) {
    return `${formatMonthYear(s)} - ${formatMonthYear(e)}${remPart}`;
  }
  if (e) {
    return `Ends ${formatMonthYear(e)}${remPart}`;
  }
  return `Starts ${formatMonthYear(s)}`;
}
