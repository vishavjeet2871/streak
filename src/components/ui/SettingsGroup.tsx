import type { ReactNode } from 'react';

export function Group({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px] font-semibold text-muted sm:px-5">
        {icon}
        {title}
      </h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <div className="break-words text-[14px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
