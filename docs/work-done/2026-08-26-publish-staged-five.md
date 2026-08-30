# Five articles live in 144 seconds, and the edge purge made the five-minute wait obsolete on its first outing.

26 Ogos 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-publish-staged-five.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo record:** `docs/work-done/2026-08-26-publish-staged-five-UNDO.md` + `…-UNDO.sql` — written, and both scripts executed in dry mode, before the first write.
**Evidence:** `docs/work-done/2026-08-26-publish-staged-five-EVIDENCE/` — the dry-run log, both ingest transcripts, before/after DB state, every proof request with its cache headers, both sitemaps, and every script that produced a number in this log.

Three C2.3 articles into P2 `/artikel/hantaran-mas-kahwin/` and two P3 articles
into `/artikel/ucapan-doa/`, plus the SEO-03 fee-table swap on the live
`kursus-kahwin`. **Six writes to production, six exit code 0, zero rollbacks.**

```
articles      56 -> 61        media       757 -> 781 (+24, one per declared image)
published     56 -> 61        tags         65 ->  76 (+11 new, 4 pre-existing reused)
sitemap       73 ->  78       P2 pillar      8 ->  11    P3 pillar      3 ->   5
```

**The headline is the timing.** The last publishing run waited 325 seconds after
the final write before it dared request a page. This one measured the P2 pillar
**ten seconds** after the last write and got a cold, correct render. The
five-minute rule is retired; the measurement is below.

## The two blockers the last two runs hit did not exist this time

Both previous publishing runs were stopped at the dry run — nine unrendered
graphics, one hub slug in `internalLinks`. **All five files passed a dry run
against production first time.** 24 declared images, 24 present on disk, 24
credited. Nothing was dropped, nothing was edited to make a file ingestable.

## The brief's first trap was not true, and it is the third run in a row

> _"Internal links must resolve to PUBLISHED articles… These five cross-link to
> each other, so work out the dependency order or ingest then patch in a second
> pass. A link to an unpublished sibling is a hard failure."_

**Zero of the five link to each other.** Measured before anything was written,
using the parser's own `bodyInternalLinks` regex over the bodies as well as the
front matter, then resolved against production:

```
C2-3-A1-dulang-hantaran  fm+body: hantaran-kahwin, hantaran-tunang, bunga-telur, bajet-kahwin
C2-3-A2-gubahan-hantaran fm+body: hantaran-kahwin, hantaran-tunang, bajet-kahwin
C2-3-A3-sirih-junjung    fm+body: hantaran-tunang, bunga-telur, doa-majlis-pertunangan
P3-A4-walimatul-urus     fm+body: rukun-nikah, doa-majlis-perkahwinan, contoh-kad-jemputan-kahwin, ucapan-pengantin-baru
P3-A5-skrip-pengacara    fm+body: doa-majlis-perkahwinan, rukun-nikah, ucapan-pengantin-baru, checklist-kahwin

=== all 10 referenced slugs, resolved against production ===
  PUBLISHED  bajet-kahwin      bunga-telur       checklist-kahwin
  PUBLISHED  contoh-kad-jemputan-kahwin          doa-majlis-perkahwinan
  PUBLISHED  doa-majlis-pertunangan              hantaran-kahwin
  PUBLISHED  hantaran-tunang   rukun-nikah       ucapan-pengantin-baru

IN-BATCH cross-links: NONE
```

Ten distinct targets, all already `status = published`, none of them in this
batch. **No dependency order was needed and no second link-patching pass was
done.** The front matter and the body agree on every file, which also means the
declared `internalLinks` list is an honest description of the prose for once.

The P3/P4/P7 log recorded the identical finding a day earlier — _"Zero
cross-links inside the batch… the brief still asserted the opposite."_ That is
now three consecutive briefs asserting an intra-batch dependency that the data
does not contain. See the retrospective.

## Staging: two files, seven changed lines each

The three C2.3 articles were already staged in `drafts/ingest/` by their writer
and are **byte-unchanged** by this run. P3-A4 and P3-A5 were staged the same way
the P1/P6 and P3/P4/P7 batches were, by `stage.mjs`, which reports every change
it makes. Two kinds, both mechanical:

| Change                                | Count | Why                                                                                                         |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `status: draft` → `status: published` | 2     | The publish-control field. Without it `--publish` inserts a draft, silently. Not article text.              |
| `images/x` → `../images/x`            | 12    | The staging copy sits one directory below the original and `resolve()` is relative to the **article file**. |

The whole diff, both files, is exactly seven lines each — one `status`, one
`cover.file`, five body `file:` entries — and is printed verbatim in
`…-EVIDENCE/`. The assertion that makes _"no sentence was rewritten"_ a
measurement rather than a claim:

```
=== body bytes identical to the original? ===
  IDENTICAL  P3-A4-walimatul-urus
  IDENTICAL  P3-A5-skrip-pengacara-majlis-perkahwinan
=== './' prefixes in either staged copy: 0 ===
```

**No article text was edited. No alt text, caption, credit, title or meta
description was edited. No internal link was retargeted.** The five
`metaDescription` values came in at 135–152 characters against the schema's 160
limit, so unlike the P5 run nothing had to be trimmed.

The R2 keys prove the `../` prefix changes nothing that reaches the site — the
key is the declared path slugified, so `../images/S-x.jpg` and `images/S-x.jpg`
both derive `images-s-x`:

```
inspire/dulang-hantaran/1787680476366-images-s-pertunangan-zeeana-mohd-nasir.jpg
inspire/walimatul-urus/1787680552936-images-s-jamuan-kenduri-raja-abd-kadir.jpg
```

No `-` prefix, no `..`. Byte-identical in shape to the two previous batches.

## No text cards, and it is measured across the whole site, not the batch

Owner directive, standing. The five files declare **24 images, every one a
sourced photograph** (`S-*.jpg`) — no `kad-tajuk`, no `cover-*.png`, no
generated graphic of any kind. Checked at the source and then again in the
database, over every published row rather than just this batch:

```
published articles scanned: 61
body image nodes scanned:   634
text-card style graphics:   0
```

**61 of 61 live articles serve zero text cards.** The count was 56 of 56 this
morning; the five added kept it at zero.

## `jsonb_typeof(content)`, before and after

Checked against production **before** the first write:

```
=== jsonb_typeof(content) census, WHOLE TABLE, 2026-08-25T17:44:55.547Z ===
[{"t":"object","count":"56"}]
```

Zero `string` rows. Nothing needed fixing. After the run:

```
=== jsonb_typeof(content) census, WHOLE TABLE, 2026-08-25T17:59:24.550Z ===
[{"t":"object","n":61}]

=== every jsonb column on the five new rows ===
{"slug":"dulang-hantaran","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"gubahan-hantaran","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"sirih-junjung","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"skrip-pengacara-majlis-perkahwinan","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}
{"slug":"walimatul-urus","content":"object","variants":"object","crops":"object","focal":"object","detect":"object"}

=== media jsonb on the 24 rows created by this run ===
[{"v":"object","s":"object","n":24}]

=== kursus-kahwin, the row that was EDITED not inserted ===
{"slug":"kursus-kahwin","content":"object","blocks":74,"bytes":40152}
```

**All six writes landed as `object`. Zero `string` rows in the table, before or
after.**

## The commands

```
pnpm --silent ingest <file>.md --db "$DB" --commit --publish --revalidate-url https://hellokahwin.com
```

`pnpm --silent` throughout, never `pnpm run` — the database URL is in argv and
the runner banner has leaked it into a transcript before. `$DB` was read out of
`.env` inside the runner script, so the literal never appeared on a command line
typed anywhere. `--revalidate-url` on all five. The whole run was wrapped in
`vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN` so the edge purge had a token;
`VERCEL_TOKEN present: True` is the first line of the transcript.

Order was C2.3 before P3, as the brief asked — P2 is the only pillar Google has
actually crawled (SEO-01), so the cluster with a live crawl path went first.

```
RUN START  2026-08-25T17:54:34.9Z
RUN END    2026-08-25T17:56:58.7Z      five articles, 144 seconds, five exit 0
SWAP       2026-08-25T17:58:14.4Z -> 17:58:17.5Z
```

Every one of the five printed the sentence that may only be printed when both
caches are clear:

```
Content caches dropped and the Vercel edge purged — the article is visible on the
site now. Purged (HTTP 200):
  /artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
  /artikel/ucapan-doa
  /sitemap.xml
```

## The fee-table swap did not go through ingest, and could not have

`kursus-kahwin` is a WordPress-migrated row with no markdown source file, so
`pnpm ingest --update` has nothing to update _from_: it would have had to
reconstruct the whole 56-block document, including 18 image nodes, from a body
that exists only in the database. The swap instructions call that out as the
thing to avoid, and they are right. So it was a targeted `articles.content`
write, guarded, with the cache handling ingest bundles reproduced exactly rather
than approximated — same revalidate endpoint, same three-attempt retry, then
`purgeVercelEdge` over the same three paths.

**The instructions' description of the column is wrong, and following it
literally is impossible.** They say `articles.content` is _"a legacy jsonb
object holding a TipTap HTML string"_ and give an HTML find-string to
substring-replace. It is a ProseMirror JSON document. The find-string was
therefore matched against **the two nodes it describes** — the `Bayaran Yuran`
h2 and the paragraph after it — located by content and never by index, and the
replacement HTML was converted with `generateJSON`, the same function
`markdownToTiptap` uses, so the new nodes are shape-identical to anything ingest
would have written. This is the retrospective; see below.

Every guard the swap ran, and what each returned:

```
converted section blocks: {"h2":1,"paragraph":15,"table":1,"h3":3}
table rows: 15 · header cells: 4 · cell types: tableHeader, tableCell
nodes: 56 -> 74 (swapped 2 -> 20 at index 12)
untouched nodes carried by identity: 54 / 54
image nodes: 18 -> 18 · identical: true
bytes: 23655 -> 37443
WROTE  {"id":"1c2e96ae-…","t":"object","updated_at":"2026-08-25T17:58:15.646Z"}
VERIFY {"t":"object","blocks":74,"old_survives":false,"new_present":true}
```

The run aborts if the row id or the whole `content::text` has moved since the
snapshot, if the h2 is not unique, if the following node is not the exact
paragraph named, if the table does not survive conversion, if it does not have
15 rows and a `tableHeader` header row, if any node outside the swapped window
changes, if any of the 18 image nodes changes, or if any of five expected
strings is missing from the result. **`18 -> 18 · identical: true` is the one
that mattered** — it is precisely the collateral edit the instructions forbid.

The section carries the time-sensitive figure the brief flagged: Pulau Pinang
RM100 → RM120 on **1 September 2026**, six days out, with both figures and the
changeover date in the table row and in the prose.

## Proof

Cache headers on every request, because a stale 200 and a fresh 200 are
otherwise identical. **No wait was taken after the last write.**

### The pillar hubs, with a control — this is the edge purge's first real outing

The two hubs were deliberately warmed to a **confirmed HIT before any write**.
Without that the measurement proves nothing: an absent or expired CDN entry
rebuilds on the first request regardless of whether the purge did anything.

```
2026-08-25T17:54:21Z  /artikel/hantaran-mas-kahwin  MISS  age 0   41556 bytes   dulang/gubahan/sirih: 0/0/0
2026-08-25T17:54:25Z  /artikel/hantaran-mas-kahwin  HIT   age 2   41556 bytes   dulang/gubahan/sirih: 0/0/0
2026-08-25T17:54:24Z  /artikel/ucapan-doa           MISS  age 0   37631 bytes   walimatul/skrip:     0/0
2026-08-25T17:54:26Z  /artikel/ucapan-doa           HIT   age 1   37631 bytes   walimatul/skrip:     0/0
```

A warm edge entry existed, and it did not contain the new articles. Then the
five writes. Then **one request each — not two, not a warm-up, not a retry:**

```
URL:              https://hellokahwin.com/artikel/hantaran-mas-kahwin
AT (UTC):         2026-08-25T17:57:08.304Z   (+10s after last write)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       44463
PROBE "dulang-hantaran": 3   "gubahan-hantaran": 2   "sirih-junjung": 2

URL:              https://hellokahwin.com/artikel/ucapan-doa
AT (UTC):         2026-08-25T17:57:12.869Z   (+14s after last write)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       39806
PROBE "walimatul-urus": 2   "skrip-pengacara-majlis-perkahwinan": 2
```

**It held.** `REVALIDATED age: 0` against a HIT that was two seconds old ten
seconds earlier is the purge doing exactly what it was built to do, and all five
new articles are listed on request #1. Compare the behaviour this replaced,
measured 25 Aug and recorded in `@/lib/cache/edge-purge`: **457 seconds** after
the last write, past the 300s TTL, the pillar still answered
`x-vercel-cache: STALE  age: 717` with `<meta name="robots" content="noindex,
follow">`. A steady-state re-request 160 seconds later returned `HIT` with
byte-identical bodies (44463 / 39806), so the `REVALIDATED` response was the
full render and not a partial one.

Both hubs also carry the right cluster heading — `Gubahan &amp; dulang hantaran`
and `Aturcara &amp; pengacara majlis` — so the articles land under their cluster,
not loose on the hub.

### The five new URLs — first request, one shot each

None of these had ever been requested; they returned 404 until 17:54. So
`REVALIDATED age: 0` here is a genuine cold render.

```
URL:              https://hellokahwin.com/artikel/hantaran-mas-kahwin/dulang-hantaran
AT (UTC):         2026-08-25T17:57:23.916Z   (+25s after last write)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       117164   NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/hantaran-mas-kahwin/gubahan-hantaran
AT (UTC):         2026-08-25T17:57:29.287Z   (+31s)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       120547   NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/hantaran-mas-kahwin/sirih-junjung
AT (UTC):         2026-08-25T17:57:33.172Z   (+34s)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       118048   NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus
AT (UTC):         2026-08-25T17:57:36.684Z   (+38s)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       139518   NOINDEX ANYWHERE IN BODY: false

URL:              https://hellokahwin.com/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
AT (UTC):         2026-08-25T17:57:40.529Z   (+42s)
STATUS:           200      HDR x-vercel-cache: REVALIDATED   HDR age: 0
BODY BYTES:       151608   NOINDEX ANYWHERE IN BODY: false
```

**Five for five: 200, cold, no `noindex`, within 42 seconds of the last write.**
None of the five emits a robots meta at all, which is the indexable default.

### The kursus article, and the table in the live HTML

Not baselined first, per the swap instructions.

```
URL:              https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin
AT (UTC):         2026-08-25T17:58:23.395Z   (+8s after the write)
STATUS:           200      HDR x-vercel-cache: MISS   HDR age: 0
BODY BYTES:       144270   NOINDEX ANYWHERE IN BODY: false
PROBE "RM180": 6   "1 September 2026": 2   "KISWA": 4   "Tiada kadar tersiar": 6
```

The table is a real table in the served HTML — `1 <table>, 15 <tr>, 4 <th>,
56 <td>`, exactly the source — not prose that used to be a table:

```html
<tr>
  <th colspan="1" rowspan="1"><p>Negeri</p></th>
  <th colspan="1" rowspan="1"><p>Yuran seorang</p></th>
  <th colspan="1" rowspan="1"><p>Di mana kadar itu tersiar</p></th>
  <th colspan="1" rowspan="1"><p>Disemak</p></th>
</tr>

<tr>
  <td colspan="1" rowspan="1"><p>Pulau Pinang</p></td>
  <td colspan="1" rowspan="1"><p>RM100, naik ke RM120 mulai 1 Sep 2026</p></td>
  <td colspan="1" rowspan="1"><p>JHEAIPP, portal e-Munakahat</p></td>
  <td colspan="1" rowspan="1"><p>26 Ogos 2026</p></td>
</tr>
```

### Sitemap, 73 → 78

```
2026-08-25T17:51:44Z   73 <loc>   x-vercel-cache: HIT           age: 1266
2026-08-25T17:58:49Z   78 <loc>   x-vercel-cache: REVALIDATED   age: 0
```

Diffed line by line, the only additions are the five new URLs. `kursus-kahwin`
moves position in the file — it is ordered by `updated_at` — but its `<loc>` is
byte-identical, which is the swap instructions' _"same slug, same URL"_
discharged as a measurement.

### One rendered credit line, quoted from the live HTML

From `/artikel/hantaran-mas-kahwin/sirih-junjung`, the served markup:

```html
<figcaption class="absolute inset-x-0 bottom-0 … text-xs text-white italic">
  <a
    href="https://www.flickr.com/photos/mynasir/4125132130"
    target="_blank"
    rel="noopener noreferrer"
    >Setiap helai daun disemat satu demi satu supaya tepinya bertindih dan tidak menampakkan gabus
    di bawahnya. Kubah inilah yang memakan 100 helai daun. — Kredit: Mohd Nasir Mat Noor (CC BY
    2.0)<svg …></svg
  ></a>
</figcaption>
```

Caption, em-dash, credit and licence, wrapped in the licensor's own source URL
with `rel="noopener noreferrer"`. Every one of the five pages renders one of
these per image — 10, 10, 10, 14, 14 credit strings respectively, matching 4, 4,
4, 6, 6 images plus their RSC payload copies.

## The row moved under us, four minutes later

At **18:01:59Z**, while this was being written up, the **SEO-02
internal-linking session added five editorial links to `kursus-kahwin`** —
blocks 11, 69 and 73, pointing at `rukun-nikah`, `syarat-sah-nikah`,
`borang-nikah`, `lafaz-taklik` and `taaruf-maksud`. Concurrent, legitimate work
by another session on the same production row.

**The fee section survived intact.** Blocks 12–31 are byte-identical to what
this run wrote, and the live page still serves the table (`1 <table>, 15 <tr>,
4 <th>, 56 <td>` at 18:03:40Z). Establishing that needed one non-obvious step:
Postgres normalises jsonb object key order, so `{"type":"text","text":"…"}` comes
back as `{"text":"…","type":"text"}` and a naive diff calls **every** block
changed. Compared key-sorted, exactly three blocks differ, and none of them is
in the swapped window.

The consequence is recorded in the undo, because it changes it: a blind restore
of the pre-swap snapshot would now delete that session's links as well as the
fee table. `restore-kursus.mjs` was hardened for it — it compares the live
document against what this run wrote, names every block that has moved, and
**refuses** unless also given `--i-know-it-moved`. It currently refuses with
exit code 4, which is the correct answer.

**One consequence for whoever owns SEO-02.** That session also changed
`markdownToTiptap` in `scripts/ingest-article.mts` after this run finished — it
now runs `normaliseInternalLinkMarks(doc)` over the converted document, using a
new `InternalAwareLink` extension. **All five articles here were ingested by the
converter as it stood before that change**, at 17:54–17:56, and so carry
whatever link-mark shape the old path produced. If the normalisation is meant to
apply retroactively, these five need a `--commit --update --publish` pass; if it
only matters for new work, they do not. Flagged rather than decided — it is not
this run's call. Both edits to that file coexist cleanly: typecheck, eslint,
prettier and the full suite are green with them in place together.

## What this run did not do

- **No article text was written or edited.** The board-cleared text is what
  shipped, and the two staged copies differ from their originals by seven lines
  each, all mechanical.
- **No pillar hub row was written.** Both hubs already owned published articles,
  so neither changes indexability because of this run.
- **The three C2.3 originals were not touched** — they were authored directly
  into `drafts/ingest/` and had no separate original to keep in sync.

---

## Retrospective

**The question.** The fee-table swap was gated for days, researched carefully,
and its instruction document was thorough — it named the target row, warned
about collateral edits, specified `--update`, mandated the revalidate URL, and
even wrote a contingency for the 1 September fee change. And its central
technical claim was false: `articles.content` is not "a legacy jsonb object
holding a TipTap HTML string". So what should catch _"this document describes
production, and nobody asked production"_?

**The uncomfortable answer: the document already contained its own refutation,
and it was two paragraphs from the error.** Verbatim, from
`kursus-kahwin-yuran-SWAP-INSTRUCTIONS.md`:

> _"Do not rebuild the body from the rendered page. The rendered `<img>` tags
> carry Next.js Image attributes (`data-nimg`, `loading`, `decoding`, generated
> `class` and `style`) that are not in the stored source, so a reconstructed body
> would silently rewrite all 18 image nodes."_

That paragraph is exactly right, and it states the principle that render ≠
storage. The next paragraph then derives the storage format **from the render**
— because the rendered page is HTML, the stored value was assumed to be an HTML
string — and prescribes a substring replace on it. **The method the document
prescribes is the failure the document forbids.** Rendering the doc to HTML,
patching the string and writing it back is the only way to make that instruction
followable, and it rewrites all 18 image nodes.

**And the same false belief is in shipped code**, which is how it survives being
noticed. `scripts/audit-internal-links.mts`, written for SEO-02 the same day,
opens with:

> _"Both content shapes are handled: TipTap JSON (everything ingested) and the
> raw TipTap HTML string the WordPress-migration rows carry."_

One query settles it, and it takes two seconds:

```
select jsonb_typeof(content), content->>'type', wp_id is not null, count(*)
  from articles group by 1,2,3;

  shape   doc_type  wordpress_migrated  rows
  object  doc       true                29
  object  doc       false               32
```

**All 61 rows are `{type:"doc", content:[…]}`, including all 29 WordPress
migrations. No row has ever held an HTML string.** The audit script's
`typeof content === 'string'` branch is unreachable against this database —
harmless as defence, wrong as documentation, and it is the documentation that
propagated.

**This is the same failure the last retrospective wrote up, one level down.**
That one said: _derive the population from the data, never from a brief's table_,
and _record the query beside the rule_. It fixed the rule for **counts**. Nobody
extended it to **shapes** — and a wrong shape is worse than a wrong count,
because a count that is wrong makes a check fail loudly, while a shape that is
wrong makes an operator write a plausible script that silently destroys 18 image
nodes. The near-miss here was avoided by one habit, not by any rule: dumping the
row before touching it.

There is a second, cheaper finding worth naming. **Three consecutive briefs have
asserted intra-batch cross-links that do not exist** — P1/P6, P3/P4/P7, and this
one. Every time, the whole link graph is derivable from the drafts and
production in about four seconds, and every time it comes back `NONE`. Briefs
should stop asserting the dependency order and start asking for it to be
measured; the measurement already exists as `links.mjs` in this run's evidence,
and `pnpm --silent links:audit` covers the live half.

### The file that must change, and the edit

**`scripts/ingest-article.mts`** (site repo) — the file that already owns every
hard-won lesson about writing `articles.content` directly, including the
`sql.json()` versus `JSON.stringify` double-encoding note that this very column
produced. It is where anyone about to hand-edit a legacy row will land, and it
said nothing about what the column actually holds.

Added immediately above the `sql.json()` block, so the two notes read as one
lesson: **WHAT `articles.content` IS, FOR ANYONE WRITING IT BY HAND.** It states
the shape, carries the census above with the query that produced it, tells the
story of this near-miss in three sentences so the rule has a reason attached,
prescribes the method that worked (walk `doc.content`, splice, carry every other
node by identity, build replacement nodes with `generateJSON` so hand-written and
ingested sections are the same shape, then assert the untouched nodes and the
image nodes are byte-identical), and names the one other place the false belief
lives.

Passes prettier, eslint, `typecheck`, and the full suite — **21 files, 237
tests, all green.**

**What was deliberately not edited.** The header comment of
`scripts/audit-internal-links.mts` is wrong and should be corrected, but that
file is **uncommitted work belonging to a live SEO-02 session** in this shared
worktree — the same session that wrote to `kursus-kahwin` mid-run. Editing
another session's untracked file is how two sessions lose an afternoon. It is
named in the note instead, and is handed to its owner as a one-line fix.

**The honest limit.** None of this would have stopped the instruction document
being written wrong. It only guarantees that the next person to open the ingest
script finds the truth before they write, rather than after. The thing that
would actually have prevented it — _a document that states a property of
production must cite the query that produced the claim_ — belongs in the content
production workflow's Standards loop, and that file is the docs repo's, not this
one's. It is worth one line there, and this log is the citation for it.
