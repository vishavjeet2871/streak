import { motion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Minus, Pencil } from 'lucide-react';
import type { DateKey, Habit } from '../../types';
import type { StreakInfo } from '../../utils/streaks';
import { describeFrequency, formatValue, isComplete, progressOf, type WeekProgress } from '../../utils/schedule';
import { haptic } from '../../utils/celebrate';
import { cn } from '../../utils/cn';
import { HabitTile } from './HabitTile';
import { StreakBadge } from './StreakBadge';
import { CompletionIndicator } from './CompletionIndicator';
import { GlowPulse } from '../ui/Burst';

interface Props {
  habit: Habit;
  date: DateKey;
  today: DateKey;
  value: number;
  streak: StreakInfo;
  week?: WeekProgress;
  /** 1–9 keyboard shortcut */
  shortcut?: number;
  /** Not on today's schedule */
  offSchedule?: boolean;
  onChange: (value: number) => void;
  onEdit: () => void;
}

const LONG_PRESS_MS = 550;

export function HabitCard({ habit, date, today, value, streak, week, shortcut, offSchedule, onChange, onEdit }: Props) {
  const done = isComplete(habit, value);
  const progress = progressOf(habit, value);
  const isCount = habit.kind === 'count';

  // Celebrate only real completions on the same day, not date switches.
  const [burst, setBurst] = useState(0);
  const prev = useRef({ date, done });
  useEffect(() => {
    if (prev.current.date === date && !prev.current.done && done) setBurst((b) => b + 1);
    prev.current = { date, done };
  }, [date, done]);

  const tap = () => {
    haptic(done && !isCount ? 8 : 14);
    if (isCount) onChange(value + habit.step);
    else onChange(done ? 0 : 1);
  };

  // Long-press opens the editor on touch screens.
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      press.current = null;
      return;
    }
    const timer = window.setTimeout(() => {
      if (press.current) press.current.fired = true;
      haptic(20);
      onEdit();
    }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY, fired: false };
  };
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress();
  };
  const onClick = () => {
    if (press.current?.fired) {
      press.current = null;
      return;
    }
    tap();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap();
    }
  };

  const parts: { text: string; accent?: boolean }[] = [];
  if (isCount) parts.push({ text: `${formatValue(value)} / ${formatValue(habit.target)} ${habit.unit}`.trim() });
  else if (habit.unit) parts.push({ text: habit.unit });
  if (week) {
    parts.push({ text: week.done >= week.required ? 'Weekly goal met' : `${week.done} of ${week.required} this week` });
  } else if (offSchedule) {
    parts.push({ text: `Off today · ${describeFrequency(habit.frequency)}` });
  } else if (date === today && streak.atRisk && streak.current >= 2 && new Date().getHours() >= 18) {
    // An evening-only nudge, so the list stays calm during the day.
    parts.push({ text: `Keep the ${streak.current}-${streak.unit} streak alive`, accent: true });
  } else if (habit.frequency.type !== 'daily' || parts.length === 0) {
    parts.push({ text: describeFrequency(habit.frequency) });
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-pressed={done}
      aria-label={`${habit.name}${isCount ? `, ${formatValue(value)} of ${formatValue(habit.target)}` : ''}${done ? ', done' : ''}`}
      data-done={done}
      style={{ '--c': habit.color } as CSSProperties}
      className={cn(
        'habit-card card group relative flex min-h-[78px] cursor-pointer select-none items-center [-webkit-touch-callout:none] gap-3.5 overflow-hidden p-3.5 pr-4 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--c)] sm:p-4',
        offSchedule && !done && 'opacity-60 hover:opacity-100',
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => {
        e.preventDefault();
        // Android also fires contextmenu on long-press; open the editor only once.
        if (press.current?.fired) return;
        cancelPress();
        if (press.current) press.current.fired = true;
        onEdit();
      }}
    >
      <GlowPulse trigger={burst} color={habit.color} />
      <HabitTile emoji={habit.emoji} color={habit.color} size={46} />

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium leading-snug">{habit.name}</span>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Edit ${habit.name}`}
            className="hidden size-6 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-surface-2 hover:text-fg group-hover:opacity-100 md:grid"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil size={12} />
          </button>
          {shortcut !== undefined && (
            <span className="kbd pointer-events-none ml-auto hidden opacity-0 transition-opacity group-hover:opacity-70 md:inline-grid">
              {shortcut}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[13px] text-muted">
          {parts.map((p, i) => (
            <span key={i} className={p.accent ? 'font-medium text-accent' : undefined}>
              {i > 0 && ' · '}
              {p.text}
            </span>
          ))}
        </div>
      </div>

      <StreakBadge streak={streak} today={today} className="relative" />

      {isCount && value > 0 && (
        <button
          type="button"
          aria-label={`Remove ${formatValue(habit.step)} from ${habit.name}`}
          className="relative -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            haptic(8);
            onChange(Math.max(0, value - habit.step));
          }}
        >
          <Minus size={16} />
        </button>
      )}

      <CompletionIndicator done={done} progress={isCount ? progress : done ? 1 : 0} color={habit.color} showPlus={isCount} burst={burst} />

      {isCount && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] rounded-r-full"
          style={{ background: habit.color }}
          initial={false}
          animate={{ width: `${progress * 100}%`, opacity: progress > 0 ? 0.9 : 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
        />
      )}
    </motion.div>
  );
}
