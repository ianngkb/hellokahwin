/**
 * Pure observability wrapper for awaited promises. No behavior change —
 * just logs duration with a stable `[admin-timing]` prefix so a 24h Vercel
 * log slice can answer "which step in the admin auth chain is the slow one"
 * without having to reproduce the issue locally.
 *
 * Format: `[admin-timing] <label> <ms>` on success, `[admin-timing] <label> <ms> FAILED`
 * on rejection (the underlying error is still re-thrown unchanged).
 *
 * Why this exists: the 2026-05-03 `/admin` slow-load incident had multiple
 * candidate bottlenecks (Clerk auth(), Clerk currentUser(), pg_findAdminRow,
 * getAdminUser permissions chain, secondary count queries). The previous
 * fix attempt set blanket 5s deadlines without first measuring which step
 * was actually slow on which percentile of requests, and tripped on
 * legitimate cold-start auth. This helper lets us measure first, then fix.
 */
export async function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await promise;
    console.log('[admin-timing]', label, Date.now() - t0);
    return result;
  } catch (err) {
    console.log('[admin-timing]', label, Date.now() - t0, 'FAILED');
    throw err;
  }
}
