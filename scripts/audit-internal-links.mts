/**
 * Measure the internal link graph of the live site — SEO-02.
 *
 *   pnpm --silent links:audit --db "$DB"            # table to stdout
 *   pnpm --silent links:audit --db "$DB" --json out.json
 *
 * Why this exists: on 26 Aug 2026 the indexing baseline showed 8 of 28 new
 * articles indexed and 19 discovered-but-never-crawled. The cause was a crawl
 * path, not a block — six of seven pillars had no editorial link pointing into
 * them from anything Google already had in its index. Counting that by reading
 * drafts is how the image counts went wrong twice; it is counted here instead,
 * from the rows the site actually serves.
 *
 * DEFINITIONS, stated because every one of them is arguable:
 *
 *  - An EDITORIAL link is an <a> inside `articles.content`. The pillar hub
 *    lists every article in its clusters automatically (see PillarBody), and
 *    the header/footer link the hubs. Those are navigation. Counting them
 *    would make every article non-orphan by construction and measure nothing.
 *  - An ORPHAN is a published article with zero inbound EDITORIAL links.
 *  - A DEAD link is an internal href that resolves to no published article
 *    and no category — i.e. a 404 or a link into a draft.
 *  - A 308 link is an internal article href whose category segment is not the
 *    article's current primary category. It resolves, one hop, but it spends a
 *    redirect the crawler does not have to spend.
 *
 * Both content shapes are handled: TipTap JSON (everything ingested) and the
 * raw TipTap HTML string the WordPress-migration rows carry.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';

interface Args {
  db: string;
  json: string;
}

function parseArgs(argv: string[]): Args {
  let db = '';
  let json = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') db = argv[++i] ?? '';
    else if (argv[i] === '--json') json = argv[++i] ?? '';
  }
  if (!db) {
    // Same rule as the ingest script: no implicit DATABASE_URL, because that
    // points at production and a script that defaults to production
    // eventually runs against it by accident.
    throw new Error('--db is mandatory');
  }
  return { db, json };
}

/** Every href in a TipTap document, whatever shape the row stores it in. */
export function extractHrefs(content: unknown): string[] {
  const out: string[] = [];
  if (content == null) return out;
  if (typeof content === 'string') {
    for (const m of content.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
    return out;
  }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.marks)) {
      for (const mark of n.marks as Record<string, unknown>[]) {
        if (mark?.type === 'link') {
          const href = (mark.attrs as Record<string, unknown> | undefined)?.href;
          if (typeof href === 'string') out.push(href);
        }
      }
    }
    // A bare href attr (image links, legacy nodes) counts too.
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (attrs && typeof attrs.href === 'string') out.push(attrs.href);
    if (Array.isArray(n.content)) (n.content as unknown[]).forEach(walk);
  };
  walk(content);
  return out;
}

type Target =
  | { kind: 'external' }
  | { kind: 'anchor' }
  | { kind: 'article'; slug: string; categorySegment: string | null }
  | { kind: 'category'; slug: string }
  | { kind: 'page'; path: string };

/** Classify one href exactly the way the router resolves it. */
export function classify(href: string): Target {
  let path = href.trim();
  if (!path) return { kind: 'anchor' };
  if (path.startsWith('#')) return { kind: 'anchor' };
  if (/^(mailto:|tel:)/i.test(path)) return { kind: 'external' };
  if (/^https?:\/\//i.test(path)) {
    let u: URL;
    try {
      u = new URL(path);
    } catch {
      return { kind: 'external' };
    }
    if (!/(^|\.)hellokahwin\.com$/i.test(u.hostname)) return { kind: 'external' };
    path = u.pathname;
  }
  if (!path.startsWith('/')) return { kind: 'external' };
  path = path.split('#')[0].split('?')[0].replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { kind: 'page', path: '/' };
  if (segments[0] === 'artikel') {
    // /artikel/<category>/<slug> is an article; /artikel/<category> is a hub;
    // /artikel alone is the index. Mirrors bodyInternalLinks().
    if (segments.length >= 3) {
      return {
        kind: 'article',
        slug: segments[segments.length - 1],
        categorySegment: segments[1],
      };
    }
    if (segments.length === 2) return { kind: 'category', slug: segments[1] };
    return { kind: 'page', path: '/artikel' };
  }
  // A bare single segment is the legacy root-slug route, which resolves an
  // article by slug alone and 308s to its canonical path.
  if (segments.length === 1) return { kind: 'article', slug: segments[0], categorySegment: null };
  return { kind: 'page', path };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(args.db, { prepare: false, max: 2 });
  try {
    const cats = await sql<
      {
        id: string;
        slug: string;
        name: string;
        pillar_code: string | null;
        parent_id: string | null;
        is_pillar: boolean;
      }[]
    >`select id, slug, name, pillar_code, parent_id, is_pillar from inspire_categories`;
    const arts = await sql<
      {
        id: string;
        slug: string;
        title: string;
        status: string;
        primary_category_id: string | null;
        content: unknown;
        wp_id: number | null;
        published_at: Date | null;
      }[]
    >`select id, slug, title, status, primary_category_id, content, wp_id, published_at from articles`;

    const catById = new Map(cats.map((c) => [c.id, c]));
    const catBySlug = new Map(cats.map((c) => [c.slug, c]));
    const bySlug = new Map(arts.map((a) => [a.slug, a]));
    const published = arts.filter((a) => a.status === 'published');
    const publishedSlugs = new Set(published.map((a) => a.slug));

    /** The pillar a category belongs to, walking up one level. */
    const pillarOf = (catId: string | null): string => {
      if (!catId) return '--';
      const c = catById.get(catId);
      if (!c) return '--';
      if (c.is_pillar) return c.pillar_code ?? c.slug;
      const p = c.parent_id ? catById.get(c.parent_id) : undefined;
      return p?.pillar_code ?? p?.slug ?? c.pillar_code ?? 'legacy';
    };

    interface Edge {
      from: string;
      to: string;
      href: string;
      verdict: string;
    }
    const edges: Edge[] = [];
    const inbound = new Map<string, Set<string>>();
    for (const a of published) inbound.set(a.slug, new Set());

    for (const a of published) {
      for (const href of extractHrefs(a.content)) {
        const t = classify(href);
        if (t.kind === 'external' || t.kind === 'anchor') continue;
        if (t.kind === 'page') {
          edges.push({ from: a.slug, to: t.path, href, verdict: 'page' });
          continue;
        }
        if (t.kind === 'category') {
          edges.push({
            from: a.slug,
            to: t.slug,
            href,
            verdict: catBySlug.has(t.slug) ? 'hub-ok' : 'DEAD-hub',
          });
          continue;
        }
        const target = bySlug.get(t.slug);
        if (!target) {
          edges.push({ from: a.slug, to: t.slug, href, verdict: 'DEAD-missing' });
          continue;
        }
        if (!publishedSlugs.has(t.slug)) {
          edges.push({ from: a.slug, to: t.slug, href, verdict: 'DEAD-draft' });
          continue;
        }
        const canonical = target.primary_category_id
          ? (catById.get(target.primary_category_id)?.slug ?? null)
          : null;
        const hop = t.categorySegment === null || t.categorySegment !== canonical;
        edges.push({ from: a.slug, to: t.slug, href, verdict: hop ? '308' : 'ok' });
        if (a.slug !== t.slug) inbound.get(t.slug)!.add(a.slug);
      }
    }

    const rows = published
      .map((a) => ({
        slug: a.slug,
        title: a.title,
        pillar: pillarOf(a.primary_category_id),
        legacy: a.wp_id != null,
        inboundCount: inbound.get(a.slug)!.size,
        inboundFrom: [...inbound.get(a.slug)!].sort(),
        outbound: edges.filter(
          (e) => e.from === a.slug && (e.verdict === 'ok' || e.verdict === '308'),
        ).length,
      }))
      .sort((x, y) =>
        x.pillar === y.pillar ? x.slug.localeCompare(y.slug) : x.pillar.localeCompare(y.pillar),
      );

    const orphans = rows.filter((r) => r.inboundCount === 0);
    const dead = edges.filter((e) => e.verdict.startsWith('DEAD'));
    const hops = edges.filter((e) => e.verdict === '308');

    console.log('PIL  L SLUG                                          IN  OUT');
    for (const r of rows) {
      console.log(
        `${r.pillar.padEnd(4)} ${r.legacy ? 'L' : ' '} ${r.slug.slice(0, 44).padEnd(44)} ${String(r.inboundCount).padStart(3)} ${String(r.outbound).padStart(4)}`,
      );
    }
    console.log('-'.repeat(64));
    console.log(`published articles      ${published.length}`);
    console.log(`ORPHANS (0 inbound)     ${orphans.length}`);
    console.log(`DEAD internal links     ${dead.length}`);
    console.log(`308-hop links           ${hops.length}`);
    console.log(
      `editorial article links ${edges.filter((e) => e.verdict === 'ok' || e.verdict === '308').length}`,
    );
    if (dead.length) {
      console.log('\nDEAD:');
      for (const d of dead) console.log(`  ${d.from} -> ${d.href}  [${d.verdict}]`);
    }
    if (orphans.length) {
      console.log('\nORPHANS:');
      for (const o of orphans) console.log(`  ${o.pillar}  ${o.slug}`);
    }

    if (args.json) {
      writeFileSync(args.json, JSON.stringify({ rows, edges, orphans, dead, hops }, null, 1));
      console.log(`\nwrote ${args.json}`);
    }
  } finally {
    await sql.end();
  }
}

await main();
