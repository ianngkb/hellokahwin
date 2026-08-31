# CONT-14 — the hantaran-kahwin seed re-angled onto definition **and money**, and the last C2.1 boundary closed

**Sprint 05 — *Build where the click is*** · track `content` · 3 points
**Owner:** `writer-inspirasi-vendor-venue` · **01 September 2026**
**Live:** https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin (200)

---

## The short version

The brief's premise was wrong, the DoD was right anyway, and the work was real.

CONT-14's brief opens: *"Decision 120 assigned this to CONT-12 and CONT-12
closed without doing it."* **CONT-12 did do it** — and `ceo-memory.md` said so
five lines above the `⚠ OPEN` bullet the brief was written from. The seed
stopped being a 20-item idea list on 28 August.

But **only half of decision 120 survived that pass.** Measured on the live HTML
before I touched anything: the opening 200 reader-facing words were definition
end to end, and money appeared only as vocabulary — `duit hantaran` ×1 and
`kos` ×1, both inside the deck's *list of what was coming* rather than in any
answer; `RM` ×0; no sentence answering a money question until node 39 of 57.

So the item was a **VERIFY plus a real half-rewrite**, not a do-over. I ran the
SERP gate first, it passed decisively, and I rewrote the title, the `<h1>`, the
deck and the opening three paragraphs. One row. No new URL, no redirect,
sitemap unchanged.

---

## 1. The gate — run before anything was rewritten

The brief required the SERP check the C2.1 boundary was left pending.

Ahrefs MCP tools were **not exposed to this subagent session** (three
`ToolSearch` lookups by three different queries, all negative). This is not a
missing company credential and not a blocked session: the Ahrefs API v3 key is
in the vault as `ahrefs.hellokahwin`, and the whole gate was run against
`api.ahrefs.com/v3` directly with curl. Recorded so nobody re-diagnoses it.

**`serp-overview`, `country=my`, `keyword=hantaran kahwin`, `date=2026-09-01`.**
Raw JSON: `…-EVIDENCE/serp-hantaran-kahwin-2026-09-01.json`.

Eight organic results. **Four are money pages:**

| pos | URL | DR | what it is |
|---|---|---|---|
| 6 | `shopee.com.my/r.a.ahantaranmurah` | 87 | commerce, "hantaran murah" |
| 8 | `facebook.com/mingguanwanita/…duit-hantaran-hak-siapa…` | 100 | *duit hantaran hak siapa* |
| 9 | `mhf.org.sg/ms/wang-hantaran-in-malay-weddings/` | 11 | *wang hantaran* |
| 10 | `loanstreet.com.my/…/panduan-duit-hantaran-mas-kahwin` | 50 | duit hantaran + mas kahwin |

The other four (nikahsatu 17 idea, Pinterest 57 idea, songketdunia 25 idea,
love-and-co idea barang) are idea listicles. **The CEO's 28 August
characterisation — "the seed's SERP is half money" — still holds exactly, four
days later, on the day of the rewrite.**

**Not one definitional page ranks organically.** Yet **three of Google's four
People-also-ask questions are definitional or money:**

- *Apakah maksud hantaran kahwin?*
- *Apakah maksud mas kahwin?*
- *Apakah mas kahwin dan hantaran di Kelantan?*
- (*Apakah contoh dulang hantaran kahwin yang menarik?* — the idea one)

And Google answers them itself in an AI Overview whose sitelinks cite
baitulmuslim's *APA ITU MAS KAHWIN? DAN APA ITU WANG HANTARAN?* and mhf's
*Wang Hantaran* — **two pages that do not rank organically at all.** A question
Google is answering from pages it will not rank is the clearest unclaimed slot
on the page, and it is a definition-and-money question.

**Corroborated by the index**, `keywords-explorer/overview`, `country=my`,
field `volume` = the 12-month average, named per the house rule
(`…-EVIDENCE/keywords-batch-2026-09-01.json`):

| keyword | `volume` | `parent_topic` | `traffic_potential` |
|---|---|---|---|
| `hantaran kahwin` | 2,000 | `barang hantaran lelaki` | 2,400 |
| `mas kahwin` | 1,900 | `mas kahwin perak` | 2,800 |
| `duit hantaran` | 300 | **`mas kahwin`** | 800 |
| `barang hantaran perempuan` | 300 | `barang hantaran lelaki` | 2,500 |
| `wang hantaran` | 70 | `duit hantaran` | 500 |
| `maksud hantaran kahwin` | 50 | **`mas kahwin`** | 800 |
| `apa itu hantaran` | 20 | `hantaran kahwin` | 600 |
| `beza mas kahwin dan hantaran` | 20 | (own) | 10 |

**`maksud hantaran kahwin` and `duit hantaran` carry the same `parent_topic`.**
The index puts the definitional query and the money query under one head. That
is the page this now is.

**Gate verdict: PASS.** Re-angle toward definition and money is correct on
today's data, not only on 28 August's.

---

## 2. The one thing the gate does NOT license, and the check that follows it

My own persona carries the CONT-12 lesson: *an upstream DECISION that names your
topic ages exactly like a brief does.* "Money" was exactly the instruction that
went stale last time, because the money questions were already owned by live
siblings. So before writing a single word I re-derived the live cluster from
production — 37 live `hantaran`/`mas kahwin` articles — and read the siblings'
bodies, not their titles:

- `duit-hantaran-kahwin` owns *hak siapa* and the Selangor ketetapan.
- `apa-itu-mas-kahwin` owns the mas kahwin definition and the wife's right.
- `cara-tetapkan-duit-hantaran` owns how to arrive at a figure.
- `mas-kahwin-ikut-negeri` and the seven state pages own the rates.
- `hantaran-kahwin-bajet` owns the real cost of twelve dulang.

**So the head does not become a money page.** Writing "the money article" here
would have made a fifth page on ground four pages already hold — the exact
collision the re-angle exists to remove, moved one topic to the left.

What is genuinely unowned on a cluster head is the same thing as last time:
**the vocabulary map and the routing.** Three sums appear in one majlis, readers
use the words interchangeably, and **no sibling can separate them, because each
owns only one of them.** That is what the new opening does. **No ringgit figure
was added to this page.**

Re-derived a second time immediately before the write, per the standing rule:
published-article count **86 before and 86 after**, nothing published since
29 Aug, no concurrent session had touched the cluster.

---

## 3. Before and after, quoted from live HTML

Both windows produced by `scripts/measure/opening-200.sh` (written for this
item — §6), which takes the DOM containers rather than pattern-matching the
page furniture. Files: `…-EVIDENCE/live-before.html`, `…-EVIDENCE/live-after.html`.

### BEFORE (production, 01 Sep 2026, pre-write)

```
<title>Hantaran kahwin: maksud, adat dan beza dengan mas kahwin | HelloKahwin</title>
<h1 class="s-h1 mt-3">Hantaran kahwin: maksud, adat dan beza dengan mas kahwin</h1>
```

First 200 reader-facing words:

> Hantaran kahwin: maksud, adat dan beza dengan mas kahwin Hantaran kahwin ialah
> hadiah yang dibawa bersama wang hantaran dalam majlis perkahwinan orang Melayu,
> dan ia adat, bukan kewajipan agama. Maksudnya mengikut Kamus Dewan, bezanya
> dengan mas kahwin dan duit hantaran, siapa yang menentukan bilangan dulang, dan
> apa yang menggerakkan kosnya. Hantaran kahwin ialah hadiah berupa makanan,
> pakaian dan barangan lain yang dibawa bersama wang hantaran dalam majlis
> perkahwinan orang Melayu. Takrif itu milik Kamus Dewan Edisi Keempat, disemak
> pada 28 Ogos 2026. Ia adat, bukan kewajipan agama. Satu-satunya pemberian yang
> enakmen negeri sebut wajib ialah mas kahwin, iaitu bayaran daripada suami kepada
> isteri pada masa akad nikah. Enakmen ialah undang-undang yang diluluskan oleh
> dewan undangan negeri. Apa maksud hantaran kahwin? Hantaran ialah barang yang
> dibawa pihak lelaki kepada pihak perempuan pada majlis perkahwinan, dan pihak
> perempuan membalasnya dengan hantarannya sendiri. Kamus Dewan Edisi Keempat
> memberi dua makna yang berkait. Perkataan hantaran sendiri merujuk wang yang
> dihantar pihak lelaki kepada bakal mentua untuk perbelanjaan perkahwinan. Dalam
> majlis perkahwinan orang Melayu pula, ia merujuk hadiah berupa makanan, pakaian
> dan sebagainya yang dibawa bersama wang hantaran itu. Kedua-dua makna disemak di
> PRPM, portal dalam talian Dewan Bahasa dan Pustaka, pada 28 Ogos 2026.

### AFTER (live production, verified after the purge)

```
<title>Hantaran kahwin: maksud, adat dan wang yang terlibat | HelloKahwin</title>
<h1 class="s-h1 mt-3">Hantaran kahwin: maksud, adat dan wang yang terlibat</h1>
```

First 200 reader-facing words:

> Hantaran kahwin: maksud, adat dan wang yang terlibat Hantaran kahwin ialah
> hadiah yang dibawa bersama wang hantaran dalam majlis perkahwinan orang Melayu,
> dan ia adat, bukan kewajipan agama. Wang yang terlibat ada tiga jenis, dan hanya
> mas kahwin yang wajib. Maksudnya mengikut Kamus Dewan, beza mas kahwin dengan
> duit hantaran, dan apa yang menggerakkan kos dulang. Hantaran kahwin ialah
> hadiah berupa makanan, pakaian dan barangan lain yang dibawa bersama wang
> hantaran dalam majlis perkahwinan orang Melayu. Takrif itu milik Kamus Dewan
> Edisi Keempat, disemak pada 28 Ogos 2026. Ia adat, bukan kewajipan agama. Wang
> yang terlibat pula ada tiga jenis, dan hanya satu daripadanya wajib. Mas kahwin
> ialah bayaran daripada suami kepada isteri pada masa akad nikah, ia hak isteri
> sepenuhnya, dan enakmen negeri menyebutnya wajib. Enakmen ialah undang-undang
> yang diluluskan oleh dewan undangan negeri. Duit hantaran ialah wang yang diberi
> kepada keluarga pengantin perempuan, dan jumlahnya dirunding antara dua
> keluarga. Kos isi dulang ialah perbelanjaan pihak yang membawa hantaran, dan ia
> tidak diserahkan kepada sesiapa. Kadar mas kahwin bagi setiap negeri ada dalam
> mas kahwin ikut negeri , dan kos sebenar dua belas dulang ada dalam hantaran
> kahwin bajet . Apa maksud hantaran kahwin? Hantaran ialah barang yang dibawa

### The term counts, and why they are the weaker half of this evidence

Same instrument, same window, both sides:

| term | before | after |
|---|---|---|
| `mas kahwin` | 3 | **5** |
| `duit hantaran` | 1 | **2** |
| `wang` | 4 | **6** |
| `kos` | 1 | **3** |
| `wajib` | 1 | **3** |
| `bayaran` | 1 | 1 |
| `perbelanjaan` | 1 | 1 |
| `maksud` | 3 | 3 |
| `Kamus Dewan` | 3 | 2 |
| `RM` | 0 | 0 |

Money words (`wang`/`kos`/`bayaran`/`perbelanjaan`) went **7 → 11**, and **that
number understates the change, which is why it is reported with its own
caveat.** Before, all seven sat inside the deck's list of upcoming topics or
inside the Kamus Dewan gloss of *hantaran*. After, the opening **names the three
sums, separates them, and says which one is obligatory.** Read the windows, not
the table. `RM` is 0 on both sides deliberately: the ringgit figures belong to
the children, and this page routes to them.

---

## 4. What changed in the row, exactly

One row: `articles.id = de528bb4-650a-4c19-a1fa-5770d5963d0d`, slug
`hantaran-kahwin`. Five columns: `title`, `meta_title`, `meta_description`,
`excerpt`, `content`. Content went 57 → 58 top-level nodes: old nodes 0 and 1
replaced by three paragraphs, everything from the first `<h2>` down untouched.

- `title` / `meta_title` / `<h1>`:
  *"Hantaran kahwin: maksud, adat dan beza dengan mas kahwin"* →
  *"Hantaran kahwin: maksud, adat dan wang yang terlibat"* (52 chars).
- `meta_description` (156 chars): *"Maksud hantaran kahwin mengikut Kamus
  Dewan, dan tiga jenis wang dalam satu majlis: mas kahwin yang wajib, duit
  hantaran yang dirunding, dan kos isi dulang."*
- The deck and the first three paragraphs, as quoted above.
- Two internal links moved above the fold: `mas-kahwin-ikut-negeri` and
  `hantaran-kahwin-bajet` — the two money children. Both were already linked
  deeper in the body, so no new target was introduced.

**No new claim was added that is not already sourced on the page.** The
definition is Kamus Dewan Edisi Keempat (checked on PRPM, 28 Ogos 2026, carried
in the body). "Only mas kahwin is obligatory" is the page's existing claim,
sourced in the body to seksyen 2 Enakmen Undang-Undang Keluarga Islam (Negeri
Pulau Pinang) 2004. "Duit hantaran goes to the bride's family, and the amount is
negotiated" is the page's existing node 9 and node 13. **No image was added,
removed or re-credited**, so `media_article_usage` was not touched.

The house rule that religious and adat terms are explained plainly on first use
is preserved: *"Enakmen ialah undang-undang yang diluluskan oleh dewan undangan
negeri"* survived the rewrite and still sits immediately after its first use.

`/humanizer` ran on the new copy **before** it was written, and changed three
things: the "Halaman ini membawa maksud …, siapa …, dan empat perkara …"
paragraph was cut entirely (announcing the next point, plus a forced group of
three), "Kos isi dulang pula bukan bayaran kepada sesiapa, tetapi perbelanjaan …"
became a direct statement instead of a *not X but Y*, and the deck stopped
teasing ("hanya satu yang wajib") and answered ("hanya **mas kahwin** yang
wajib").

---

## 5. The DoD, clause by clause

**"The live page's `<h1>`, `<title>` and opening 200 words centre on definition
and money, quoted from live HTML before and after."** Done, §3. Both windows
quoted from live HTML, produced by a committed script anyone can re-run.

**"No new URL is created and no redirect is added — the sitemap count is
unchanged at whatever CONT-13/16 leave it, stated explicitly."**

**The sitemap is unchanged at 103 `<loc>` entries.** Stated explicitly, and
proven more strongly than by the count: the sorted `<loc>` sets before and after
are **identical, with an empty `diff`** — so no URL was added, removed or
renamed by anything, mine or anyone else's, during the window of this item.
CONT-13 and CONT-16 had published nothing at the time of measurement (published
article count 86 before and after). Both sitemaps committed:
`…-EVIDENCE/sitemap-before.xml`, `…-EVIDENCE/sitemap-count-before.txt`.

```
loc before: 103  loc after: 103
diff <(sort before) <(sort after)  ->  (no output)
```

The slug did not change, so no redirect was needed or added. The pre-existing
legacy short URL still behaves exactly as it did before the write:
`https://hellokahwin.com/hantaran-kahwin` → `308` →
`https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin`. That 308
was there in the first fetch of this session, before any write.

**"The C2.1 boundary line in ceo-memory.md is closed with the measurement that
closed it, or is left open with a stated reason."** **Closed**, with the 01 Sept
SERP and the `parent_topic` corroboration written into the bullet itself
(`docs/boardroom/ceo-memory.md`, the `🟢 THE LAST C2.1 BOUNDARY IS CLOSED`
bullet), together with the correction to the brief's premise.

**Shipped.** Content ingested to production, URL returns 200, the reader sees
it: three consecutive live fetches after the cache purge returned the new
`<title>`, `X-Vercel-Cache` MISS then HIT then HIT.

---

## 6. Correcting the CEO, and the write path

**Correction 1 — the brief's premise.** "CONT-12 closed without doing it" is
wrong; CONT-12 did it on 28 Aug and this same file recorded it. Corrected at
source in `ceo-memory.md` rather than only here. What was true is narrower and
more useful: **the money half of decision 120 did not survive**, and the `⚠ OPEN`
bullet was never struck when the work landed, so it kept reading as a live
instruction for four days.

**Correction 2 — `origin/master` is not this repo's doc line.** The dispatch
named `master` as the PR target. `origin/master` on `ianngkb/hellokahwin` is the
legacy migration-tool history and **contains no `docs/` directory at all** —
`git cat-file -e origin/master:docs/boardroom/ceo-memory.md` fails. The doc line
is `feat/command-centre-dashboard`. Merging `origin/master` into this worktree
produced eight conflicts including `backend/server.js` and the whole `frontend/`
tree, and was aborted. This branch was fast-forwarded onto
`origin/feat/command-centre-dashboard` (04c2f7c) instead, which is where the
sep-01 briefs live. **Anyone dispatching a docs item should say
`feat/command-centre-dashboard`, not `master`.**

**Write path.** All three Supabase MCP servers failed to connect this session
(`CONNECTION_CLOSED`). That is a session-level connection failure, not a missing
capability, and it did not block anything: the production write went through
`psql` on the session pooler (`aws-0-ap-southeast-1.pooler.supabase.com:5432`)
with the password injected from the vault key `supabase.hellokahwin-dbpass`,
exactly the path the `/tokens` registry documents. Cache purge via the site's
own `POST /api/cron/revalidate-content` with `CRON_SECRET` from
`hellokahwin-site/.env`.

**Worth recording: the STALE-title defect did NOT reproduce on a purge.** The
`ceo-memory` repro is for TTL expiry — first request past TTL serves a `STALE`
copy with the old truncated title. After an explicit `revalidate-content` purge
the very first request was `MISS` and carried the **new** title. `PURGE_IMMEDIATELY`
is doing what its comment says it does.

---

## 7. The undo

Written, committed and pushed **before** the write
(`sep-01-2026-cont-14-UNDO.md`, `…-EVIDENCE/undo.sql`), and **run against the
live row before the write rather than only described**:

```
BEGIN
UPDATE 1
COMMIT
      slug       |                          title                           | node_count
-----------------+----------------------------------------------------------+------------
 hantaran-kahwin | Hantaran kahwin: maksud, adat dan beza dengan mas kahwin |         57
```

`undo.sql` embeds the complete pre-write state as a dollar-quoted literal, so it
needs no other file and no ordering assumption. Its first draft read the state
from `before-row.json` via `\copy … FORMAT text`, which would have split the
pretty-printed JSON across rows and failed — caught by running it.

---

## Retrospective

### What did we learn that is not written down

**A DoD that says "the opening N words" has no window until a script defines
one.** On an article page the rail and the table of contents sit between the
`<h1>` and the first paragraph. Strip tags, take 200 words, and roughly 90 of
them are *"Rekod Kategori Penulis Bacaan Disemak Kongsi artikel ini Isi Kandungan
…"* plus every heading in the page — and then the term counts describe the
furniture. On this page the naive window **ended inside the table of contents**:
an article whose first paragraph answers its head question measured as an
article with no opening at all. That is the same family as the `grep -o -i -F`
defect: a check that returns a confident number about the wrong thing.

**A stale `⚠ OPEN` line is more dangerous than a stale brief, because it is what
briefs are written from.** The writer-side version of this — *an upstream
DECISION that names your topic ages exactly like a brief does* — is already in my
persona. The planning-side half was not written anywhere. CONT-12 landed the
work and wrote a green line five lines above the open bullet, and left the open
bullet standing. Four days later it became a sprint item whose first sentence was
false.

### Which document must change, and who owns the edit

Three, and all three edits are made, not proposed.

1. **NEW — `scripts/measure/opening-200.sh`.** Owner: me
   (`writer-inspirasi-vendor-venue`). The executable form of the lesson above.
   Takes the DOM containers (`<h1>`, `p.s-deck`, `div.inspire-prose` with every
   `<nav>` removed) rather than pattern-matching furniture, prints the window for
   quoting, warns on any zero, and says so loudly when it has to fall back.
   Committed and used to produce both windows in §3 of this log.

2. **`docs/boardroom/ceo-memory.md` — the measurement-tooling section.** Owner:
   me. A new bullet next to the `count-in-html.sh` one, so the next seat handed an
   "opening N words" DoD finds the script instead of re-improvising it.

3. **`docs/boardroom/ceo-memory.md` — the planning rule.** Owner:
   `ceo-hellokahwin`; edit made by me at source because the retrospective
   requires the edit, not the request. **Before an item is written from a `⚠`
   bullet, scan the same section for a later `✅`/`🟢` line naming the same slug or
   decision number; if one exists the item is a VERIFY, not a DO, and should say
   so. And when work lands against an open bullet, the seat that lands it strikes
   the bullet in the same commit.** The C2.1 boundary bullet itself is now struck
   and green, which is the rule applied to its own instance.

### What did we do twice that we should never repeat

**Wrote a fix and trusted it before running it — twice in one item, and both
were caught by running it.** `undo.sql` v1 would have failed on `\copy … FORMAT
text` against pretty-printed JSON. `opening-200.sh` v1 cut from `Rekod` to the
first `?` after `Isi Kandungan`, which lands on the **first of eleven** TOC
entries — run against the very page it was written for, it still spent 60 words
on the table of contents and still printed term counts about it. Both are now in
the scripts' own headers, because "I understand the cause" remains not a test.

Also, less charitably: **I nearly measured the before-state twice with two
different ad-hoc extractors and quoted whichever ran first.** They agreed, which
is luck. The script exists so the next comparison is one instrument on both sides.

### What did we nearly ship, and what caught it

**A term-count claim that was simply wrong.** The first draft of the
`ceo-memory` bullet said money terms in the opening went "from 2 to 11". The
real before-figure is **7**. I had it from a partial count taken with a
different term list than the after-count. Caught by re-running both sides with
the same instrument and the same list before committing. It is now in the bullet
as 7 → 11 **with an explicit note that the number understates the change and
that the window, not the count, is the evidence** — because a 7 → 11 delta
argued as decisive would be exactly the proxy-with-a-pattern-nobody-tested
failure the standing rules are about.

**And a truncated `ceo-memory.md`.** A Python edit script opened the file with
`open(p, "w")`, then raised `UnicodeEncodeError` on a lone-surrogate escape —
after truncation, before writing. The 1,315-line file went to 0 bytes with the
C2.1 edit uncommitted. Caught immediately by `git diff --stat` printing "1315
deletions", restored with `git checkout --`, and all edits reapplied by a script
that **encodes first, writes a temp file, then `os.replace`s** — so a failed
encode can never truncate the file again. That pattern is now in the edit script
and is worth adopting for every `ceo-memory.md` edit: it is the one file in this
company that six seats rewrite on a normal evening, and `open(..., "w")` destroys
it before it knows whether it can write it.

---

## Evidence index

`docs/work-done/sep-01-2026-session-01/sep-01-2026-cont-14-EVIDENCE/`

| file | what it proves |
|---|---|
| `serp-hantaran-kahwin-2026-09-01.json` | the gate: SERP still half money, PAA 3/4 definitional, AI Overview cites two non-ranking definitional pages |
| `keywords-batch-2026-09-01.json` | Ahrefs `volume` + `parent_topic` for all eight terms; `maksud hantaran kahwin` and `duit hantaran` share `mas kahwin` |
| `live-before.html` | production HTML before the write |
| `live-after.html` | production HTML after the write and purge |
| `before-row.json` | the complete pre-write row: title, all meta, 57-node `content` |
| `after-row.json` | the exact payload written |
| `write.sql` | the write, one row, five columns |
| `undo.sql` | the undo, self-contained, proven by running it |
| `sitemap-before.xml`, `sitemap-count-before.txt` | 103 `<loc>`, and the set that the after-sitemap `diff`s clean against |
| `../sep-01-2026-cont-14-UNDO.md` | the undo document, pushed before the write |
