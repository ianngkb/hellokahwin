# RISK-07 — six sitemap URLs served noindex, and the reason nobody could tell

**Sprint 03 · risk track · 3 points · Agent: Amelia (BMAD dev) · 2026-08-28**
**Branch:** `feat/risk07-noindex` → shipped to `master` as `db8a117`, `3bdaeec`, `096bdfc`
**Evidence:** `docs/work-done/2026-08-28-risk-07-noindex-EVIDENCE/`

---

## The claim, stated so it can be checked and so it cannot be over-read

**Shipped and verified.** All six URLs are served without `noindex` on a fresh
request from live production, and now say `index, follow` explicitly rather than
saying nothing. The sitemap is unchanged at 103 URLs. The rule that decides
robots for `/artikel/[category]` is now a pure, unit-tested table, and the
indexing monitor has the alarm condition that would have escalated this instead
of filing it.

**One clause of the DoD is not met yet, and it is not mine to force.** "At least
one of the six shows its exclusion cleared in GSC URL Inspection" depends on
Google re-crawling. All six still read `Excluded by 'noindex' tag` with
`last_crawled: 2026-08-23`. The sitemap has been resubmitted; the API offers no
way to request indexing. See **The clause that is still open**, below.

---

## The six, named, with the robots meta quoted from live HTML

Every line below is `curl` against `https://hellokahwin.com`, not the route
source. The before column is 2026-08-28T03:16Z; the after column is
2026-08-28T03:36Z, two minutes after deployment `db8a117` went green.

| URL | before | after |
|---|---|---|
| `https://hellokahwin.com/artikel/hiasan-dekorasi` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |
| `https://hellokahwin.com/artikel/moden-kontemporari` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |
| `https://hellokahwin.com/artikel/pantai-santai` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |
| `https://hellokahwin.com/artikel/glamor-eksklusif` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |
| `https://hellokahwin.com/artikel/fotografi-videografi` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |
| `https://hellokahwin.com/artikel/minimalis-mewah` | *(no robots meta at all)* | `<meta name="robots" content="index, follow"` |

Raw, with cache headers on every request:
`01-before-live-robots.txt`, `02-after-live-robots.txt`.

**A negative control ran in both passes**, because "no robots meta found" six
times in a row is exactly what a broken grep looks like:

```
https://hellokahwin.com/artikel/idea-dan-nasihat?sub=zzz-tiada-slug-19380
HTTP/1.1 404 Not Found
X-Vercel-Cache: MISS
<meta name="robots" content="noindex"
```

Same command, same pipe, a URL that should be `noindex` — and it is. The grep
was not blind.

**Every after-row was `X-Vercel-Cache: MISS` or a 20-second-old `HIT`**, i.e.
served from the origin on the deployment under test. That header is quoted per
URL in the evidence file, because without it a stale 200 and a fresh one are
indistinguishable — the trap `src/lib/cache/purge.ts` documents at length.

**No edge purge was needed and none was run.** The production deploy invalidated
the CDN by itself; the first request to each canonical URL afterwards came back
`MISS`. That is measured, not assumed.

## The sitemap is untouched

```
$ curl -sS https://hellokahwin.com/sitemap.xml | grep -c '<loc>'
103
```

All six still present, one `<loc>` each. This was a robots fix, as the DoD
requires, not a sitemap edit — `src/app/sitemap.ts` is byte-identical to what
was on `master` this morning.

---

## What was actually wrong, which is not what the item assumed

The item was written expecting to find `noindex` on six live URLs and remove it.
**It was not there.** Before I changed a line, all six already served without
`noindex` — on a warm `HIT` and on a cache-busted `MISS` alike.

The render fix shipped on **23 Aug 2026 in `a2952ce`** ("pillar pages,
self-maintaining pillar/cluster links, sitemap fix"), which added
`src/lib/inspire/category-indexability.ts` and the child-hub exception in the
category route. Google's crawls of the six ran **04:39Z to 07:01Z on 23 Aug**;
`a2952ce` landed at **05:44Z**. The crawl straddled the deploy, Google recorded
`BLOCKED_BY_META_TAG`, and has not been back since.

So the defect on 28 August was not a `noindex` tag. It was:

1. **A stale Google verdict** nothing was asking Google to revisit, and
2. **an origin that could not tell you which state it was in.**

(2) is the part worth fixing in code, and it is why the six spent five days
looking exactly like a live defect to anyone reading Search Console.
`generateMetadata` returned `baseMeta` with no `robots` key for an indexable
hub — no meta tag, indexable by default. It also returns `{}` when the category
lookup blows its 3s deadline. Two states, one wire signature:

```
indexable, as designed   →  (no robots meta)
metadata render failed   →  (no robots meta)
```

A page whose robots state cannot be read off the artefact the consumer receives
is the whole failure shape this item is named after. So the page now says it out
loud. `index, follow` is what Google already assumed; the change is that
`curl | grep robots` can now distinguish the two cases above, and the six rows
in the table at the top of this document are a measurement rather than an
absence.

---

## The rule now lives somewhere it can be argued with

`src/lib/seo/category-robots.ts` — a pure function, no DB, no network, no clock.
The route computes the facts; the table decides.

| view | condition | robots |
|---|---|---|
| child hub | owns ≥1 published article | `index, follow` |
| child hub | owns none | `noindex, follow` |
| top-level hub | ≥1 article anywhere beneath it | `index, follow` |
| top-level hub | empty pillar | `noindex, follow` |
| `?sub=` | slug is not a real child | `noindex, nofollow` |
| `?sub=` | real child, has articles | `index, follow` |
| `?sub=` | real child, empty | `noindex, follow` |
| any | deadline missed | `index, follow` — **fails open** |

**No indexability decision changed.** Every row above is what the route already
did; the four inline returns in `generateMetadata` now call one table instead of
each carrying its own literal.

The reason to move it is not tidiness. The rule could previously only be
exercised by rendering the route against a database, which means it could only
be reviewed by running it — and this defect survived a sprint after its own fix
shipped. `src/lib/seo/indexing-alarm.ts` already made this split for the same
reason and says so in its header: judgement pure, I/O outside.

`ROBOTS_ON_DEADLINE_MISS` is the fail-open case, named and tested. `revalidate:
false` caches whatever a render produced for as long as the tag lives, so one
transient DB blip would otherwise pin `noindex` on a hub that owns live article
URLs — this defect, recreated by its own error path.

---

## The monitor now has the condition that would have caught this

RISK-05's monitor **saw all six on its first real sweep**, 26 Aug, and printed
them in its census table:

```
Excluded by 'noindex' tag                 6
```

It did not alarm, and it was right not to: its DoD named two conditions,
`unknown-to-google` and `never-crawled`, and this is neither. The six became a
finding, went to the backlog unowned, and stayed excluded for a sprint.

Looking without escalating produces a fact nobody is accountable for. So:

- `isNoindexedInSitemap()` — third alarm condition, same 72h grace window.
  Reads `indexingState === 'BLOCKED_BY_META_TAG'` **or** the prose, for the
  reason the file header already gives about `isUnknownToGoogle`: Google's
  `coverageState` is localised human text and `indexingState` is an enum that
  can gain values, so either alone is one Google change away from silence.
- `alarmIssueTitle()` — exported and unit-tested, because the title is the only
  line most people read and it must not call this "dark". Google fetched these
  pages; it did what the page asked. A new alarm wearing a familiar headline
  gets read as the familiar one and closed.
- The census bucket labels lost the word "dark" for the same reason — a bucket
  label that cannot describe a defect becomes the place that defect hides.

**It has been seen to fire.** Dispatched on `master` immediately after shipping:

```
run  https://github.com/ianngkb/hellokahwin/actions/runs/33139930483
### Indexing monitor — 103 sitemap URLs swept

| bucket | count |
| alarming (>72h) | 4 |
| watching (inside 72h) | 7 |
| not answered by Google | 0 |

| coverage_state | count |
| Submitted and indexed | 92 |
| Excluded by 'noindex' tag | 6 |
| Discovered - currently not indexed | 4 |
| URL is unknown to Google | 1 |

detected at : 2026-08-28T03:50:46.524Z
issue at    : 2026-08-28T03:50:47Z
gap         : 1s
issue       : https://github.com/ianngkb/hellokahwin/issues/10
```

Issue #10, titled **"ALARM: 4 sitemap URL(s) are advertised while serving
noindex (>72h)"**, is **deliberately left OPEN**. Its condition is still true:
Google is still excluding six URLs we advertise. It will clear itself when
Google re-crawls, and until then it is the accountable record this item existed
because nobody had.

### The "4" is not "two of them cleared", and I nearly wrote that it was

The alarm says 4; the census in the same run says 6. **Both are correct.**
`hiasan-dekorasi` (34h) and `fotografi-videografi` (57h) are in the *watching*
bucket, inside the 72h grace window, because a recently published article moved
those categories' sitemap `lastmod` — not because their exclusion cleared. A
direct URL Inspection on all six, taken after the run, returns
`Excluded by 'noindex' tag` for **all six**.

The headline number and the thing the DoD asks about are different quantities.
Reading the first as the second would have been a false pass produced by my own
new alarm on the day I shipped it.

---

## The clause that is still open

> "At least one of the six shows its exclusion cleared in GSC URL Inspection."

**Not met.** All six: `Excluded by 'noindex' tag`, `last_crawled: 2026-08-23`,
`indexing_state: BLOCKED_BY_META_TAG`. Polled at 03:52Z, 04:07Z, 04:20Z, 04:31Z
and 04:42Z, 65 minutes after the resubmission — identical every time, and
`last_crawled` has not moved for any of the six. Full record in
`07-gsc-url-inspection-after.txt`.

What has been done to move it, and what cannot be:

- **Sitemap resubmitted** to `https://hellokahwin.com/` at 2026-08-28T03:37Z —
  the RISK-04 mechanism, which on 27 Aug took four URLs out of
  "unknown to Google" within eight hours. **Google re-downloaded it the same
  minute**: `last_downloaded: 2026-08-28 03:37`, `status: Valid`,
  `indexed_urls: 103`, `errors: 0`. So Google has the current sitemap and has
  simply not scheduled a re-crawl of these six yet.
- **The URL Inspection API has no "Request indexing".** It is read-only. The
  button exists only in the Search Console UI, and there is no connected browser
  in this session (`list_connected_browsers` → `[]`), so I could not press it. A
  human with Search Console open can, on any one of the six, and that is the
  fastest path to closing this clause.
- **The Google Indexing API is not an option**: it is documented for
  `JobPosting` and `BroadcastEvent` only, and using it for ordinary pages is
  outside what Google supports. Not worth the risk on a property this young.

**The one human action that closes this clause:** open any one of the six in
Search Console and press **Request indexing**. One is enough; the DoD asks for at
least one. Everything else it asks for is measured and quoted above.

Nothing about the site is now wrong. The remaining wait is Google's, the alarm
that watches it is live, and it self-clears. Issue #10 carries the same summary
as a comment, so the open item explains itself to whoever opens it next.

**The item therefore reports a non-zero exit.** Not because anything failed, but
because a DoD is not rewritten to match what was reachable. Three of the four
observable clauses are met and quoted; the fourth is pending on Google and is
named as pending.

---

## Gates

| Gate | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | **359 passed / 359**, 29 files (was 348 before this item's 11 new cases) |
| `pnpm lint` | **exit 0** — first time since Sprint 02, see below |
| `pnpm build` | **exit 0** (against the `hk_preview_ro` read-only role, `--frozen-lockfile` install in this worktree) |
| `pnpm start` of that build | all six render `index, follow`; invalid `?sub=` still `noindex` |
| Vercel deploy `db8a117` | `success`, 2026-08-28T03:34Z |

`pnpm lint` was RED on `master` and had been since Sprint 02. UX-03 diagnosed it
exactly and left it — correctly, not its item. UX-04 then committed five more
files prettier cannot parse. Mine would have been the third work-done entry to
report the same red gate as pre-existing, so I fixed it instead: `.prettierignore`
now excludes `docs/work-done` (captured measurements, kept as the tool emitted
them — reformatting a record makes it a worse record), and four source files got
a whitespace-only `prettier --write`. `096bdfc`.

---

## Undo

Three commits, all revertable independently and in any order:

```
git revert 096bdfc   # the lint gate — restores the red pnpm lint
git revert 3bdaeec   # the monitor's third alarm condition
git revert db8a117   # the explicit robots meta; hubs go back to emitting nothing
```

Reverting `db8a117` does **not** re-introduce `noindex` on the six — that was
already gone before this item started. It restores the ambiguity, not the defect.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**An absent signal is not a measurement, and this project's doctrine only says
half of that.** The doctrine already says *check the artefact the consumer
receives, not the input you control.* I did — and the artefact said nothing at
all. Six `curl`s returned no robots meta, which is simultaneously the correct
result and the signature of a failed metadata render. I had a green measurement
and no way to know which of two things it meant.

The missing half is the producer's obligation: **when a page's state matters,
the page must state it.** Not "it defaults to the right thing" — a default is
indistinguishable from a failure that fell back to the same place. This is the
same rule as *"unknown must never coerce to a success value"*, one layer out:
that rule governs the collector, and this one governs the thing being collected
from.

Second thing, smaller and sharper: **a monitor that records without escalating
launders a defect into a statistic.** RISK-05's monitor did everything right and
the six still sat for a sprint, because a number in a census table has no owner.
Recording is not watching.

### 2. Which document must change, and who owns that edit?

Three, and all three are **mine, made in this item, not filed as recommendations**:

- **`src/lib/seo/indexing-alarm.ts`** — the alarm table had no condition for the
  defect it had itself detected. Changed in `3bdaeec`: third condition, retitled
  issue, relabelled census buckets. *(Owner: this item. Done.)*
- **`docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md`**,
  §"OUR FAILURE MODE HAS ONE SHAPE" — gains a second corollary, the producer's
  half of the rule described in (1). *(Owner: this item. Done — committed on
  `feat/command-centre-dashboard`, which is where that document lives.)*
- **`.prettierignore`** — `pnpm lint` had been red for two sprints with two
  written diagnoses and no fix. Changed in `096bdfc`. *(Owner: this item. Done.)*

### 3. What did we do twice that we should never repeat?

**Reported a red `pnpm lint` as "pre-existing, not my item" and moved on.**
UX-03 did it on 27 Aug with a precise diagnosis and two named fixes. I was one
paragraph into doing it again. The correct behaviour when a shared gate is red
for the second time is to fix the gate, because "not my item" is individually
right and collectively how a gate stops being a gate. Fixed, and this is the
note that says why the third report never happened.

Also twice, less visibly: **the pillar/child-hub indexability rule has now been
got wrong, diagnosed and re-fixed three times** — the Phase 1 audit found four of
six, `a2952ce` found all six, and RISK-05 found the sitemap still advertising
them. Every round was a correct fix to an inline rule nobody could test. That is
why it is a table now.

### 4. What did we nearly ship, and what caught it?

**"Two of the six cleared in GSC."** The alarm I had just written fired with
"4 sitemap URL(s)" against a census of 6 in the same run, and the difference is
exactly the number the DoD asks for. It is a very comfortable read and it is
wrong: the other two were inside the 72h grace window because a new article moved
their `lastmod`, and a direct URL Inspection returns `Excluded by 'noindex' tag`
for all six.

What caught it was the standing rule to verify rather than assert — I ran the
inspection instead of quoting my own alarm's headline. The general shape is worth
naming: **a number produced by an instrument you shipped this morning is the
least trustworthy number in the report**, and it is most dangerous when it
happens to answer the question you were hoping to close.

The doctrine edit in (2) is the durable half of this. This note is the other.
