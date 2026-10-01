import { motion } from 'motion/react';
import { Download, Keyboard, Plus } from 'lucide-react';
import type { Page } from '../../hooks/useRoute';
import { useHabitEditor } from '../../hooks/useHabitEditor';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { cn } from '../../utils/cn';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav';

export function Sidebar({ page, onShowShortcuts }: { page: Page; onShowShortcuts: () => void }) {
  const { openEditor } = useHabitEditor();
  const { canInstall, install } = useInstallPrompt();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg/40 px-3 py-6 backdrop-blur-xl md:flex">
      <a href="#/" className="mb-8 flex items-center gap-2.5 px-3">
        <Logo size={28} />
        <span className="text-[17px] font-semibold tracking-tight">Streak</span>
      </a>

      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {NAV_ITEMS.map(({ page: p, label, icon: Icon, key }) => {
          const active = p === page;
          return (
            <a
              key={p}
              href={p === 'today' ? '#/' : `#/${p}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
                active ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-surface-2 ring-1 ring-line"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon size={18} className={cn('relative', active && 'text-accent')} />
              <span className="relative flex-1">{label}</span>
              <span className="kbd relative opacity-0 transition-opacity group-hover:opacity-100">{key.toUpperCase()}</span>
            </a>
          );
        })}
      </nav>

      <button type="button" className="btn btn-accent mt-6 w-full" onClick={() => openEditor()}>
        <Plus size={17} strokeWidth={2.5} />
        New habit
        <span className="kbd ml-auto border-white/30 text-white/80">N</span>
      </button>

      <div className="mt-auto flex flex-col gap-1">
        {canInstall && (
          <button type="button" className="btn btn-ghost justify-start" onClick={install}>
            <Download size={16} />
            Install app
          </button>
        )}
        <button type="button" className="btn btn-ghost justify-start" onClick={onShowShortcuts}>
          <Keyboard size={16} />
          Shortcuts
          <span className="kbd ml-auto">?</span>
        </button>
      </div>
    </aside>
  );
}

