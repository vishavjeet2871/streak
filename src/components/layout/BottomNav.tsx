import { motion } from 'motion/react';
import type { Page } from '../../hooks/useRoute';
import { cn } from '../../utils/cn';
import { NAV_ITEMS } from './nav';

/** Thumb-reachable tab bar for phones. */
export function BottomNav({ page }: { page: Page }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/80 pb-safe backdrop-blur-2xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {NAV_ITEMS.map(({ page: p, label, icon: Icon }) => {
          const active = p === page;
          return (
            <a
              key={p}
              href={p === 'today' ? '#/' : `#/${p}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-fg' : 'text-faint',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-active"
                  className="absolute top-2 h-8 w-14 rounded-full bg-surface-2"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon size={21} className={cn('relative', active && 'text-accent')} strokeWidth={active ? 2.3 : 2} />
              <span className="relative">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
