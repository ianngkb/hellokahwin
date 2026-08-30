# The gap was not three articles. It was twenty-three, and 69 images.

26 Ogos 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-ship-cont-02-enrichment.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo:** `docs/work-done/2026-08-26-ship-cont-02-enrichment-UNDO/before.json` + `undo-restore.mts` — captured and dry-run-proved **before** the first write.
**Evidence:** `docs/work-done/2026-08-26-ship-cont-02-enrichment-EVIDENCE/` — every number below, and every script that produced one.

CONT-02's image enrichment is on the site. **23 published articles were
re-ingested, 69 photographs reached a reader for the first time, and the 33
pillar articles went from 76 live images to 145.** No URL changed, no publish
date moved, no prose changed, and not one of the 178 internal links SEO-02
wrote yesterday was lost.

```
pnpm --silent audit:drafts --db "$DB" --drafts <docs>/drafts/ingest --drafts <docs>/drafts
PASS — every published article serves every image its draft declares.
```

That command did not exist this morning. It is the retrospective, and §8 explains why.

---

## 1. The brief's sample table was wrong, and the way it was wrong is the finding

The brief measured three articles and reported:

| Article | Brief said live | Actually live |
|---|---|---|
| `nikah-undang-undang/borang-nikah` | 4 ✓ | **1** |
| `ucapan-doa/doa-pengantin-baru` | 2 | **1** |
| `venue-perancangan/bajet-kahwin` | 4 | **1** |

The brief told me to enumerate all 33 rather than trust it, and it was right to.
But the reason the numbers differ is worth more than the correction: **the brief
counted the images on the page, and every article page carries sibling
thumbnails from the related-articles block.**

```
$ curl -s https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah | grep -o 'images\.hellokahwin\.com/[^"]*' | ...
inspire/borang-nikah/…-images-s-selepas-akad-raja-abd-kadir…   <- the article's own, x1
inspire/lafaz-taklik/…/crop-4x3-article-card.webp              <- sibling thumbnail
inspire/rukun-nikah/…/crop-4x3-article-card.webp               <- sibling thumbnail
inspire/syarat-sah-nikah/…/crop-4x3-article-card.webp          <- sibling thumbnail
```

Four distinct images on the page, one of them the article's. The same arithmetic
gives 2 for `doa-pengantin-baru` and 4 for `bajet-kahwin` — the brief's exact
figures. **A hand-count of image tags cannot measure this and will always read
high.** It is now written into the workflow as a rule, because it is the second
time a count taken off the rendered page has misdirected a run.

## 2. The real number, from a command, both columns against production

`audit.mts` in the evidence folder, and `pnpm audit:drafts` now does the same
thing as a checked-in gate. Identity is the **declared filename** —
`media.filename` live, `basename(file:)` in the draft. Not the URL: ingest
stamps every upload with `Date.now()` and stores the WebP derivative, so nothing
in `articles.content` ever resembles anything in a draft.

```
CAT                     SLUG                                 BEFORE AFTER DELTA
busana-pengantin        baju-pengantin-sewa-atau-beli             2     3     +1
busana-pengantin        inai-tangan-pengantin                     1     4     +3
busana-pengantin        songket-tenunan-tangan-atau-cetak         2     5     +3
hantaran-mas-kahwin     apa-itu-mas-kahwin                        4     4      0
hantaran-mas-kahwin     dulang-hantaran                           4     4      0
hantaran-mas-kahwin     gubahan-hantaran                          4     4      0
hantaran-mas-kahwin     mas-kahwin-ikut-negeri                    4     4      0
hantaran-mas-kahwin     mas-kahwin-johor                          2     4     +2
hantaran-mas-kahwin     mas-kahwin-kelantan-terengganu            2     4     +2
hantaran-mas-kahwin     mas-kahwin-melebihi-kadar-minimum         4     4      0
hantaran-mas-kahwin     mas-kahwin-pahang-negeri-sembilan         2     5     +3
hantaran-mas-kahwin     mas-kahwin-perak                          2     4     +2
hantaran-mas-kahwin     mas-kahwin-sabah-sarawak                  2     4     +2
hantaran-mas-kahwin     sirih-junjung                             4     4      0
nikah-undang-undang     borang-nikah                              1     4     +3
nikah-undang-undang     lafaz-taklik                              1     4     +3
nikah-undang-undang     rukun-nikah                               2     5     +3
nikah-undang-undang     syarat-sah-nikah                          1     5     +4
pelamin-kad-cenderahati bunga-telur                               3     3      0
pelamin-kad-cenderahati contoh-kad-jemputan-kahwin                2     4     +2
pelamin-kad-cenderahati pelamin                                   3     3      0
sebelum-nikah           cincin-tunang                             1     5     +4
sebelum-nikah           doa-majlis-pertunangan                    1     5     +4
sebelum-nikah           taaruf-maksud                             1     4     +3
ucapan-doa              doa-majlis-perkahwinan                    2     5     +3
ucapan-doa              doa-pengantin-baru                        1     4     +3
ucapan-doa              skrip-pengacara-majlis-perkahwinan        6     6      0
ucapan-doa              ucapan-pengantin-baru                     1     5     +4
ucapan-doa              walimatul-urus                            6     6      0
venue-perancangan       bajet-kahwin                              1     5     +4
venue-perancangan       checklist-kahwin                          1     5     +4
venue-perancangan       harga-sewa-dewan-kahwin                   2     5     +3
venue-perancangan       pakej-dewan-kahwin                        1     5     +4
                        TOTAL (33 articles)                      76   145    +69
```

**23 of 33 articles were behind. Ten were already in sync** — the P2 hantaran
set, the three CONT-01 articles, `pelamin`, `bunga-telur`, `walimatul-urus` and
`skrip-pengacara`. Those ten were not touched.

**61 articles are published, not 33.** The other 28 are the legacy WordPress
pages; they have no draft and were not in scope. That distinction is in the
audit output rather than assumed.

### Why the eight P1/P6 articles were at 1 and 2

They were higher yesterday. The text-card purge of 26 Aug removed the displaced
`kad-tajuk` cover from each of the eight, correctly, and nothing replaced it —
because the replacement was sitting in the draft under CONT-02's "do not ingest"
hold. `borang-nikah` went 2 → 1 that morning and 1 → 4 tonight.

## 3. Rule 3, answered per article rather than assumed

The brief said *"where they disagree, the union is almost certainly right, but
say so per article rather than assuming."*

**There was no disagreement to resolve.** Measured, not asserted:

- **Zero articles where production served an image the draft does not declare.**
  All 33 checked, cover and body.
- **The cover matched on all 33** — no image was live as a cover and drafted as
  a body image, or the reverse.
- So the draft is a **strict superset** of live on every article, the union
  equals the draft, and nothing needed reconciling. Had it not been, an
  `--update` would have deleted a live credited image, which is why this was
  checked before the write and not after.

The check is in the shipped gate too: `pnpm audit:drafts` prints
*"PRODUCTION SERVES AN IMAGE THE DRAFT DOES NOT DECLARE — an --update from this
draft would REMOVE these from the page"* whenever that case appears.

## 4. The two traps that would have made this a bad night

Neither is hypothetical. Both were armed.

### SEO-02 wrote 68 internal links straight into 45 live bodies, and never touched a draft

`aug-26-2026-done-seo-02-internal-linking.md`, this morning: 45 article bodies
rewritten in one transaction, every internal link's `nofollow` stripped, 68 links
added. **31 of the 33 articles I was about to re-ingest were among them.** Ingest
replaces `articles.content` wholesale. A naive `--update` from a draft that
predates that write loses whatever the write added.

So before committing anything I built the planned document locally — the same
pipeline ingest runs, `marked` → `generateJSON` with the same extensions →
`normaliseInternalLinkMarks` — stripped the figures from both sides, and diffed
block by block against live (`plan.mts`, `plan.json`):

```
SLUG                                 LIVEBLK  PLANBLK  PROSE  LINKSLOST  LINKSNEW
baju-pengantin-sewa-atau-beli        49       49       same   0          0
inai-tangan-pengantin                59       59       same   0          0
…all 23…
--- INTERNAL LINKS PRODUCTION WOULD LOSE ---      none
--- LINKS THE DRAFT ADDS THAT PRODUCTION LACKS -- none
--- PROSE BLOCKS THAT DIFFER ---
  none — every planned body matches live prose exactly
```

Every planned body reproduces live prose **exactly**, block for block, marks
included. The reason it is safe is `7c63287` — the nofollow fix — which is in
this worktree, so `normaliseInternalLinkMarks` reproduces the repaired mark shape
byte-for-byte. Without that commit the diff would have shown 23 articles
regressing to `rel="noopener noreferrer nofollow" target="_blank"`.

Proved again after the write, from the instrument SEO-02 used:

```
edges  194 -> 194     orphans 0 -> 0     dead 0 -> 0     308-hops 41 -> 41
edges lost since SEO-02:   0
edges gained since SEO-02: 0
```

**The first diff attempt reported all 23 articles as changed and was wrong.**
Postgres `jsonb` does not preserve key order — it returns `{"text":…,"type":"text"}`
where TipTap emitted `{"type":"text","text":…}`. A raw `JSON.stringify` compare
flags every block. Sorting keys on both sides is what makes the diff mean
anything, and it is commented in `plan.mts` because the false positive is
indistinguishable from a real finding at a glance.

### The publish-date trap, and it is now closed at the files

`ingest-article.mts` writes `published_at = frontMatter.publishedAt ?? new Date().toISOString()`
on update. **25 of the 33 drafts carried no `publishedAt:`.** A plain
`--update --publish` would have restamped 18 indexed pages with tonight's date
and taken the JSON-LD `datePublished` and the sitemap `lastmod` with them. The
card purge worked around this by ingesting reconstructed files and wrote up that
the trap *"is still armed for anyone who ingests those drafts."*

It is not any more. `stamp.mts` read each article's real `published_at` out of
production and wrote it into the front matter with the comment
`A3-mas-kahwin-johor.md` already carried — **all 33 now carry it, 25 added.**
Every insert was round-tripped through `parseArticleFile` before the bytes
landed, and refused if the body changed.

**Two files refused on that guard and the guard was right.** `walimatul-urus`
and `skrip-pengacara-majlis-perkahwinan` are CRLF while the other 31 are LF;
splitting on `/\r?\n/` and re-joining with `\n` would have rewritten every line
ending in both files. Fixed by keeping the file's own EOL.

Verified after the write, all 23:

```
SLUG                     PUBLISHED_AT               SAME  STATUS     URL
rukun-nikah              2026-08-25T10:11:45.119Z   yes   published  /artikel/nikah-undang-undang/rukun-nikah
borang-nikah             2026-08-25T10:11:27.185Z   yes   published  /artikel/nikah-undang-undang/borang-nikah
…
23 articles checked; 0 with a moved date, changed URL or lost publish.
```

`--publish` is not optional and it is worth restating: without it
`effectiveStatus` falls to `draft`, which would have unpublished 23 live
articles in one run.

## 5. The run

```
pnpm --silent ingest <file> --db "$DB" --commit --update --publish --revalidate-url https://hellokahwin.com
```

`pnpm --silent` throughout, never `pnpm run`. Both secrets injected by nested
`vault.ps1 run` calls — `supabase.hellokahwin-dbpass` → `PGPASSWORD`,
`vercel.twn` → `VERCEL_TOKEN` — so neither value ever reached a command line.

**All 23 dry-ran against production first** (`ingest-dryrun.txt`): 23 files,
0 failures, every one `Status: published`, every one `Images: N, every one
credited`, 103 image lines, zero `kad-tajuk`. Then all 23 committed
(`ingest-commit.txt`): **exit 0, no warnings, no retries**, each reporting

```
Done. /artikel/<pillar>/<slug> (published)
Content caches dropped and the Vercel edge purged — the article is visible on the site now.
Purged (HTTP 200 in 1 request(s)): /artikel/<pillar>/<slug>, /artikel/<pillar>, /sitemap.xml
```

Order was fixed in `ingest.ps1` and the four P6 files are read from the drafts
root, not `ingest/` — they have no `ingest/` twin and the root copy is the
canonical one.

### Unreferencing the superseded uploads

Every ingest re-uploads under a fresh `Date.now()` prefix and only ever
*inserts* `media_article_usage`, so after the run each article's admin library
still listed the previous generations as "used by" it. **72 superseded rows
deleted by id** — exactly the 72 the undo snapshot holds. `media_article_usage`
is 775. **No `media` row and no R2 object was touched**: an orphan media row is
invisible to a reader, a deleted one takes its R2 object with it. Same call the
card purge made.

## 6. Proof, from what a reader gets

**All 33 pages fetched. Every one HTTP 200. Every one serves exactly the number
of its own images the database holds** — counted by filtering to
`inspire/<own-slug>/…` so sibling thumbnails cannot inflate it, which is the
mistake §1 is about (`livesweep.txt`):

```
200   1 ->  4 (db 4)  https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah
200   1 ->  5 (db 5)  https://hellokahwin.com/artikel/venue-perancangan/bajet-kahwin
200   1 ->  4 (db 4)  https://hellokahwin.com/artikel/ucapan-doa/doa-pengantin-baru
…33 of 33…
33 articles + 10 navigation URLs; 0 problem(s).
```

**Navigation renders and no URL changed.** All seven pillar hubs, the home page,
`/artikel` and the sitemap, all 200, sitemap still listing 61 articles:

```
200  67534B  50 article links  https://hellokahwin.com/
200  39797B   8 article links  https://hellokahwin.com/artikel/nikah-undang-undang
200  43224B  22 article links  https://hellokahwin.com/artikel/hantaran-mas-kahwin
200  39800B  10 article links  https://hellokahwin.com/artikel/ucapan-doa
200  36742B   6 article links  https://hellokahwin.com/artikel/busana-pengantin
200  39319B   6 article links  https://hellokahwin.com/artikel/pelamin-kad-cenderahati
200  37557B   8 article links  https://hellokahwin.com/artikel/venue-perancangan
200  40522B   6 article links  https://hellokahwin.com/artikel/sebelum-nikah
200  15046B  61 article links  https://hellokahwin.com/sitemap.xml
```

**A credit line, quoted from the HTML the site delivered** for
`/artikel/nikah-undang-undang/borang-nikah` — one of the three figures that had
never reached a reader until tonight:

```html
<figcaption …><a href="https://commons.wikimedia.org/wiki/File:UTC_Keramat_counter_(220527).jpg"
   … target="_blank" rel="noopener noreferrer">Sesetengah kaunter jabatan agama duduk dalam
   UTC yang sama dengan JPN dan Imigresen. Papan tanda di pintu masuk yang memberitahu anda
   tingkat mana. — Kredit: *angys* (CC BY-SA 4.0)…
```

**Zero images live without a full credit chain, on the 33.** Checked as
`credit` **and** `credit_url` **and** `license_class` **and** `licensor_name`,
all four non-empty, on every cover and body image of all 33 — the audit checks
`credit_url` too, which `pnpm audit:images` does not.

> **The 28 legacy WordPress articles are a different story and I am not going to
> round it off.** 619 of their images carry no credit, no licence class and no
> licensor. That is pre-existing, none of it was touched tonight, and none of it
> is on the 33. It is the largest open credit exposure on the domain and it
> belongs in a brief of its own.

**Zero text cards, database and live.** `pnpm audit:images --db … --live`, all
61 published articles, all 61 pages fetched: `text cards referenced: 0`,
`text cards served: 0`, `non-200 responses: 0`, **PASS**.

## 7. Two defects found and fixed, and one of them failed this run

### The text-card classifier called two 1899-era photographs text cards

The first post-write audit came back **FAIL**, naming
`S-menenun-songket-kelantan-1899-skeat.png` and
`S-menenun-songket-alor-setar-british-official.png`. Both had just gone live on
`songket-tenunan-tangan-atau-cetak`.

I opened both frames. One is a Kelantan kampung loom photographed around 1899 —
four people, a backstrap loom, a bamboo wall. The other is a woman at a floor
loom in Alor Setar. **There is not a word in either frame.** The style guide's
test — *could you paste the content as a markdown table and lose nothing* —
returns no on both.

The classifier's own header comment already promised the exemption: *"archival
photographs correctly declared as `images/S-name.png` (the 1899 songket plates
are real ones)"*. **The code never implemented it.** The comment described a
three-clause rule; the code had two. It cost nothing while the plates sat in a
draft and failed the run the hour they went live.

Fixed, and moved somewhere it can be tested:

- **`src/lib/inspire/text-card.ts`** — the rule, with the third clause,
  `filename does not start with S-`.
- **`src/lib/inspire/__tests__/text-card.test.ts`** — 5 tests, every case a real
  production row: both songket plates, two generated cards, a legacy WordPress
  PNG, a JPEG, and `s-` lower-case which must **not** buy an exemption.
- `scripts/audit-live-images.mts` calls it instead of redeclaring it.

**An instrument that fails on correct content is worse than no instrument**,
because the next operator learns to read past its FAIL — and reading past the
audit is exactly the habit that let eight real cards sit on indexed pages for a
day.

### The asset register still blessed all seventeen text cards

`digunakan_dalam` and `status_guna` were both wrong, in the document a writer
consults before choosing an image.

- **17 rows still said `status_guna: boleh-guna`** — HK-C-0009…0016 and
  HK-G-0011…0019, every P1/P6 card. The eight `kad-tajuk` rows
  (HK-C-0001…0008) were retired properly on 25 Aug; these seventeen were
  missed. **A register that says `boleh-guna` is how a banned card comes back.**
  All 17 are now `jangan-guna` with the directive quoted, the §13.4 test
  restated, and the original nota preserved after it.
- **12 `digunakan_dalam` entries were missing**, all on `walimatul-urus` and
  `skrip-pengacara-majlis-perkahwinan` — the two articles CONT-01 wrote while
  CONT-02 was running and which CONT-02 deliberately did not touch. Nobody wrote
  their reuse back.

**Additive only.** The recompute would have dropped 39 entries — every one a
retired card or a superseded asset whose `digunakan_dalam` is a historical
record — and they are printed rather than deleted. 46 cells changed, 794 rows in
and 794 rows out, 20 columns unchanged, previous copy kept beside it as
`asset-register.csv.before-cont02-ship`. **Every image live on the 33 now has a
register row, with a complete credit chain, naming the article it is on, and not
one of them says `jangan-guna`.**

### Still open, and it is the CEO's call, not mine

`pnpm covers --set kad-tajuk,p1-body,p6-body` still regenerates all seventeen
cards from `scripts/generate-cover-graphics.mts`. CONT-02's retrospective raised
this on 26 Aug and parked it as a decision the CEO owns because it is a code
change outside that brief. **It is outside this one too, so I have not made it,
and I am raising it a second time rather than letting it go quiet.** The register
and the style guide now both refuse these cards; the generator still offers them
with one command.

## 8. What I did NOT do

- **No prose was written, rewritten or deleted.** Front matter and figures only,
  proved block-by-block in §4 before the write.
- **`/humanizer` was not run.** No body prose changed; the new writing in this
  run is nothing — the Malay captions and alt text were written by CONT-02 and
  shipped unaltered. Same call as CONT-02 and for the same reason.
- **No `media` row or R2 object deleted**, and no PNG removed from disk.
- **The ten in-sync articles were not re-ingested.** They needed nothing, and a
  needless `--update` resets `review_status` and re-uploads every image.
- **`7c63287` is still not deployed.** SEO-02 flagged it; it is still true. This
  run is safe without it because ingest ran from this worktree, which has it —
  but the renderer half only reaches readers on a deploy.

## 9. Files changed

**Site repo — `ianng89/pillars-ingest-redirects`:**

| Path | What |
|---|---|
| `src/lib/inspire/text-card.ts` | **new** — the text-card rule, third clause included |
| `src/lib/inspire/__tests__/text-card.test.ts` | **new** — 5 tests, all real production rows |
| `scripts/audit-live-images.mts` | calls the shared rule; header corrected |
| `scripts/audit-draft-vs-live.mts` | **new** — `pnpm audit:drafts`, the content ship gate |
| `package.json` | `audit:drafts` script |
| `docs/work-done/2026-08-26-ship-cont-02-enrichment*` | this log, the undo, the evidence |

**Docs repo — `hellokahwin`:**

| Path | What |
|---|---|
| 25 of the 33 canonical drafts | `publishedAt:` added, front matter only, body byte-identical |
| `docs/asset-register/asset-register.csv` | 17 cards retired, 12 usage entries added, 46 cells |
| `docs/asset-register/asset-register.csv.before-cont02-ship` | **new** — the copy before that edit |
| `docs/plans/…/aug-23-2026-workflow-content-production.md` | Stage 7 and Stage 9b — the retrospective edit |

**Gates:** `pnpm test` **255 passed, 23 files** (250 before, +5). `pnpm typecheck`
clean. `eslint` clean on every file touched; `prettier --write` run on every
source file.

> `pnpm lint` as a whole still fails, and it did before this run: `prettier --check .`
> reports **148 files**, almost all of them the `docs/work-done/` logs and their
> evidence folders, none of which this run created. The markdown in this folder is
> hand-formatted like its twenty-two siblings and I have not reflowed it — running
> prettier over these logs is a separate decision about whether they are source or
> prose, and it belongs to whoever owns `lint`.

### Stage 9b, run on this run — and the honest answer is amber

Owner of this gate is the CEO, not me, so here is the state rather than a verdict.

```
site repo   git status --short              6 paths belong to this item, ALL UNCOMMITTED
            git rev-list origin/master..HEAD   0
docs repo   git status --short              28 paths belong to this item, all uncommitted
            git rev-list origin/…..HEAD       15   (pre-existing, not this item's)
            pnpm --silent audit:drafts        PASS, exit 0
```

**The content is shipped and proved — that is the deliverable and it is live.**
The code and the logs are not committed anywhere. I have not committed them
because the brief did not ask for a commit and shipping this repo is a separate,
board-approved act; the previous run declined to merge `7c63287` for the same
reason. But leaving it unsaid in a log whose entire retrospective is about work
stopping one step short would be absurd, so:

| Uncommitted, and it belongs to this item | Repo |
|---|---|
| `src/lib/inspire/text-card.ts` + its tests | site |
| `scripts/audit-draft-vs-live.mts`, `scripts/audit-live-images.mts`, `package.json` | site |
| this log, its UNDO and its EVIDENCE | site |
| 25 stamped drafts, the register + its backup, the workflow edit, the pointer log | docs |

`scripts/audit-live-images.mts`, `scripts/generate-cover-graphics.mts` and
`scripts/covers/` were **already untracked before this run** — earlier sessions'
work, still uncommitted. The docs repo's 15 unpushed commits are also not mine.
Both are worth someone's attention and neither is this brief's to resolve.

## 10. Undo

`docs/work-done/2026-08-26-ship-cont-02-enrichment-UNDO/before.json` — the
complete pre-write state of all 23 rows, written and **dry-run-proved before the
transaction opened**: 23 `articles` rows across all 22 columns ingest rewrites,
46 `article_categories`, 79 `article_tags`, 72 `media_article_usage`, 80 `media`.

```
pwsh vault.ps1 run supabase.hellokahwin-dbpass -EnvVar PGPASSWORD -Cmd pwsh,"-NoProfile","-Command",
  'npx tsx <evidence>/undo-restore.mts --db "$DB" --file <undo>/before.json --commit'
# then re-run the revalidate + edge purge
```

It restores `published_at`, `status`, `review_status`, both join tables and the
72 usage rows exactly as captured. It deliberately does **not** delete the media
rows this run created: unreferencing is enough, and a deleted media row takes an
R2 object with it. The draft edits undo by deleting the `publishedAt:` block from
each front matter; the register undoes by restoring
`asset-register.csv.before-cont02-ship`.

---

## Retrospective

### 1. The question the brief asked

> *The work was complete and correct in the drafts, and stopped one step short of
> a reader. What in the content workflow should make "written but not ingested"
> impossible to mark as finished?*

**The workflow already had that gate. It could not see content.**

Stage 9b — *"Fixed is not shipped"* — was added on 25 Aug after exactly this
failure in code: a verified fix sat uncommitted while every report read as
complete. It gives two commands and a three-row table of things that look done.

Both commands are git commands. For code that chain ends at a reader — correct,
committed, deployed, working. **For content it forks, and git can only see the
branch that does not matter.** Committing a draft ships the *source*. Only an
ingest writes the *row*, and the row is what a reader gets. No git command in
any repository can see it.

I checked both states of the repo, because I had assumed the first and it was
only half true:

| The draft was… | `git status --short` said | Read as |
|---|---|---|
| **untracked** — CONT-02's own state, 26 Aug 00:31. Its log says so: *"None of these files is tracked in git, so there is no committed state to diff against."* | `?? …/drafts/borang-nikah.md` | noise — Stage 9b itself says *"uncommitted files unrelated to the item are fine"* |
| **committed** — the same files at 09:03, after `d4c4237` swept the whole sprint's drafts into git | *(clean)* | shipped |

```
$ git log --diff-filter=A --format='%h %ai' -- …/drafts/borang-nikah.md
d4c4237 2026-08-26 09:03:07 +0800
$ git show HEAD:…/drafts/borang-nikah.md | grep -c '^  - file:'
3
```

**The committed HEAD already carried all three of CONT-02's new photographs**,
and the page was serving none of them. So there is no state of the repository
that would have caught this: untracked reads as noise, committed reads as
shipped, and the article was behind in both.

So CONT-02 passed a ship check that was structurally incapable of failing it.
That is not carelessness. The agent sourced fifteen photographs, verified every
licence at origin against the Commons `extmetadata` API, caught a wrong licence
version, opened every frame before writing alt text, rejected five images on
content grounds, wrote both directions of the register, and **checked four tools
and a validator into the repo so the next run would measure instead of
hand-count.** Its report is the most careful in the folder. It was also held by
an explicit "do not ingest" instruction — RISK-01 — and when that hold lifted,
nothing anywhere connected the release of the hold to the work waiting behind it.

**A hold is a promise to come back, and nothing in this workflow was holding the
other end of it.**

### 2. Which document changes, and who owns the edit

**`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
— me, done in this run.** Two edits, and one of them is a command that did not
exist this morning.

**Stage 9b gains a fourth row and a fourth command.** The table of things that
look done now reads:

| Looks done | Actually is | How to tell |
|---|---|---|
| Code is correct | Not committed | `git status --short` is non-empty |
| Committed | Not deployed | `git rev-list --count origin/master..HEAD` is non-zero |
| Deployed | Not visibly working | The URL, row or render still says otherwise |
| **The draft is correct** | **Not ingested** | `pnpm --silent audit:drafts` says the article is behind its draft |

and the gate is now *"all three commands run and accounted for… for a content
item the third is the one that matters and the first two will lie to you."* The
table of which git state lies in which direction is in the workflow beside it.

**A rule with no command is a wish, so the command is checked in.**
`scripts/audit-draft-vs-live.mts`, `pnpm audit:drafts`. Per published article it
compares the images the draft declares against the images production serves,
matched on the declared filename. It **exits 1** when any article is behind, so
it is a gate rather than a report somebody reads. It also names the opposite
case — production serving an image the draft does not declare — because that is
what an `--update` deletes.

Both directions are proved in the evidence folder, not asserted:

```
draftaudit.txt   PASS — every published article serves every image its draft declares.   exit=0
failcase.txt     FAIL — 1 published article(s) are behind their draft, 1 image(s).       exit=1
```

The failure case is a scratch copy of `borang-nikah.md` declaring one image more
than production serves. **A gate nobody has watched fail is not a gate**, and
this project has already shipped one check that could never fire —
`cover_image_url not like '%kad-tajuk%'`, which came back clean while eight
pages served a card.

**Stage 7 records that the publish-date trap is closed at the files** — all 33
drafts now carry `publishedAt:` — and that it stays armed for every new draft,
because the file format defaults it to absent.

### 3. What did we do twice that we should never do again

**Counted images off a rendered page.** Twice now. The 25 Aug gap table counted
front-matter entries naming files that did not exist; this brief's table counted
sibling thumbnails. Both times the number was wrong in the direction that hides
work. It is now a written rule with the reason attached.

**Let a comment stand in for code.** The text-card classifier's header described
a three-clause rule and the code had two, for as long as the file has existed.
The same shape as SEO-02's finding this morning — *"nobody typed the word
anywhere"* — and the same fix: move the rule where a test can hold it. It is
now `src/lib/inspire/text-card.ts` with five tests over real production rows.

**Retired a text card in one place and not the others.** The cards are banned in
the owner's directive, banned in style guide §13.4, purged from production, and
were still `boleh-guna` in the asset register with a live article named in
`digunakan_dalam` — while the generator that makes them is one command away.
**Four documents, three of them updated, and the ban is only as strong as the
weakest.** The register is fixed here; the generator is still the CEO's call and
is raised again in §7.

### 4. What did we nearly ship, and what caught it

**Twenty-three articles regressing to `nofollow` on every internal link.** Ingest
replaces `content` wholesale and SEO-02 had rewritten 31 of my 33 that morning
without touching a draft. What caught it was refusing to reason about it: I built
the planned document with the real pipeline and diffed it against live before
committing. It came back clean — but only because `7c63287` is in this worktree.
The same run from `master` would have shipped the regression and reported
success, because the images would all have been there.

**A first diff that reported 23 false positives.** Postgres `jsonb` reorders
object keys. `JSON.stringify` on both sides flagged every block in every article,
and the output *looked* exactly like a real finding — same articles, same shape.
What caught it was printing the two nodes side by side instead of trusting the
count. A diff that reports everything is reporting nothing.

**Eighteen indexed pages restamped with tonight's date.** Caught because the card
purge wrote the trap down four hours earlier, by name, with the line number. That
is a retrospective paying for itself inside a day, and it is the argument for
Stage 9 that no amount of policy makes.

**A false sentence in this retrospective.** I wrote *"the drafts are not tracked
in git at all"*, quoting CONT-02's log, and then ran `git status` on the docs
repo as part of my own Stage 9b check and found them tracked and modified. Both
statements are true at different hours — `d4c4237` added them at 09:03 — and the
version that survives contact with the evidence is stronger than the one I
started with. **What caught it was running the gate on myself rather than only
writing about it**, which is the entire argument for Stage 9b having an owner
who is not the agent that did the work.

**Two files with their line endings rewritten**, by the same script that closed
the date trap. Caught by a guard that compared the parsed body before and after
the edit and refused rather than warned. The two CRLF files are the two CONT-01
wrote — a difference nobody could have predicted and nobody needed to, because
the guard was checking the thing that mattered rather than the thing that was
likely.

### Files touched by this retrospective

- `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
  — Stage 7 (publish-date trap, closed) and Stage 9b (fourth row, fourth
  command, the "two git commands cannot see content" section)
- `scripts/audit-draft-vs-live.mts` + `package.json` — `pnpm audit:drafts`, the
  command that makes the new rule enforceable
- `src/lib/inspire/text-card.ts` + its tests — the classifier that failed this run
