import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ArchiveRestore, BarChart3, ChevronDown, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Habit } from '../types';
import { useData } from '../hooks/useData';
import { useHabitEditor } from '../hooks/useHabitEditor';
import { deleteHabit, reorderHabits, restoreHabit, undoDelete } from '../db/repo';
import { describeFrequency, describeTarget } from '../utils/schedule';
import { formatDate } from '../utils/dates';
import { cn } from '../utils/cn';
import { PageHeader } from '../components/layout/PageHeader';
import { HabitTile } from '../components/habits/HabitTile';
import { StreakBadge } from '../components/habits/StreakBadge';
import { StarterSuggestions } from '../components/habits/StarterSuggestions';
import { useConfirm } from '../components/ui/Confirm';
import { useToast } from '../components/ui/Toast';
import { DuplicatesBanner } from '../components/habits/DuplicatesBanner';

export function HabitsPage() {
  const { activeHabits, archivedHabits } = useData();
  const { openEditor } = useHabitEditor();
  const [showArchived, setShowArchived] = useState(false);

  // Local order so a drop renders instantly, before IndexedDB echoes it back.
  const activeIds = activeHabits.map((h) => h.id);
  const [order, setOrder] = useState(activeIds);
  const [synced, setSynced] = useState(activeIds.join());
  if (synced !== activeIds.join()) {
    setSynced(activeIds.join());
    setOrder(activeIds);
  }
  const byId = new Map(activeHabits.map((h) => [h.id, h]));
  const ordered = order.map((id) => byId.get(id)).filter((h): h is Habit => !!h);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    void reorderHabits([...next, ...archivedHabits.map((h) => h.id)]);
  };

  return (
    <>
      <PageHeader
        title="Habits"
        subtitle={activeHabits.length > 1 ? 'Drag the handle to reorder. Order here is the order on Today.' : undefined}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openEditor()}>
            <Plus size={16} strokeWidth={2.5} />
            New habit
          </button>
        }
      />

      <DuplicatesBanner />

      {ordered.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {ordered.map((h) => (
                <SortableHabitRow key={h.id} habit={h} onEdit={() => openEditor(h)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="card px-6 py-10 text-center">
          <p className="font-medium">No active habits</p>
          <p className="mt-1 text-sm text-muted">Create one, or pick a starter below.</p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="section-title mb-3">Starter ideas</h2>
        <StarterSuggestions compact />
      </div>

      {archivedHabits.length > 0 && (
        <div className="mt-10">
          <button
            type="button"
            className="section-title mb-3 flex items-center gap-1.5 hover:text-fg"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            <ChevronDown size={15} className={cn('transition-transform', !showArchived && '-rotate-90')} />
            Archived ({archivedHabits.length})
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2">
              {archivedHabits.map((h) => (
                <ArchivedRow key={h.id} habit={h} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function SortableHabitRow({ habit, onEdit }: { habit: Habit; onEdit: () => void }) {
  const { today, streaks } = useData();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'card relative flex items-center gap-3 py-3 pl-2 pr-3 sm:pr-4',
        isDragging && 'z-10 border-line-strong shadow-[var(--shadow-pop)]',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${habit.name}`}
        className="grid h-10 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <HabitTile emoji={habit.emoji} color={habit.color} size={40} />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <div className="truncate text-[15px] font-medium">{habit.name}</div>
        <div className="truncate text-[13px] text-muted">
          {[describeFrequency(habit.frequency), describeTarget(habit), habit.freezes ? '❄️' : '']
            .filter(Boolean)
            .join(' · ')}
        </div>
      </button>
      <StreakBadge streak={streaks.get(habit.id)!} today={today} className="hidden sm:flex" />
      <div className="flex shrink-0 items-center">
        <a href={`#/stats/${encodeURIComponent(habit.id)}`} className="btn btn-ghost btn-sm btn-icon" aria-label={`Stats for ${habit.name}`}>
          <BarChart3 size={16} />
        </a>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
          <Pencil size={15} />
        </button>
      </div>
    </li>
  );
}

function ArchivedRow({ habit }: { habit: Habit }) {
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <li className="card flex items-center gap-3 p-3 opacity-80">
      <HabitTile emoji={habit.emoji} color={habit.color} size={36} className="grayscale" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{habit.name}</div>
        <div className="text-[12px] text-muted">
          Archived {habit.archivedAt && formatDate(habit.archivedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={async () => {
          await restoreHabit(habit.id);
          toast({ message: `Restored “${habit.name}”`, tone: 'success' });
        }}
      >
        <ArchiveRestore size={14} />
        Restore
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon hover:!text-danger"
        aria-label={`Delete ${habit.name}`}
        onClick={async () => {
          const ok = await confirm({
            title: `Delete “${habit.name}” forever?`,
            message: 'Its whole history goes with it.',
            confirmLabel: 'Delete',
            danger: true,
          });
          if (!ok) return;
          const deleted = await deleteHabit(habit.id);
          if (deleted) toast({ message: 'Habit deleted', action: { label: 'Undo', onClick: () => undoDelete(deleted) } });
        }}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
