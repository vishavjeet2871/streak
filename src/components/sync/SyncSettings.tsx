import { useState } from 'react';
import { CloudCheck, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { db } from '../../db/db';
import { signIn, signOut, STATUS_LABEL, useCloud } from '../../hooks/useCloud';
import { useConfirm } from '../ui/Confirm';
import { useToast } from '../ui/Toast';
import { cn } from '../../utils/cn';
import { Group, Row } from '../ui/SettingsGroup';

const MANAGER_URL = 'https://manager.dexie.cloud';

function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return d.toLocaleDateString();
}

/** The "Sync" group on the Settings page. */
export function SyncSettings() {
  const cloud = useCloud();
  const confirm = useConfirm();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  if (!cloud.enabled) return null;

  if (!cloud.signedIn) {
    return (
      <Group title="Sync" icon={<CloudCheck size={15} />}>
        <Row
          label="Sync across devices"
          hint="Sign in with your email on your laptop and phone. Habits and check-ins then stay in sync automatically, and still work offline."
        >
          <button type="button" className="btn btn-accent btn-sm" onClick={() => void signIn()}>
            Sign in
          </button>
        </Row>
      </Group>
    );
  }

  const evalDays = cloud.license?.type === 'eval' ? cloud.license.evalDaysLeft : undefined;

  return (
    <Group title="Sync" icon={<CloudCheck size={15} />}>
      <Row
        label={cloud.email ?? 'Signed in'}
        hint={
          <span className={cn(cloud.status === 'error' || cloud.status === 'paused' ? 'text-danger' : undefined)}>
            {STATUS_LABEL[cloud.status]}
            {cloud.lastSynced && cloud.status !== 'syncing' ? ` · last synced ${timeAgo(cloud.lastSynced)}` : ''}
            {cloud.status === 'error' && cloud.error ? ` · ${cloud.error.message}` : ''}
          </span>
        }
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            try {
              await db.cloud.sync({ wait: true, purpose: 'pull' });
              toast({ message: 'Up to date', tone: 'success' });
            } catch {
              toast({ message: 'Couldn’t reach the sync server. Changes are saved and will sync later.', tone: 'error' });
            } finally {
              setSyncing(false);
            }
          }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : undefined} />
          Sync now
        </button>
      </Row>

      {(evalDays !== undefined || cloud.status === 'paused') && (
        <div className="px-4 py-3.5 sm:px-5">
          <div className="rounded-xl bg-accent/10 px-3.5 py-3 text-[13px] leading-relaxed">
            {cloud.status === 'paused' ? (
              <>Sync is paused because this account’s evaluation period ended. Your data is safe on this device.</>
            ) : (
              <>
                This is an <b>evaluation</b> account: {evalDays} active day{evalDays === 1 ? '' : 's'} of sync left.
              </>
            )}{' '}
            Make it permanent for free: open Dexie Cloud Manager, sign in with the email you used to create the database,
            and upgrade <b>{cloud.email}</b> to a production user.
            <a
              href={MANAGER_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex w-fit items-center gap-1 font-medium text-accent hover:underline"
            >
              Open Dexie Cloud Manager <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}

      <Row label="Sign out" hint="Removes the synced copy from this device. Everything stays in your account.">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const ok = await confirm({
              title: 'Sign out of sync?',
              message:
                'Your habits and history will be removed from this device but stay safe in your account. Sign in again to bring them back.',
              confirmLabel: 'Sign out',
            });
            if (ok && (await signOut())) toast({ message: 'Signed out' });
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </Row>
    </Group>
  );
}
