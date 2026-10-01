import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../ui/Toast';
import { addHabit } from '../../db/repo';
import { STARTERS, starterInput } from '../../utils/starters';
import { describeFrequency } from '../../utils/schedule';
import { HabitTile } from './HabitTile';

/** One-tap starter habits; hides the ones you already have. */
export function StarterSuggestions({ compact = false }: { compact?: boolean }) {
  const { habits, today } = useData();
  const toast = useToast();
  const existing = new Set(habits.map((h) => h.name.toLowerCase()));
  const available = STARTERS.filter((s) => !existing.has(s.template.name.toLowerCase()));
  if (available.length === 0) return null;

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid gap-2 sm:grid-cols-2'}>
      <AnimatePresence initial={false}>
        {available.map((s) => (
          <motion.button
            key={s.key}
            type="button"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await addHabit(starterInput(s, today));
              toast({ message: `Added “${s.template.name}”`, tone: 'success' });
            }}
            className={
              compact
                ? 'flex h-9 items-center gap-2 rounded-full border border-line bg-surface-2 pl-2 pr-3 text-[13px] font-medium transition-colors hover:border-line-strong hover:bg-surface'
                : 'card flex items-center gap-3 p-3 text-left transition-colors hover:border-line-strong'
            }
          >
            {compact ? (
              <span className="text-base leading-none">{s.template.emoji}</span>
            ) : (
              <HabitTile emoji={s.template.emoji} color={s.template.color} size={38} />
            )}
            <span className={compact ? '' : 'min-w-0 flex-1'}>
              <span className="block truncate text-[14px] font-medium">{s.template.name}</span>
              {!compact && (
                <span className="block text-[12px] text-muted">{describeFrequency(s.template.frequency)}</span>
              )}
            </span>
            <Plus size={compact ? 14 : 16} className="shrink-0 text-muted" />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
