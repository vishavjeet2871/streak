import { useState, type FormEvent } from 'react';
import { useObservable } from 'dexie-react-hooks';
import { resolveText, type DXCAlert, type DXCUserInteraction } from 'dexie-cloud-addon';
import { CircleAlert, Info, MailCheck, TriangleAlert } from 'lucide-react';
import { db } from '../../db/db';
import { cloudEnabled } from '../../hooks/useCloud';
import { Sheet } from '../ui/Sheet';
import { cn } from '../../utils/cn';

const NEVER = { subscribe: () => ({ unsubscribe() {} }) };
const OTP_LENGTH = 8;

/**
 * Renders Dexie Cloud's sign-in steps (email → one-time code) and its alerts
 * in Streak's own sheet, instead of the addon's default dialog.
 */
export function SyncDialog() {
  const interaction = useObservable(cloudEnabled ? db.cloud.userInteraction : NEVER);
  // Keep the last step on screen while the sheet animates out, and count steps so
  // each new prompt (including a retry after a wrong code) starts with a fresh form.
  const [last, setLast] = useState<{ i?: DXCUserInteraction; step: number }>({ step: 0 });
  if (interaction && interaction !== last.i) setLast({ i: interaction, step: last.step + 1 });
  const shown = interaction ?? last.i;

  return (
    <Sheet open={!!interaction} onClose={() => interaction?.onCancel()} title={shown ? titleFor(shown) : undefined}>
      {/* Keyed per step so inputs reset between the email and code steps */}
      {shown && <InteractionForm key={last.step} interaction={shown} />}
    </Sheet>
  );
}

function titleFor(i: DXCUserInteraction): string {
  switch (i.type) {
    case 'email':
      return 'Sync across devices';
    case 'otp':
      return 'Check your email';
    case 'logout-confirmation':
      return 'Sign out?';
    default:
      return i.title;
  }
}

function InteractionForm({ interaction: i }: { interaction: DXCUserInteraction }) {
  const fieldNames = Object.keys(i.fields ?? {});
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = (e?: FormEvent, override?: Record<string, string>) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    const all = { ...values, ...override };
    i.onSubmit(Object.fromEntries(fieldNames.map((n) => [n, (all[n] ?? '').trim()])));
  };

  const canSubmit = fieldNames.every((n) => (values[n] ?? '').trim().length > 0);
  const danger = i.type === 'logout-confirmation';

  return (
    <form onSubmit={submit} className="space-y-4">
      {i.type === 'email' && (
        <p className="text-[14px] leading-relaxed text-muted">
          Sign in with your email on each device and your habits stay in sync automatically. We’ll send you a one-time
          code; there’s no password.
        </p>
      )}

      {i.alerts.length > 0 && (
        <div className="space-y-2">
          {i.alerts.map((a, n) => (
            <AlertRow key={n} alert={a} />
          ))}
        </div>
      )}

      {fieldNames.map((name) => {
        const f = i.fields[name] as { type?: string; label?: string; placeholder?: string };
        const isOtp = i.type === 'otp' || f.type === 'otp';
        const isEmail = i.type === 'email' || f.type === 'email';
        return (
          <div key={name}>
            {f.label && !isOtp && (
              <label className="label" htmlFor={`dxc-${name}`}>
                {f.label}
              </label>
            )}
            <input
              id={`dxc-${name}`}
              data-autofocus
              className={cn('field', isOtp && 'h-14 text-center font-mono text-2xl font-semibold tracking-[0.3em]')}
              type={isEmail ? 'email' : f.type === 'password' ? 'password' : 'text'}
              inputMode={isEmail ? 'email' : undefined}
              // Codes are 8 letters/digits; uppercase like the server expects.
              autoCapitalize={isOtp ? 'characters' : 'off'}
              autoCorrect="off"
              spellCheck={false}
              maxLength={isOtp ? OTP_LENGTH : undefined}
              autoComplete={isOtp ? 'one-time-code' : isEmail ? 'email' : undefined}
              placeholder={isOtp ? 'ABCD1234' : isEmail ? 'you@example.com' : f.placeholder}
              aria-label={isOtp ? 'One-time code' : (f.label ?? f.placeholder ?? name)}
              value={values[name] ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const value = isOtp ? raw.toUpperCase().replace(/\s/g, '') : isEmail ? raw.toLowerCase() : raw;
                setValues((v) => ({ ...v, [name]: value }));
                // Pasting or typing the full code signs you in right away.
                if (isOtp && value.length === OTP_LENGTH) submit(undefined, { [name]: value });
              }}
            />
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-1">
        {i.cancelLabel && (
          <button type="button" className="btn btn-secondary" onClick={() => i.onCancel()}>
            {i.type === 'logout-confirmation' ? 'Keep me signed in' : 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          className={cn('btn min-w-28', danger ? 'btn-danger' : 'btn-primary')}
          disabled={busy || (fieldNames.length > 0 && !canSubmit)}
          data-autofocus={fieldNames.length === 0 ? true : undefined}
        >
          {busy
            ? 'Working…'
            : i.type === 'email'
              ? 'Send code'
              : i.type === 'otp'
                ? 'Sign in'
                : danger
                  ? 'Sign out anyway'
                  : i.submitLabel || 'OK'}
        </button>
      </div>
    </form>
  );
}

function AlertRow({ alert }: { alert: DXCAlert }) {
  const Icon = alert.type === 'error' ? CircleAlert : alert.type === 'warning' ? TriangleAlert : alert.messageCode === 'OTP_SENT' ? MailCheck : Info;
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[13px] leading-snug',
        alert.type === 'error' && 'bg-danger/10 text-danger',
        alert.type === 'warning' && 'bg-accent/10 text-fg',
        alert.type === 'info' && 'bg-surface-2 text-fg',
      )}
      role={alert.type === 'error' ? 'alert' : undefined}
    >
      <Icon size={16} className="mt-px shrink-0" />
      <span>{resolveText(alert)}</span>
    </div>
  );
}
