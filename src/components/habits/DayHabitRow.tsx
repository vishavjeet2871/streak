import { Minus, Plus } from 'lucide-react';
import type { DateKey, Habit } from '../../types';
import { setEntryValue } from '../../db/repo';
import { formatValue, isComplete, progressOf } from '../../utils/schedule';
import { haptic } from '../../utils/celebrate';
import { cn } from '../../utils/cn';
import { HabitTile } from './HabitTile';
import { CompletionIndicator } from './CompletionIndicator';

interface Props {
  habit: Habit;
  date: DateKey;
  value: number;
  status: string;
  disabled?: boolean;
  muted?: boolean;
}

/** Compact editable row for a habit on one specific day (calendar day panel). */
export function DayHabitRow({ habit, date, value, status, disabled, muted }: Props) {
  const done = isComplete(habit, value);
  const set = (v: number) => {
    haptic(10);
    void setEntryValue(habit.id, date, Math.max(0, v));
  };

  return (
    <li className={cn('flex items-center gap-3 py-2.5', muted && !done && 'opacity-60')}>
      <HabitTile emoji={habit.emoji} color={habit.color} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{habit.name}</div>
        <div className="truncate text-[12px] text-muted">{status}</div>
      </div>
      {habit.kind === 'count' ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            disabled={disabled || value <= 0}
            onClick={() => set(value - habit.step)}
            aria-label={`Less ${habit.name}`}
          >
            <Minus size={15} />
          </button>
          <span className="min-w-12 text-center text-[13px] font-semibold tabular">
            {formatValue(value)}
            <span className="font-normal text-faint">/{formatValue(habit.target)}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            disabled={disabled}
            onClick={() => set(value + habit.step)}
            aria-label={`More ${habit.name}`}
          >
            <Plus size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => set(done ? 0 : 1)}
          aria-pressed={done}
          aria-label={`${habit.name}: ${done ? 'done' : 'not done'}`}
          className="rounded-full disabled:opacity-40"
        >
          <CompletionIndicator done={done} progress={progressOf(habit, value)} color={habit.color} burst={0} size={30} />
        </button>
      )}
    </li>
  );
}
