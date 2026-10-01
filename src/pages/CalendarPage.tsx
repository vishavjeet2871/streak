import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateKey } from '../types';
import { useData } from '../hooks/useData';
import { useHotkeys } from '../hooks/useHotkeys';
import {
  addMonths,
  eachDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  minKey,
  parseKey,
  startOfMonth,
  startOfWeek,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
} from '../utils/dates';
import { aggregateRate, dailyScores, perfectDays } from '../utils/stats';
import { dayStatus, describeFrequency, formatValue, isActiveOn, isComplete, weekProgress } from '../utils/schedule';
import { mix } from '../utils/colors';
import { cn } from '../utils/cn';
import { PageHeader } from '../components/layout/PageHeader';
import { DayHabitRow } from '../components/habits/DayHabitRow';
import { pct } from '../components/charts/ChartCard';

export function CalendarPage() {
  const { habits, index, today, values, streaks } = useData();
  const [month, setMonth] = useState<DateKey>(startOfMonth(today));
  const [selected, setSelected] = useState<DateKey>(today);
  const [filter, setFilter] = useState<string>('all');

  const habit = filter === 'all' ? undefined : habits.find((h) => h.id === filter);
  const scope = useMemo(() => (habit ? [habit] : habits), [habit, habits]);
  const color = habit?.color ?? 'var(--accent)';

  const monthEnd = endOfMonth(month);
  const scoreEnd = minKey(monthEnd, today);
  const scores = useMemo(
    () => (month <= today ? dailyScores(scope, index, month, scoreEnd) : []),
    [scope, index, month, scoreEnd, today],
  );
  const byDate = useMemo(() => new Map(scores.map((s) => [s.date, s])), [scores]);
  const grid = eachDay(startOfWeek(month), endOfWeek(monthEnd));

  const goMonth = (n: number) => {
    const next = addMonths(month, n);
    if (next > today) return;
    setMonth(next);
  };

  useHotkeys((e) => {
    if (e.key === 'ArrowLeft') {
      goMonth(-1);
      return true;
    }
    if (e.key === 'ArrowRight') {
      goMonth(1);
      return true;
    }
  });

  const completions = scores.reduce((n, s) => n + s.completions, 0);

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          <select
            className="field h-9 w-auto max-w-48 pr-8 text-[13px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by habit"
          >
            <option value="all">All habits</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.emoji} {h.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight">
              {formatDate(month, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => goMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={month === startOfMonth(today) && selected === today}
                onClick={() => {
                  setMonth(startOfMonth(today));
                  setSelected(today);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                disabled={addMonths(month, 1) > today}
                onClick={() => goMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAY_ORDER.map((d) => (
              <div key={d} className="pb-1 text-center text-[11px] font-medium text-faint">
                {WEEKDAY_SHORT[d]}
              </div>
            ))}
            {grid.map((d) => {
              const inMonth = d >= month && d <= monthEnd;
              const future = d > today;
              const s = byDate.get(d);
              const rate = s?.rate ?? null;
              // Perfect days glow; partial days get a gentler, quadratic tint so 70% and 95% read differently.
              const strong = rate !== null && rate >= 0.9;
              const tint = rate === null || rate === 0 ? 0 : rate === 1 ? 92 : 12 + rate * rate * 58;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future || !inMonth}
                  onClick={() => setSelected(d)}
                  aria-label={`${formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}${rate !== null ? `, ${pct(rate)}` : ''}`}
                  aria-pressed={selected === d}
                  className={cn(
                    'relative flex aspect-square flex-col items-start justify-between rounded-xl p-1.5 text-left transition duration-150 sm:rounded-2xl sm:p-2',
                    !inMonth && 'invisible',
                    future && 'opacity-30',
                    !future && inMonth && 'hover:scale-[1.04]',
                    selected === d && 'ring-2 ring-fg/70 ring-offset-2 ring-offset-[var(--bg)]',
                  )}
                  style={{
                    background: rate === null ? 'var(--surface-2)' : tint === 0 ? 'var(--cell-empty)' : mix(color, tint, 'var(--cell-empty)'),
                  }}
                >
                  <span
                    className={cn(
                      'text-[12px] font-semibold tabular sm:text-[13px]',
                      d === today ? 'text-accent' : strong ? 'text-white' : 'text-muted',
                      d === today && strong && 'text-white underline decoration-2 underline-offset-2',
                    )}
                  >
                    {parseKey(d)[2]}
                  </span>
                  {rate !== null && !future && (
                    <span className={cn('hidden text-[11px] font-medium sm:block', strong ? 'text-white/85' : 'text-faint')}>
                      {rate === 1 ? '✓' : `${Math.round(rate * 100)}%`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            {[
              ['Completion', pct(aggregateRate(scores))],
              ['Perfect days', String(perfectDays(scores))],
              ['Completions', String(completions)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[20px] font-semibold tracking-tight">{v}</div>
                <div className="text-[12px] text-muted">{k}</div>
              </div>
            ))}
          </div>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={selected}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="card self-start p-4 sm:p-5"
          >
            {renderDayPanel(selected, habit?.id)}
          </motion.section>
        </AnimatePresence>
      </div>
    </>
  );

  // A render helper (not a nested component) so rows keep their identity across re-renders.
  function renderDayPanel(date: DateKey, habitFilter?: string) {
    const list = habits.filter((h) => isActiveOn(h, date) && (!habitFilter || h.id === habitFilter));
    const withStatus = list.map((h) => ({ h, status: dayStatus(h, values(h.id), date) }));
    const due = withStatus.filter((x) => x.status);
    const other = withStatus.filter((x) => !x.status);
    const score = byDate.get(date) ?? dailyScores(scope, index, date, date)[0];

    const describe = (h: (typeof habits)[number], isDue: boolean) => {
      const v = values(h.id).get(date) ?? 0;
      if (streaks.get(h.id)?.frozen.includes(date)) return '❄️ Freeze used, streak safe';
      if (h.kind === 'count') return `${formatValue(v)} / ${formatValue(h.target)} ${h.unit}`.trim();
      if (isComplete(h, v)) return isDue ? 'Done' : 'Done (bonus)';
      if (isDue) return date === today ? 'Not yet' : 'Missed';
      if (h.frequency.type === 'weekly') {
        const w = weekProgress(h, values(h.id), date);
        return `Optional · ${w.done} of ${w.required} this week`;
      }
      return `Not scheduled · ${describeFrequency(h.frequency)}`;
    };

    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              {score && score.total > 0 ? `${score.completions} of ${score.total} done` : 'Nothing was due'}
              {date === today && ' · today'}
            </p>
          </div>
          {score?.rate !== null && score?.rate !== undefined && (
            <span className="text-[22px] font-semibold tracking-tight">{pct(score.rate)}</span>
          )}
        </div>
        {list.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">No habits were running on this day.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line">
              {due.map(({ h }) => (
                <DayHabitRow key={h.id} habit={h} date={date} value={values(h.id).get(date) ?? 0} status={describe(h, true)} />
              ))}
            </ul>
            {other.length > 0 && (
              <>
                <h3 className="section-title mb-1 mt-4">Not due</h3>
                <ul className="divide-y divide-line">
                  {other.map(({ h }) => (
                    <DayHabitRow
                      key={h.id}
                      habit={h}
                      date={date}
                      value={values(h.id).get(date) ?? 0}
                      status={describe(h, false)}
                      muted
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </>
    );
  }
}
