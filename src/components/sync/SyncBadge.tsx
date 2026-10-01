import { Cloud, CloudAlert, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { STATUS_LABEL, useCloud, type CloudStatus } from '../../hooks/useCloud';
import { cn } from '../../utils/cn';

const ICONS: Record<CloudStatus, typeof Cloud> = {
  local: Cloud,
  'signed-out': Cloud,
  synced: CloudCheck,
  syncing: RefreshCw,
  offline: CloudOff,
  error: CloudAlert,
  paused: CloudAlert,
};

/** Small sync-status link to Settings. `compact` shows the icon only (phone header). */
export function SyncBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { enabled, status } = useCloud();
  if (!enabled || (compact && status === 'signed-out')) return null;
  const Icon = ICONS[status];
  const tone =
    status === 'synced' ? 'text-good' : status === 'error' || status === 'paused' ? 'text-danger' : 'text-muted';

  return (
    <a
      href="#/settings"
      title={STATUS_LABEL[status]}
      aria-label={`Sync: ${STATUS_LABEL[status]}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl text-[13px] font-medium transition-colors hover:bg-surface-2',
        compact ? 'size-9 justify-center' : 'h-10 px-3',
        className,
      )}
    >
      <Icon size={compact ? 18 : 16} className={cn(tone, status === 'syncing' && 'animate-spin [animation-duration:1.6s]')} />
      {!compact && <span className="text-muted">{STATUS_LABEL[status]}</span>}
    </a>
  );
}
