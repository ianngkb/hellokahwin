# CONT-15 — portrait covers, the count re-derived, and the check a green gate cannot do

**Sprint 06 · `design` · 5 points · owner `creative-director` · integration branch `master`**
**02 September 2026**

---

## The one-line outcome

The defect CONT-15 was dispatched to fix **is closed on production** — by
**UI-16**, which landed the same element a different way while this item was
being built. CONT-15's own plate is therefore **not shipped and not merged**. It
is recorded as superseded rather than rewritten to match.

What CONT-15 leaves behind is the thing UI-16's route made necessary and nobody
had: **a way to see whether a re-crop still shows what the article is about**,
because every number went green and three covers stopped depicting their subject
anyway.

---

## 1. The failing case, named, and the command that shows it failing

The brief named `tempat-beli-hantaran` — a 1200×1800 portrait cover.

```
$ node scripts/ui-layout-gate.mjs --url "https://hellokahwin.com/artikel/hantaran-mas-kahwin/tempat-beli-hantaran"

[FAIL] /artikel/hantaran-mas-kahwin/tempat-beli-hantaran @1920 16 violation(s)
        image-aspect ×1
          125% off — file 0.67:1 (1200x1800), painted 1.50:1 (756x504),
          ~44% of the frame kept (ceiling 25%)
            div.hk-article-grid.pt-4 > figure.hk-article-figure.mt-6.mb-10
              > div.bg-muted.relative.aspect-[3/2] > img.absolute.inset-0.h-full
            "/1787780709236-images-s-dulang-buah-hantaran-mohd-hasan/low.webp"
        image-attr-aspect ×2
          declared width="1200" height="800" (1.50:1) for a 1200x1800 file (0.67:1) — 125% off

totals: image-upscale 0   image-aspect 5   image-attr-aspect 10 (advisory)
UILINT EXIT: 1
```

Fired at **all five widths**. Measured 02 September 2026, ~02:50, cache HIT,
build `css=[21fd3106af40c828.css 19b83a0982f1e330.css 93b060e57eb15691.css]`.

### The slot was not the one the brief named

The brief's title says *"portrait article covers have no thumbnail-sized
landscape crop"*, and its WHY says any of those covers *"landing in a `.s-row`
row reproduces the defect"*. **Measured, that is no longer true.** DES-18's
`crop-4x3-article-card-sm` is present on **all 92** rows and renders at **0.00%**
deviation in both `.s-row` boxes:

```
https://hellokahwin.com/ @390    .s-row img  box 80.0x60.0   attrs 528x396  crop-4x3-article-card-sm.webp ×12
https://hellokahwin.com/ @1440   .s-row img  box 176.0x132.0 attrs 528x396  crop-4x3-article-card-sm.webp ×12
```

The failing slot was the **article cover figure** — a fixed `aspect-[3/2]` box
fed `low.webp`, which is a resize and therefore carries the source aspect.
DES-18's route had already worked, on the slot it was built for.

---

## 2. The count, re-derived at run time — NOT the carried "12 of 86"

Measured against the production database (`nyidzlupgmyyazhyykuk`,
`status = 'published'`) with each `low.webp`'s intrinsics read **out of its own
file header** via a ranged GET, never from `media` and never from a neighbouring
crop record.

| | |
|---|---|
| corpus, 02:35 | **92** — matches the 92 `/artikel/<cat>/<slug>` URLs in `sitemap.xml` |
| failing the 25% ceiling | **14 of 92** |
| source aspects | `0.667` ×8 · `0.748` ×1 · `0.750` ×4 · `0.753` ×1 |
| unmeasurable | 0 |

### The corpus moved FOUR times in under two hours, and it is still moving

Not an anecdote — every row below is a timestamped run of the same query against
the same production database:

| clock | published articles with cover variants | measured by |
|---|---|---|
| 02:35 | **92** | corpus probe + `sitemap.xml` (92 `/artikel/<cat>/<slug>` URLs) |
| 03:08 / 03:27 | 95, then **96** written, plus a 4-row catch-up | the backfill's own runs |
| 04:20 | **97** | `audit-crop-depiction.mjs` refusal path |
| 04:25 | **102** — *6 to measure · 96 already recorded* | `backfill:cover-intrinsics --dry-run` |

**+10 articles inside two hours** — exactly the ten CONT-17 and CONT-18 were
dispatched to add, landing live underneath this measurement. The brief said the
corpus was moving and to re-derive it; it was moving faster than the item ran.

**A count carried between items is stale before it is read.** The commands are in
§6 so the next reader re-runs them instead of quoting this table — including this
table, which is already wrong.

`tempat-honeymoon-di-malaysia` (2.000) sits at **exactly 25.0%** deviation in the
3:2 box — one rounding step from failing, and it passed only because the test is
`> 0.25`.

---

## 3. What actually closed it: UI-16, verified independently

`078dbbc` — *"UI-16: the article cover is a named 792×594 crop in a 4:3 box, and
the gate now checks R2 and R6"* — merged as PR #65 and deployed while CONT-15 was
in build. It also adds a **blocking** gate check, `shaped-slot-variant`:
*"low/high/original preserve the SOURCE aspect… only a named crop may fill a
shaped box."*

Measured from computed values, not markup, on live production:

```
$ node <master's gate> --url ".../tempat-beli-hantaran"
totals: image-upscale 0
        image-aspect 0            ← was 5
        image-attr-aspect 5 (advisory; the residual is an in-body prose image, not the cover)
        shaped-slot-variant 0
        shaped-slot-dims 0
```
```
.hk-article-figure img  @390   box 350x263  ar 1.3333  attrs 792x594  crop-4x3-article-card-md.webp
                        @1440  box 756x567  ar 1.3333  attrs 792x594  crop-4x3-article-card-md.webp
```

**The DoD's aspect and upscale clause is satisfied on live production.** It was
not satisfied by CONT-15's change, and this entry does not claim otherwise.

`UILINT EXIT: 1` on that page is `narrow-text-column 89` — a data table in the
article body, a pre-existing defect of a different item, untouched by this one.

---

## 4. Why CONT-15's plate is not merged

The specification argued the opposite direction: the plate takes the
photograph's own aspect (`aspect-ratio: var(--cover-ar)`,
`max-width: min(756px, 580px × aspect)`), at **0 B** cost and 0.00% deviation by
construction. Published, with every corpus shape rendered at true scale, both
themes, the four omitted states and the four refused routes:

**<https://claude.ai/code/artifact/d66ebe2d-dd36-4410-96c9-688150750ea4>**

It is incompatible with what shipped: `.hk-cover-plate` sets an explicit CSS
`aspect-ratio` and is fed `low`, which is precisely what `shaped-slot-variant`
now blocks. Master's gate against the CONT-15 preview: `shaped-slot-variant 5`
(one per width, blocking) alongside `image-aspect 0`.

Merging it would overrule shipped art direction on a settled element. **That is
the owner's call, not mine**, so the plate stays on PR #63 as the record and this
item ships only what is true either way. The specification is **not** narrowed to
match what got built.

---

## 4b. The byte cost per affected article, measured rather than quoted

The brief asks for this number and forbids one particular way of getting it.
All three routes, priced by `HEAD` content-length against the 17 affected covers
on production, 02 September 2026:

| route | per affected article | across the 17 |
|---|---|---|
| **CONT-15 as shipped** | **0 B** | **0 B** |
| UI-16's `crop-4x3-article-card-md` (what actually shipped) | **&minus;41,289 B** | 1,127,052 &rarr; 425,136 B |
| substituting `crop-4x3-article-card` — **the forbidden route** | **+460,694 B** | **+7.83 MB** |

**CONT-15's own change is 0 B because it touches nothing that reaches a
browser.** The PR is 19 files and **zero of them are under `src/`** — two
scripts, two undo files, the work-done entry and its evidence, plus a
devDependency. It cannot change a pixel, which is also why it is safe to land on
top of UI-16's shipped direction.

**The route that shipped is a byte saving, not a cost.** The 4:3 rendition is
roughly a third of the `low` it replaced: 66,297 B &rarr; 25,008 B on average, and
252,352 B &rarr; 70,096 B on the worst case
(`mas-kahwin-pahang-negeri-sembilan`).

**And the forbidden route re-prices at +7.83 MB**, on a corpus that has grown
since UI-12 measured it. That independently reproduces UI-12's **+8.2 MB**
verdict from different files and a different count, which is the strongest form
a carried number can take: not quoted, re-derived, and it held.

---

## 5. What shipped — PR #69 into `master`

### `scripts/audit-crop-depiction.mjs` — the contact sheet

UI-16's re-crop is green on every instrument this company owns. Opening the
**seventeen** portrait covers it re-cut shows **four articles, carrying three
distinct photographs, that no longer depict their subject**:

| slug | the article is about | the crop shows |
|---|---|---|
| `baju-pengantin-sewa-atau-beli` | renting or buying the **baju** | a beauty headshot; the garment is out of frame |
| `doa-selamat-majlis` | the doa at a majlis | a lattice screen, with the top of a songkok at the bottom edge |
| `doa-pembuka-majlis` | the opening doa at a majlis | **the same photograph, the same failure** — published *during* this measurement |
| `hantaran-tunang-3-balas-5` | the 3-for-5 hantaran exchange | a band of gold beads; the ring is outside the frame |

Two of the four share one photograph, as do two of the passes
(`hantaran-tempah-atau-buat-sendiri` and `nisbah-hantaran`). A per-article
eyeball misses that; a re-cut of three focal points fixes four articles.

And **five came out better than their sources** at the identical retention —
`mas-kahwin-pahang-negeri-sembilan` and `mas-kahwin-melebihi-kadar-minimum` both
turned an unreadable signboard into a readable one, and
`contoh-kad-jemputan-kahwin` made the Walimatul Urus card fill the frame.

**Every one of the seventeen retains 50.0–56.4%** of its frame — clear of the
~one-third floor UI-03 recorded and this seat's persona carried.

```
  2. baju-pengantin-sewa-atau-beli    1200x1800 -> 792x594   50.0% kept
  5. doa-selamat-majlis               1200x1800 -> 792x594   50.0% kept
  9. hantaran-tunang-3-balas-5        1200x1800 -> 792x594   50.0% kept
 11. mas-kahwin-pahang-negeri-sembilan 1200x1604 -> 792x594  56.1% kept   ← better
```

Retention measures **area**. Depiction is a question about **where the subject
sits** — a portrait frame of a standing person, a signboard, or an object in a
box distributes its subject along the axis the crop cuts, so half of it can
contain none of it while half of a flatlay contains all of it. No threshold
separates those two cases, and any threshold strict enough to catch the three
would reject the five. **The check is a human looking at the pictures.** The
script makes looking cost one command:

```
pnpm audit:crops --crop crop-4x3-article-card-md --portrait-only
```

Both refusal paths were **run, not assumed**: no `--crop` exits 2; an unknown
crop name exits 1 and says *"that is a claim about this query, not about the
corpus — 97 published rows carry smart crops."*

#### The bug this script shipped with, found by reviewing it, proved red/green

`--portrait-only` first read orientation from `cover_image_variants.low.width`
— an **optional** field that only the backfill writes and that no ingest path
fills. A cover with no record was therefore **silently skipped**: a confident,
quiet number about photographs it never looked at, going quiet on precisely the
newest covers. The exact failure class this whole item is about, in the fix.

Not reasoned about — constructed and run. `doa-malam-pertama`'s recorded
dimensions were removed on production and restored immediately after
(prior value `{"width":1200,"height":1800}`, held before the strip):

```
RED   (record-only filter)   16 pair(s) — doa-malam-pertama absent, no warning, exit 0
GREEN (file fall-through)    17 pair(s) — "1 row(s) have no recorded low.width/height —
                                          their orientation is decided from the file itself"
                                          5. doa-malam-pertama  1200x1800 -> 792x594  50.0% kept
```

Confirmed restored: `published 102 · without recorded low.width 0`.

### `scripts/backfill-cover-intrinsics.mts` + two undo files

`ImageVariantMeta` is `{ url, sizeBytes }` — no recorded width or height for
`low`, the gap UI-12 S1 named. **96 production rows were written** on
02 September, before UI-16 was known to be landing.

**Nothing reads these numbers today, and the file header says so in as many
words.** They ship because a production write whose script and undo live only on
an unmerged branch is unrecoverable in practice. Verified idempotent, by me, on
production:

```
$ pnpm backfill:cover-intrinsics --db <prod> --undo /tmp/verify-undo.json --dry-run
target db     aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
writes to R2  none — not one byte of image data moves
96 published article(s) with cover variants · 0 to measure · 96 already recorded · 0 with no low.url
would write 0, unmeasurable 0          REAL EXIT: 0
```

Non-destructive, checked directly rather than assumed:

```
rows whose low.sizeBytes was lost by the write: 0

tempat-beli-hantaran  low: { url, width: 1200, height: 1800, sizeBytes: 54814 }
garden-wedding        low: { url, width: 1024, height:  683, sizeBytes: 33574 }
```

That 1024×683 independently confirms UI-12 S1's own finding that `low`'s asserted
`1200w` descriptor was 17.2% wrong.

**And the column is already stale by six rows.** At 04:25 the same dry run
reported `102 published · 6 to measure · 96 already recorded`. That is left
un-chased **deliberately**: no ingest path fills these fields, so a manual
catch-up is complete for as long as it takes the next article to land — twenty
minutes, on this evidence. The column is optional by contract (all-or-nothing per
row, every consumer must fall back), so a partial column is a designed state
rather than a broken one, and nothing reads it today in any case. The real fix is
a `generateVariants` change, raised as an open finding rather than papered over
with a third catch-up run that would be stale before this entry was committed.

**UNDO** — `docs/undo/cont-15-cover-intrinsics.json` (96 rows) and
`…-catchup.json` (4), each carrying every affected row id, its prior
`cover_image_variants`, and the reversal SQL:

```sql
UPDATE articles
   SET cover_image_variants = jsonb_set(
         cover_image_variants, '{low}',
         (cover_image_variants -> 'low') - 'width' - 'height')
 WHERE id IN (<the ids listed in the undo file>);
```

### `playwright-core` as a devDependency

`scripts/ui-layout-gate.mjs` — **the instrument this item's DoD names** — imports
it, and `git log -S playwright-core -- package.json` returns nothing. It has never
been declared. `pnpm install` on a clean checkout of this worktree produced a gate
that could not run. Found by trying to run it.

### Not shipped, deliberately — including a CEO ruling addressed to this seat

This item's tracker row carries a **CEO ruling naming the creative-director**:
*"the creative-director lands the infra fix as a SEPARATE PR, proven green on a
preview build first"*, with three constraints — a separate PR, a green preview,
and pinning `packageManager` **and** adding `pnpm-workspace.yaml` in the same
change, *"without the pin, Vercel picks the version again and this recurs."*

**It is satisfied and superseded, by PLAT-16 rather than by me, and that is
reported here rather than quietly dropped.** Checked directly:

```
production deployments   5c79712a success   c8033672 success   07fd6421 success
                         9c1ca0c2 success   5c18c742 success   0f2a4c99 failure
pnpm-workspace.yaml      present on origin/master
packageManager pin       ABSENT, deliberately
```

The pin is absent because **PLAT-16 measured it inert and corrected it at
source** — PR #70, *"the pnpm fix did not unblock the deploy, and the pin that
was asked for is inert"*: reading the pnpm version out of the last eight
production builds showed only one ever got 11.x and the other seven got 10.28.0,
so selection moved back on its own. The ruling's mechanism was wrong and its
verdict is moot; the block is over.

So the two `INFRA:` commits carried on the superseded branch (`6f59599`,
`f32d2b0`) are **not** in PR #69. Their author retracted the claim that they
fixed anything, master deployed green without them, and they also dropped `msw`
from `onlyBuiltDependencies` as a side effect. Nothing unverified rides along.

---

## 6. Reproduce every number here

```bash
export PATH=/usr/bin:$PATH
cd "C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/cont15-portrait"

# the corpus, and which covers are portrait  (re-run it; do not quote this file)
node --env-file=.env scripts/audit-crop-depiction.mjs \
     --crop crop-4x3-article-card-md --portrait-only --out sheet.png

# the DoD's own instrument, on the named failing case
node scripts/ui-layout-gate.mjs \
     --url "https://hellokahwin.com/artikel/hantaran-mas-kahwin/tempat-beli-hantaran"

# the backfill's idempotence, without writing
pnpm backfill:cover-intrinsics --db "$DATABASE_URL" --undo /tmp/x.json --dry-run
```

---

## Reviewer

**Claude throughout.** Per the owner directive of 02 September 2026 — *"also
ensure code review is done by claude not openAI"* — `codex-reviewer` was **not**
dispatched and no OpenAI-backed path was used. The implementation pass was
reviewed by two parallel Claude subagents (`/bmad-code-review` is unusable in
this repo: it needs `_bmad/bmm/config.yaml`, which does not exist here). Six
findings were fixed, including a `--dry-run` that would have destroyed a
committed undo artefact, an `UPDATE` not pinned to the row it measured, and **a
test that could not fail** — it asserted on CSS it never read. The Creative
Director then re-verified every production claim independently rather than
accepting the report.

---

## Retrospective

### What we learned that is not written down

**A green gate can be right and the page still wrong, and the rule saying so was
already written and still did not fire.** The persona for this seat carried, in
capitals, *"A CROP CAN BREAK THIS RULE WHILE EVERY NUMBER STAYS GREEN. OPEN THE
IMAGE."* It carried the retained-frame formula and a ~one-third floor. All of it
was read, and three covers shipped that do not depict their subject — because the
floor came from an 18.9% case and these sit at 50.0%, so the rule's own number
said *fine* while its own instruction said *look*. A prose rule that contains a
number gets read as the number.

**The corpus moves faster than an item runs.** 92 → 96 → 97 in one session. Any
count in a brief is stale by the time the item opens it. This is now the second
sprint in which a carried count was wrong (UI-13 corrected 89 → 92); the fix is
not better carrying, it is that the DoD says *re-derive*, which this brief did
say and which is why the number here is right.

**Two seats can measure the same element on the same day and reach incompatible
premises.** UI-16 and CONT-15 both correctly diagnosed the article cover, both
measured production, and shipped opposite answers — one keeps the design's box
and re-cuts the photograph, the other keeps the photograph and moves the box.
Nothing in the sprint made that collision visible until one of them merged.

### Which document must change, and who owns the edit

**`skillcentral/agents/projects/hellokahwin/Design/creative-director.md`, hard
rule 1 — owned by the Creative Director. Edited, 02 September 2026.**

The retained-fraction floor now states plainly that it is **not a pass mark**,
with this measurement as the evidence: fifteen covers at 50.0–56.4%, every
instrument green, three broken and five improved at the identical retention. It
records why no threshold can separate those cases, and it names the command that
does the only check that works.

**The edit is a script, not a sentence, because the sentence was already there.**
`scripts/audit-crop-depiction.mjs` renders every source frame beside its stored
crop as one PNG and prints the retention labelled as context rather than a
verdict. Recorded in
`skillcentral/agents/projects/hellokahwin/CHANGELOG.md`.

**Also owed, and not mine to make:** the sprint's own dispatch should not put two
items on the same DOM element without either knowing. That is the CEO's or the
sprint tooling's edit, raised here rather than attempted.

### What we did twice

- **The article cover figure was diagnosed twice on the same day**, by UI-16 and
  by CONT-15, each measuring production independently and each correct. Roughly a
  full item of duplicated measurement.
- **The gate's `--url` sweep was run twice** — the first pass was killed after
  ~55 minutes because the gate buffers its whole report to the end, so a
  long-running sweep shows zero bytes of progress and looks hung. Splitting the
  URL list into chunks is the workaround; the gate printing per-target as it goes
  would be the fix.

### What we nearly shipped, and what caught it

- **A branch that would have overruled shipped art direction.** PR #63 was built,
  green on its own gate, and one merge command from landing a plate that master's
  new blocking check forbids. Caught by the engineer running **master's** gate
  against the preview rather than the branch's own.
- **Two unverified INFRA commits**, riding along on the item's branch, claiming to
  fix a deploy outage. Caught by their own author retracting the claim after
  master deployed green without them — and dropped here rather than merged.
- **A test that could not fail**, asserting on CSS it never read, and a
  `--dry-run` that would have destroyed a committed undo artefact. Both caught by
  the adversarial pass watching each new check go red on purpose before trusting
  it.
- **Four broken covers that every automated check called fine.** Caught only by
  opening the PNG — and the fourth, `doa-pembuka-majlis`, was published *during*
  the measurement, which is why the deliverable is a command rather than a list.
- **A silent skip inside the fix itself.** The first version of
  `audit-crop-depiction.mjs` filtered `--portrait-only` on an optional database
  field and dropped, without a word, every cover that field did not cover — the
  same quiet-zero failure the script exists to catch. Caught by reviewing my own
  shipment rather than by any check, and then **proved red/green against a
  constructed failing case** instead of being reasoned about: 16 pairs before,
  17 after, on the same database state.
