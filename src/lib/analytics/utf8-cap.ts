/**
 * Byte caps for the `analytics_events` text columns an index stores.
 *
 * `/collect` validates `pathname` and `referrer` at 2,000 CHARACTERS, but a
 * btree index entry is limited in BYTES (~2,700 on an 8 kB page), and a
 * character can be up to 4 UTF-8 bytes. The partial covering index
 * `idx_analytics_events_artikel_pageview` stores pathname (key) + visitor_hash
 * + session_id + a timestamp, so a human /artikel/
 * pageview carrying a long, poorly compressible path could exceed
 * that limit — and an over-limit entry fails the WHOLE insert batch (which may
 * hold other events), not just the one row.
 *
 * Capping pathname at 1,000 bytes keeps the widest possible entry well under
 * the limit, whatever the data (HelloKahwin caps pathname only — referrer is
 * in no index here). TWN measured the longest pathname ever stored at 230
 * bytes over 1.39M rows, so real paths never reach the cap.
 */
export const MAX_PATHNAME_BYTES = 1_000;
export const MAX_REFERRER_BYTES = 1_000;

/** UTF-8 width of one code point (a lone surrogate is sent as U+FFFD: 3 bytes). */
function utf8Width(cp: number): number {
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/**
 * `s` cut to at most `maxBytes` UTF-8 bytes, on a code-point boundary (never
 * half a character, never half a surrogate pair). Unchanged when it fits.
 */
export function capUtf8Bytes(s: string, maxBytes: number): string {
  // Fast path: every UTF-16 unit is at most 3 UTF-8 bytes.
  if (s.length * 3 <= maxBytes) return s;
  let bytes = 0;
  let end = 0;
  for (const ch of s) {
    const w = utf8Width(ch.codePointAt(0)!);
    if (bytes + w > maxBytes) return s.slice(0, end);
    bytes += w;
    end += ch.length;
  }
  return s;
}
