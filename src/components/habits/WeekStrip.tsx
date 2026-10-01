import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateKey } from '../../types';
import { addDays, formatDate, parseKey, startOfWeek, WEEKDAY_LETTER, weekday } from '../../utils/dates';
import type { DayScore } from '../../utils/stats';
import { ProgressRing } from '../ui/ProgressRing';
import { cn } from '../../utils/cn';

interface Props {
  selected: DateKey;
  today: DateKey;
  onSelect: (date: DateKey) => void;
  scoreFor: (date: DateKey) => DayScore;
}

/** Mon–Sun strip with a mini completion ring per day. Pick a past day to log it. */
export function WeekStrip({ selected, today, onSelect, scoreFor }: Props) {
  const start = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const canGoForward = addDays(start, 7) <= today;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon shrink-0"
        aria-label="Previous week"
        onClick={() => onSelect(addDays(selected, -7))}
      >
        <ChevronLeft size={18} />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-0.5 sm:gap-1.5">
        {days.map((d) => {
          const future = d > today;
          const isSel = d === selected;
          const score = scoreFor(d);
          const rate = future ? 0 : (score.rate ?? 0);
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              onClick={() => onSelect(d)}
              aria-label={formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}
              aria-current={isSel ? 'date' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors duration-150',
                isSel ? 'bg-surface-2 ring-1 ring-line-strong' : 'hover:bg-surface-2',
                future && 'opacity-35',
              )}
            >
              <span className={cn('text-[11px] font-medium', isSel ? 'text-fg' : 'text-faint')}>
                {WEEKDAY_LETTER[weekday(d)]}
              </span>
              <ProgressRing value={rate} size={30} stroke={3} color={rate >= 1 ? 'var(--good)' : 'var(--accent)'}>
                <span className={cn('text-[12px] font-semibold tabular', d === today ? 'text-accent' : isSel ? 'text-fg' : 'text-muted')}>
                  {parseKey(d)[2]}
                </span>
              </ProgressRing>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon shrink-0"
        aria-label="Next week"
        disabled={!canGoForward}
        onClick={() => {
          const next = addDays(selected, 7);
          onSelect(next > today ? today : next);
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
