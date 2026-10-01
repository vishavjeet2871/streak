import { motion, useReducedMotion } from 'motion/react';

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const dist = 26 + (i % 3) * 7;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 3 + (i % 3), delay: (i % 4) * 0.015 };
});

/** A small confetti pop + ring, replayed whenever `trigger` changes. */
export function Burst({ trigger, color }: { trigger: number; color: string }) {
  const reduce = useReducedMotion();
  if (!trigger || reduce) return null;
  return (
    <span key={trigger} aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 2px ${color}` }}
        initial={{ scale: 1, opacity: 0.9 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            background: i % 4 === 0 ? '#fff' : color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.6, delay: p.delay, ease: [0.15, 0.7, 0.3, 1] }}
        />
      ))}
    </span>
  );
}

/** Soft radial glow that sweeps across a card when it's completed. */
export function GlowPulse({ trigger, color }: { trigger: number; color: string }) {
  const reduce = useReducedMotion();
  if (!trigger || reduce) return null;
  return (
    <motion.span
      key={trigger}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(120% 140% at 90% 50%, color-mix(in oklab, ${color} 35%, transparent), transparent 60%)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.9, times: [0, 0.25, 1] }}
    />
  );
}
