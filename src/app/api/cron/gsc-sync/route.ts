import { NextResponse, type NextRequest } from 'next/server';
import { sqlClient } from '@/lib/db/drizzle';
import { GscAuthError, openGscSession } from '@/lib/analytics/gsc/client';
import { reresolveUnresolvedPages, syncPageDaily, ymd } from '@/lib/analytics/gsc/sync';

/**
 * Nightly Google Search Console sync → `gsc_pages` / `gsc_page_daily`, which
 * the Article Analytics overview's Google columns and the Title tests tab
 * read. Ported from The Wedding Notebook's `/api/cron/gsc-sync`, cut to its
 * page_daily job.
 *
 * Invoked by Vercel Cron (vercel.json) with `Authorization: Bearer
 * $CRON_SECRET` — the same check as `/api/cron/revalidate-content` — and a GET,
 * which is what Vercel Cron sends. Idempotent: every write is an upsert keyed
 * on (page, day), and each night refetches a trailing window, so a missed or
 * repeated run heals itself.
 */
export const dynamic = 'force-dynamic';
// One date×page call (~1 s) plus a few chunked upserts; generous headroom.
export const maxDuration = 120;

/**
 * Refetch a trailing 5 days rather than just yesterday: Google keeps revising
 * the last ~3, and the overlap makes the job self-healing.
 */
export const PAGE_DAILY_LOOKBACK_DAYS = 5;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const log = (message: string) => console.log(`[gsc-sync] ${message}`);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com';

  let session;
  try {
    session = await openGscSession(baseUrl);
  } catch (err) {
    // A missing or rejected credential is a configuration problem, not a
    // crash: say exactly what, and answer non-200 so the cron shows red.
    const error = err instanceof Error ? err.message : String(err);
    console.error('[gsc-sync] cannot authenticate:', error);
    return NextResponse.json(
      { ok: false, error: err instanceof GscAuthError ? error : 'auth failed' },
      { status: 503 },
    );
  }

  const from = ymd(PAGE_DAILY_LOOKBACK_DAYS);
  const to = ymd(1);
  try {
    const stats = await syncPageDaily(
      { sql: sqlClient, session, log },
      { startDate: from, endDate: to, dataState: 'all' },
    );
    // Newly published articles whose URL Google already knew about.
    let reresolved = 0;
    try {
      reresolved = await reresolveUnresolvedPages(sqlClient);
    } catch (err) {
      console.error('[gsc-sync] re-resolve failed:', err);
    }
    const durationMs = Date.now() - startedAt;
    log(`done in ${durationMs}ms: ${stats.rowsWritten} rows for ${from}..${to}`);
    return NextResponse.json({ ok: true, from, to, durationMs, ...stats, reresolved });
  } catch (err) {
    console.error('[gsc-sync] page_daily failed:', err);
    return NextResponse.json(
      { ok: false, from, to, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
