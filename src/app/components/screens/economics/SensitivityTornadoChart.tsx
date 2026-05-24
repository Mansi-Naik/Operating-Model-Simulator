import { Info } from 'lucide-react';
import { useMemo } from 'react';

type SensitivityDriver = {
  name: string;
  low: number;
  base: number;
  high: number;
  lowLabel: string;
  baseLabel: string;
  highLabel: string;
};

function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtPct(value: number): string {
  const n = Math.round(value * 10) / 10;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}

function parseDrivers(drivers: Record<string, unknown>[]): SensitivityDriver[] {
  return drivers.map((driver) => ({
    name: String(driver.name ?? 'Driver'),
    low: toNum(driver.low_pct),
    base: toNum(driver.base_pct),
    high: toNum(driver.high_pct),
    lowLabel: String(driver.low_label ?? ''),
    baseLabel: String(driver.base_label ?? ''),
    highLabel: String(driver.high_label ?? ''),
  }));
}

function driverTooltip(driver: SensitivityDriver): string {
  const parts = [
    `Downside: ${driver.lowLabel || 'low'} → ${fmtPct(driver.low)} savings`,
    `Base: ${driver.baseLabel || 'base'} → ${fmtPct(driver.base)}`,
    `Upside: ${driver.highLabel || 'high'} → ${fmtPct(driver.high)}`,
  ];
  return parts.join(' · ');
}

interface SensitivityTornadoChartProps {
  drivers: Record<string, unknown>[];
}

export function SensitivityTornadoChart({ drivers }: SensitivityTornadoChartProps) {
  const parsed = useMemo(() => parseDrivers(drivers), [drivers]);

  const sorted = useMemo(
    () => [...parsed].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low)),
    [parsed],
  );

  const baseValue = useMemo(() => {
    const monthlyBase = parsed.find((d) => d.name !== 'Ramp speed')?.base;
    return monthlyBase ?? parsed[0]?.base ?? 0;
  }, [parsed]);

  const layout = useMemo(() => {
    const leftLabelWidth = 180;
    const chartWidth = 500;
    const infoColWidth = 36;
    const rowHeight = 60;
    const rowGap = 16;
    const topPadding = 44;
    const bottomPadding = 36;
    const svgWidth = leftLabelWidth + chartWidth + infoColWidth;
    const plotHeight = sorted.length * rowHeight + Math.max(0, sorted.length - 1) * rowGap;
    const svgHeight = topPadding + plotHeight + bottomPadding;

    const allValues = sorted.flatMap((d) => [d.low, d.high, d.base, baseValue]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const xMin = minVal - 2;
    const xMax = maxVal + 2;
    const xSpan = Math.max(0.001, xMax - xMin);

    const xScale = (value: number) => leftLabelWidth + ((value - xMin) / xSpan) * chartWidth;
    const rowCenterY = (index: number) => topPadding + index * (rowHeight + rowGap) + rowHeight / 2;

    return {
      leftLabelWidth,
      chartWidth,
      svgWidth,
      svgHeight,
      topPadding,
      plotHeight,
      xScale,
      rowCenterY,
      baseX: xScale(baseValue),
    };
  }, [sorted, baseValue]);

  if (sorted.length === 0) {
    return (
      <p className="text-[13px] text-[#6D7069]">No sensitivity drivers available for this scenario.</p>
    );
  }

  const axisY = layout.topPadding + layout.plotHeight + 12;

  return (
    <div className="w-full overflow-x-auto sm:overflow-visible">
      <svg
        viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
        className="w-full min-w-[320px] max-w-[760px]"
        role="img"
        aria-label="Sensitivity tornado chart showing savings range for top drivers"
      >
        <line
          x1={layout.baseX}
          y1={layout.topPadding - 8}
          x2={layout.baseX}
          y2={layout.topPadding + layout.plotHeight}
          stroke="#FD4E59"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
        <text
          x={layout.baseX}
          y={20}
          textAnchor="middle"
          fill="#FD4E59"
          fontSize={13}
          fontWeight={700}
          letterSpacing="0.04em"
        >
          BASE CASE: {fmtPct(baseValue)}
        </text>

        {sorted.map((driver, index) => {
          const y = layout.rowCenterY(index);
          const lowX = layout.xScale(Math.min(driver.low, driver.high));
          const highX = layout.xScale(Math.max(driver.low, driver.high));
          const barWidth = Math.max(2, highX - lowX);
          const downsideX = layout.xScale(driver.low);
          const upsideX = layout.xScale(driver.high);

          return (
            <g key={driver.name}>
              <text
                x={layout.leftLabelWidth - 12}
                y={y + 4}
                textAnchor="end"
                fill="#161916"
                fontSize={14}
                fontWeight={600}
              >
                {driver.name}
              </text>

              <rect
                x={lowX}
                y={y - 6}
                width={barWidth}
                height={12}
                rx={6}
                fill="#FD4E59"
                fillOpacity={0.6}
              />

              <text
                x={downsideX - 8}
                y={y + 4}
                textAnchor="end"
                fill="#161916"
                fontSize={13}
                fontWeight={700}
              >
                {fmtPct(driver.low)}
              </text>
              <text
                x={upsideX + 8}
                y={y + 4}
                textAnchor="start"
                fill="#161916"
                fontSize={13}
                fontWeight={700}
              >
                {fmtPct(driver.high)}
              </text>

              <title>{driverTooltip(driver)}</title>

              <foreignObject
                x={layout.leftLabelWidth + layout.chartWidth + 4}
                y={y - 10}
                width={28}
                height={20}
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  className="flex items-center justify-center h-full"
                  title={driverTooltip(driver)}
                >
                  <Info className="w-4 h-4 text-[#6D7069] cursor-help" aria-hidden />
                </div>
              </foreignObject>
            </g>
          );
        })}

        <line
          x1={layout.leftLabelWidth}
          y1={axisY - 14}
          x2={layout.leftLabelWidth + layout.chartWidth}
          y2={axisY - 14}
          stroke="#494949"
          strokeWidth={0.5}
          opacity={0.15}
        />

        <text x={layout.leftLabelWidth} y={layout.svgHeight - 8} fill="#6D7069" fontSize={12}>
          ◀ Downside risk
        </text>
        <text
          x={layout.baseX}
          y={layout.svgHeight - 8}
          textAnchor="middle"
          fill="#FD4E59"
          fontSize={12}
          fontWeight={600}
        >
          Base {fmtPct(baseValue)}
        </text>
        <text
          x={layout.leftLabelWidth + layout.chartWidth}
          y={layout.svgHeight - 8}
          textAnchor="end"
          fill="#6D7069"
          fontSize={12}
        >
          Upside potential ▶
        </text>
      </svg>
    </div>
  );
}
