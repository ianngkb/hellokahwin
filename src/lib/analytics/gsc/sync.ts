import 'server-only';
import type postgres from 'postgres';
import { searchAnalyticsAll, type GscDataState, type GscSession } from './client';
import { classifyGscPath, normalizeGscUrl, type GscEntityType } from './url';

/**
 * The Search Console → `gsc_pages` / `gsc_page_daily` ingest, run nightly by
 * `/api/cron/gsc-sync`. Ported from The Wedding Notebook (`src/lib/gsc/sync.ts`
 * + `resolve.ts`), cut to the one job HelloKahwin reads: per-page daily clicks,
 * impressions and position (TWN's query windows and URL inspection are not
 * ported).
 *
 * Two invariants, kept from TWN:
 *   1. HTTP happens strictly OUTSIDE transactions — fetch fully into memory,
 *      then write — so a slow Google never holds a pooled connection.
 *   2. Writes go out in bounded chunks, each its own transaction with
 *      `SET LOCAL statement_timeout` (`SET LOCAL` because a bare `SET` does not
 *      survive the transaction pooler moving us between backends).
 */

/** Canonical host every `gsc_pages.url` is stored under. */
export const CANONICAL_HOST = 'https://hellokahwin.com';

const WRITE_TIMEOUT = '120s';
const WRITE_CHUNK = 2_000;
/** Postgres caps a statement at 65,535 bind parameters; stay well under. */
const LOOKUP_CHUNK = 5_000;
/** Map-key separator for (page_id, date): an escape, never a literal NUL in source. */
const KEY_SEP = '\u0000';

export interface SyncStats {
  rowsFetched: number;
  rowsWritten: number;
  apiCalls: number;
  truncated: boolean;
}

/** `yyyy-MM-dd`, N days before `from` (UTC). The trailing refetch makes the sub-day offset moot. */
export function ymd(daysAgo: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// postgres-js types `TransactionSql` as an `Omit<Sql, …>`, which drops the call
// signature; casting back is the standard workaround (a typing bug only).
type Tx = postgres.Sql;

async function inChunks<T>(
  sql: postgres.Sql,
  rows: T[],
  size: number,
  write: (tx: Tx, chunk: T[]) => Promise<void>,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    await sql.begin(async (t) => {
      const tx = t as unknown as Tx;
      await tx.unsafe(`SET LOCAL statement_timeout = '${WRITE_TIMEOUT}'`);
      await write(tx, chunk);
    });
    written += chunk.length;
  }
  return written;
}

// ── Pages: raw Google URL → gsc_pages row ──────────────────────────────────

interface PendingPage {
  url: string;
  path: string;
  entityType: GscEntityType;
  slug: string | null;
  categorySlug: string | null;
  articleId: string | null;
}

async function lookupArticleIds(sql: postgres.Sql, slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += LOOKUP_CHUNK) {
    const chunk = slugs.slice(i, i + LOOKUP_CHUNK);
    // The raw postgres-js client serialises a JS array to text[] correctly
    // (the `= ANY(${array})` 22P02 trap is Drizzle's `sql` template only).
    const rows = await sql<{ id: string; slug: string }[]>`
      SELECT id, slug FROM articles WHERE slug = ANY(${chunk}) AND status <> 'deleted'`;
    for (const row of rows) out.set(row.slug, row.id);
  }
  return out;
}

/**
 * Normalise + classify raw URLs, resolve article ids by slug (one lookup for
 * the batch), upsert `gsc_pages`, and return raw URL → page id. Several raw
 * URLs can collapse onto one page (www, trailing slash, query strings), so
 * callers must aggregate by page id. Foreign-host URLs are skipped.
 */
export async function upsertPages(
  sql: postgres.Sql,
  rawUrls: Iterable<string>,
): Promise<Map<string, string>> {
  const rawToCanonical = new Map<string, string>();
  const pending = new Map<string, PendingPage>();
  for (const raw of rawUrls) {
    if (rawToCanonical.has(raw)) continue;
    const path = normalizeGscUrl(raw);
    if (path === null) continue;
    const canonical = `${CANONICAL_HOST}${path}`;
    rawToCanonical.set(raw, canonical);
    if (pending.has(canonical)) continue;
    const { entityType, slug, categorySlug } = classifyGscPath(path);
    pending.set(canonical, {
      url: canonical,
      path,
      entityType,
      slug,
      categorySlug,
      articleId: null,
    });
  }
  if (pending.size === 0) return new Map();

  const articleSlugs = [
    ...new Set(
      [...pending.values()].filter((p) => p.entityType === 'article' && p.slug).map((p) => p.slug!),
    ),
  ];
  const ids = articleSlugs.length > 0 ? await lookupArticleIds(sql, articleSlugs) : new Map();
  for (const p of pending.values()) {
    if (p.entityType === 'article' && p.slug) p.articleId = ids.get(p.slug) ?? null;
  }

  const rows = [...pending.values()].map((p) => ({
    url: p.url,
    path: p.path,
    entity_type: p.entityType,
    slug: p.slug,
    category_slug: p.categorySlug,
    article_id: p.articleId,
    // An ISO string, not a Date: postgres-js serialises by the server-reported
    // parameter type, and a Date there throws through the shared client.
    resolved_at: p.articleId ? new Date().toISOString() : null,
  }));

  const canonicalToId = new Map<string, string>();
  for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
    const chunk = rows.slice(i, i + WRITE_CHUNK);
    const inserted = (await sql`
      INSERT INTO gsc_pages ${sql(
        chunk,
        'url',
        'path',
        'entity_type',
        'slug',
        'category_slug',
        'article_id',
        'resolved_at',
      )}
      ON CONFLICT (url) DO UPDATE SET
        last_seen_at  = now(),
        entity_type   = excluded.entity_type,
        slug          = excluded.slug,
        category_slug = excluded.category_slug,
        -- Never clobber a resolved article with NULL: an article that is
        -- briefly unpublished must not orphan its Google history.
        article_id    = COALESCE(excluded.article_id, gsc_pages.article_id),
        resolved_at   = COALESCE(excluded.resolved_at, gsc_pages.resolved_at)
      RETURNING id, url
    `) as unknown as { id: string; url: string }[];
    for (const row of inserted) canonicalToId.set(row.url, row.id);
  }

  const result = new Map<string, string>();
  for (const [raw, canonical] of rawToCanonical) {
    const id = canonicalToId.get(canonical);
    if (id) result.set(raw, id);
  }
  return result;
}

/**
 * Retry resolution for article-shaped pages with no article yet — typically
 * one published after Google first saw its URL. Touches only unresolved rows.
 */
export async function reresolveUnresolvedPages(sql: postgres.Sql): Promise<number> {
  const rows = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM gsc_pages
    WHERE article_id IS NULL AND slug IS NOT NULL AND entity_type = 'article'`;
  if (rows.length === 0) return 0;
  const ids = await lookupArticleIds(sql, [...new Set(rows.map((r) => r.slug))]);
  let resolved = 0;
  for (const row of rows) {
    const articleId = ids.get(row.slug);
    if (!articleId) continue;
    await sql`UPDATE gsc_pages SET article_id = ${articleId}, resolved_at = now() WHERE id = ${row.id}`;
    resolved++;
  }
  return resolved;
}

// ── page_daily (date × page) ───────────────────────────────────────────────

export interface PageDailyRecord {
  page_id: string;
  date: string;
  clicks: number;
  impressions: number;
  /** position × impressions — the additive form (see schema/gsc.ts). */
  position_sum: number;
  data_state: GscDataState;
}

/**
 * Google rows (`keys = [date, page]`) → one record per (page id, date).
 * Several raw URLs can map to one page id, which would put the same key twice
 * in one INSERT ("ON CONFLICT DO UPDATE command cannot affect row a second
 * time"), so they are folded first — summing is right: they ARE one page.
 * Position is carried as position × impressions so it sums correctly.
 */
export function foldPageDaily(
  rows: ReadonlyArray<{ keys: string[]; clicks: number; impressions: number; position: number }>,
  pageIds: ReadonlyMap<string, string>,
  dataState: GscDataState,
): PageDailyRecord[] {
  const folded = new Map<string, PageDailyRecord>();
  for (const r of rows) {
    const [date, rawUrl] = r.keys;
    const pageId = rawUrl ? pageIds.get(rawUrl) : undefined;
    if (!pageId || !date) continue;
    const rec: PageDailyRecord = {
      page_id: pageId,
      date,
      clicks: Math.round(r.clicks),
      impressions: Math.round(r.impressions),
      position_sum: r.position * r.impressions,
      data_state: dataState,
    };
    const key = `${pageId}${KEY_SEP}${date}`;
    const prev = folded.get(key);
    if (prev) {
      prev.clicks += rec.clicks;
      prev.impressions += rec.impressions;
      prev.position_sum += rec.position_sum;
    } else {
      folded.set(key, rec);
    }
  }
  return [...folded.values()];
}

/**
 * Pull per-page daily metrics for `[startDate, endDate]` and upsert them.
 * Callers pass a range that OVERLAPS what is stored: Google keeps revising the
 * last ~3 days, so refetching a trailing window makes the job self-healing
 * against a missed night, a failed run and Google's own revisions.
 */
export async function syncPageDaily(
  deps: { sql: postgres.Sql; session: GscSession; log?: (m: string) => void },
  opts: { startDate: string; endDate: string; dataState?: GscDataState },
): Promise<SyncStats> {
  const dataState = opts.dataState ?? 'all';
  const { rows, apiCalls, truncated } = await searchAnalyticsAll(deps.session, {
    startDate: opts.startDate,
    endDate: opts.endDate,
    dimensions: ['date', 'page'],
    dataState,
  });
  deps.log?.(
    `page_daily ${opts.startDate}..${opts.endDate}: ${rows.length} rows, ${apiCalls} calls`,
  );
  if (truncated) deps.log?.('page_daily hit the pagination cap — the range is wider than expected');
  if (rows.length === 0) return { rowsFetched: 0, rowsWritten: 0, apiCalls, truncated };

  const pageIds = await upsertPages(
    deps.sql,
    rows.map((r) => r.keys[1]),
  );
  const records = foldPageDaily(rows, pageIds, dataState);

  const rowsWritten = await inChunks(deps.sql, records, WRITE_CHUNK, async (tx, chunk) => {
    await tx`
      INSERT INTO gsc_page_daily ${tx(
        chunk,
        'page_id',
        'date',
        'clicks',
        'impressions',
        'position_sum',
        'data_state',
      )}
      ON CONFLICT (page_id, date) DO UPDATE SET
        clicks       = excluded.clicks,
        impressions  = excluded.impressions,
        position_sum = excluded.position_sum,
        data_state   = excluded.data_state,
        updated_at   = now()
    `;
  });
  return { rowsFetched: rows.length, rowsWritten, apiCalls, truncated };
}
