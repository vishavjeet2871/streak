import { useMemo, useState, type CSSProperties } from 'react';
import { Archive, Minus, Plus, Trash2 } from 'lucide-react';
import type { DateKey, Frequency, Habit, HabitKind } from '../../types';
import { addHabit, archiveHabit, deleteHabit, restoreHabit, undoDelete, updateHabit, type HabitInput } from '../../db/repo';
import { useData } from '../../hooks/useData';
import { HABIT_COLORS } from '../../utils/colors';
import { isDateKey, WEEKDAY_ORDER, WEEKDAY_SHORT } from '../../utils/dates';
import { describeFrequency } from '../../utils/schedule';
import { cn } from '../../utils/cn';
import { Sheet } from '../ui/Sheet';
import { Segmented } from '../ui/Segmented';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/Confirm';
import { HabitTile } from './HabitTile';

const EMOJIS = [
  '💻', '📚', '🏋️', '🏃', '🧘', '😴', '💧', '🥗',
  '✍️', '🧠', '🎯', '🎸', '🎨', '🌱', '🚶', '🚴',
  '🏊', '🧹', '💊', '🦷', '☀️', '🌙', '📵', '💰',
  '🗣️', '🎧', '🧪', '♟️', '🙏', '❤️', '🍎', '⏰',
];

type FreqType = Frequency['type'];

interface Draft {
  name: string;
  emoji: string;
  color: string;
  kind: HabitKind;
  target: string;
  unit: string;
  step: string;
  freqType: FreqType;
  days: number[];
  times: number;
  startDate: DateKey;
  freezes: boolean;
}

function toDraft(h: Habit): Draft {
  return {
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    kind: h.kind,
    target: String(h.kind === 'count' ? h.target : 3),
    unit: h.unit,
    step: String(h.step),
    freqType: h.frequency.type,
    days: h.frequency.type === 'weekdays' ? h.frequency.days : [1, 3, 5],
    times: h.frequency.type === 'weekly' ? h.frequency.times : 3,
    startDate: h.startDate,
    freezes: h.freezes,
  };
}

/** Defaults to the first icon and color not already taken by another habit. */
function emptyDraft(today: DateKey, existing: Habit[]): Draft {
  const usedEmoji = new Set(existing.map((h) => h.emoji));
  const usedColor = new Set(existing.map((h) => h.color));
  const firstFree = <T,>(list: readonly T[], used: (x: T) => boolean) => list.find((x) => !used(x)) ?? list[existing.length % list.length];
  return {
    name: '',
    emoji: firstFree(EMOJIS, (e) => usedEmoji.has(e)),
    color: firstFree(HABIT_COLORS, (c) => usedColor.has(c.hex)).hex,
    kind: 'check',
    target: '3',
    unit: '',
    step: '1',
    freqType: 'daily',
    days: [1, 3, 5],
    times: 3,
    startDate: today,
    freezes: true,
  };
}

/** First grapheme of whatever was typed, so "🏋️‍♀️" stays intact. */
function firstGrapheme(text: string): string {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return seg.segment(text.trim())[Symbol.iterator]().next().value?.segment ?? '';
}

interface Props {
  open: boolean;
  habit?: Habit;
  onClose: () => void;
}

export function HabitForm({ open, habit, onClose }: Props) {
  const { today, habits } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(() => (habit ? toDraft(habit) : emptyDraft(today, habits)));
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const frequency: Frequency = useMemo(() => {
    if (draft.freqType === 'weekdays') return { type: 'weekdays', days: [...draft.days].sort((a, b) => a - b) };
    if (draft.freqType === 'weekly') return { type: 'weekly', times: draft.times };
    return { type: 'daily' };
  }, [draft.freqType, draft.days, draft.times]);

  const target = Number(draft.target);
  const step = Number(draft.step);
  const errors = {
    name: !draft.name.trim() ? 'Give your habit a name' : null,
    target: draft.kind === 'count' && !(target > 0) ? 'Target must be above 0' : null,
    step: draft.kind === 'count' && !(step > 0) ? 'Must be above 0' : null,
    days: draft.freqType === 'weekdays' && draft.days.length === 0 ? 'Pick at least one day' : null,
    startDate: !isDateKey(draft.startDate) ? 'Pick a valid date' : null,
  };
  const valid = Object.values(errors).every((e) => e === null);

  const save = async () => {
    setSubmitted(true);
    if (!valid) return;
    const input: HabitInput = {
      name: draft.name.trim(),
      emoji: draft.emoji || '✨',
      color: draft.color,
      kind: draft.kind,
      target: draft.kind === 'count' ? target : 1,
      unit: draft.unit.trim(),
      step: draft.kind === 'count' ? step : 1,
      frequency,
      startDate: draft.startDate,
      freezes: draft.freezes,
    };
    if (habit) {
      await updateHabit(habit.id, input);
      toast({ message: 'Saved', tone: 'success' });
    } else {
      await addHabit(input);
      toast({ message: `Added “${input.name}”`, tone: 'success' });
    }
    onClose();
  };

  const archive = async () => {
    if (!habit) return;
    await archiveHabit(habit.id, today);
    onClose();
    toast({ message: `Archived “${habit.name}”`, action: { label: 'Undo', onClick: () => restoreHabit(habit.id) } });
  };

  const remove = async () => {
    if (!habit) return;
    const ok = await confirm({
      title: `Delete “${habit.name}”?`,
      message: 'This removes the habit and its whole history. Archive it instead if you might want the stats later.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const deleted = await deleteHabit(habit.id);
    onClose();
    if (deleted) toast({ message: 'Habit deleted', action: { label: 'Undo', onClick: () => undoDelete(deleted) } });
  };

  const show = (key: keyof typeof errors) => (submitted ? errors[key] : null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      footer={
        <>
          {habit && (
            <div className="flex gap-1">
              <button type="button" className="btn btn-ghost btn-icon" onClick={archive} aria-label="Archive" title="Archive">
                <Archive size={17} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon hover:!text-danger"
                onClick={remove}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={17} />
              </button>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary min-w-24" onClick={save}>
              {habit ? 'Save' : 'Create habit'}
            </button>
          </div>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {/* Name + preview */}
        <div className="flex items-center gap-3">
          <HabitTile emoji={draft.emoji || '✨'} color={draft.color} size={52} />
          <div className="min-w-0 flex-1">
            <input
              data-autofocus
              className="field text-base"
              placeholder="e.g. Solve 2 LeetCode problems"
              value={draft.name}
              maxLength={80}
              onChange={(e) => set('name', e.target.value)}
              aria-label="Habit name"
              aria-invalid={!!show('name')}
            />
            {show('name') && <p className="mt-1.5 text-xs text-danger">{show('name')}</p>}
          </div>
        </div>

        {/* Icon */}
        <div>
          <span className="label">Icon</span>
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set('emoji', e)}
                aria-label={`Icon ${e}`}
                aria-pressed={draft.emoji === e}
                className={cn(
                  'grid aspect-square place-items-center rounded-xl text-[20px] transition',
                  draft.emoji === e ? 'bg-surface-2 ring-2 ring-[color:var(--c)]' : 'hover:bg-surface-2',
                )}
                style={{ '--c': draft.color } as CSSProperties}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className="field mt-2 h-10 text-sm"
            placeholder="Or type / paste any emoji"
            onChange={(e) => {
              const g = firstGrapheme(e.target.value);
              if (g) set('emoji', g);
            }}
            aria-label="Custom emoji"
          />
        </div>

        {/* Color */}
        <div>
          <span className="label">Color</span>
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => set('color', c.hex)}
                aria-label={c.name}
                aria-pressed={draft.color === c.hex}
                className="grid size-8 place-items-center rounded-full transition hover:scale-110"
                style={{ background: c.hex, boxShadow: draft.color === c.hex ? `0 0 0 2px var(--elevated), 0 0 0 4px ${c.hex}` : undefined }}
              />
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <span className="label">Type</span>
          <Segmented
            className="w-full"
            value={draft.kind}
            onChange={(k) => set('kind', k)}
            options={[
              { value: 'check', label: 'Done / not done' },
              { value: 'count', label: 'Count' },
            ]}
            aria-label="Habit type"
          />
          {draft.kind === 'check' ? (
            <div className="mt-3">
              <input
                className="field"
                placeholder="Goal note (optional), e.g. 30 min"
                value={draft.unit}
                maxLength={40}
                onChange={(e) => set('unit', e.target.value)}
                aria-label="Goal note"
              />
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-[1fr_1.3fr_1fr] gap-2">
              <div>
                <label className="label text-xs" htmlFor="hf-target">
                  Daily target
                </label>
                <input
                  id="hf-target"
                  className="field tabular"
                  inputMode="decimal"
                  value={draft.target}
                  onChange={(e) => set('target', e.target.value)}
                  aria-invalid={!!show('target')}
                />
              </div>
              <div>
                <label className="label text-xs" htmlFor="hf-unit">
                  Unit
                </label>
                <input
                  id="hf-unit"
                  className="field"
                  placeholder="problems, min, L"
                  value={draft.unit}
                  maxLength={40}
                  onChange={(e) => set('unit', e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs" htmlFor="hf-step">
                  Per tap
                </label>
                <input
                  id="hf-step"
                  className="field tabular"
                  inputMode="decimal"
                  value={draft.step}
                  onChange={(e) => set('step', e.target.value)}
                  aria-invalid={!!show('step')}
                />
              </div>
              {(show('target') || show('step')) && (
                <p className="col-span-3 text-xs text-danger">{show('target') ?? `Per tap: ${show('step')}`}</p>
              )}
            </div>
          )}
        </div>

        {/* Frequency */}
        <div>
          <span className="label">Repeat</span>
          <Segmented
            className="w-full"
            value={draft.freqType}
            onChange={(t) => set('freqType', t)}
            options={[
              { value: 'daily', label: 'Every day' },
              { value: 'weekdays', label: 'Specific days' },
              { value: 'weekly', label: 'Times a week' },
            ]}
            aria-label="Repeat"
          />
          {draft.freqType === 'weekdays' && (
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {WEEKDAY_ORDER.map((d) => {
                const on = draft.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('days', on ? draft.days.filter((x) => x !== d) : [...draft.days, d])}
                    className={cn(
                      'h-10 rounded-xl text-[13px] font-medium transition',
                      on ? 'text-white' : 'bg-surface-2 text-muted hover:text-fg',
                    )}
                    style={on ? { background: draft.color } : undefined}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
              {show('days') && <p className="col-span-7 text-xs text-danger">{show('days')}</p>}
            </div>
          )}
          {draft.freqType === 'weekly' && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                aria-label="Fewer"
                disabled={draft.times <= 1}
                onClick={() => set('times', draft.times - 1)}
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-xl font-semibold tabular">{draft.times}</span>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                aria-label="More"
                disabled={draft.times >= 6}
                onClick={() => set('times', draft.times + 1)}
              >
                <Plus size={16} />
              </button>
              <span className="text-sm text-muted">times per week, any days</span>
            </div>
          )}
          <p className="mt-2 text-xs text-faint">{describeFrequency(frequency)}</p>
        </div>

        {/* Start + freeze */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hf-start">
              Start date
            </label>
            <input
              id="hf-start"
              type="date"
              className="field"
              value={draft.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              aria-invalid={!!show('startDate')}
            />
            {show('startDate') && <p className="mt-1.5 text-xs text-danger">{show('startDate')}</p>}
          </div>
          <div>
            <span className="label">Streak freeze</span>
            <div className="flex h-11 items-center gap-3">
              <Switch checked={draft.freezes} onChange={(v) => set('freezes', v)} label="Streak freeze" />
              <span className="text-[13px] leading-tight text-muted">1 missed day a week won’t break it ❄️</span>
            </div>
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
