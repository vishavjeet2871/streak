import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ToastInput {
  message: ReactNode;
  tone?: 'default' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.action ? 6000 : 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
          aria-live="polite"
        >
          <AnimatePresence initial={false}>
            {items.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-elevated/95 py-2.5 pl-4 pr-2.5 text-sm shadow-[var(--shadow-pop)] backdrop-blur-xl"
              >
                {t.tone === 'success' && <CircleCheck size={16} className="shrink-0 text-good" />}
                {t.tone === 'error' && <CircleAlert size={16} className="shrink-0 text-danger" />}
                <span className={cn('min-w-0', !t.action && 'pr-1.5')}>{t.message}</span>
                {t.action && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm shrink-0"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
