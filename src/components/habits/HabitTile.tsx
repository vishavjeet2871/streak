import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';

export function HabitTile({ emoji, color, size = 44, className }: { emoji: string; color: string; size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('habit-tile grid shrink-0 place-items-center', className)}
      style={{ '--c': color, width: size, height: size, borderRadius: size * 0.32, fontSize: size * 0.47 } as CSSProperties}
    >
      <span className="leading-none">{emoji}</span>
    </div>
  );
}
