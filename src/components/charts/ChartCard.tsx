import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  /** The same data as a table: every chart gets a non-hover, non-color way to read it. */
  table?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, legend, table, className, children }: Props) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('card min-w-0 p-4 sm:p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {legend && !asTable && <div className="hidden items-center gap-3 sm:flex">{legend}</div>}
          {table && (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon -mr-1.5 -mt-1"
              aria-pressed={asTable}
              aria-label={asTable ? 'Show chart' : 'Show as table'}
              title={asTable ? 'Show chart' : 'Show as table'}
              onClick={() => setAsTable((v) => !v)}
            >
              {asTable ? <BarChart3 size={15} /> : <Table2 size={15} />}
            </button>
          )}
        </div>
      </header>
      {legend && !asTable && <div className="-mt-2 mb-3 flex items-center gap-3 sm:hidden">{legend}</div>}
      {asTable ? <div className="max-h-72 overflow-auto rounded-xl border border-line">{table}</div> : children}
    </section>
  );
}

export function LegendKey({ color, label, shape = 'line' }: { color: string; label: string; shape?: 'line' | 'rect' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span
        aria-hidden
        className={shape === 'line' ? 'h-[2px] w-3.5 rounded-full' : 'size-2.5 rounded-[3px]'}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

interface TooltipRow {
  value: string;
  label: string;
  color?: string;
}

/** Values lead, labels follow; series keyed by a short line, not a box. */
export function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="pointer-events-none min-w-36 rounded-xl border border-line bg-elevated/95 px-3 py-2 shadow-[var(--shadow-pop)] backdrop-blur-xl">
      <div className="mb-1 text-[12px] text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5 text-[13px]">
          {r.color && <span aria-hidden className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: r.color }} />}
          <span className="font-semibold text-fg tabular">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="sticky top-0 bg-elevated">
        <tr>
          {columns.map((c, i) => (
            <th key={c} className={cn('px-3 py-2 font-medium text-muted', i > 0 && 'text-right')}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className={cn('px-3 py-1.5', j > 0 && 'text-right tabular')}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const pct = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`);
