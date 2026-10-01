import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DateKey } from '../../types';
import { addDays, diffDays, formatDate, parseKey, startOfWeek } from '../../utils/dates';
import { heatColor } from '../../utils/colors';
import { rateLevel } from '../../utils/stats';
import { TooltipBox } from './ChartCard';

export interface HeatCell {
  date: DateKey;
  /** 0–1, or null when nothing was due */
  rate: number | null;
}

interface Props {
  cells: HeatCell[];
  color: string;
  today: DateKey;
  describe: (cell: HeatCell) => { value: string; label: string };
}

const GAP = 3;
const LABEL_W = 30;
const TOP = 18;
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** GitHub-style year grid: columns are Mon–Sun weeks, intensity = completion %. */
export function Heatmap({ cells, color, today, describe }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ cell: HeatCell; x: number; y: number } | null>(null);

  const start = startOfWeek(cells[0]?.date ?? today);
  const weeks = Math.ceil((diffDays(cells[cells.length - 1]?.date ?? today, start) + 1) / 7);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Fill the card on wide screens; scroll horizontally on phones.
  const cell = Math.max(10, Math.min(16, Math.floor((width - LABEL_W - 16) / weeks) - GAP));
  const step = cell + GAP;
  // Right padding leaves room for a month label that starts in the last column.
  const svgW = LABEL_W + weeks * step + 16;
  const svgH = TOP + 7 * step;

  useEffect(() => {
    const el = wrapRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [svgW]);

  const months = useMemo(() => {
    const out: { col: number; label: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        if (parseKey(date)[2] === 1) {
          if (!out.length || w - out[out.length - 1].col >= 3) out.push({ col: w, label: formatDate(date, { month: 'short' }) });
          break;
        }
      }
    }
    return out;
  }, [start, weeks]);

  return (
    <div className="relative">
      <div ref={wrapRef} className="no-scrollbar overflow-x-auto" onPointerLeave={() => setHover(null)}>
        <svg width={svgW} height={svgH} role="img" aria-label="Completion heatmap for the past year" className="block">
          {months.map((m) => (
            <text key={m.col} x={LABEL_W + m.col * step} y={11} className="fill-[var(--faint)] text-[10.5px]">
              {m.label}
            </text>
          ))}
          {ROW_LABELS.map((l, i) =>
            l ? (
              <text key={l} x={0} y={TOP + i * step + cell - 2} className="fill-[var(--faint)] text-[10px]">
                {l}
              </text>
            ) : null,
          )}
          {cells.map((c) => {
            if (c.date > today) return null;
            const offset = diffDays(c.date, start);
            const x = LABEL_W + Math.floor(offset / 7) * step;
            const y = TOP + (offset % 7) * step;
            const isHover = hover?.cell.date === c.date;
            const d = describe(c);
            return (
              <rect
                key={c.date}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={3}
                style={{
                  fill: heatColor(color, rateLevel(c.rate)),
                  stroke: isHover ? 'var(--fg)' : c.date === today ? 'var(--line-strong)' : 'none',
                  strokeWidth: 1,
                }}
                onPointerEnter={() => setHover({ cell: c, x: x + cell / 2, y })}
                onClick={() => setHover({ cell: c, x: x + cell / 2, y })}
              >
                <title>{`${formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}: ${d.value} ${d.label}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{
            left: Math.min(Math.max(hover.x - (wrapRef.current?.scrollLeft ?? 0), 80), width - 80),
            top: hover.y - 6,
          }}
        >
          <TooltipBox
            title={formatDate(hover.cell.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            rows={[{ ...describe(hover.cell), color }]}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-faint">
        <span className="mr-1">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-2.5 rounded-[3px]" style={{ background: heatColor(color, l) }} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}
