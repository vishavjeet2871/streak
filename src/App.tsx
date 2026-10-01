import { MotionConfig, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { DataProvider, useData } from './hooks/useData';
import { HabitEditorProvider, useHabitEditor } from './hooks/useHabitEditor';
import { navigate, useRoute, type Page } from './hooks/useRoute';
import { useApplyTheme } from './hooks/useTheme';
import { useHotkeys } from './hooks/useHotkeys';
import { useReminder } from './hooks/useReminder';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncDialog } from './components/sync/SyncDialog';
import { TodayPage } from './pages/TodayPage';

// Today is the landing page and ships in the main bundle; the rest (and Recharts) load on demand.
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const HabitsPage = lazy(() => import('./pages/HabitsPage').then((m) => ({ default: m.HabitsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <DataProvider>
          <ToastProvider>
            <ConfirmProvider>
              <HabitEditorProvider>
                <Shell />
              </HabitEditorProvider>
            </ConfirmProvider>
          </ToastProvider>
        </DataProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

const PAGE_KEYS: Record<string, Page> = { t: 'today', c: 'calendar', s: 'stats', h: 'habits', ',': 'settings' };

function Shell() {
  const route = useRoute();
  const { ready, settings, settingsReady } = useData();
  const { openEditor } = useHabitEditor();
  const [helpOpen, setHelpOpen] = useState(false);

  useApplyTheme(settingsReady ? settings.theme : undefined);
  useReminder();

  useHotkeys((e) => {
    if (e.key === 'n') {
      openEditor();
      return true;
    }
    if (e.key === '?') {
      setHelpOpen(true);
      return true;
    }
    const page = PAGE_KEYS[e.key];
    if (page) {
      navigate(page, route.page === 'stats' && page === 'stats' ? route.param : undefined);
      return true;
    }
  });

  return (
    <div className="min-h-dvh">
      <Sidebar page={route.page} onShowShortcuts={() => setHelpOpen(true)} />
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 md:pb-12 md:pt-10 lg:px-10">
          {ready && settingsReady ? (
            <Suspense fallback={<PageSkeleton />}>
              <motion.div
                key={route.page}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {route.page === 'today' && <TodayPage />}
                {route.page === 'calendar' && <CalendarPage />}
                {route.page === 'stats' && <StatsPage habitId={route.param} />}
                {route.page === 'habits' && <HabitsPage />}
                {route.page === 'settings' && <SettingsPage />}
              </motion.div>
            </Suspense>
          ) : (
            <PageSkeleton />
          )}
        </div>
      </main>
      <BottomNav page={route.page} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SyncDialog />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-40 rounded-lg bg-surface-2" />
      <div className="h-9 w-64 rounded-xl bg-surface-2" />
      <div className="h-44 rounded-[20px] bg-surface-2" />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-[20px] bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
