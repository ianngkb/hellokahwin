import { db } from '@/lib/db/drizzle';
import { seoIndexnowSubmissions } from '@/lib/db/schema/seo-indexing';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const TIMEOUT_MS = 5000;

// Fire-and-forget IndexNow notifier called from the article publish path. The
// HTTP call is bounded by a 5s AbortController so a slow / unreachable hub
// can't keep the publish server action waiting; whatever the outcome — 2xx,
// non-2xx, network error, or timeout — gets logged to
// seo_indexnow_submissions for the future indexing-health monitoring view to
// surface (see `_bmad-output/implementation-artifacts/deferred-work.md`).
//
// A logging error never throws; it's swallowed via console.error so a
// transient DB hiccup in the audit path cannot bubble back into the publish
// action and turn a successful publish into a user-facing failure.
export async function submitUrlToIndexNow(url: string, articleId?: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    // Expected on local dev runs that don't have Doppler pulled. Stay quiet.
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    await safeLog(url, articleId, false, null, 'invalid url');
    return;
  }

  const payload = {
    host,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: [url],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let httpStatus: number | null = null;
  let success = false;
  let error: string | null = null;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    httpStatus = res.status;
    success = res.ok;
    if (!success) {
      const body = await res.text().catch(() => '');
      error = body.slice(0, 500) || `HTTP ${res.status}`;
    }
  } catch (err) {
    const e = err as Error & { name?: string };
    error =
      e.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : e.message || 'network error';
  } finally {
    clearTimeout(timer);
  }

  await safeLog(url, articleId, success, httpStatus, error);
}

async function safeLog(
  url: string,
  articleId: string | undefined,
  success: boolean,
  httpStatus: number | null,
  error: string | null,
): Promise<void> {
  try {
    await db.insert(seoIndexnowSubmissions).values({
      url,
      articleId: articleId ?? null,
      success,
      httpStatus,
      error,
    });
  } catch (logErr) {
    console.error('[indexnow] failed to log submission for', url, logErr);
  }
}
