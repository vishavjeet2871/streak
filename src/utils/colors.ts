/** Habit accent palette, tuned to glow on near-black and stay legible on white. */
export const HABIT_COLORS = [
  { name: 'Ember', hex: '#ff6b3d' },
  { name: 'Amber', hex: '#f5a524' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Mint', hex: '#22c993' },
  { name: 'Cyan', hex: '#22b8cf' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Slate', hex: '#8b93a7' },
  { name: 'Violet', hex: '#9b6cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Rose', hex: '#f43f5e' },
] as const;

export const BRAND_ACCENT = '#ff6b3d';

/** CSS color-mix of `color` over `base`, for tinted surfaces and heat levels. */
export const mix = (color: string, percent: number, base = 'transparent') =>
  `color-mix(in oklab, ${color} ${percent}%, ${base})`;

/** Heat level (0–4) → fill, blended onto the empty-cell color. */
export function heatColor(color: string, level: number): string {
  if (level <= 0) return 'var(--cell-empty)';
  const pct = [0, 28, 50, 74, 100][level];
  return mix(color, pct, 'var(--cell-empty)');
}
