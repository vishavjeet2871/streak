import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Sparkles, Undo2 } from 'lucide-react';
import type { DateKey, Habit } from '../types';
import { useData } from '../hooks/useData';
import { useHabitEditor } from '../hooks/useHabitEditor';
import { useHotkeys } from '../hooks/useHotkeys';
import { useLoadDemo } from '../hooks/useLoadDemo';
import { setEntryValue } from '../db/repo';
import { addDays, formatDate } from '../utils/dates';
import { dayScore } from '../utils/stats';
import { isActiveOn, isComplete, isScheduledOn, weekProgress } from '../utils/schedule';
import { celebrate } from '../utils/celebrate';
import { greeting, progressMessage } from '../utils/greeting';
import { HabitCard } from '../components/habits/HabitCard';
import { WeekStrip } from '../components/habits/WeekStrip';
import { StarterSuggestions } from '../components/habits/StarterSuggestions';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Logo } from '../components/layout/Logo';
import { SyncBadge } from '../components/sync/SyncBadge';
import { DuplicatesBanner } from '../components/habits/DuplicatesBanner';

export function TodayPage() {
  const { habits, activeHabits, index, today, streaks, settings, values } = useData();
  const { openEditor } = useHabitEditor();

  const [selected, setSelected] = useState<DateKey>(today);
  // When the day rolls over, follow it if you were looking at "today".
  const [trackedToday, setTrackedToday] = useState(today);
  if (trackedToday !== today) {
    setTrackedToday(today);
    if (selected === trackedToday) setSelected(today);
  }
  const isToday = selected === today;

  const visible = activeHabits.filter((h) => isActiveOn(h, selected));
  const scheduled = visible.filter((h) => isScheduledOn(h, selected));
  const offSchedule = visible.filter((h) => !isScheduledOn(h, selected));
  const ordered = [...scheduled, ...offSchedule];

  const score = useMemo(() => dayScore(activeHabits, index, selected), [activeHabits, index, selected]);
  const scoreFor = useCallback((d: DateKey) => dayScore(activeHabits, index, d), [activeHabits, index]);

  // Confetti when a tap finishes the whole day.
  const userActed = useRef(false);
  const prev = useRef({ date: selected, rate: score.rate });
  useEffect(() => {
    const p = prev.current;
    if (userActed.current && p.date === selected && (p.rate ?? 0) < 1 && score.rate === 1) void celebrate();
    prev.current = { date: selected, rate: score.rate };
    userActed.current = false;
  }, [selected, score.rate]);

  const change = (h: Habit, value: number) => {
    userActed.current = true;
    void setEntryValue(h.id, selected, value);
  };

  useHotkeys((e) => {
    if (/^Digit[1-9]$/.test(e.code)) {
      const h = ordered[Number(e.code.slice(5)) - 1];
      if (!h) return;
      const v = values(h.id).get(selected) ?? 0;
      if (h.kind === 'count') change(h, e.shiftKey ? Math.max(0, v - h.step) : v + h.step);
      else change(h, isComplete(h, v) ? 0 : 1);
      return true;
    }
    if (e.key === 'ArrowLeft') {
      setSelected(addDays(selected, -1));
      return true;
    }
    if (e.key === 'ArrowRight' && selected < today) {
      setSelected(addDays(selected, 1));
      return true;
    }
  });

  const pct = Math.round((score.rate ?? 0) * 100);
  const best = activeHabits
    .map((h) => ({ h, s: streaks.get(h.id)! }))
    .filter((x) => x.s && x.s.current > 0 && x.s.unit === 'day')
    .sort((a, b) => b.s.current - a.s.current)[0];

  const renderCard = (h: Habit, i: number, off: boolean) => (
    <motion.div
      key={h.id}
      className="min-w-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.035, duration: 0.25, ease: 'easeOut' }}
    >
      <HabitCard
        habit={h}
        date={selected}
        today={today}
        value={values(h.id).get(selected) ?? 0}
        streak={streaks.get(h.id)!}
        week={h.frequency.type === 'weekly' ? weekProgress(h, values(h.id), selected) : undefined}
        shortcut={i < 9 ? i + 1 : undefined}
        offSchedule={off}
        onChange={(v) => change(h, v)}
        onEdit={() => openEditor(h)}
      />
    </motion.div>
  );

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3 md:mb-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">
            {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight md:text-[34px]">
            {greeting(new Date().getHours(), settings.name)}
          </h1>
        </div>
        <SyncBadge compact className="-mr-1.5 shrink-0 md:hidden" />
      </header>

      <DuplicatesBanner />

      {habits.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="card mb-6 p-4 sm:p-6">
            <div className="flex items-center gap-5 px-1">
              <ProgressRing value={score.rate ?? 0} size={92} stroke={8} color={pct === 100 ? 'var(--good)' : 'var(--accent)'}>
                <span className="text-[22px] font-semibold tracking-tight">
                  <AnimatedNumber value={pct} />
                  <span className="text-[13px] font-medium text-muted">%</span>
                </span>
              </ProgressRing>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 text-[18px] font-semibold tracking-tight">
                  <AnimatedNumber value={score.completions} />
                  <span>of {score.total} done</span>
                </div>
                <p className="mt-0.5 text-[14px] text-muted">{progressMessage(score.completions, score.total, isToday)}</p>
                {best && (
                  <p className="mt-2 truncate text-[13px] text-faint">
                    Longest run: <span className="font-medium text-muted">🔥 {best.s.current} days</span> · {best.h.name}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <WeekStrip selected={selected} today={today} onSelect={setSelected} scoreFor={scoreFor} />
            </div>
          </section>

          {!isToday && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-2.5 text-[14px]"
            >
              <span>
                Logging for <span className="font-semibold">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm -mr-2 text-fg" onClick={() => setSelected(today)}>
                <Undo2 size={14} />
                Today
              </button>
            </motion.div>
          )}

          {scheduled.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">{scheduled.map((h, i) => renderCard(h, i, false))}</div>
          ) : (
            <div className="card px-6 py-10 text-center">
              <div className="text-3xl">🌿</div>
              <p className="mt-2 font-medium">Nothing scheduled {isToday ? 'today' : 'this day'}</p>
              <p className="mt-1 text-sm text-muted">Rest is part of the plan.</p>
            </div>
          )}

          {offSchedule.length > 0 && (
            <>
              <h2 className="section-title mb-3 mt-8">Not scheduled {isToday ? 'today' : 'this day'}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {offSchedule.map((h, i) => renderCard(h, scheduled.length + i, true))}
              </div>
            </>
          )}

          {visible.length === 0 && (
            <p className="mt-4 text-center text-sm text-muted">None of your habits had started on this day yet.</p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => openEditor()}
        aria-label="New habit"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-white shadow-[0_10px_30px_-8px_var(--accent)] transition active:scale-95 md:hidden"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function EmptyState() {
  const { openEditor } = useHabitEditor();
  const loadDemo = useLoadDemo();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative overflow-hidden p-5 sm:p-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 30%, transparent), transparent)' }}
      />
      <div className="relative mx-auto max-w-md text-center">
        <motion.div
          className="mx-auto mb-5 w-fit"
          animate={{ rotate: [0, -4, 4, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
        >
          <Logo size={64} />
        </motion.div>
        <h2 className="text-[22px] font-semibold tracking-tight">Start your first streak</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Small things, every day. Tap a starter to add it instantly, or build your own.
        </p>
      </div>
      <div className="relative mt-8">
        <StarterSuggestions />
      </div>
      <div className="relative mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => openEditor()}>
          <Plus size={16} strokeWidth={2.5} />
          Create a custom habit
        </button>
        <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={loadDemo}>
          <Sparkles size={15} />
          Try it with 90 days of demo data
        </button>
      </div>
    </motion.section>
  );
}
