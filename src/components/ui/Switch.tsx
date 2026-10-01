import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <motion.span
        className="block size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)]"
        initial={false}
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 36 }}
      />
    </button>
  );
}
