import { createHash } from 'crypto';

/** The KL calendar day as `yyyymmdd`. Malaysia is UTC+8 year-round, no DST. */
function klDayStamp(now: Date): string {
  // `en-CA` formats as `yyyy-MM-dd`.
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).replace(/-/g, '');
}

/**
 * Generates a daily-rotating visitor hash using SHA-256.
 * Hash input: `${ip}|${ua}|${KL yyyymmdd}|${ANALYTICS_SALT}`
 *
 * - Rotates at KL midnight (not UTC), so a "unique visitor per day" on the
 *   dashboard matches the KL days it buckets by.
 * - The raw IP never leaves this function; only the digest is stored.
 * - Throws without a salt: an unsalted hash of ip|ua|day is reversible by
 *   brute force over the IPv4 space, so the collector must fail instead.
 */
export function generateVisitorHash(ip: string, ua: string): string {
  const salt = process.env.ANALYTICS_SALT;
  if (!salt) {
    throw new Error('ANALYTICS_SALT environment variable is required');
  }
  const input = `${ip}|${ua}|${klDayStamp(new Date())}|${salt}`;
  return createHash('sha256').update(input).digest('hex');
}
