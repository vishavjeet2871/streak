/**
 * crypto.randomUUID only exists in secure contexts, and the dev server is
 * often opened over plain http on a LAN IP from a phone, so fall back.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const entryId = (habitId: string, date: string) => `${habitId}:${date}`;
