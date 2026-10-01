import { useRef, useState, type ReactNode } from 'react';
import { Bell, Database, Download, FileJson, FileSpreadsheet, Monitor, Moon, Smartphone, Sparkles, Sun, Trash2, Upload } from 'lucide-react';
import type { ThemePref } from '../types';
import { useData } from '../hooks/useData';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useLoadDemo } from '../hooks/useLoadDemo';
import { notificationsSupported, showNotification } from '../hooks/useReminder';
import { clearAllData, saveSettings } from '../db/repo';
import { exportCSV, exportJSON, importJSON } from '../db/backupIO';
import { BackupError } from '../utils/backup';
import { PageHeader } from '../components/layout/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';

const DAY_START_OPTIONS = [0, 1, 2, 3, 4, 5];
const hourLabel = (h: number) => (h === 0 ? 'Midnight' : `${h}:00 AM`);

export function SettingsPage() {
  const { settings, habits, entries } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const loadDemo = useLoadDemo();
  const { canInstall, install, installed, ios } = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(settings.name);
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'));

  const toggleReminder = async (on: boolean) => {
    if (!on) return saveSettings({ reminderEnabled: false });
    if (!notificationsSupported()) {
      toast({ message: 'This browser doesn’t support notifications.', tone: 'error' });
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') {
      toast({ message: 'Notifications are blocked. Allow them in your browser’s site settings.', tone: 'error' });
      return;
    }
    await saveSettings({ reminderEnabled: true });
    toast({ message: `Reminder set for ${settings.reminderTime}`, tone: 'success' });
  };

  const onImport = async (file: File) => {
    const ok = await confirm({
      title: 'Restore from backup?',
      message: `This replaces your ${habits.length} habit${habits.length === 1 ? '' : 's'} and their history with the contents of “${file.name}”.`,
      confirmLabel: 'Replace my data',
      danger: true,
    });
    if (!ok) return;
    try {
      const n = await importJSON(file);
      toast({ message: `Restored ${n.habits} habits and ${n.entries} check-ins`, tone: 'success' });
    } catch (e) {
      toast({ message: e instanceof BackupError ? e.message : 'Couldn’t read that file.', tone: 'error' });
    }
  };

  const wipe = async () => {
    const ok = await confirm({
      title: 'Delete all data?',
      message: 'Every habit and check-in on this device will be erased. This can’t be undone, so export a backup first.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    await clearAllData();
    toast({ message: 'All data deleted' });
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-4">
        <Group title="Appearance">
          <Row label="Theme" hint="Dark is the default when your system is dark.">
            <Segmented<ThemePref>
              value={settings.theme}
              onChange={(theme) => void saveSettings({ theme })}
              size="sm"
              options={[
                { value: 'system', label: <><Monitor size={13} /> Auto</> },
                { value: 'light', label: <><Sun size={13} /> Light</> },
                { value: 'dark', label: <><Moon size={13} /> Dark</> },
              ]}
              aria-label="Theme"
            />
          </Row>
          <Row label="Your name" hint="Used in the greeting on Today.">
            <input
              className="field h-9 w-44 text-sm"
              placeholder="Optional"
              value={name}
              maxLength={30}
              onChange={(e) => {
                setName(e.target.value);
                void saveSettings({ name: e.target.value });
              }}
            />
          </Row>
        </Group>

        <Group title="Day">
          <Row label="New day starts at" hint="Night owl? Check-ins before this hour count toward the previous day.">
            <select
              className="field h-9 w-36 text-sm"
              value={settings.dayStartHour}
              onChange={(e) => void saveSettings({ dayStartHour: Number(e.target.value) })}
            >
              {DAY_START_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </Row>
        </Group>

        <Group title="Reminders" icon={<Bell size={15} />}>
          <Row
            label="Daily reminder"
            hint={
              permission === 'denied' && notificationsSupported()
                ? 'Notifications are blocked for this site in your browser settings.'
                : 'One nudge if habits are still open. Fires while Streak is open in a tab or running as an installed app.'
            }
          >
            <Switch checked={settings.reminderEnabled} onChange={toggleReminder} label="Daily reminder" />
          </Row>
          {settings.reminderEnabled && (
            <Row label="Remind me at">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="field h-9 w-32 text-sm"
                  value={settings.reminderTime}
                  onChange={(e) => e.target.value && void saveSettings({ reminderTime: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void showNotification('Streak', 'This is how your daily reminder will look 🔥')}
                >
                  Test
                </button>
              </div>
            </Row>
          )}
        </Group>

        <Group title="Install" icon={<Smartphone size={15} />}>
          <Row
            label={installed ? 'Installed' : 'Install Streak as an app'}
            hint={
              installed
                ? 'You’re running the installed app. It works offline.'
                : ios
                  ? 'In Safari, tap Share, then “Add to Home Screen”.'
                  : canInstall
                    ? 'Opens in its own window, launches from your dock or home screen, and works offline.'
                    : 'Use your browser’s menu: “Install app” in Chrome / Edge, or “Add to Home Screen” on phones.'
            }
          >
            {canInstall && !installed && (
              <button type="button" className="btn btn-accent btn-sm" onClick={install}>
                <Download size={14} />
                Install
              </button>
            )}
          </Row>
        </Group>

        <Group title="Data" icon={<Database size={15} />}>
          <p className="px-4 pt-3 text-[13px] text-muted sm:px-5">
            Everything lives in this browser’s storage: {habits.length} habit{habits.length === 1 ? '' : 's'},{' '}
            {entries.length} check-ins. Nothing is sent anywhere. Back up now and then, especially before clearing browser data.
          </p>
          <Row label="Backup" hint="A JSON file you can restore on any device.">
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void exportJSON()}>
                <FileJson size={14} />
                Export
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} />
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void onImport(f);
                }}
              />
            </div>
          </Row>
          <Row label="Spreadsheet" hint="Every check-in as CSV, for Excel or Sheets.">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void exportCSV()}>
              <FileSpreadsheet size={14} />
              Export CSV
            </button>
          </Row>
          <Row label="Demo data" hint="90 days of realistic history, to explore the charts.">
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadDemo}>
              <Sparkles size={14} />
              Load demo
            </button>
          </Row>
          <Row label="Delete all data">
            <button type="button" className="btn btn-danger btn-sm" onClick={wipe}>
              <Trash2 size={14} />
              Delete
            </button>
          </Row>
        </Group>

        <Group title="Keyboard">
          <p className="px-4 py-3 text-[13px] text-muted sm:px-5">
            Press <kbd className="kbd">?</kbd> anywhere for the full list. <kbd className="kbd">1</kbd>–<kbd className="kbd">9</kbd>{' '}
            toggle habits on Today, <kbd className="kbd">N</kbd> new habit, <kbd className="kbd">T</kbd> /{' '}
            <kbd className="kbd">C</kbd> / <kbd className="kbd">S</kbd> / <kbd className="kbd">H</kbd> to switch pages.
          </p>
        </Group>

        <p className="pt-4 text-center text-[12px] text-faint">Streak 1.0 · made for showing up every day</p>
      </div>
    </>
  );
}

function Group({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
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

function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
