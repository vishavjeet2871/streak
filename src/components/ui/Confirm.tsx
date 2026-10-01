import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the dialog doesn't go blank during its exit animation.
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={open}
        onClose={() => close(false)}
        title={options.title}
        footer={
          <div className="flex w-full justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
              Cancel
            </button>
            <button
              type="button"
              data-autofocus
              className={options.danger ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={() => close(true)}
            >
              {options.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        }
      >
        {options.message && <div className="text-sm leading-relaxed text-muted">{options.message}</div>}
      </Sheet>
    </ConfirmContext.Provider>
  );
}
