/** Full-screen confetti for finishing the day. Loaded lazily to keep startup lean. */
export async function celebrate(): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#ff6b3d', '#f5a524', '#9b6cf6', '#22c993', '#3b82f6', '#ec4899'];
  const base = { spread: 70, startVelocity: 42, ticks: 200, scalar: 0.9, colors, disableForReducedMotion: true };
  confetti({ ...base, particleCount: 70, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...base, particleCount: 70, angle: 120, origin: { x: 1, y: 0.7 } });
}

export function haptic(ms = 12): void {
  navigator.vibrate?.(ms);
}
