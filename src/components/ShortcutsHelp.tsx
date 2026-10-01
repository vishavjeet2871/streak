import { Sheet } from './ui/Sheet';

const GROUPS: { title: string; items: [keys: string[], label: string][] }[] = [
  {
    title: 'Today',
    items: [
      [['1', '–', '9'], 'Toggle habit / add one'],
      [['Shift', '1–9'], 'Subtract from a count habit'],
      [['←', '→'], 'Previous / next day'],
    ],
  },
  {
    title: 'Anywhere',
    items: [
      [['N'], 'New habit'],
      [['T'], 'Today'],
      [['C'], 'Calendar'],
      [['S'], 'Stats'],
      [['H'], 'Habits'],
      [[','], 'Settings'],
      [['?'], 'This list'],
      [['Esc'], 'Close dialogs'],
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="section-title mb-2">{g.title}</h3>
            <ul className="divide-y divide-line">
              {g.items.map(([keys, label]) => (
                <li key={label} className="flex items-center justify-between py-2.5 text-[14px]">
                  <span>{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((k) =>
                      k === '–' ? (
                        <span key={k} className="text-faint">
                          –
                        </span>
                      ) : (
                        <kbd key={k} className="kbd">
                          {k}
                        </kbd>
                      ),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
