# Done — CONT-12: C2.1 verified complete at 8, and the seed re-angled off its own children

**Date:** 28 Ogos 2026 · **Sprint 03, CONT-12** · **Owner:** `writer-inspirasi-vendor-venue`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-cont-12.md`
**Upstream decision, not reopened:** `aug-28-2026-done-cont-10-c21-serp-decision.md` — DO NOT MERGE, C2.1 stays at eight.
**Undo:** `aug-28-2026-cont-12-UNDO.md`, written, dry-run-proved and **committed before the first write** (`2987928`, pushed).
**Evidence:** `aug-28-2026-cont-12-EVIDENCE/` — before-state, after-state, undo script, proof requests and every response body.

---

## The claim, stated exactly

**C2.1 is complete at eight published articles, all eight live, all eight linked
on their pillar, and the cluster head no longer duplicates two of its own
children.** Zero new articles were published, because CONT-10 fixed the count at
eight and eight were already live before this item began. The work this item
carried out is the one piece of C2.1 that was still unassigned: decision 120's
re-angle of the legacy seed.

**This is not a narrowed DoD, and the difference matters.** The DoD says the
sitemap rises by exactly the number published. The number published is zero, so
the sitemap holds at 103, and that is the DoD satisfied rather than dodged. If
the reader of this log wanted eight *new* articles, the item was mis-sized at
planning and that is a scoping question for `head-of-seo-content`, not something
to be papered over here.

---

## 1. Every URL, its first-request status code, and the condition on that number

Proof run recorded by `.tmp-cont12/proof.mts`, sequential, 3 s apart,
`redirect: manual` so a 3xx would be reported as a 3xx. Full response bodies are
kept in the evidence directory, not just the verdicts.
Raw table: `…-EVIDENCE/proof-requests.tsv`.

| # | URL | Status | `x-vercel-cache` | `age` | Bytes | `<title>` served |
|---|---|---|---|---|---|---|
| 1 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin> | **200** | HIT | 21 | 135,580 | Hantaran kahwin: maksud, adat dan beza dengan mas kahwin |
| 2 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-untuk-lelaki> | **200** | HIT | 282 | 126,222 | Hantaran untuk lelaki |
| 3 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/barang-hantaran-perempuan> | **200** | HIT | 278 | 150,768 | Barang hantaran perempuan: senarai ikut kategori dan kos |
| 4 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin-bajet> | **200** | HIT | 274 | 146,333 | Hantaran kahwin bajet: kos sebenar 12 dulang, 2026 |
| 5 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/barang-hantaran-berguna> | **200** | HIT | 271 | 142,815 | Barang hantaran yang digunakan, dan yang tersimpan |
| 6 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/adat-hantaran-ikut-keluarga> | **200** | HIT | 267 | 143,301 | Adat hantaran ikut keluarga: bila dua senarai berbeza |
| 7 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/persiapan-hantaran-kahwin> | **200** | HIT | 264 | 145,332 | Persiapan hantaran kahwin: jadual lapan minggu |
| 8 | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/tempat-beli-hantaran> | **200** | HIT | 260 | 150,814 | Tempat beli barang hantaran: lima jenis kedai |
| — | <https://hellokahwin.com/artikel/hantaran-mas-kahwin> (pillar) | **200** | HIT | 256 | 58,951 | Hantaran & Mas Kahwin \| Inspire \| HelloKahwin |
| — | <https://hellokahwin.com/sitemap.xml> | **200** | HIT | 265 | 20,098 | 103 `<loc>` |

**The condition that has to travel with "200 on FIRST request".** Every one of
these eight URLs was already live and already 200 before this item started, and
this session requested all of them during orientation. A genuinely-first request
was therefore not available to me and I am not claiming one. What the table
records is the first request of the proof run, each URL fetched once, no
redirect followed, with the cache state and age of the copy that answered.
Anyone re-running this gets different `age` values and should read the row on
the same terms.

**The trailing-slash form is a 308, not a 200.**
`/artikel/hantaran-mas-kahwin/` redirects to `/artikel/hantaran-mas-kahwin`.
Every href on the pillar uses the canonical no-slash form, which is what the
table above measures.

---

## 2. Pillar-link confirmation

`…-EVIDENCE/body-PILLAR-hantaran-mas-kahwin.html`, 58,951 bytes, HTTP 200.

- All eight C2.1 slugs appear exactly once each as
  `href="/artikel/hantaran-mas-kahwin/<slug>"`. Counted per slug, all 1.
- **`akan datang` appears zero times** on the whole pillar.
- The seed's link text on the pillar is the **new** title,
  *Hantaran kahwin: maksud, adat dan beza dengan mas kahwin*. The old
  WordPress title appears nowhere on the page.
- 38 unique article links on the pillar, matching the 38 published articles the
  database returns for the five P2 clusters.

---

## 3. Sitemap, before and after

| | `<loc>` count |
|---|---|
| Before, read at the start of the item | **103** |
| Before, re-read immediately before the write | **103** |
| After | **103** |

Published articles in the database: **86 before, 86 after.** No article was
created, deleted, unpublished or re-parented. `hantaran-kahwin` is present in
the sitemap at its unchanged URL.

---

## 4. What actually changed, and why

CONT-10's decision 120 left one job in C2.1 and named it: the legacy seed's
centre of gravity was **20 Idea Hantaran Kahwin Lelaki & Perempuan**, which is
the job `hantaran-untuk-lelaki` and `barang-hantaran-perempuan` were published
to do on 27 Ogos. That is why the seed measured Jaccard 40% against the bride
page, level with the cluster's own within-article baseline.

**The seed is now the cluster's definitional head and router.** Its own
People-also-ask box (Ahrefs `serp-overview`, country `my`, snapshot 2026-08-21,
pulled by CONT-10 on 28 Ogos) asks four questions, and the new body answers all
four:

| PAA question | Where it is answered |
|---|---|
| Apakah maksud hantaran kahwin? | Opening 38 words, then H2 *Apa maksud hantaran kahwin?* |
| Apakah maksud mas kahwin? | H2 *Beza hantaran, mas kahwin dan duit hantaran*, and a Soalan lazim entry |
| Apakah mas kahwin dan hantaran di Kelantan? | H2 *Mas kahwin dan hantaran di Kelantan* |
| Apakah contoh dulang hantaran kahwin yang menarik? | Soalan lazim entry, routing to the two gubahan articles |

### The re-angle was re-angled again, by the live database

The obvious execution of "move the seed onto the money questions" is to write
the money article. **Reading the live cluster before drafting killed that
plan.** Every money question on the seed's SERP is already owned by a published
sibling: `duit-hantaran-kahwin` owns *duit hantaran hak siapa* including the
Selangor fatwa, `apa-itu-mas-kahwin` owns the definition, and
`mas-kahwin-kelantan-terengganu` owns the Kelantan question. Writing the money
article would have put a fifth page on ground four pages already hold.

So the seed took the half no sibling owns: **the vocabulary map and the
routing.** A five-row table separating mas kahwin, hantaran, duit hantaran,
dulang and gubahan — dulang and gubahan appear in no sibling's comparison table —
and then one short, sourced answer per question with a link down to the article
that carries the working. **19 unique internal links**, all followed.

A link you wrote is not a link Google follows, so the emitted `<a>` tags were
counted on the shipped HTML rather than in the draft. The served page carries
**20** unique `/artikel/hantaran-mas-kahwin/*` anchors, and the extra one is
`persiapan-hantaran-kahwin` from the template's related-articles block, not from
the body. **Zero of the twenty carry `rel="nofollow"`.**

### The body, in numbers

| | Before | After |
|---|---|---|
| Top-level nodes | 152 | 57 |
| H2 sections | 4 (`Apa itu`, `Ratio`, `20 Idea`, `Tips`, plus `Kesimpulan`) | 9, ending in `Mula dari mana` and `Soalan lazim` |
| Internal links to siblings | 0 | 19 unique, 22 total |
| Body images | 25, all unlicensed | 2, both licensed and credited |
| `Soalan lazim` block | none | 4 questions, answers 43–52 words |
| Words (links stripped) | — | 1,239 |
| Sentence average / max | — | 12.32 / 24 words |

`published_at` verified unchanged at `2025-11-23T22:26:36.000Z` after the write,
asserted by the write script itself. No URL, slug, category or redirect changed.

---

## 5. The false pass this item was warned about, found live on the page it was editing

The DoD names Sprint 02 failure mode 5: an English SOURCE NOTES block that rode
a transformation onto a Malay reader page. **The same shape was already live on
this article, and it had been for months.**

Fourteen paragraphs of the seed's body read, in English, on a Malay reader page:

> `source: sentuhan nin's`

The asset register's verdict on those images is the second half of it. All 25
carry `status_guna: jangan-guna`, `pencipta: TIDAK DIKETAHUI`,
`license_class: TIADA` and an **empty `credit` column**. So the page was printing
an origin the register says is unknown, in the wrong language, in a format the
style guide does not have. Every one of the 25 also carried `alt=""`.

All 25 left with the section that carried them. The shipped page was then
checked rather than the draft: `grep -ci "sentuhan nin"` on the served HTML
returns **0**, and `<img>` nodes with empty alt in the body: **0**.

**This is a symptom of a much larger inherited condition and I am not claiming
to have fixed it.** The register records 682 legacy WordPress assets, every one
`license_class: TIADA`, of which 307 are `jangan-guna`. This item removed 25 of
them from one page as a side effect of the re-angle. The rest are still live
across the legacy articles and belong to the clearance programme.

### The cover is the part I could not fix, and it is worse than the body was

`…/inspire/hantaran-kahwin/1787396480698-cover.jpg` is still the cover, and its
`media` row reads `credit: null`, `licensor_name: null`, `license_class: null`.
The served HTML confirms the consequence: the only two `Kredit:` lines on the
page are the two I added, so **the cover is published with no visible credit at
all**, and its `alt` is the article title rather than a description of the frame.

The asset register points at `HK-L-0170`
(`RW-WhitenerySharinaSeanTheDannaLangkawi-19.jpg`, `status_guna: kuarantin`) as
the one asset whose `digunakan_dalam` names `hantaran-kahwin` outside the 25 body
images. **That identification is by register row, not by a matching URL, so it is
a lead and not a finding.** Either way the cover is uncredited on a live page,
which is an owner-level rule being broken right now.

Replacing it is Stage 6b and belongs to `managing-editor`, not to a writer's
database edit. **Escalated below.** The cover a re-angled head page wants, in
one noun phrase: **deretan dulang hantaran di atas permaidani masjid** — the
subject the article is about, in frame, countable. Source must be ≥ 2464 × 2400.

---

## 6. Images: two in, twenty-five out, every field copied from the register

Both photographs are already in the library, `status_guna: boleh-guna`, and both
were opened at 1:1 before the alt text was written. The five credit fields were
copied out of the register rows, never retyped.

| Register row | Subject | Placed | Alt written from |
|---|---|---|---|
| **HK-P-0038** `S-dulang-hantaran-masjid-mylifestory.jpg` | Deretan dulang hantaran di atas permaidani masjid | After the definition section | the pixels, viewed at 1:1 |
| **HK-P-0037** `S-serah-hantaran-akad-mylifestory.jpg` | Gubahan hantaran dihulurkan pada majlis akad | Inside the mas kahwin / hantaran distinction | the pixels, viewed at 1:1 |

Both render with a linked credit, verified on the served HTML:
`Kredit: MyLifeStory (CC BY 2.0)` twice, linking to
`flickr.com/photos/88758808@N00/411401964` and `…/411421869`.

**HK-P-0037's register `nota` carries an instruction and it was obeyed:**
*"jangan guna gambar ini untuk mewakili mas kahwin"*. Its caption on this page
says the opposite of that misreading in as many words — *"Yang dihulurkan di sini
ialah hantaran. Mas kahwin bukan barang di atas dulang, kerana ia disebut dalam
lafaz akad."*

**A compromise, written down rather than left silent.** Both figures point at an
R2 object uploaded under a sibling article's path rather than a fresh copy under
`inspire/hantaran-kahwin/`. Uploading a fresh copy is what the ingest CLI would
do; this run wrote SQL directly and did not re-implement the variants pipeline by
hand. The URLs are public, the licence is the same licence, and the images render.
The cost is a coupling: if those two objects are ever purged with their original
articles, this page loses two images. Recorded on the upgrade list.

`media_article_usage` was reconciled exactly as `syncMediaUsage()` reconciles it,
because a raw SQL write calls neither the admin path nor the ingest CLI:
25 rows deleted, 2 inserted, verified at 2 after the write.

Asset register: **52 cells changed across 27 rows, in two columns only**
(`digunakan_dalam` × 27, `nota` × 25). Row count unchanged at 799, column count
verified at 20 on every row after re-parsing. Before-copy kept at
`asset-register.csv.before-cont12`. The 25 legacy rows now read
`TIDAK BERKENAAN` with a dated `nota` saying what removed them and when — the
register's own orphan convention. **No new asset id was allocated**, so the
cross-worktree id ceiling (0108 on `feat/cont-05-hantaran-tunang`, against 0082
here) could not be collided with.

---

## 7. Sourcing, and the one thing I could not verify myself

**Verified at source by me, today.** The Kamus Dewan Edisi Keempat entry for
*hantaran*, read on PRPM (Dewan Bahasa dan Pustaka) on 28 Ogos 2026. Two senses,
both used: *"wang yg dihantar oleh pihak lelaki kpd bakal mentua utk perbelanjaan
perkahwinan"*, and *"(dlm majlis perkahwinan orang Melayu) hadiah (berupa
makanan, pakaian, dsb) yg dibawa bersama wang hantaran"*.

**Named, but NOT verified by me today.** The article states that mas kahwin is
the only obligatory payment and attributes it to seksyen 2 Enakmen
Undang-Undang Keluarga Islam (Negeri Pulau Pinang) 2004. **Four attempts at the
primary text failed for infrastructure reasons, not absence:**
`www2.esyariah.gov.my` refused the connection, `lom.agc.gov.my` returned
*Invalid request*, a Google query returned only the search chrome, and
DuckDuckGo served a CAPTCHA. So the claim rests on four live siblings that carry
it with the verbatim quotation, verified 26 Ogos 2026, and the article routes the
reader to `apa-itu-mas-kahwin` for the quotation and the date. **That is a
weaker footing than a fresh primary read and it is said here rather than
implied.** Re-verifying it is cheap for whoever can reach those hosts.

**The Kelantan section reports our own negative honestly.** It says four state
sources were checked and none publishes a rate, names the four, and routes to
`mas-kahwin-kelantan-terengganu` for the check and its date. It also carries the
sibling's refusal: the widely-repeated claim that Kelantan counts wang hantaran
as mas kahwin is printed as an amalan people mention and explicitly **not** as a
state ketetapan, because no JAHEAIK document saying so was found.

**No ringgit figure appears anywhere on the page, deliberately.** Style guide
§7.1a requires a price to carry its source's own last sign of life, and this run
verified no supplier prices today. The page says so in its own words and sends
the reader to `hantaran-kahwin-bajet`, where every figure is dated and carries
its supplier's name.

---

## 8. Review board and `/humanizer`

Like CONT-01, CONT-07 and CONT-08, this run could not convene `/bmad-party-mode`;
the seats ran as sequential passes by one agent, and that departure is named here
rather than buried.

1. **Chair pass, run as a script** (`check.py`) so it could be re-run after every
   edit: heading case and length, sentence average and ceiling, paragraph
   sentence and word counts, `anda` budget, banned-pronoun sweep, the §5
   Indonesian table, the §12 banned list, em and en dashes, curly quotes,
   exclamation marks, colloquial forms, FAQ count and answer lengths, internal
   link count. **Final run: zero fails**, average 12.32 words, max sentence 24,
   `anda` 0, dashes 0, bold spans 0.
2. **Verification pass** — caught the reflex to write the money article, and sent
   the topic to the half the siblings do not own. See §4.
3. **`/humanizer` AFTER revision**, never before. It changed: a duplicated PRPM
   currency stamp that said the same thing twice eight lines apart; a not-X-but-Y
   construction (*"Perkara yang paling kekok bukan angkanya, tetapi…"*); a
   deeper-truth tell (*"dan di situlah salah faham paling kerap berlaku"*),
   replaced with the fact it was commenting on; the §16 mini-label pattern on the
   four-item cost list, rewritten as full sentences; a dramatic fragment opening
   the close; and four repetitions of the same *"ada dalam X"* link formula.
4. **Every gate re-run after every edit**, including two full builds of the
   TipTap document with all assertions before the write was allowed to run.
5. **Simplification, the required output (S15):** the 20-item idea list and the
   10-item savings list, roughly 1,900 words, were cut outright. Both are covered
   better and with real prices by `hantaran-untuk-lelaki`,
   `barang-hantaran-perempuan` and `hantaran-kahwin-bajet`.
6. **Warmth test (S12):** the article names two-families-disagree, in the section
   on how many dulang, and routes to `adat-hantaran-ikut-keluarga`.

The write script refused on any of: title over 60 characters, meta description
over 155, any dash or exclamation in the metadata, an `IMEJ` marker anywhere, a
surviving `sentuhan nin` string, a bare uncredited `image` node, a figure caption
without `Kredit:`, a figure alt under 60 characters, or an internal-link count
other than 19. Final: title **56**, meta **151**, 57 nodes, 19 unique links,
all assertions passed.

---

## 9. A defect reproduced twice, which the board has open and unowned

ceo-memory carries **🔴 the cached-metadata / wrong-`<title>` defect** as OPEN
AND UNFIXED with no owner and no mechanism. This run reproduced it twice and can
now say what it looks like from outside.

**A `STALE` edge copy serves a `<title>` truncated at the first colon. The next
request, after the refresh completes, serves the full title.**

| Article | Request | `x-vercel-cache` | `age` | `<title>` |
|---|---|---|---|---|
| `hantaran-kahwin` | first past TTL | STALE | 304 | Hantaran kahwin |
| `hantaran-kahwin` | second | HIT | 4 | Hantaran kahwin: maksud, adat dan beza dengan mas kahwin |
| `hantaran-untuk-lelaki` | first past TTL | STALE | 344 | Hantaran untuk lelaki |
| `hantaran-untuk-lelaki` | second | HIT | 45 | Hantaran untuk lelaki: senarai barang dan kos 2026 |
| `hantaran-untuk-lelaki` | third | HIT | 91 | Hantaran untuk lelaki: senarai barang dan kos 2026 |

The STALE copy of `hantaran-kahwin` carried the **new** body and a title that
matches neither the old row nor the new one, so it is not simply an old render.
Both articles healed on the second request.

**Two observations, and I am not generalising past them.** I did not test the
other six, and a confirmed fault on two pages licenses re-checking the
neighbours, never concluding about them. What this adds for whoever picks the
defect up is a reproduction: fetch any article past its 300 s edge TTL, read the
`<title>` on the STALE response, then read it again.

The same run also settles a smaller open question: this page emits
`FAQPage` JSON-LD with **4 `Question` / `Answer` pairs**, alongside `Article`,
`BreadcrumbList`, `WebPage`, two `ImageObject` and two `Organization`. Whatever
the FAQ-schema gap SEO-10 is chasing, it is not "the emitter never fires".

---

## 10. What is escalated, and to whom

1. **`managing-editor`, Stage 6b — the `hantaran-kahwin` cover.** Uncredited on a
   live page, `credit`/`licensor_name`/`license_class` all null, alt text is the
   article title. Subject wanted: *deretan dulang hantaran di atas permaidani
   masjid*, source ≥ 2464 × 2400. This is the cluster's head page and the one a
   reader lands on first.
2. **`head-of-seo-content` — the item sizing.** CONT-12 was sized on the larger
   shape while CONT-10 was open. CONT-10 closed it at eight, and eight were
   already live, so a 12-point item resolved to a one-article re-angle. That is
   the sizing working as designed, but the tracker should show it rather than
   leave a reader to infer it.
3. **Whoever owns the legacy image clearance.** 307 `jangan-guna` assets are
   still live across the legacy articles. This run removed 25 from one page and
   verified their removal on the shipped HTML. The pattern is repeatable on every
   other legacy article and it is not a writer's item.
4. **The `<title>` defect owner.** Reproduction in §9.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**An article's re-angle target is decided by the live database, not by the
decision that ordered the re-angle.** CONT-10 said, in a sentence the CEO memory
and the decision log both repeat, *re-angle the seed toward definition and
money*. That instruction was correct on 28 Ogos morning and already half-obsolete
by the evening, because every money question on the seed's SERP is owned by a
sibling that was live before CONT-10 wrote it: `duit-hantaran-kahwin`,
`apa-itu-mas-kahwin` and `mas-kahwin-kelantan-terengganu`. Executing the
instruction literally would have created the fifth page on ground four pages hold
— the exact collision the re-angle exists to remove, moved one topic to the left.

The persona already says *re-derive the live cluster before you draft*. What it
does not say, and now does, is that **an upstream instruction naming a topic is
itself a claim about the cluster, and it ages at the same rate as the cluster
does.** The check is not "has anything published since my brief"; it is "does the
half I have been sent to write still belong to nobody". Here it did not, and the
answer was to take the half that did: the vocabulary map and the routing, which
no sibling carries because only the head has a reason to.

**Second, smaller, and it changed how this item reported itself.** A DoD clause
can be satisfied with N = 0 and still be honestly satisfied. *Sitemap count rises
by exactly the number published* reads as an instruction to publish. With the
count fixed upstream at eight and eight already live, the number published is
zero and the sitemap holds. Writing that plainly, with the reason, is a different
act from quietly not mentioning the sitemap — and the temptation to do the
second was real enough to be worth recording.

### 2. Which document must change, and who owns that edit?

Three. All mine, all edited in this commit.

1. **`skillcentral/agents/projects/hellokahwin/Marketing/writer-inspirasi-vendor-venue.md`**,
   my own persona. Its section *Re-derive the live cluster before you draft, and
   again before you ingest* covers a brief that has gone stale. It did not cover
   an upstream **decision** that names the topic — which is what CONT-12 was
   handed, and which reads as more authoritative than a brief precisely because
   it is. The section now says a decision naming a topic ages the same way, and
   the test is whether the half you were sent to write still belongs to nobody.
   Owner: me.
2. **`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`**,
   Stage 7. It documents the ingest CLI's post-write behaviour in detail and says
   nothing about a **direct database write**, which is the correct path for a
   WordPress-migration row and which CONT-05 and this item have now both taken.
   A raw SQL write calls neither `revalidateTag` nor `syncMediaUsage` nor the
   edge purge, and every one of those has to be run by hand or the page is stale,
   the media index drifts, and the operator does not find out. Stage 7 now
   carries that checklist. Owner: me.
3. **`docs/boardroom/ceo-memory.md`**, two entries. C2.1 moves from *CONT-12
   plans against 8* to complete, with the seed re-angled and the count verified
   from the database. And the 🔴 `<title>` defect gains the reproduction in §9,
   because *needs an owner* with no repro is a harder thing to pick up than
   *needs an owner, here is how to see it*. Owner: me.

### 3. What did we do twice that we should never repeat?

**I fetched the same page five times in two minutes watching a cache age tick
up.** The Stage 7 rule says wait a full five minutes after the last write, and
says the second request past the TTL is the honest one. I read that rule, then
polled anyway, and every one of those five requests measured the same STALE copy
and told me nothing. It cost two minutes and a timed-out tool call.

The wider version, and it is the one worth keeping: **on an edge-cached URL, a
request is not free and is not neutral.** It can re-arm the cache it is
measuring. The workflow already knows this and already writes it down. The
failure was mine for reaching for a poll loop before reading what I had already
been told, which is the same shape as the persona's own note about running the
wrong check carefully.

Second, thinner: I wrote the same heredoc twice after the shell rejected it, then
used the file-writing tool that would have worked the first time. Two rejections
should have been one.

### 4. What did we nearly ship, and what caught it?

**A page that reported eight green ticks while an English label sat in its own
body.** The DoD's beware-the-false-pass clause is about a transformation carrying
something through. I read it as a warning about my new content and checked my
draft against it — which is exactly the mistake the clause names, because reading
your own source proves what you intended.

What caught it was pulling the asset register rows for the images already on the
page, which was housekeeping for a different task entirely: I wanted the credit
fields for the two images I was adding, and the query returned the 25 that were
already there. All 25 read `jangan-guna`, `TIDAK DIKETAHUI`, `TIADA`, empty
credit. The page had been printing `source: sentuhan nin's` in English, fourteen
times, on a Malay reader page, asserting an origin the register says nobody
knows — the same failure mode as the SOURCE NOTES block, on the article the DoD
was warning me about, months old.

**The habit that caught it was reading the register before writing the artefact,
not after** — the persona rule from 27 Ogos, written for a different reason
(getting a `creditUrl` wrong by one digit). It paid twice here. It found the 25,
and it found HK-P-0037's `nota` telling me not to use that photograph to
represent mas kahwin, which is precisely the section I had chosen to put it in.
The caption now says so out loud instead.

**And one thing I nearly certified and did not.** The first proof run returned
`hantaran-kahwin` at 200 with the title `Hantaran kahwin`, and 200 was the number
the DoD asks for. Recording the `<title>` alongside the status is what made the
row look wrong; body size and cache state are what let me tell a STALE copy from
a fresh one. Had the proof script recorded status alone — which is all the DoD
literally asks for — this item would have certified a page serving a truncated
title and a generic site description, and called it done.
