import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface Props {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--accent)',
  track = 'var(--cell-empty)',
  className,
  children,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`relative inline-grid shrink-0 place-items-center ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v), opacity: v > 0 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 22 }}
        />
      </svg>
      {children !== undefined && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
