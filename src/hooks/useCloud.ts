import { useObservable } from 'dexie-react-hooks';
import { CLOUD_URL, db } from '../db/db';

export const cloudEnabled = !!CLOUD_URL;

/** Stand-in observable for builds without a sync URL. */
const NEVER = { subscribe: () => ({ unsubscribe() {} }) };

export type CloudStatus = 'local' | 'signed-out' | 'synced' | 'syncing' | 'offline' | 'error' | 'paused';

export const STATUS_LABEL: Record<CloudStatus, string> = {
  local: 'This device only',
  'signed-out': 'Sign in to sync',
  synced: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline · will sync',
  error: 'Sync error',
  paused: 'Sync paused',
};

export function useCloud() {
  const user = useObservable(cloudEnabled ? db.cloud.currentUser : NEVER);
  const sync = useObservable(cloudEnabled ? db.cloud.syncState : NEVER);
  const persisted = useObservable(cloudEnabled ? db.cloud.persistedSyncState : NEVER);

  const signedIn = !!user?.isLoggedIn;
  const license = user?.license;
  let status: CloudStatus;
  if (!cloudEnabled) status = 'local';
  else if (!signedIn) status = 'signed-out';
  else if (license && license.status !== 'ok') status = 'paused';
  else if (sync?.phase === 'error' || sync?.status === 'error') status = 'error';
  else if (sync?.phase === 'offline' || sync?.status === 'offline') status = 'offline';
  else if (sync?.phase === 'in-sync') status = 'synced';
  else status = 'syncing';

  return {
    enabled: cloudEnabled,
    signedIn,
    email: user?.email,
    license,
    status,
    error: sync?.error,
    lastSynced: persisted?.timestamp,
  };
}

export async function signIn(): Promise<void> {
  try {
    await db.cloud.login();
  } catch {
    // Cancelled by the user, or the error was already shown in the sign-in sheet.
  }
}

export async function signOut(): Promise<boolean> {
  try {
    await db.cloud.logout();
    return true;
  } catch {
    // The user kept their unsynced changes instead of signing out.
    return false;
  }
}
