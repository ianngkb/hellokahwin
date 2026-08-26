# The Hantaran pillar now lists the two articles it was calling missing

26 Ogos 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-seo-06.md` (docs repo)
**By:** head-of-seo-content · **Sprint 02, item SEO-06, 2 points**
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo:** `docs/work-done/2026-08-26-seo-06-refile-hantaran-UNDO/` (`before.json` and `undo.sql`, generated from the live rows and verified 8 of 8 literals back against them before the first write)
**Evidence:** `docs/work-done/2026-08-26-seo-06-refile-hantaran-EVIDENCE/` (every command output quoted below, and the scripts that produced them)

**Production was written.** Two `articles` rows re-parented, two `article_categories` rows removed, four added, in one transaction at `2026-08-26T14:47:51Z` with row-count guards. No prose, cover or `published_at` changed. No code file changed: this was taxonomy, so UX-03's files (`page.tsx`, `navbar.tsx`, `pillar-body.tsx`) were never opened for editing.

CONT-05 and CONT-07 are unblocked as of 14:48 UTC. Their seed articles live at:

- https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin (cluster C2.1, `hantaran-kahwin-panduan`)
- https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang (cluster C2.2, `hantaran-tunang-panduan`)

---

## 1. Which redirect mechanism applies (the brief asked me to confirm, not assume)

**Claim:** CONT-04's finding holds for these two. No redirect-table row was needed, none was written, and the route self-heals in one hop.

**Evidence, from code:** `src/app/(public)/artikel/[category]/[slug]/page.tsx:520-553`. The page loads the article by slug alone (`getArticlePageData(slug)`), and when the URL's category segment does not match the article's primary category it calls `permanentRedirect('/artikel/${article.categorySlug}/${slug}')`. The `redirects` table is consulted only on the 404 path (line 534), and the admin action that writes to it is gated on a slug change (`actions.ts:302`), so a category-only move never touches it.

**Evidence, from the database, before and after:**

```
REDIRECT TABLES
│ redirects_rows │ article_category_redirects_rows │
│ '0'            │ '0'                             │
```

Zero rows before the move (14:47:24Z capture), zero rows after. Nothing stored, so nothing can chain.

**Evidence, live, before the move.** The self-heal was already visible in reverse: the future URLs bounced back to the old ones, because the route follows the article's primary category wherever it is.

```
-- /artikel/hantaran-mas-kahwin/hantaran-kahwin
308 loc=https://hellokahwin.com/artikel/hiasan-dekorasi/hantaran-kahwin cache=MISS age=0
-- /artikel/hantaran-mas-kahwin/hantaran-tunang
308 loc=https://hellokahwin.com/artikel/hiasan-dekorasi/hantaran-tunang cache=MISS age=0
```

## 2. Both articles re-filed into hantaran-mas-kahwin

**Claim:** primary category is now the P2 pillar; each article is linked to the pillar and to its own cluster; the `hiasan-dekorasi` link is gone. The two legacy hub links (`idea-dan-nasihat`, `perancangan`) were kept, mirroring what `mas-kahwin-ikut-negeri` has had since CONT-04, and because GSC lists `/artikel/idea-dan-nasihat` as the referring URL Google actually crawled these from.

**Evidence** (`EVIDENCE/01-refile-commit.txt`):

```
COMMITTED {"updated":2,"deleted":2,"inserted":4} 2026-08-26T14:47:51.475Z
│ slug              │ primary_slug          │ updated_at               │ linked
│ 'hantaran-kahwin' │ 'hantaran-mas-kahwin' │ 2026-08-26T14:47:54.711Z │ 'hantaran-kahwin-panduan,hantaran-mas-kahwin,idea-dan-nasihat,perancangan'
│ 'hantaran-tunang' │ 'hantaran-mas-kahwin' │ 2026-08-26T14:47:54.711Z │ 'hantaran-mas-kahwin,hantaran-tunang-panduan,idea-dan-nasihat,perancangan'
```

The transaction (`EVIDENCE/refile.mjs`) asserts exactly 2 updates, 2 deletes and 4 inserts and rolls back on any other count. The updates are also guarded on `id`, `slug` and the previous `primary_category_id`.

## 3. Redirect verified as ONE hop to 200

**Claim:** each old URL returns a single 308 whose Location is the new URL, and the new URL returns 200 with no further redirect.

**Evidence** (`EVIDENCE/05-hop-samples.txt`, 6 rounds, 3 seconds apart, no `-L`, 24 of 24 samples identical):

```
s1 /artikel/hiasan-dekorasi/hantaran-kahwin -> 308 loc=https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin cache=HIT
s1 /artikel/hiasan-dekorasi/hantaran-tunang -> 308 loc=https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang cache=HIT
s1 /artikel/hantaran-mas-kahwin/hantaran-kahwin -> 200 loc= cache=HIT
s1 /artikel/hantaran-mas-kahwin/hantaran-tunang -> 200 loc= cache=HIT
```

The legacy WordPress permalinks also resolve in one hop (`EVIDENCE/04-live-after.txt`):

```
-- GET /hantaran-kahwin/
   200 https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin
   redirects=1 final=200
-- GET /hantaran-tunang/
   200 https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang
   redirects=1 final=200
```

The redirect is a 308, which is what Next's `permanentRedirect` emits. Google treats 308 as permanent, the same as 301.

One sample was not clean, and it stays in the evidence. The first trace after the purge, at 14:48:33Z, ran two requests one second apart against the old `hantaran-kahwin` URL. The first resolved correctly; the second reported `redirects=5 final=308`, a bounce between old and new. Section 7 explains what that was. It did not recur in any of the 24 later samples.

## 4. The pillar shows them as real entries; empty states dropped from three to one

**Claim:** https://hellokahwin.com/artikel/hantaran-mas-kahwin lists both articles under their cluster headings, and only "duit hantaran" (C2.5) still carries the coming-soon line.

**Evidence, before** (pillar HTML, 14:46Z):

```
Artikel untuk "hantaran kahwin" akan datang tidak lama lagi.
Artikel untuk "hantaran tunang" akan datang tidak lama lagi.
Artikel untuk "duit hantaran" akan datang tidak lama lagi.
```

**Evidence, after** (`EVIDENCE/04-live-after.txt` and `05`):

```
links to the two:
href="/artikel/hantaran-mas-kahwin/hantaran-kahwin"
href="/artikel/hantaran-mas-kahwin/hantaran-tunang"

<p class="text-muted-foreground mt-4 text-sm">Artikel untuk [duit hantaran] akan datang tidak lama lagi.
```

One empty state. My first count read 2, because the page HTML carries the React flight payload as well as the markup and the string appears in both. Counting the `<p>` elements is the measurement; counting the string is not.

The bidirectional rule is closed from the article side too. Each new page renders the up-link to the pillar with the pillar's name as anchor, a canonical on its new URL, and sideways links inside P2 (`EVIDENCE/04-live-after.txt`):

```
<link rel="canonical" href="https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin"
href="/artikel/hantaran-mas-kahwin">Hantaran &amp; Mas Kahwin
href="/artikel/hantaran-mas-kahwin/dulang-hantaran"
href="/artikel/hantaran-mas-kahwin/gubahan-hantaran"
```

## 5. Old URLs still resolve, old hub still valid

Section 3 covers the URLs. The `hiasan-dekorasi` hub keeps `goodies-kahwin` as its only article, so it stays indexable and stays in the sitemap. It no longer lists either hantaran article:

```
=== OLD HUB /artikel/hiasan-dekorasi
status-links-to-hantaran: (none)
noindex? (no robots meta)
```

## 6. Sitemap reflects the move

**Claim:** the sitemap lists both articles at their new URLs, neither at the old, with a `lastmod` equal to the write, and Google was told.

**Evidence** (`EVIDENCE/04-live-after.txt`, fetched 14:48:33Z, `X-Vercel-Cache: REVALIDATED`, `Age: 0`):

```
<loc>https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang</loc>
<loc>https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin</loc>
<lastmod>2026-08-26T14:47:54.711Z</lastmod>
hiasan-dekorasi rows: 2   (the hub and goodies-kahwin)
url count: 78
```

78 URLs before, 78 after: two moved, none added. Resubmitted through the GSC API at 14:49 UTC, "Pending processing" (`EVIDENCE/00-gsc-before.json`).

## 7. The caches, and the one sample that bounced

Two caches sit in front of a reader and a direct database write reaches neither. Both were dropped, in this order, and both answered 200 (`EVIDENCE/02-*`, `03-*`):

```
POST /api/cron/revalidate-content   -> {"revalidated":["articles","inspire-categories"]}  HTTP 200
purgeVercelEdge (11 paths)          -> {"ok": true, "detail": "HTTP 200 in 1 request(s)"}
```

The eleven purged paths were the two old article URLs, the two new ones, both hubs, the two legacy hubs that link to these articles, `/artikel`, `/` and `/sitemap.xml`. The ingest CLI's own list (`pathsInvalidatedByIngest`) is three paths: the article at its current category, its pillar, and the sitemap. That list is right for an ingest and incomplete for a re-file, because a re-file has two article URLs, and the new one is the one that causes trouble.

In section 1, I proved the self-heal by requesting the future URLs before the move. Each answered 308 to the old URL, and the edge cached that answer under `s-maxage=300`. After the move, the old URL correctly 308s to the new one. If the new URL still serves its cached pre-move 308, a reader bounces between the two until the browser gives up. That is the one bad sample at 14:48:33Z: the purge had been issued at 14:48:07Z and had not yet reached every edge node the second request landed on. Twenty-six seconds later it had, and it stayed clean.

So the new path must always be in a re-file's purge list, and my own verification probe is what created the entry that needed purging. The retrospective records both.

## 8. GSC positions before, and when "after" can be read

**Before** (GSC API, 28 days to 26 Aug, `data_state=all`, `EVIDENCE/00-gsc-before.json`):

| URL | Clicks | Impressions | Position | Index state |
|---|---|---|---|---|
| `/artikel/hiasan-dekorasi/hantaran-kahwin` | 0 | 4 | 6.5 | Submitted and indexed, crawled 23 Aug 06:51 |
| `/artikel/hiasan-dekorasi/hantaran-tunang` | 0 | 58 | 10.3 | Submitted and indexed, crawled 23 Aug 07:11 |

The brief's figures (6.5, and 49 impressions at 9.6) were taken on a different day and window; the 6.5 matches exactly, the tunang figures drifted with the window. Both sit at position 6 to 10 on their own head terms, which is the "ranking signal already exists" case in the playbook, and the reason this move is worth protecting.

**After, as of 14:49 UTC today**, URL inspection of the new addresses:

```
/artikel/hantaran-mas-kahwin/hantaran-kahwin   URL is unknown to Google
/artikel/hantaran-mas-kahwin/hantaran-tunang   Discovered - currently not indexed
```

That is the after-state today and it cannot be anything else yet, because Google has not recrawled since the move. Ranking after the move is not measurable from here, and I am not going to present an inference as a measurement. What measures it: rerun the same GSC pages query with the filter `page contains /hantaran-` on or after **2026-08-30** (final data runs two days behind, and the new URLs need at least one crawl), then compare the union of old and new URL rows against the table above. The trigger for concern is the union position for either article worse than its before figure by more than one place across a full week, or impressions on the new URL failing to overtake the old by 2026-09-09. The rollback is `UNDO/undo.sql` followed by the same two cache drops.

## Compliance

- `/humanizer` run on this document, the UNDO narrative and the docs-repo done log before commit.
- Every number carries its source and time. Nothing estimated. The one thing not measurable today (post-move ranking) is labelled as such with the date it becomes measurable.
- No image work in this item, so the credit rule does not apply.
- No rendering file was edited. UX-03 has no open worktree in the site repo and BMAD's live dispatch is PLAT-07, checked before starting, so there was no concurrent edit to avoid.
- The sprint tracker (`docs/sprints/sprint-02.json`) was not edited; that is the orchestrator's write.

---

## Retrospective

### What did we learn that is not written down

The CEO record says a re-parent has "two preconditions, not redirects", and the first is that "the save must go through the admin editor" because its `revalidateTag` is what purges the page cache, while "a direct SQL write leaves the new URL bouncing back to the old". Half of that is true, and the true half has the wrong cause.

The admin editor does not purge the Vercel edge. `purgeVercelEdge` has exactly one caller in `src/`, and it is the ingest CLI (`scripts/ingest-article.mts`). An editor save drops the origin data cache and leaves the CDN copy of every affected page in place for up to `s-maxage=300` plus its stale window. The admin path skips the second cache. The bounce the record describes is real, but it is the edge holding a pre-move 308 on the new URL, and it happens on any write path that does not purge that path, editor included.

A direct write with the two drops in order (origin `revalidate-content`, then `purgeVercelEdge` on old URL, new URL, hubs and sitemap) is complete. That is what shipped here, and it is what the ingest CLI already does for its own three paths.

### Which document must change and who owns the edit

`docs/boardroom/ceo-memory.md`, section "URL structure and re-parenting", the "Two preconditions" bullet. Owner: head-of-seo-content, as the author of the CONT-04 entry it corrects. Edited in this item: the bullet now names the two caches, says which write paths reach which, lists the purge set for a re-file with the new URL in it, and says why the new URL is the one that loops.

For engineering, not edited by me: `pathsInvalidatedByIngest` in `src/lib/cache/edge-purge.ts` is correct for an ingest and incomplete for a re-file. A `scripts/refile-article.mts` that takes a slug and a target cluster and performs the transaction plus both drops in the right order is a two-point item. Until it exists, the next re-file copies `EVIDENCE/refile.mjs` and `EVIDENCE/purge.mts` from this folder.

### What did we do twice that we should never repeat

I counted a string on the rendered page instead of measuring the element. My first empty-state count read 2 because the string appears once in the markup and once in the React flight payload. CONT-02's log recorded the same class of error yesterday with image counts, and wrote "a hand-count off the rendered page will always read high" into the workflow. I read that yesterday and did it again today.

### What did we nearly ship and what caught it

A redirect loop, manufactured by me. Proving the self-heal before the move meant requesting the new URLs while they still 308'd back, which put a five-minute 308 for each new URL into the edge. After the move that entry forms a loop with the fresh old-to-new 308. Two things caught it: the new URLs were already in my purge list, and the hop trace made two requests per URL instead of one, which is the only reason the 14:48:33Z bounce is in the evidence at all. A single sample would have shown clean, and the loop would have stayed invisible to me while still live for twenty-odd seconds on the nodes the purge had not reached. For any future re-file: purge the new path, and sample the chain more than once, spaced out, before calling it verified.
