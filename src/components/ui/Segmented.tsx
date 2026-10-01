import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Option<T> {
  value: T;
  label: ReactNode;
}

interface Props<T> {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

export function Segmented<T extends string | number>({ value, onChange, options, size = 'md', className, ...rest }: Props<T>) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn('relative inline-flex rounded-xl border border-line bg-surface-2 p-[3px]', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center whitespace-nowrap rounded-[9px] px-3 font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 text-[12.5px]' : 'h-8 text-[13px]',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[9px] bg-elevated shadow-[0_1px_3px_rgb(0_0_0/0.12)] ring-1 ring-line dark:bg-white/[0.09]"
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
