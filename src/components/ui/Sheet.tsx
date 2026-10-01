import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// Only the top-most sheet reacts to Escape / Tab.
const stack: string[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Bottom sheet on phones (drag the handle to dismiss), centered dialog on larger screens. */
export function Sheet({ open, onClose, title, description, children, footer, className }: SheetProps) {
  const desktop = useMediaQuery('(min-width: 640px)');
  const controls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    stack.push(id);
    const restoreFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
      target?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      stack.splice(stack.indexOf(id), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      restoreFocus?.focus?.({ preventScroll: true });
    };
  }, [open, id]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          data-modal
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onCloseRef.current()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? `${id}-title` : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] border border-line bg-elevated shadow-[var(--shadow-pop)] outline-none sm:max-w-lg sm:rounded-[24px]',
              className,
            )}
            initial={desktop ? { opacity: 0, scale: 0.96, y: 10 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.97, y: 6 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 460, damping: 38 }}
            drag={desktop ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onCloseRef.current();
            }}
          >
            {!desktop && (
              <div className="flex touch-none justify-center pb-1 pt-3" onPointerDown={(e) => controls.start(e)}>
                <div className="h-1.5 w-10 rounded-full bg-line-strong" />
              </div>
            )}
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-3 sm:px-6 sm:pt-6">
                <div className="min-w-0">
                  {title && (
                    <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon -mr-2 -mt-1 shrink-0"
                  onClick={() => onCloseRef.current()}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2 sm:px-6">{children}</div>
            {footer && (
              <div className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
