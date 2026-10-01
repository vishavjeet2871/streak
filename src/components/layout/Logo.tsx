import { useId } from 'react';

/** The Streak flame mark (same artwork as the app icon). */
export function Logo({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1d24" />
          <stop offset="1" stopColor="#0b0b0f" />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#ffb648" />
          <stop offset="0.55" stopColor="#ff6b3d" />
          <stop offset="1" stopColor="#f2386d" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${id}-bg)`} />
      <rect x="1.5" y="1.5" width="509" height="509" rx="118.5" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="3" />
      <path
        fill={`url(#${id}-f)`}
        d="M262 92c10 58 62 94 86 140 30 58 14 132-38 162-20 12-44 18-68 18-70 0-122-52-122-118 0-46 22-82 56-112 4 30 18 52 42 62-14-66 6-120 44-152z"
      />
      <path
        fill="#ffe2b8"
        fillOpacity="0.92"
        d="M250 270c34 26 56 50 56 86 0 32-24 52-54 52-32 0-54-22-54-50 0-22 12-38 28-50 2 14 10 22 20 24-6-22-2-44 4-62z"
      />
    </svg>
  );
}
