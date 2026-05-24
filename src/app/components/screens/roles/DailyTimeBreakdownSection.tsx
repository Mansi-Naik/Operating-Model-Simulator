import { useMemo } from 'react';
import { computeDailyTimeBreakdown, formatShiftMinutes } from '../../../../lib/roleAggregation';

type ActivityType = 'productive' | 'overhead' | 'development';

const TYPE_TOOLTIPS: Record<ActivityType, string> = {
  productive:
    'Future-state role work after automation. Assisted tasks count at roughly half the original effort; fully automated tasks are excluded.',
  overhead: 'Fixed shift overhead: team standup, status updates, breaks, and context-switching buffer.',
  development: 'Coaching, training, and skill-building time typical for this shift.',
};

function typeDot(type: ActivityType) {
  if (type === 'productive') {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FD4E59]" aria-hidden />;
  }
  if (type === 'development') {
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full border border-[#FFAB28] bg-[#FFAB28]/50"
        aria-hidden
      />
    );
  }
  return (
    <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-[#6D7069] bg-transparent" aria-hidden />
  );
}

function typeLabel(type: ActivityType): string {
  if (type === 'productive') return 'Productive';
  if (type === 'development') return 'Development';
  return 'Overhead';
}

export interface DailyTimeBreakdownSectionProps {
  role: Record<string, unknown> | null | undefined;
  tasks?: Record<string, unknown>[] | null;
  isEmergent?: boolean;
}

export function DailyTimeBreakdownSection({ role, tasks, isEmergent = false }: DailyTimeBreakdownSectionProps) {
  const breakdown = useMemo(
    () => computeDailyTimeBreakdown(role, tasks ?? [], Boolean(isEmergent)),
    [role, tasks, isEmergent],
  );

  const productiveHours = (breakdown.productive_minutes / 60).toFixed(1).replace(/\.0$/, '');
  const overheadHours = (breakdown.overhead_minutes / 60).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="mt-5 pt-5 border-t border-[#494949]/12">
      <div className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide mb-1">
        Daily time breakdown
      </div>
      <p className="text-[12px] text-[#6D7069] mb-4">
        9-hour shift · {productiveHours}h productive · {overheadHours}h overhead
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] font-semibold text-[#6D7069] uppercase tracking-wide border-b border-[#494949]/12">
              <th className="text-left py-2 pr-4 font-semibold">Activity</th>
              <th className="text-right py-2 pr-4 font-semibold w-[88px]">Time</th>
              <th className="text-right py-2 font-semibold w-[100px]">Type</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.activities.map((activity, idx) => {
              const actType = activity.type as ActivityType;
              return (
                <tr
                  key={`${activity.name}-${idx}`}
                  className="border-b border-[#494949]/08 text-[#161916]"
                  title={TYPE_TOOLTIPS[actType]}
                >
                  <td className="py-2.5 pr-4 align-middle">{activity.name}</td>
                  <td className="py-2.5 pr-4 text-right align-middle tabular-nums text-[#161916]">
                    {formatShiftMinutes(activity.minutes)}
                  </td>
                  <td className="py-2.5 text-right align-middle">
                    <span className="inline-flex items-center justify-end gap-2 text-[12px] text-[#494949]">
                      {typeDot(actType)}
                      <span className="sr-only">{typeLabel(actType)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-[#494949]/20 font-semibold text-[#161916]">
              <td className="py-3 pr-4">Total</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatShiftMinutes(breakdown.total_shift_minutes)}</td>
              <td className="py-3" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-[#6D7069]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#FD4E59]" />
          Productive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full border-2 border-[#6D7069]" />
          Overhead
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full border border-[#FFAB28] bg-[#FFAB28]/50" />
          Development
        </span>
      </div>
    </div>
  );
}
