import { useState } from 'react';
import { Merge, X } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { mergeDuplicateHabits } from '../../db/repo';
import { findDuplicateGroups } from '../../utils/duplicates';
import { useToast } from '../ui/Toast';

/**
 * Offers to merge habits that now exist twice, which happens when two
 * devices each created the same habit before syncing.
 */
export function DuplicatesBanner() {
  const { activeHabits } = useData();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const groups = findDuplicateGroups(activeHabits);
  if (dismissed || groups.length === 0) return null;

  const names = groups.map((g) => `“${g[0].name}”`);
  const label = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-[14px]">
      <Merge size={17} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p>
          {label} {groups.length === 1 && groups[0].length === 2 ? 'appears twice' : 'appear more than once'}, probably from
          syncing two devices.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm mt-2.5"
          onClick={async () => {
            const n = await mergeDuplicateHabits(groups);
            toast({ message: `Merged ${n} duplicate${n === 1 ? '' : 's'}; history combined`, tone: 'success' });
          }}
        >
          Merge and combine history
        </button>
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-icon -mr-2 -mt-1 shrink-0" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  );
}
