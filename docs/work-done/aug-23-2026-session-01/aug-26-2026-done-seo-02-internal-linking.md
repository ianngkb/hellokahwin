# Done — SEO-02: the internal linking pass

**Date:** 26 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-seo-02-internal-linking.md`
**By:** head-of-seo-content
**Sprint 01, item SEO-02, 3 points. The last item.**

**Production was written.** 45 article bodies updated in one transaction, both
caches dropped, 17 links proven in the HTML the site delivered. Undo recorded
before the write and reproduced below. `published_at` was never touched.

---

## The headline, and it is not the one the brief expected

**Every internal editorial link on hellokahwin.com carried `rel="nofollow"`.**

79 of 109. Including all five links out of `mas-kahwin-ikut-negeri` — the
highest-impression page on the domain, 336 impressions — and **every link on all
28 pillar articles published this week.** `nofollow` tells Googlebot not to
follow the link. The site had an internal link graph that no crawler would walk.

Nobody typed the word anywhere. TipTap's Link extension ships
`HTMLAttributes = { target: '_blank', rel: 'noopener noreferrer nofollow' }`, and
those are the defaults of the attributes themselves. `marked` emits a bare
`<a href>`, `generateJSON` fills the gap from those defaults and writes them into
the row, `generateHTML` emits them. The writer writes a link; the pipeline
switches it off; nothing reports it.

The brief asked me to add links so Googlebot would have roads into six cold
pillars. **Adding links through that pipeline would have produced sixty more
nofollowed links and a report claiming a crawl path had been opened.**

### How it hid

SEO-01 checked all 28 articles for status, `robots` meta and `X-Robots-Tag`,
found them clean, and concluded — reasonably — *"nothing is blocked; the
constraint is crawl scheduling alone."* That sentence went into `ceo-memory.md`
as fact and scoped this item.

It was true about the pages and false about the site. **Every check we had
looked at the page being diagnosed; the block was on the links, in the markup of
the pages doing the linking.** No check in the pipeline had ever read an emitted
`<a>`.

---

## The numbers

Both columns from the same command over the live database, before and after:

```
pnpm --silent links:audit --db "$DB" --json <out>
```

| | Before | After |
|---|---|---|
| Published articles | 61 | 61 |
| **Orphans (0 inbound editorial links)** | **32** | **0** |
| **Dead internal links** | **0** | **0** |
| Editorial article→article links | 111 | **178** (+67) |
| Internal links emitted `rel=nofollow` | **79** | **0** |
| Internal links emitted `target=_blank` | **109** | **0** |
| Links spending a 308 redirect hop | 42 | 41 |

Links added: **68** (15 in-prose anchors, 53 related-reading entries). One
removed — `majlis-kahwin` linked to itself. Net +67.

An **orphan** here is a published article with zero inbound links from another
article's body. Pillar hub pages list every article in their clusters
automatically (`PillarBody`), and the header links the hubs, so counting
navigation would make every article non-orphan by construction and measure
nothing. That is the definition the persona's own rule 16 uses — *"at least one
inbound EDITORIAL link; navigation and footer links do not count"* — and it is
written into the tool rather than into a note.

### The before column is not the brief's before column

The brief said five articles were *"written and ready to ingest but not yet
published"* and told me not to link to them. **All five went live 25 Ogos
17:54–17:56 UTC**, the day before the brief was written. The site has 61
published articles, not 56.

I found this only because my write script listed slugs my audit had not, an hour
into the run. I re-took the entire baseline before writing anything — the
32/0/111 above is that second measurement, not the first. Had I trusted the
brief, `dulang-hantaran`, `gubahan-hantaran`, `sirih-junjung`, `walimatul-urus`
and `skrip-pengacara-majlis-perkahwinan` would have been left as orphans and the
"orphans → 0" claim would have been false.

---

## What was changed, and why each link earns its place

Two shapes only, and **no prose was written, rewritten or deleted.**

**In-prose anchors (15).** The anchor text was already on the page; the link
mark was added to it. `kursus-kahwin` already said *"syarat nikah"* and *"rukun
nikah"*; `mas-kahwin-ikut-negeri` already said *"borang nikah"*. The script
refuses unless the phrase matches exactly one unlinked text node, so no anchor
was placed by guesswork — three entries were rejected on the first run for
matching two or three candidates and had to be disambiguated.

**Related-reading entries (53).** Fourteen legacy articles already carry a
WordPress-era **"Artikel Lain:"** block. Entries were appended to the existing
list. The block, its heading and its shape were on the page before this run.

### The crawl-path hypothesis, stated so Sprint 02 can score it

All ten legacy articles used as link sources were confirmed by URL Inspection on
26 Ogos as **"Submitted and indexed", last crawled 2026-08-23.** 26 of the 29
legacy articles are. Until today, every editorial link in them pointed only at
other legacy articles — a closed loop with no door into the pillar architecture.

The links I expect to open a crawl path, highest confidence first:

| From (indexed) | Into | Why |
|---|---|---|
| `mas-kahwin-ikut-negeri` (336 imp) | **P1** `borang-nikah` | in-prose, on the strongest page we have |
| `kursus-kahwin` (19 imp) | **P1** ×4 | the course certificate is an attachment to the nikah form; same errand |
| `dewan-kahwin` (971 imp, pos 9.3) | **P6** ×3, **P5** | the site's traffic leader, into the pillar its readers are already shopping in |
| `garden-wedding` (824 imp) | **P6** ×2, **P5** | second-strongest page |
| `hantaran-tunang` (32 imp) | **P7** ×3, **P5** | engagement content into the engagement cluster |
| `majlis-kahwin` (16 imp) | **P3** ×4 | the only natural doorway into ucapan/doa |
| `hantaran-kahwin` | **P4** ×2 | songket and baju are standing dulang items — the only honest route into busana |
| `lokasi-pre-wedding-photoshoot-terbaik` | **P4** ×2 | weakest of the set: this source is itself never-crawled |

**P4 is the weakest claim and I am saying so rather than levelling the table.**
No indexed legacy article is about baju, songket or inai. Its two real inbound
links come from `hantaran-kahwin` (indexed, low traffic); the pre-wedding
photoshoot article is a good editorial fit but has never been crawled itself.

### The counter-example that changed the design

`lokasi-pre-wedding-photoshoot-terbaik` already had **three inbound links from
indexed pages** and had still never been crawled. That looked like a refutation
of the whole hypothesis. It is not — all three pointed at the legacy **root**
slug `/lokasi-pre-wedding-photoshoot-terbaik/`, which 308s, and URL Inspection
reports that root URL as **"unknown to Google"** while its canonical sits in
"Discovered".

So a link through a redirect splits the signal across two URLs and spends a hop.
**Every one of the 68 links added points at the canonical
`/artikel/{category}/{slug}`.** The 41 remaining root-slug links are all inside
legacy bodies and are listed as open work below.

---

## Verification

The audit numbers above come from the database. What readers and Googlebot
actually receive was checked separately, **serially, one URL at a time, ~6s
apart** — a proof sweep is production traffic, and on 25 Ogos a concurrent sweep
of seven cold pillar hubs blew the 3s query deadline on six of them and cached
the degraded render. No hub was requested. Bodies were kept
(`.tmp-seo02/proof/*.html`), not just verdicts.

```
200 cache=MISS age=0  118064B 5565ms anchors=28 nofollow=0 _blank=0  …/mas-kahwin-ikut-negeri
200 cache=HIT  age=86 145672B   93ms anchors=32 nofollow=0 _blank=0  …/kursus-kahwin
200 cache=MISS age=0  108967B 3456ms anchors=31 nofollow=0 _blank=0  …/dewan-kahwin
200 cache=MISS age=0  103468B 3437ms anchors=28 nofollow=0 _blank=0  …/hantaran-tunang
```

Body sizes 103–145 KB against a healthy article render of ~118 KB, so none of
these is a thin degraded 200. **All 17 named links were present, followed and
same-tab in the delivered HTML.** `kursus-kahwin` came back a `HIT` at `age=86`
— a copy cached 86 seconds *after* the write, and it carried the new links, so
it is post-write; I did not baseline any of these URLs beforehand.

---

## The code, and what is NOT deployed

The database repair fixes today. It does not stop the next `--update` ingest
re-stamping `nofollow` from the same defaults. That needed a code fix.

Committed to `ianng89/pillars-ingest-redirects` as **`7c63287`**:

- **`src/lib/inspire/internal-links.ts`** — the Link mark decides `rel`/`target`
  from the href. Internal → followed, same tab. External → unchanged, because
  whether to follow outbound links is an editorial decision, not a defect. The
  decision is at *render* because the 29 WordPress rows have no source file and
  no ingest-side change can reach them.
- **`normaliseInternalLinkMarks`**, called by the ingest after `generateJSON`,
  so what we store matches what we emit.
- **7 tests.** The one that matters runs markdown through the actual ingest
  extensions and the actual renderer and asserts the delivered `<a>`. A unit
  test on the extension alone would have passed on the day production shipped 79
  nofollowed links.
- **`scripts/audit-internal-links.mts`** (`pnpm links:audit`) — the instrument.

Full suite: **250 tests, 22 files, all passing.** Typecheck clean. Prettier clean.

> **⚠ FOR THE CEO: this commit is not deployed.** Production ships through the
> git integration on `master`. The site is correct today because the rows were
> repaired; it will regress the first time anyone re-ingests an article from a
> draft. **Merging `7c63287` is a code deploy, which is a different act from the
> content write this brief authorised, so I have not done it.**

### Two defects found in the edge purge, fixed in the same commit

Purging 58 paths returned `400 tags should NOT have more than 16 items` and
**purged nothing**. `pathsInvalidatedByIngest` returns exactly three paths, so
the ceiling sat one article above anything anyone had ever sent. Then the retry
loop made it worse: it retried the 400 twice, spent the endpoint's
five-requests-per-minute budget, and the next attempt came back `429`.

- Batch at 16, spaced ~12.5s so four batches fit inside the rate limit.
- Only a `429` is retried, and it waits to Vercel's own `limit.reset` instant.
  Every other 4xx is a fact about the request, not a blip.

Both are covered by tests. The purge then completed: `HTTP 200 in 4 request(s)`,
58 paths.

---

## Undo

`docs/work-done/aug-23-2026-session-01/aug-26-2026-undo-seo-02-internal-linking/content-before.json`
— the complete pre-write `content` for all 45 rows, written **before** the
transaction opened, keyed by article id.

```
pwsh vault.ps1 run supabase.hellokahwin-dbpass -EnvVar PGPASSWORD \
  pwsh -c "node .tmp-seo02-undo.mjs <path-to>/content-before.json --commit"
# then re-run the revalidate + edge purge
```

`published_at` is not in the undo because SEO-02 never wrote it — the restore
sets `content` and `updated_at` only. Nothing here restamps a publish date.

---

## Open, with the evidence attached

1. **`7c63287` is not deployed.** Above. This is the one that matters.
2. **41 internal links still point at legacy root slugs**, all inside legacy
   bodies. Each spends a 308 and, per the `lokasi-pre-wedding` finding, may be
   landing the discovery on a URL Google calls "unknown". Repairing them is the
   same mechanical shape as today's write. Not done today because it is a
   separate change to article bodies and this run had already written 45 rows.
3. **Cluster-sibling links are still thin.** Rule 14 wants every cluster article
   linking sideways to 2–4 siblings. Today's pass came entirely from legacy
   sources because that is where the crawl value is; the sibling pass needs the
   draft files edited and re-ingested, which is a different risk surface (each
   re-ingest restamps `published_at` unless the date is read out of the database
   first). **Recommend it as the first SEO item of Sprint 02.**
4. **🔴 The production database URL, with its password, has been sitting in
   plaintext at `%TEMP%\hk_db_url.txt` since 24 Ogos 22:51.** Written by an
   earlier run's helper script. I did not use it and did not delete it — another
   in-flight run may read it, and deleting it mid-sprint could break something I
   cannot see. **It should be deleted and the password rotated.** Owner call.
   The vault path works and needs no file: `vault.ps1 run
   supabase.hellokahwin-dbpass -EnvVar PGPASSWORD …`.
5. **P4 has the weakest crawl path.** See the table above.

---

## Retrospective

**Stage 9. The file that had to change is
`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
and I have edited it** — a new section under Stage 7, *"A LINK YOU WROTE IS NOT
A LINK GOOGLE FOLLOWS. Check the emitted `<a>`."* I also corrected
`docs/boardroom/ceo-memory.md`, which carried the disproved sentence as fact.

**1. The instrument decided the finding, and I nearly built the wrong one.**
My first plan was to count orphans and add links — exactly what the brief asked.
The nofollow defect surfaced only because the audit script recorded the link
*attributes* alongside the hrefs, which was not needed for any question I had at
the time. That is the same accident as the P5 body-size near-miss recorded in
this document, and it should not be needed a third time. **Record more than the
question you currently have** is already written down; what today adds is that
it applies to *measurement scripts*, not just proof sweeps.

**2. "No blocker found" was reported as "the only remaining cause is X", and it
scoped a sprint item wrongly.** SEO-01 was careful and its measurements were
right. Its error was in the sentence after them: the absence of the blockers it
checked became a positive claim about the only remaining explanation. That
sentence entered `ceo-memory.md` as a fact and framed this brief around adding
links to a graph that was switched off. **The honest form is "no page-level
block found; checked status, `robots` meta, `X-Robots-Tag`" — which names the
search space and leaves the next person somewhere to look.** This is the second
time this exact failure has been recorded here: the "migration with thirteen
redirects" belief entered the same file as an inference and scoped a sprint item
around a redirect map that could not exist.

**3. The brief's premises expired and only a tool caught it.** Five articles the
brief called staged had been live for eighteen hours. I did not catch it by
reading; I caught it because a script printed slugs the earlier one hadn't.
This document's own rule — *"a block is a claim about the current state of a
file, and it has a shelf life of exactly one edit"* — is filed under blocks.
**It applies to every factual premise in a brief, including the ones that sound
like settled context**, and the cheapest guard is to re-derive the row count
from the database as the first act of any run that will write to it.

**4. Guards that refuse are worth more than guards that warn.** The write script
refused three times before it ran: two ambiguous anchor phrases, one that
matched a table cell as well as a section heading. Each refusal was a link that
would have landed in the wrong sentence, and none would have shown up in any
count — orphans, dead links and totals would all have read correctly. **A count
cannot see a link that resolves but reads wrong.** The `exactly one match or
refuse` rule is the only thing standing between this pass and fifteen anchors
placed by first-occurrence.

**5. I fixed the emitter before adding to it, and that ordering was the whole
job.** Sixty-eight new links through the unfixed pipeline would have produced a
truthful-looking report — orphans 0, dead 0, 68 added — describing a crawl path
that did not exist. The brief's definition of done was fully satisfiable without
achieving the brief's purpose. **When the definition of done can be met while
the stated mechanism stays broken, the mechanism is the deliverable.**
