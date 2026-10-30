/**
 * A v4 UUID for the client tracker's session and visitor ids.
 *
 * `crypto.randomUUID` is missing on older Android WebViews and on iOS before
 * 15.4, and a throw there would surface inside whatever click handler called
 * `track()`. Fall back to a v4 UUID built from `crypto.getRandomValues`, which
 * those browsers do have — still shaped to pass the collector's UUID check.
 */
export function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
