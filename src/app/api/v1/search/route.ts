import { NextResponse, type NextRequest } from 'next/server';
import { searchArticles } from '@/lib/search/article-search';
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '@/lib/search/engine';
import type { SearchResponse } from '@/lib/search/contract';

/**
 * GET /api/v1/search?q=&limit=&offset= — the article search behind the
 * header search screen and the /artikel box. The contract is
 * `src/lib/search/contract.ts`; the matching rules are DES-06 §3.3 and live in
 * `src/lib/search/engine.ts`.
 *
 * A failure is a 500, never an empty 200: the UI must be able to tell "the
 * search broke" from "there is nothing on this" (DES-06 F1). `type` is still
 * accepted from older clients and ignored — only articles are searched.
 */
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === '') return fallback;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get('q') ?? '').trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
  const limit = intParam(params.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = intParam(params.get('offset'), 0, 0, 10_000);

  if (q.length < SEARCH_MIN_QUERY_LENGTH) {
    const data: SearchResponse = {
      query: q,
      articles: [],
      total: 0,
      mode: 'none',
      suggestion: null,
    };
    return NextResponse.json({ data });
  }

  try {
    const data = await searchArticles(q, { limit, offset });
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (err) {
    console.error('[search] query failed:', err);
    return NextResponse.json(
      { error: 'Carian gagal' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
