import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Habit } from '../types';
import { HabitForm } from '../components/habits/HabitForm';

interface EditorApi {
  /** Open the editor for an existing habit, or a blank one for a new habit. */
  openEditor: (habit?: Habit) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function HabitEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; habit?: Habit; session: number }>({ open: false, session: 0 });
  const openEditor = useCallback((habit?: Habit) => setState((s) => ({ open: true, habit, session: s.session + 1 })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const api = useMemo(() => ({ openEditor }), [openEditor]);

  return (
    <EditorContext.Provider value={api}>
      {children}
      {/* A fresh key per opening resets the form; it stays mounted while closing to animate out. */}
      <HabitForm key={state.session} open={state.open} habit={state.habit} onClose={close} />
    </EditorContext.Provider>
  );
}

export function useHabitEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useHabitEditor must be used inside <HabitEditorProvider>');
  return ctx;
}
