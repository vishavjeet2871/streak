import type { StreakInfo } from '../../utils/streaks';
import { formatStreak } from '../../utils/streaks';
import { startOfWeek } from '../../utils/dates';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { cn } from '../../utils/cn';
import type { DateKey } from '../../types';

/** 🔥 current streak, with a ❄️ when a freeze saved it this week. */
export function StreakBadge({ streak, today, className }: { streak: StreakInfo; today: DateKey; className?: string }) {
  const { current, unit, frozen } = streak;
  const thisWeek = startOfWeek(today);
  const frozeThisWeek = frozen.some((d) => (unit === 'week' ? d === thisWeek : startOfWeek(d) === thisWeek));
  const label = `Current streak: ${formatStreak(current, unit)}${frozeThisWeek ? ', freeze used this week' : ''}`;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1 text-[14px] font-semibold',
        current > 0 ? 'text-fg' : 'text-faint',
        className,
      )}
      title={label}
      aria-label={label}
    >
      {frozeThisWeek && <span className="text-[12px]">❄️</span>}
      <span className={cn('text-[15px] leading-none', current === 0 && 'opacity-40 grayscale')}>🔥</span>
      <AnimatedNumber value={current} />
      {unit === 'week' && <span className="-ml-0.5 text-[11px] font-medium text-muted">w</span>}
    </div>
  );
}
