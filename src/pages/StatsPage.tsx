import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Pencil } from 'lucide-react';
import type { DateKey, Habit } from '../types';
import { useData } from '../hooks/useData';
import { navigate } from '../hooks/useRoute';
import { useHabitEditor } from '../hooks/useHabitEditor';
import { addDays, diffDays, formatDate, minKey, startOfWeek, WEEKDAY_SHORT, weekday } from '../utils/dates';
import {
  aggregateRate,
  bestAndWorst,
  compareWeeks,
  dailyScores,
  habitSummary,
  movingAverage,
  perfectDays,
  weekdayBreakdown,
  type DayScore,
  type HabitSummary,
} from '../utils/stats';
import { dayStatus, describeFrequency, describeTarget, formatValue, isActiveOn, isComplete } from '../utils/schedule';
import { formatStreak } from '../utils/streaks';
import { cn } from '../utils/cn';
import { PageHeader } from '../components/layout/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { HabitTile } from '../components/habits/HabitTile';
import { ChartCard, DataTable, LegendKey, pct } from '../components/charts/ChartCard';
import { Heatmap, type HeatCell } from '../components/charts/Heatmap';
import { CompareChart, MonthlyChart, TrendChart, WeekdayChart } from '../components/charts/Charts';

type Range = 30 | 90 | 365;
const RANGE_LABEL: Record<Range, string> = { 30: '30 days', 90: '90 days', 365: 'year' };

export function StatsPage({ habitId }: { habitId?: string }) {
  const { habits, activeHabits, index, today, streaks, values } = useData();
  const { openEditor } = useHabitEditor();
  const [range, setRange] = useState<Range>(30);

  const habit = habitId ? habits.find((h) => h.id === habitId) : undefined;
  const scope = useMemo(() => (habit ? [habit] : habits), [habit, habits]);
  const color = habit?.color ?? 'var(--accent)';

  const rangeStart = addDays(today, -(range - 1));
  const prevStart = addDays(rangeStart, -range);
  const yearStart = startOfWeek(addDays(today, -364));
  const avgWindow = range === 365 ? 14 : 7;

  // One pass over the widest window anything on this page needs.
  const scores = useMemo(
    () => dailyScores(scope, index, minKey(yearStart, addDays(prevStart, -avgWindow)), today),
    [scope, index, yearStart, prevStart, avgWindow, today],
  );

  const view = useMemo(() => {
    const inRange = scores.filter((s) => s.date >= rangeStart);
    const prev = scores.filter((s) => s.date >= prevStart && s.date < rangeStart);
    const rate = aggregateRate(inRange);
    const prevRate = aggregateRate(prev);
    const avg = movingAverage(
      scores.map((s) => s.rate),
      avgWindow,
    );
    const offset = scores.length - inRange.length;
    const trend = inRange.map((s, i) => ({
      date: s.date,
      rate: s.rate === null ? null : s.rate * 100,
      avg: avg[offset + i] === null ? null : avg[offset + i]! * 100,
      completions: s.completions,
      total: s.total,
    }));
    const weekdays = weekdayBreakdown(inRange);
    const { best, worst } = bestAndWorst(weekdays);
    return {
      inRange,
      rate,
      delta: rate !== null && prevRate !== null ? Math.round((rate - prevRate) * 100) : null,
      completions: inRange.reduce((n, s) => n + s.completions, 0),
      perfect: perfectDays(inRange),
      trend,
      // Every day tied for best gets the emphasis, not just the first.
      weekdays: weekdays.map((w) => ({ ...w, emphasis: best !== null && w.rate === best.rate })),
      bestDays: best ? weekdays.filter((w) => w.rate === best.rate) : [],
      best,
      worst,
      byDate: new Map(scores.map((s) => [s.date, s])),
    };
  }, [scores, rangeStart, prevStart, avgWindow]);

  const compare = useMemo(() => compareWeeks(scope, index, today), [scope, index, today]);
  const summaries = useMemo(
    () => (habit ? [] : activeHabits.map((h) => habitSummary(h, values(h.id), today, { rangeStart }))),
    [habit, activeHabits, values, today, rangeStart],
  );
  const single = useMemo(
    () => (habit ? habitSummary(habit, values(habit.id), today, { months: 12, rangeStart }) : null),
    [habit, values, today, rangeStart],
  );

  if (habits.length === 0) {
    return (
      <>
        <PageHeader title="Stats" />
        <div className="card px-6 py-14 text-center">
          <div className="text-4xl">📈</div>
          <h2 className="mt-3 text-lg font-semibold">Nothing to chart yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add a habit and check it off for a few days. Your heatmap and trends will grow here.
          </p>
          <a href="#/" className="btn btn-primary mt-5">
            Go to Today
          </a>
        </div>
      </>
    );
  }

  // Heatmap cells and their tooltips
  const heatCells: HeatCell[] = [];
  for (let d = yearStart; d <= today; d = addDays(d, 1)) {
    if (!habit) {
      heatCells.push({ date: d, rate: view.byDate.get(d)?.rate ?? null });
    } else {
      const v = values(habit.id).get(d) ?? 0;
      const status = dayStatus(habit, values(habit.id), d);
      // Off-schedule completions still light up the habit's own grid.
      heatCells.push({ date: d, rate: status ? status.progress : isComplete(habit, v) ? 1 : null });
    }
  }
  const frozen = new Set(habit ? streaks.get(habit.id)?.frozen : []);
  const describe = (c: HeatCell) => describeDay(c.date, habit, view.byDate.get(c.date), values, today, frozen);

  const bestStreak = activeHabits
    .map((h) => ({ h, s: streaks.get(h.id)! }))
    .sort((a, b) => b.s.current - a.s.current)[0];

  return (
    <>
      <PageHeader title="Stats" subtitle={habit ? `${habit.emoji} ${habit.name}` : 'How all your habits are trending'} />

      {/* Filters: one row, scoping everything below */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!habit} onClick={() => navigate('stats')}>
            All habits
          </Chip>
          {[...activeHabits, ...(habit?.archivedAt ? [habit] : [])].map((h) => (
            <Chip key={h.id} active={habit?.id === h.id} color={h.color} onClick={() => navigate('stats', h.id)}>
              <span className="text-[14px] leading-none">{h.emoji}</span>
              <span className="max-w-40 truncate">{h.name}</span>
            </Chip>
          ))}
        </div>
        <Segmented
          className="shrink-0 self-start"
          value={range}
          onChange={setRange}
          options={[
            { value: 30, label: '30 days' },
            { value: 90, label: '90 days' },
            { value: 365, label: '1 year' },
          ]}
          aria-label="Date range"
        />
      </div>

      {/* Headline tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Completion rate"
          value={pct(view.rate)}
          delta={view.delta}
          hint={`last ${RANGE_LABEL[range]}`}
        />
        <StatTile label="Completions" value={view.completions.toLocaleString()} hint={`last ${RANGE_LABEL[range]}`} />
        {single ? (
          <>
            <StatTile
              label="Current streak"
              value={`🔥 ${single.streak.current}`}
              hint={single.streak.unit === 'week' ? 'weeks in a row' : 'days in a row'}
            />
            <StatTile
              label="Longest streak"
              value={String(single.streak.longest)}
              hint={`${single.streak.unit === 'week' ? 'weeks' : 'days'} · ${single.totalCompletions} total completions`}
            />
          </>
        ) : (
          <>
            <StatTile label="Perfect days" value={String(view.perfect)} hint="every due habit done" />
            <StatTile
              label="Best current streak"
              value={bestStreak ? `🔥 ${bestStreak.s.current}` : '–'}
              hint={bestStreak ? `${bestStreak.h.emoji} ${bestStreak.h.name}` : undefined}
            />
          </>
        )}
      </div>

      {/* Year heatmap */}
      <ChartCard
        className="mb-4"
        title="Past year"
        subtitle={
          habit
            ? `${heatCells.filter((c) => c.rate === 1).length} days completed in the last 12 months`
            : 'Each square is a day, shaded by the share of due habits you completed'
        }
      >
        <Heatmap cells={heatCells} color={color} today={today} describe={describe} />
      </ChartCard>

      {/* Trend + weekdays */}
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Daily completion"
          subtitle={`Last ${RANGE_LABEL[range]}`}
          legend={
            <>
              <LegendKey color={`color-mix(in oklab, ${color} 45%, transparent)`} label="Daily" />
              <LegendKey color={color} label={`${avgWindow}-day avg`} />
            </>
          }
          table={
            <DataTable
              columns={['Date', 'Done', 'Rate', `${avgWindow}-day avg`]}
              rows={[...view.trend]
                .reverse()
                .map((p) => [
                  formatDate(p.date, { weekday: 'short', day: 'numeric', month: 'short' }),
                  p.total ? `${p.completions}/${p.total}` : '–',
                  p.rate === null ? '–' : `${Math.round(p.rate)}%`,
                  p.avg === null ? '–' : `${Math.round(p.avg)}%`,
                ])}
            />
          }
        >
          <TrendChart data={view.trend} color={color} avgWindow={avgWindow} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="By weekday"
          subtitle={
            view.best && view.worst && view.best.rate !== view.worst.rate ? (
              <>
                Best on{' '}
                <span className="font-medium text-fg">
                  {view.bestDays.length > 2 ? `${view.bestDays.length} days` : view.bestDays.map((w) => w.label).join(' & ')}
                </span>{' '}
                ({pct(view.best.rate)}), toughest on <span className="font-medium text-fg">{WEEKDAY_SHORT[view.worst.weekday]}</span> (
                {pct(view.worst.rate)})
              </>
            ) : (
              `Last ${RANGE_LABEL[range]}`
            )
          }
          table={
            <DataTable
              columns={['Day', 'Rate', 'Completions']}
              rows={view.weekdays.map((w) => [w.label, pct(w.rate), w.completions])}
            />
          }
        >
          <WeekdayChart data={view.weekdays} color={color} />
        </ChartCard>
      </div>

      {/* Week comparison + monthly (single habit) */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <WeekCompareCard compare={compare} color={color} />
        {single && (
          <ChartCard
            title="Monthly trend"
            subtitle="Completion rate per month"
            table={
              <DataTable
                columns={['Month', 'Rate', 'Completions']}
                rows={[...single.monthly]
                  .reverse()
                  .map((m) => [formatDate(m.month, { month: 'long', year: 'numeric' }), pct(m.rate), m.completions])}
              />
            }
          >
            <MonthlyChart data={single.monthly} color={color} />
          </ChartCard>
        )}
        {!single && <TopStreaks habits={activeHabits} />}
      </div>

      {single && habit && (
        <section className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <HabitTile emoji={habit.emoji} color={habit.color} size={44} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{habit.name}</div>
            <div className="text-[13px] text-muted">
              {[describeFrequency(habit.frequency), describeTarget(habit), `since ${formatDate(habit.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}`]
                .filter(Boolean)
                .join(' · ')}
              {habit.freezes && ' · ❄️ freezes on'}
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditor(habit)}>
            <Pencil size={14} />
            Edit
          </button>
        </section>
      )}

      {/* Per-habit breakdown */}
      {!single && summaries.length > 0 && (
        <>
          <h2 className="section-title mb-3 mt-8">Per habit · last {RANGE_LABEL[range]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map((s) => (
              <HabitStatCard key={s.habit.id} summary={s} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function describeDay(
  date: DateKey,
  habit: Habit | undefined,
  score: DayScore | undefined,
  values: (id: string) => ReadonlyMap<DateKey, number>,
  today: DateKey,
  frozen: Set<DateKey>,
): { value: string; label: string } {
  if (!habit) {
    if (!score || score.total === 0) return { value: '–', label: 'nothing due' };
    return { value: pct(score.rate), label: `${score.completions} of ${score.total} done` };
  }
  if (!isActiveOn(habit, date)) return { value: '–', label: date < habit.startDate ? 'before start' : 'archived' };
  const v = values(habit.id).get(date) ?? 0;
  const status = dayStatus(habit, values(habit.id), date);
  const amount = habit.kind === 'count' ? `${formatValue(v)}/${formatValue(habit.target)} ${habit.unit}`.trim() : null;
  if (isComplete(habit, v)) return { value: amount ?? 'Done', label: status ? '' : 'bonus day' };
  if (frozen.has(date)) return { value: '❄️', label: 'freeze used' };
  if (!status) return { value: amount && v > 0 ? amount : '–', label: 'not scheduled' };
  if (date === today) return { value: amount ?? 'Not yet', label: 'today' };
  return { value: amount ?? 'Missed', label: amount ? 'short of target' : '' };
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ '--c': color ?? 'var(--fg)' } as CSSProperties}
      className={cn(
        'flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150',
        active
          ? 'border-[color-mix(in_oklab,var(--c)_45%,transparent)] bg-[color-mix(in_oklab,var(--c)_14%,transparent)] text-fg'
          : 'border-line text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function StatTile({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[28px] font-semibold leading-none tracking-tight sm:text-[32px]">{value}</span>
        {delta !== undefined && delta !== null && <Delta value={delta} />}
      </div>
      {hint && <div className="mt-2 truncate text-[12px] text-faint">{hint}</div>}
    </div>
  );
}

function Delta({ value, suffix = 'pts' }: { value: number; suffix?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[13px] font-medium',
        value > 0 ? 'text-good' : value < 0 ? 'text-danger' : 'text-muted',
      )}
      title="Change vs the previous period"
    >
      <Icon size={14} strokeWidth={2.5} />
      {value > 0 ? '+' : ''}
      {value} {suffix}
    </span>
  );
}

function WeekCompareCard({ compare, color }: { compare: ReturnType<typeof compareWeeks>; color: string }) {
  const data = compare.thisWeekDays.map((d, i) => ({
    label: WEEKDAY_SHORT[weekday(d.date)],
    date: d.date,
    current: d.rate === null ? null : d.rate * 100,
    last: compare.lastWeekDays[i].rate === null ? null : compare.lastWeekDays[i].rate! * 100,
  }));
  const days = diffDays(compare.thisWeek.end, compare.thisWeek.start) + 1;
  return (
    <ChartCard
      title="This week vs last week"
      subtitle={days === 7 ? 'Full week' : `First ${days} day${days === 1 ? '' : 's'} of each week`}
      legend={
        <>
          <LegendKey color={color} label="This week" shape="rect" />
          <LegendKey color="var(--line-strong)" label="Last week" shape="rect" />
        </>
      }
      table={
        <DataTable
          columns={['Day', 'This week', 'Last week']}
          rows={data.map((d) => [d.label, d.current === null ? '–' : `${Math.round(d.current)}%`, d.last === null ? '–' : `${Math.round(d.last)}%`])}
        />
      }
    >
      <div className="mb-4 flex items-end gap-6">
        <div>
          <div className="text-[28px] font-semibold leading-none tracking-tight">{pct(compare.thisWeek.rate)}</div>
          <div className="mt-1.5 text-[12px] text-muted">{compare.thisWeek.completions} completions</div>
        </div>
        <div className="pb-5 text-[13px] text-faint">vs</div>
        <div>
          <div className="text-[28px] font-semibold leading-none tracking-tight text-muted">{pct(compare.lastWeek.rate)}</div>
          <div className="mt-1.5 text-[12px] text-muted">{compare.lastWeek.completions} completions</div>
        </div>
        {compare.delta !== null && (
          <div className="ml-auto pb-5">
            <Delta value={compare.delta} />
          </div>
        )}
      </div>
      <CompareChart data={data} color={color} />
    </ChartCard>
  );
}

function TopStreaks({ habits }: { habits: Habit[] }) {
  const { streaks } = useData();
  const rows = habits
    .map((h) => ({ h, s: streaks.get(h.id)! }))
    .sort((a, b) => b.s.current - a.s.current || b.s.longest - a.s.longest)
    .slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.s.longest));
  return (
    <ChartCard title="Streaks" subtitle="Current run, against each habit’s record">
      <ul className="space-y-3.5">
        {rows.map(({ h, s }) => (
          <li key={h.id}>
            <a href={`#/stats/${encodeURIComponent(h.id)}`} className="group block">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="leading-none">{h.emoji}</span>
                  <span className="truncate group-hover:underline">{h.name}</span>
                </span>
                <span className="shrink-0 text-muted">
                  <span className="font-semibold text-fg">🔥 {s.current}</span> / {formatStreak(s.longest, s.unit)} best
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--cell-empty)]">
                <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${(s.longest / max) * 100}%`, background: h.color }} />
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s.current / max) * 100}%`, background: h.color }} />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function HabitStatCard({ summary: s }: { summary: HabitSummary }) {
  const h = s.habit;
  return (
    <a
      href={`#/stats/${encodeURIComponent(h.id)}`}
      className="card group block p-4 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start gap-3">
        <HabitTile emoji={h.emoji} color={h.color} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{h.name}</div>
          <div className="text-[12px] text-muted">{describeFrequency(h.frequency)}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold leading-none tracking-tight">{pct(s.completionRate)}</div>
          <div className="mt-1 text-[11px] text-faint">completion</div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Current', `🔥 ${s.streak.current}`],
          ['Longest', String(s.streak.longest)],
          ['Total', String(s.totalCompletions)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2">
            <dt className="text-[11px] text-faint">{k}</dt>
            <dd className="text-[15px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3" aria-label="Monthly trend, last 6 months">
        <MonthlyChart data={s.monthly} color={h.color} compact />
      </div>
    </a>
  );
}
