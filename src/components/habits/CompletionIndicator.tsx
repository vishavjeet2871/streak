import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { Burst } from '../ui/Burst';

interface Props {
  done: boolean;
  /** 0–1, drawn as an arc for count habits */
  progress: number;
  color: string;
  showPlus?: boolean;
  burst: number;
  size?: number;
}

/** Circle that fills with the habit color and draws a check when done. */
export function CompletionIndicator({ done, progress, color, showPlus, burst, size = 38 }: Props) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
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
          animate={{ strokeDashoffset: c * (1 - progress), opacity: progress > 0 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        />
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: color, boxShadow: `0 4px 14px -4px ${color}` }}
        initial={false}
        animate={done ? 'on' : 'off'}
        variants={{
          on: { scale: [0.6, 1.12, 1], opacity: 1 },
          off: { scale: 0.6, opacity: 0 },
        }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1] }}
      />
      <svg viewBox="0 0 24 24" className="relative size-[18px] text-white" aria-hidden>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.28, delay: done ? 0.08 : 0, ease: 'easeOut' }}
        />
      </svg>
      {showPlus && !done && <Plus size={16} className="absolute text-muted" strokeWidth={2.5} />}
      <Burst trigger={burst} color={color} />
    </div>
  );
}
