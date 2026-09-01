# COPY-01 — the empty-cluster line says what is true, not when it arrives

**Sprint 06 · `content` · 2 points · owner `managing-editor` · 02 September 2026**
**Status: completed.** Shipped to production and verified there. DoD not narrowed.

---

## The one line, if you read nothing else

Three documents and one shipped component all said the undatable
`akan datang tidak lama lagi` line had already been replaced. It had not. It was
live on **4 empty clusters across 3 of 15 pillars** on 02 September 2026, after
DES-08 — and it was not merely undatable, it was **false on its own page**.

It is now replaced, on production, and there is a script that fails if it comes back.

---

## What the DoD asked for, and what happened to each clause

| DoD clause | Outcome |
|---|---|
| The empty-CLUSTER copy is **decided** | Decided. `Belum ada artikel di sini. Halaman ini ada N artikel lain.` |
| …and either **shipped** or explicitly kept with a reason | **Shipped.** PR [#58](https://github.com/ianngkb/hellokahwin/pull/58) merged to `master` as `eaad6d3`; live and verified on `hellokahwin.com` |
| Note the **state distinction** — §7.2 C's copy is for a FULLY EMPTY CATEGORY | Held. §7.2 C's copy was **not** used. See [The trap](#the-trap-and-why-copying-72-c-across-would-have-been-wrong) |
| Correct **DES-03 §7.2 C**, which asserts a replacement that never happened | Corrected at source, plus the two places that repeated the claim |

---

## 1. The measurement, before anything was written

`bash` census of all 15 pillar pages fetched from `https://hellokahwin.com`,
02 September 2026, all HTTP 200. Full output:
[`sep-02-2026-copy-01-EVIDENCE/01-gate-production-BEFORE.txt`](sep-02-2026-copy-01-EVIDENCE/01-gate-production-BEFORE.txt).

```
  nikah-undang-undang      — 4 clusters, 1 empty     "Artikel untuk nikah siri akan datang tidak lama lagi."
  pelamin-kad-cenderahati  — 4 clusters, 1 empty     "Artikel untuk khemah kenduri akan datang tidak lama lagi."
  sebelum-nikah            — 5 clusters, 2 empty     "Artikel untuk merisik akan datang tidak lama lagi."
                                                     "Artikel untuk mandi bunga akan datang tidak lama lagi."
  TOTAL: 4 empty clusters across 3 of 15 pillars
```

The brief's premise is confirmed exactly. Nothing about it was narrowed.

---

## 2. The finding the brief did not have: the line was FALSE, not just undatable

The item was written around one defect — a promise nobody can date. There were two.

On `/artikel/sebelum-nikah`, in cluster order, on 02 September 2026:

| # | Cluster heading | Articles |
|---|---|---|
| 1 | Jodoh, taaruf & istikharah jodoh | 2 |
| 2 | **Cincin tunang, nikah & merisik** | 1 — *"Cincin Tunang, Nikah dan **Merisik**: Tiga Cincin, Siapa Beri yang Mana"* |
| 3 | Majlis pertunangan & doa | 1 |
| 4 | **Merisik & meminang** | 0 — *"Artikel untuk **merisik** akan datang tidak lama lagi."* |
| 5 | Adat perkahwinan Melayu & mandi bunga | 0 |

**We had merisik. Two headings up. The sentence said we did not.**

The cause is a scoping error, and it generalises: the shipped line made a claim
about a **topic** (`cluster.entityPhrase`, an SEO anchor phrase the reader never
otherwise sees) while the state it renders is about a **section**. A topic-scoped
sentence is contradicted by the page around it. A section-scoped one cannot be.

This is the **third** instance of the same shape in this company's record —
DES-06's offline message promising cached reading the build could not do,
DES-07 §12's one-sentence-for-two-situations on a filter, and this. Every one was
caught by reading the live page, never by reading the spec.

---

## 3. The decision

Both questions DES-07 §11.3 addressed to this seat on 28 August 2026 are now
answered and closed in that document.

### 3.1 The heading stays

An empty cluster keeps rendering its `h2`. The pillar page is the map of the
pillar; hiding a commissioned cluster makes the pillar look complete when it is
not, and the commitment is information the reader is entitled to. UI-05's
ordering rule — non-empty clusters sort first, empty ones sink, stable sort — is
what makes keeping it safe: an empty heading can never displace a real article.

Ratified as already built. No code change.

### 3.2 The line is replaced, not kept

| | |
|---|---|
| **Was** | `Artikel untuk {entityPhrase} akan datang tidak lama lagi.` |
| **Now** | `Belum ada artikel di sini. Halaman ini ada N artikel lain.` |
| **At N = 0** | `Belum ada artikel di sini.` |

Three sub-decisions, each with a reason a reviewer can check:

**No link, no button.** DES-07's K4 draft handed the reader a link to the
category. On a pillar page the category page **is** this page. A self-link is not
a way out, it costs an internal link to nowhere, and a `.s-btn` would break the
one-row rhythm UI-05 P2/P3 deliberately established (13px/13px, closed by a
`--hair` border). The sentence is the way out: it tells the reader the page is
not empty even though this section is.

**`Halaman ini`, not the category name.** DES-07 K4 wrote *"Nikah &
Undang-undang ada 4 artikel lain"* because K4 was drawn as a section inside a
catalogue you might leave. Here the h1 naming the pillar is on screen, so naming
it again is decoration. Style guide §2.1's delete-test, applied to a noun.

**The count is suppressed at zero, never printed as zero.**
`Halaman ini ada 0 artikel lain` is worse than saying nothing. See
[§6, near-miss 2](#6-what-we-nearly-shipped-and-what-caught-it).

### 3.3 The trap, and why copying §7.2 C across would have been wrong

DES-03 §7.2 C's copy is `Kategori ini masih kosong.` plus a way out to **another
category**. That is DES-07 **K3**, the *fully empty category* — nothing published
under it at all.

An empty cluster inside a populated pillar is **K4**. Dropping K3 in here would
have put *"Kategori ini masih kosong"* on `/artikel/nikah-undang-undang`, which
holds **six published articles**, and pointed the reader away from the page that
has what they came for. That is DES-07 §12's defect — one sentence, two
situations, untrue in the second — re-committed in new words, and it would have
passed every check the company owns because the string came from an approved
spec.

### 3.4 `/humanizer`

Run after the revision, per the owner-level rule. **Zero findings.** No em dash
(style guide §12.3), no `anda` that survives the delete-test, no `kami`, no
`kita`, no heading restated in its own body (DES-07 §3.10's finding on K3's first
draft), and nothing about the future. For the record, the line it replaces failed
two humanizer patterns outright: §21 (a speculative claim about the future stated
as fact) and §25 (a generic positive ending in place of the last useful fact).

---

## 4. What shipped, and where

**Site code → `master`.** PR [#58](https://github.com/ianngkb/hellokahwin/pull/58),
branch `ianng89/copy01-empty-cluster`, commit `60a2753`, merged as `eaad6d3`.

| File | Change |
|---|---|
| `src/components/inspire/pillar-body.tsx` | The copy, the zero guard (`emptyClusterCopy`), and both decisions recorded where the code is |
| `src/components/inspire/__tests__/pillar-body.test.tsx` | 6 new tests, including the live failing case reduced to a fixture |
| `src/design-system/components/feedback.tsx` | The false claim removed from `EmptyCategoryState`'s doc comment, and a `⚠ NOT the empty-cluster state` warning added |

**Documents → `feat/command-centre-dashboard`** (this line).

| File | Change |
|---|---|
| `docs/design/des-03-spesifikasi.html` | §7.2 C corrected at source: the false assertion removed, a dated correction box added naming the 4 live clusters, and the K3/K4 distinction stated so the next reader cannot repeat it. The `K-e` caption's *"replacing the shipped promise nobody can date"* also corrected |
| `docs/design/des-07-set-keadaan.html` | §11.3's `managing-editor` handover row closed with both decisions, in the same form the `creative-director` row was closed |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` | New **§13a State copy**, the dateless promise added to §12.3's banned list, and reviewer check **S18** |
| `scripts/measure/check-empty-copy.mjs` | The gate. New |

**Persona → `~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Editorial/managing-editor.md`**,
not this worktree, because `.claude/agents/` is gitignored by design.

---

## 5. Verification — run against the failing case, in both directions

**Named failing case:** `/artikel/sebelum-nikah`, cluster "Merisik & meminang",
rendering *"Artikel untuk merisik akan datang tidak lama lagi."* two headings
below a live merisik article.

| # | Check | Command | Result |
|---|---|---|---|
| 1 | New tests vs. the **shipped** component | `pnpm vitest run …/pillar-body.test.tsx` with `pillar-body.tsx` restored from `origin/master` | **6 failed / 10 passed** — the tests catch the real defect |
| 2 | New tests vs. **this** component | same | **16 passed** |
| 3 | Full suite | `pnpm test` | `Test Files 36 passed`, `Tests 514 passed`, exit **0** |
| 4 | Types | `pnpm typecheck` | exit **0** |
| 5 | Build | `pnpm build` with `DATABASE_URL` injected | exit **0** |
| 6 | Gate self-test | `node scripts/measure/check-empty-copy.mjs --selftest` | **5/5 pass**, exit **0** |
| 7 | Gate vs. **pre-fix production** | `--dir <captured 02 Sep>` | exit **1**, **7 violations** on the 3 pillars |
| 8 | Gate vs. **Vercel preview** | `--dir <preview capture>` | exit **0**, 0 violations |
| 9 | Gate vs. **live production, after deploy** | `node scripts/measure/check-empty-copy.mjs` (fetches `hellokahwin.com`) | exit **0**, **4 empty clusters checked, 0 violations** |

Row 9 is the one that counts. Everything before it is an internal signal, and
this seat has already learned once (01 Sept, the image takedown) that internal
signals can all be green while the public URL says otherwise.

**Live, on `hellokahwin.com`, after the deploy:**

```
  nikah-undang-undang      — 4 clusters, 1 empty, 6 distinct articles
     4. [EMPTY ] Soal-jawab hukum nikah
             row: "Belum ada artikel di sini. Halaman ini ada 6 artikel lain."
  pelamin-kad-cenderahati  — 4 clusters, 1 empty, 7 distinct articles
     4. [EMPTY ] Dekorasi, khemah & tema majlis
             row: "Belum ada artikel di sini. Halaman ini ada 7 artikel lain."
  sebelum-nikah            — 5 clusters, 2 empty, 4 distinct articles
     4. [EMPTY ] Merisik & meminang
             row: "Belum ada artikel di sini. Halaman ini ada 4 artikel lain."
     5. [EMPTY ] Adat perkahwinan Melayu & mandi bunga
             row: "Belum ada artikel di sini. Halaman ini ada 4 artikel lain."

  4 empty clusters checked across 15 pillars
  VIOLATIONS: 0
  PASS
```

Note that 6, 7 and 4 are the counts the **component** printed, and the gate
derived those same numbers **independently** from the page's own links. The
count in the copy is right, not just present.

Full output: [`02-gate-preview-AFTER.txt`](sep-02-2026-copy-01-EVIDENCE/02-gate-preview-AFTER.txt)
and [`03-gate-production-AFTER.txt`](sep-02-2026-copy-01-EVIDENCE/03-gate-production-AFTER.txt).

### The one check that did not pass, stated rather than hidden

`pnpm lint` exits **1**. It is **pre-existing on `origin/master`**: 0 eslint
errors and 156 warnings, plus `prettier --check` flagging 6 files —
`docs/design/card-thumbnail-image-rules.md`, `scripts/measure-above-fold-bytes.mjs`,
`src/app/(public)/brand/brand.css`, `src/app/(public)/brand/page.tsx`,
`src/components/brand/brand-assets.ts`,
`src/lib/storage/__tests__/midsize-cover.test.ts`. **None of the six is touched by
this item** — `git status` showed exactly three modified files, all of which were
run through `prettier --write`. Not fixed here because it is somebody else's diff
and cleaning it would hide it. Worth an item.

---

## 6. What we nearly shipped, and what caught it

**1. The wrong state.** The obvious move, and the one DES-03 §7.2 C invites in
writing, was to reuse `EmptyCategoryState`. Caught by the brief naming the trap,
and then confirmed by running the census **before** writing a line: `nikah-undang-undang`
holds six published articles, so *"Kategori ini masih kosong"* would have been a
new false sentence replacing an old one.

**2. `Halaman ini ada 0 artikel lain`.** The first draft printed the count
unconditionally. Caught by reading what `isEmpty` actually tests —
`clusters.length === 0 && unclustered.length === 0`, which only catches a pillar
with **no clusters at all**. A pillar whose clusters are all empty reaches this
branch with `totalArticles === 0`. No such pillar exists today; one will the day
a pillar is commissioned before it is written. Guarded and tested.

**3. A gate that counted the wrong thing.** The first `check-empty-copy.mjs`
derived the expected count from every `/artikel/x/y` link on the page. Any future
related or popular rail would have made it fail on correct copy. Caught by going
and reading what `totalArticles` *is* in `pillar-queries.ts` — `seenAnywhere.size`,
a Set built from cluster rows only — instead of assuming. Now counted from the
cluster sections only, and the reason is in the script.

All three were caught by looking at something, not by reasoning about it.

---

## 7. Not in scope, enumerated rather than dropped

`akan datang tidak lama lagi` survives on **four other surfaces**, none of which
is an empty cluster and none of which COPY-01's DoD covers:

| File:line | Surface | State |
|---|---|---|
| `src/app/(public)/artikel/page.tsx:495` | `/artikel` catalogue root, empty | not a cluster |
| `src/app/(public)/artikel/tag/[slug]/page.tsx:310` | empty tag page | not a cluster |
| `src/app/(public)/artikel/author/[slug]/page.tsx:278` | empty author page | not a cluster |
| `src/app/(public)/page.tsx:499` | homepage feed, empty (`"Kandungan akan datang tidak lama lagi — jumpa lagi!"`) | not a cluster; also carries an em dash and an inspirational close, both banned by style guide §12.3 and §11.4 |

Each is a different state with a different way out, and §13a.3 now says so.
Rewriting them from here would be widening the DoD, and doing it silently would
be worse. **Recommended as one follow-up item**, `COPY-02`, scoped to the four
above plus an extension of `check-empty-copy.mjs` to cover them. The homepage one
is the sharpest: it is on the site's most-visited page and breaks three separate
style rules in eleven words.

None of them can trip the gate shipped here, which reads pillar pages only.

---

## Undo

```bash
# Site code — one commit, no data, no migration, no external write.
git -C <site worktree> revert eaad6d3 -m 1   # or: git revert 60a2753
git push origin master                        # Vercel redeploys from master
```

Documents: `git revert` the docs-line commit on `feat/command-centre-dashboard`.
Persona: the two appended sections at the end of
`…/hellokahwin/Editorial/managing-editor.md`; delete from
`## AN UNANSWERED ESCALATION` to end of file.

---

## Reviewer

**Claude.** An adversarial pass by this seat, plus the six render tests and the
gate above. **`codex-reviewer` was not dispatched**, and review was not routed
through Codex, `/autopilot`'s default reviewer, or any OpenAI-backed path, per
the owner directive of 02 September 2026. Nothing invoked here would have reached
for it silently; the tests and the gate are both run directly.

---

## Retrospective

### 1. What did we learn that is not already written down?

**A document can assert that another document's change already shipped, and
nothing checks it.** DES-03 §7.2 C wrote *"which already replaced production's
undatable 'akan datang tidak lama lagi' line"*. That sentence was then cited as
authority one layer down, in production code: `feedback.tsx` carried it verbatim
in `EmptyCategoryState`'s doc comment. Nobody in the chain was careless — each
link was quoting the one above it. The claim was simply never checked against a
URL.

**The failure mode of an escalation is not being answered wrongly. It is never
being answered, and then being assumed answered.** DES-07 §11.3 put two questions
to this seat on 28 August. Silence. Five days later a different document recorded
the outcome as settled, and the way it assumed it had gone was the wrong way.
Silence from an owning seat does not read as *undecided* downstream. It reads as
*decided, and it went the obvious way.*

**And this is the third item in a row where a decision rode inside something and
did not execute** — decision 167 inside RIGHTS-02, decision 83's Setiawangsa
control inside SEO-04, and now DES-07 §11.3's two copy questions inside a
handover table. This is the first where the un-executed decision was then
**written up as done**, which is strictly worse: the other two were invisible,
this one was actively misleading.

### 2. Which document must change, and who owns the edit?

Named, owned, and **all of them made in this sitting**:

| File | Owner | Edit | Done |
|---|---|---|---|
| `scripts/measure/check-empty-copy.mjs` | managing-editor | **The gate.** Fetches the public pillar pages, enumerates every cluster, exits 1 on any empty cluster carrying anything but the approved row | ✅ new file, self-test 5/5 |
| `docs/plans/…/aug-23-2026-style-guide.md` | managing-editor | New **§13a State copy** (6 rules), the dateless promise added to §12.3, reviewer check **S18** | ✅ |
| `docs/design/des-03-spesifikasi.html` | managing-editor (correcting creative-director's document, evidence-first) | §7.2 C's false assertion removed, dated correction box, K3/K4 distinction stated | ✅ |
| `docs/design/des-07-set-keadaan.html` | managing-editor | §11.3 handover row closed with both decisions | ✅ |
| `src/design-system/components/feedback.tsx` | managing-editor | The repeated false claim corrected; `⚠ NOT the empty-cluster state` | ✅ shipped in #58 |
| `…/Editorial/managing-editor.md` | managing-editor | Two new sections: the unanswered-escalation rule, and copy-is-scoped-to-the-state | ✅ |

**Prose alone would not have caught this**, which is why the first row is a
script and not a paragraph. §13a.6 and S18 both point at it rather than
describing what it checks.

### 3. What did we do twice?

**Shipped a sentence that says something about the future the company cannot
date — three times.** DES-06's offline message, DES-07 §3.4's rejection of this
exact sentence, and this item, which found the same sentence still live twelve
days after DES-07 rejected it. Rejecting copy in a design document does not
remove it from production. **Fixed structurally:** the phrase is now on §12.3's
banned list, which reviewer check S13 already searches for, and the gate fails on
it.

**Reasoned about a live page instead of fetching it — twice, in two sittings.**
On 01 September this seat learned it on an image takedown: five internal signals
green, the public URL still serving the file. Today, three documents said a line
was gone while the line was being served. Same lesson, different surface.
§13a.6 now states it for copy: *a state string is not recorded as shipped until a
script has fetched the public URL and seen it.*

### 4. What did we nearly ship, and what caught it?

All three near-misses are in [§6](#6-what-we-nearly-shipped-and-what-caught-it)
with their mechanisms. The one worth carrying forward:

**The wrong state would have passed every check this company owns**, because the
string came from an approved specification and the specification told us to use
it. A spec citation is not a correctness argument. The mechanism that caught it
was the brief naming the trap in advance, and the census being run **before** a
line was written rather than after.

---

## Evidence

`docs/work-done/sep-02-2026-session-01/sep-02-2026-copy-01-EVIDENCE/`

| File | What it is |
|---|---|
| `01-gate-production-BEFORE.txt` | The gate over production as captured 02 Sep 2026, pre-fix. Exit 1, 7 violations |
| `02-gate-preview-AFTER.txt` | The gate over the Vercel preview of #58. Exit 0 |
| `03-gate-production-AFTER.txt` | The gate over live `hellokahwin.com` after the merge. Exit 0 |
| `04-tests-against-shipped-component.txt` | The 6 new tests failing against `origin/master`'s component |
| `05-tests-against-fix.txt` | The same tests passing, 16/16 |
| `before-nikah-undang-undang.html` | The served HTML carrying the old line |
| `before-pelamin-kad-cenderahati.html` | " |
| `before-sebelum-nikah.html` | " — this is the page where the line was false |

Reproduce the live check with no credentials:

```bash
node scripts/measure/check-empty-copy.mjs            # exit 0 today
node scripts/measure/check-empty-copy.mjs --selftest # 5/5
```
