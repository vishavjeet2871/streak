import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

/** A number that rolls up (or down) to its new value, like an odometer tick. */
export function AnimatedNumber({ value, className, suffix }: { value: number; className?: string; suffix?: string }) {
  // Derived state (React's "storing information from previous renders" pattern).
  const [state, setState] = useState({ value, direction: 1 });
  if (state.value !== value) setState({ value, direction: value > state.value ? 1 : -1 });
  const direction = state.direction;

  return (
    <span className={cn('relative inline-flex overflow-hidden tabular', className)}>
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? '100%' : '-100%', opacity: 0 }),
            center: { y: '0%', opacity: 1 },
            exit: (d: number) => ({ y: d > 0 ? '-100%' : '100%', opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className="inline-block"
        >
          {value}
          {suffix}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
