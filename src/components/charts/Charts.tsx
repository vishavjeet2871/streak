import { useId } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DateKey } from '../../types';
import { formatDate } from '../../utils/dates';
import { TooltipBox } from './ChartCard';

// Shared chrome: hairline solid grid, recessive axes, muted tick text.
const axisTick = { fill: 'var(--faint)', fontSize: 11 };
const grid = <CartesianGrid vertical={false} stroke="var(--line)" />;
const pctAxis = (ticks = [0, 25, 50, 75, 100]) => (
  <YAxis
    domain={[0, 100]}
    ticks={ticks}
    tickFormatter={(v: number) => `${v}%`}
    tickLine={false}
    axisLine={false}
    tick={axisTick}
    width={40}
  />
);
const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${Math.round(v)}%`);

// Recharts passes these to custom tooltip content; the row's datum is in payload[0].payload.
interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}
const hovered = <T,>({ active, payload }: TipProps) => (active ? (payload?.[0]?.payload as T | undefined) : undefined);

/* ---------- Daily completion trend ---------- */

export interface TrendPoint {
  date: DateKey;
  /** 0–100, null when nothing was due */
  rate: number | null;
  avg: number | null;
  completions: number;
  total: number;
}

export function TrendChart({ data, color, avgWindow }: { data: TrendPoint[]; color: string; avgWindow: number }) {
  const gid = useId().replace(/:/g, '');
  const long = data.length > 120;
  return (
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.16} />
              <stop offset="1" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDate(d, long ? { month: 'short' } : { day: 'numeric', month: 'short' })}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tick={axisTick}
            minTickGap={long ? 40 : 28}
            tickMargin={8}
          />
          {pctAxis()}
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
            isAnimationActive={false}
            content={(props: TipProps) => {
              const p = hovered<TrendPoint>(props);
              if (!p) return null;
              return (
                <TooltipBox
                  title={formatDate(p.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  rows={[
                    {
                      value: fmtPct(p.rate),
                      label: p.total ? `that day · ${p.completions}/${p.total} done` : 'nothing due',
                      color: `color-mix(in oklab, ${color} 45%, transparent)`,
                    },
                    { value: fmtPct(p.avg), label: `${avgWindow}-day average`, color },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={color}
            strokeOpacity={0.4}
            strokeWidth={1}
            fill={`url(#${gid})`}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--elevated)', strokeWidth: 2 }}
            connectNulls
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Completion rate by weekday ---------- */

export interface WeekdayPoint {
  label: string;
  rate: number | null;
  completions: number;
  emphasis: boolean;
}

export function WeekdayChart({ data, color }: { data: WeekdayPoint[]; color: string }) {
  return (
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d, pct: d.rate === null ? 0 : d.rate * 100 }))} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          {grid}
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={axisTick} tickMargin={8} />
          {pctAxis([0, 50, 100])}
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', radius: 8 }}
            isAnimationActive={false}
            content={(props: TipProps) => {
              const p = hovered<WeekdayPoint>(props);
              if (!p) return null;
              return (
                <TooltipBox
                  title={`${p.label}s`}
                  rows={[
                    { value: p.rate === null ? '–' : `${Math.round(p.rate * 100)}%`, label: 'completion', color },
                    { value: String(p.completions), label: 'completions' },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={500}>
            {data.map((d) => (
              <Cell key={d.label} fill={color} fillOpacity={d.emphasis ? 1 : 0.38} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- This week vs last week ---------- */

export interface ComparePoint {
  label: string;
  date: DateKey;
  last: number | null;
  current: number | null;
}

export function CompareChart({ data, color }: { data: ComparePoint[]; color: string }) {
  const muted = 'var(--line-strong)';
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: -6 }} barGap={2} barCategoryGap="28%">
          {grid}
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={axisTick} tickMargin={6} />
          {pctAxis([0, 50, 100])}
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', radius: 8 }}
            isAnimationActive={false}
            content={(props: TipProps) => {
              const p = hovered<ComparePoint>(props);
              if (!p) return null;
              return (
                <TooltipBox
                  title={p.label}
                  rows={[
                    { value: fmtPct(p.current), label: 'this week', color },
                    { value: fmtPct(p.last), label: 'last week', color: muted },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="last" fill={muted} radius={[4, 4, 0, 0]} maxBarSize={12} animationDuration={500} />
          <Bar dataKey="current" fill={color} radius={[4, 4, 0, 0]} maxBarSize={12} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Monthly trend ---------- */

export interface MonthPoint {
  month: DateKey;
  rate: number | null;
  completions: number;
}

export function MonthlyChart({ data, color, compact = false }: { data: MonthPoint[]; color: string; compact?: boolean }) {
  const rows = data.map((d) => ({ ...d, pct: d.rate === null ? 0 : d.rate * 100 }));
  return (
    <div className={compact ? 'h-16' : 'h-48 sm:h-56'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={compact ? { top: 2, right: 0, bottom: 0, left: 0 } : { top: 6, right: 6, bottom: 0, left: -6 }}>
          {!compact && grid}
          <XAxis
            dataKey="month"
            hide={compact}
            tickFormatter={(m: string) => formatDate(m, { month: 'short' })}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tick={axisTick}
            tickMargin={8}
          />
          {compact ? <YAxis hide domain={[0, 100]} /> : pctAxis([0, 50, 100])}
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', radius: 6 }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 20 }}
            content={(props: TipProps) => {
              const p = hovered<MonthPoint>(props);
              if (!p) return null;
              return (
                <TooltipBox
                  title={formatDate(p.month, { month: 'long', year: 'numeric' })}
                  rows={[
                    { value: p.rate === null ? '–' : `${Math.round(p.rate * 100)}%`, label: 'completion', color },
                    { value: String(p.completions), label: 'completions' },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="pct" fill={color} radius={[4, 4, 0, 0]} maxBarSize={compact ? 14 : 24} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
