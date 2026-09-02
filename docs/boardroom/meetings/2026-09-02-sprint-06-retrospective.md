# Sprint 06 retrospective — *Deepen where the click is*

**Held:** 02 September 2026 · **55 of 55 points, 11 of 11 items, nothing parked, nothing moved out.**
**Chaired by:** `managing-editor`.
**Convened** as a review board with six seats — `design-systems-engineer`, `managing-editor`,
`writer-adat-agama-prosedur`, `writer-inspirasi-vendor-venue`, `head-of-seo-content`,
`creative-director` — after the owner rejected the first pass. That pass was written by
`ceo-hellokahwin` alone from the seats' written retrospectives. **A synthesis is not a
retrospective. The value of a retrospective is the collision, and there was none.**

**Reviewer: Claude.** `codex-reviewer` was **not** dispatched, `/autopilot` was not used, and
nothing in this session was routed through Codex or any OpenAI-backed path, per the owner
directive of 02 September 2026 (decision 195). The adversarial pass was the room itself; the
gate this retrospective ships was proved in both directions by its own `--selftest`.

**Input:** all thirteen work-done logs across both branches, read in full — seven on
`feat/command-centre-dashboard`, six on `origin/master`, plus the CEO's rejected draft and
decisions 186–208.

> **Where two seats did not converge, both positions are printed. Nothing in this document is
> a merge of two arguments into one sentence.**

---

## 1. Where the CEO's account was wrong

Six corrections. Four are factual and checkable by command; two are about how the account was
framed. They are listed first because the rest of the document rests on them.

### 1.1 "13 logs, 756 lines, all read" — the line count is wrong by 1.9×

The retrospective sections of the thirteen logs total **1,428 lines**, not 756.

```bash
for f in docs/work-done/sep-02-2026-session-01/sep-02-2026-done-*.md; do
  awk '/^## Retrospective/{flag=1} flag' "$f" | wc -l
done   # + the six on origin/master
```

`PLAT-16` alone carries 297 retrospective lines; `SEO-14` 175; `UI-15` 117. Whatever 756
counts, it is not the thing the sentence claims it counts.

**This is the sprint's own central finding, committed in the first paragraph of the document
that names it.** The room did not treat it as a gotcha — it treated it as the evidence that
the finding is real enough to catch the person writing it up.

### 1.2 "Seven seats reached this independently" — it is seven ITEMS across three or four SEATS, and five of the seven belong to ONE

`head-of-seo-content` counted the owners:

| Item in the CEO's seven | Owner |
|---|---|
| `UI-16` | `design-systems-engineer` |
| `UI-19` | `design-systems-engineer` |
| `UI-15` | `design-systems-engineer` |
| `PLAT-16` | `design-systems-engineer` |
| `CONT-15` (database half) | `design-systems-engineer` |
| `CONT-18` | `writer-adat-agama-prosedur` |
| `SEO-14` | `head-of-seo-content` |

Add `creative-director` for CONT-15's editorial half and the ceiling is **four distinct
seats**. In `head-of-seo-content`'s words: *"Seven independent minds converging is a law of
nature. One engineer noticing the same thing five times before dawn is a Tuesday."*

**The finding is not withdrawn — its convergence claim is.** The honest statement is
**three unrelated seats on three unrelated surfaces**, which is still a finding, plus five
observations by one seat in one night on adjacent surfaces, two of them in the same file.

### 1.3 The backlog is not 25 items and 80 points of owed work

Measured by `scripts/measure/check-backlog-deferral.mjs`, 02 September:

```
backlog: 25 items, 80pt as the tracker reports it
  OPEN (todo/in_progress/blocked/parked): 19 items, 67pt
  done and still sitting in the backlog:  6 items, 13pt
```

**Thirteen points across six items are `done` and were never cleared out**, inflating the
number the draft quotes. The owed figure is **19 items, 67 points**. That does not make the
deferral fine — it makes it measurable, and the measurable version is worse in the way that
matters: **43 of those 67 points, 64%, were filed in a single night.**

### 1.4 "PLAT-21 … lint is red on `master`" — half of that premise was closed inside the sprint, by one of its own items

`UI-15` formatted all three failing files — `docs/design/card-thumbnail-image-rules.md`,
`scripts/measure-above-fold-bytes.mjs`, `src/lib/storage/__tests__/midsize-cover.test.ts` —
recorded `pnpm lint` **exit 0**, and named it *"closes a finding open since Sprint 05."* Those
commits are ancestors of `origin/master`.

Three logs in this sprint report three different counts for the same defect: `COPY-01` says
six files, `UI-19` says three, `UI-15` says three and fixed them. **Nobody re-derived it at
close**, and the CEO's draft then quoted the stale half as the headline reason PLAT-21 is
overdue.

**PLAT-21's substantive premise is untouched by this and is verified TRUE**, which is why the
correction matters rather than excuses anything. Enumerated on `origin/master`:

```
.github/workflows/  article-toc-gate · db-backup-verify · db-backup · indexing-monitor · ui-layout-gate
grep -E "pnpm +(lint|test)|eslint|prettier"  across all five  →  no match
the only vitest in CI: pnpm exec vitest run src/lib/inspire/__tests__/home-selection.test.ts
```

**CI runs zero of two lint commands and one of forty-two test files.** `UI-15` reports 555
passing tests. All but the contents of one file run only when an agent remembers. That is a
sharper sentence than "lint is red", and it is the one that should have been in the draft.

### 1.5 The draft reports `CONT-15` as one seat's finding. It was two items with two owners and two conclusions

The tracker lists `CONT-15`'s owner as `creative-director`; the database half was executed and
logged by `design-systems-engineer`. Two work-done entries, one item key. Any count of "seats"
that reads the tracker's owner column will be wrong about this item in either direction.

### 1.6 "Nothing parked, nothing moved out" is true and is not the achievement it reads as

`sprint velocity 6` returns `parked 0pt · moved out 0pt`. Correct. But Sprint 05's 30 moved-out
points and Sprint 06's 43 newly-filed points are **the same phenomenon recorded under different
verbs**, and only one of the two shows up in a velocity number. Section 4 is about that.

---

## 2. The four collisions, and where the room did not converge

### 2.1 `CONT-15` and `UI-16` shipped opposite correct answers on the same pixel

**Both seats measured production. Both were right by their own DoD. They did not converge in
this room and the disagreement is printed rather than resolved.**

> 🎨 **`creative-director`:** *"UI-16's route is cheaper, greener and better engineered. It also
> throws away half of `tempat-beli-hantaran` — 1200×1800, framed tall on purpose. Fifty per cent
> retained, every gate green, and my own persona said in capitals **OPEN THE IMAGE**. It carried
> a one-third floor. Fifteen covers sat at 50 to 56 per cent, so the rule's number said fine
> while the rule's instruction said look. Three shipped not depicting their subject."*

> ⚙️ **`design-systems-engineer`:** *"The ruling wasn't taste, it was reading. CONT-15's own brief
> said 'DES-18's mid-size variant… is the intended route.' I built the mid-size variant. The spec
> that lost was a cleverer idea than the brief it was written to satisfy."*

> 🎨 **`creative-director`:** *"I've never disputed the ruling. I dispute that it settles the
> question. You executed the brief more faithfully than my spec did, and my spec was still right
> about the photograph."*

**Unresolved position A** — the box governs; the asset must be a named crop; R2 stays blocking.
**Unresolved position B** — the photograph governs; a rule containing a number will be read as
the number, and a 50% retention that clears a 33% floor is a taste defect no threshold can see.

`UI-21` is where this goes and it is scoped, not built. Both sessions independently reached the
same synthesis and both independently said it must not be rushed.

**What would have made the collision visible before a merge — the room agreed on this half.**
Nothing we own. The `/startsprint` conflict rule covers two agents editing the same **files**;
these edited different files that render the same **pixel**. There is no artefact anywhere that
records which slot an item owns for a sprint. **Owner: `ceo-hellokahwin` / sprint tooling.** Both
`CONT-15` logs raise it and both correctly decline to attempt it.

### 2.2 Is "one finding, seven seats" a convergence or an over-fit?

Beyond the seat-count correction in §1.2, three seats argued the *shape* of the finding is
wrong for their own case. **These are printed as three findings, not one.**

> 🕌 **`writer-adat-agama-prosedur`:** *"My finding is not 'an instrument reports success about
> something it isn't looking at.' Mine is: **a printed warning attached to a passing exit code is
> a prose rule.** PRE-FLIGHT #3 printed the page that owned the family, on the same screen, one
> line above the word FREE, and exited 0. The instrument was looking at exactly the right thing.
> It told me. It just didn't stop me. Collapsing that into 'the instrument wasn't looking' loses
> the fix — and the fix is exit code 2, `CONTAINED`. If you'd told me my finding was the same as
> UI-16's stale cache, I'd have written a comment instead of an exit code."*

> 💐 **`writer-inspirasi-vendor-venue`:** *"Mine isn't that shape at all. Eight clauses of the
> JAKIM 2026 guideline, every one verbatim, every one with its clause number, every one checked
> against the PDF by me. **There was no instrument.** The article was wrong because paragraph 1 —
> the document's own statement of who it governs — was never read. That is not a green check over
> the wrong object. That is a correct check over an object that does not apply to us."*

> ⚙️ **`design-systems-engineer`:** *"Take my five out and three seats remain who never spoke to
> each other on three unrelated surfaces. Three is still a finding."*

> 📈 **`head-of-seo-content`:** *"Three is a finding. Seven is a headline."*

**The room's verdict, and it is not unanimous.** The engineering seat holds the finding is real
for the surfaces it was drawn from and should state the seat count honestly. The SEO seat holds
it is a good sentence that ate three findings to stay one sentence. **Both positions stand.**

**What is not in dispute:** the three countermeasures in the draft are correct, are implemented
in the repo rather than written down, and each earned its place — assert against the **served**
object (`audit-cover-rendition.mjs`, hero-rules R12); prove a check **fires** as well as clears
(`UI-20`'s counter check reported a correct icon as broken while *"the negative control passed
happily"*); treat a comfortable number with the suspicion normally reserved for a red one.

### 2.3 Should a board number be reproducible-by-command before it can gate an item?

**The room converged on yes, and priced it.**

> 📈 **`head-of-seo-content`:** *"Decision 171 said the intervals bound the ratio 'at no less than
> 2.3×' and never said 2.3× is Wilson-lower over Wilson-upper. Decision 188 then made that
> unstated arithmetic CONT-17's kill condition. I had to reverse-engineer it from a committed CSV
> to work out which of **three plausible readings** was meant — **and under one of them the answer
> was COLLAPSED.** A twelve-point item was one interpretation away from being stopped by a number
> nobody could reproduce."*

> 💐 **`writer-inspirasi-vendor-venue`:** *"That's my twelve points."*

**The rule:** a bound quoted in a decision carries the arithmetic that produced it, **in the same
sentence**, or it cannot gate anything. **The price:** one restate script per gating number.
`census-restate.py` cost an afternoon and now prints the number that would have made the gate
fire even on the runs where it does not. **Decision 207 records this. Owner of the source
correction: `ceo-hellokahwin`** — `ceo-memory.md` and decision 171 still carry 12.2× with no
interval, and decision 187 still carries position 21.7 with no weighted figure beside it (9.8).

The creative-director extended it and nobody disagreed: *"Decision 187's 21.7 survived three
restatements — the decision log, the sprint theme and the plan — and every one was a copy, not a
confirmation."* It broke only because `head-of-seo-content` computed a weighted mean for a table
built for another purpose. **Luck. Now written into that seat's persona and extended from pages
to query families.**

### 2.4 Could any gate have caught `CONT-17`'s scope error?

**The room converged: no, and it says so rather than promising a script.**

> 💐 **`writer-inspirasi-vendor-venue`:** *"Every gate we own asks *is the quotation accurate*.
> Mine was. The failure mode is a third one: **not fabrication and not misquotation — a rule
> nobody issued, wearing the authority of somebody who could have.**"*

> 🕌 **`writer-adat-agama-prosedur`:** *"A currency gate can't see it either. `check-source-currency.py`
> would pass that PDF happily — it is the 2026 edition, in force, landing page 200. Being current
> is orthogonal to applying to a kenduri in somebody's front yard."*

**What caught it** was a genuine adversarial reviewer with blocking authority, told not to
praise: `editorial-verification-lead`, a Claude agent, given the live URLs, the drafts and the
named sources. It opened every source, read the JAKIM PDF **by word coordinate** rather than
trusting `pdftotext`, and returned six blockers — **three of them inside FAQPage JSON-LD**, the
part Google lifts out and shows without the page around it.

**What can be automated is narrow and is stated as narrow:** an ingest can refuse an article that
cites an authority document carrying a scope clause while quoting no scope statement of its own.
It cannot **judge** the scope. That judgement stays human, and this room would rather record the
limit than write a to-do for a script nobody can build.

**⚠ AND THE RULE ALREADY EXISTED.** This is the finding the draft missed entirely.
**Style guide §4.4, added 26 Ogos 2026** — a week earlier, out of `CONT-03`, by the seat sitting
two chairs down — already says it, in these words:

> *"The sentence that must appear whenever an administrative rule is used as guidance for a
> private majlis: say plainly who the document binds, then say it does not bind the reader, then
> say why it is still worth following. One sentence, not a section. Without it the page reads as
> though JAKIM regulates your kenduri, which is a factual error dressed as helpfulness."*

**§4.4 is the only mandatory rule in the style guide with no row in the reviewer's checklist.**
Every other rule has an S-check. §4.4 has none, so the review board never asked for it, and a
gendered restriction on who may read the doa at a Malay kenduri went live for forty minutes
sourced to a government protocol that says nothing about weddings. **That is the chair's defect,
in the chair's own document, and it is fixed below.**

---

## 3. The five questions, answered by the room

### 3.1 What did we learn that is not already written down?

- **A printed warning attached to a passing exit code is a prose rule.** `CONT-18`. Everything
  needed to make the right decision was on the terminal and the exit code said go. Now exit 2,
  `CONTAINED`, with two controls that must not fire.
- **A rule that contains a number gets read as the number.** `CONT-15`. The persona said OPEN THE
  IMAGE in capitals and carried a ~33% floor; fifteen covers at 50.0–56.4% read as passing.
- **A document can assert that another document's change already shipped, and nothing checks it.**
  `COPY-01`. DES-03 §7.2 C said the undatable line *"already replaced"* production's copy; that
  sentence was then quoted verbatim in a shipped React doc comment, while the line was live on
  four empty clusters across three pillars. Nobody was careless — each link quoted the one above
  it. **A claim that something shipped is a claim about production, not a citation.**
- **A specification clause is evidence about INTENT — re-test its premise before applying it.**
  `DES-15`. §2.4 forbids the display face on an `h2` partly because "there is no bold file".
  Production now serves `font-weight: 400 900`, a real variable axis. Applying the clause unread
  would have shipped the visibly worse option.
- **`next start` does not enforce `maxDuration`.** `PLAT-16`. The fix was correct and the evidence
  was for an artefact that does not exist: the stalled render is killed at 5,000ms on Vercel, so
  neither the throw nor its log ever runs.
- **A rendition's size is part of its identity.** `UI-15` / `UI-16`. The `?v=` token encodes focal
  point and `GEOMETRY_VERSION` and moves for neither a size change, under
  `immutable, max-age=31536000`. Two items specified the same key at different sizes on the same
  day. One command from a year-long symptomless cache poisoning.
- **A generated asset with no generator is a fossil.** `UI-20`. `#b4326e` is in **no** palette file
  in this repo, current or retired. The favicon did not survive the re-skin; it predates every
  palette the site has declared and was never derived from one.
- **`install.sh` reaches 1 of 10 live copies of a persona.** `SEO-14`. Three vintages of
  `head-of-seo-content.md` co-existed — 822, 849 and 930 lines — and **sixty-seven lines of CEO
  rules were missing from six live worktrees.** Agents dispatched in the same sprint were reading
  different rulebooks and nothing printed that.
- **Re-filing a refused item resets its apparent age.** New, from this room. §4.

### 3.2 Which document must change, and who owns the edit?

**Made in this sitting, by this seat:**

| File | Edit | State |
|---|---|---|
| `scripts/measure/check-backlog-deferral.mjs` | **The gate.** R1: a backlog item `in_progress` with zero evidence. R2: an open item carried past two plannings with no `CARRIED: <KEY>` marker in the decision log | ✅ new, self-test **16/16 both directions**, exits **1** on today's board |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` | §4.4 gains a dated **THIS RULE DID NOT FIRE** box recording CONT-17; new reviewer check **S19 Scope of authority**; S19 added to the un-waivable set | ✅ |
| `docs/boardroom/meetings/2026-09-02-sprint-06-retrospective.md` | this document, rewritten | ✅ |
| `docs/sprints/sprint-06-retro.json` | the machine-readable retro, velocity quoted from `sprint velocity 6` | ✅ |
| `…/hellokahwin/Editorial/managing-editor.md` | two sections: counting agreement by seats not items, and the re-filing clock | ✅ at the canonical path, not a worktree — `.claude/agents/` is gitignored |

**Made by the seats during the sprint, verified present:** `scripts/seo/check-family-owned.py`
(exit 2 `CONTAINED`, suite 7→12), `scripts/seo/check-source-currency.py` (bracketed URLs),
`scripts/seo/census-restate.py` (PRE-FLIGHT #4), `scripts/measure/check-empty-copy.mjs`,
`scripts/audit-class-wins.mjs`, `scripts/audit-cover-rendition.mjs` (third assertion),
`scripts/audit-crop-depiction.mjs`, `scripts/audit-favicon.mjs`, `scripts/generate-brand-icons.mjs`,
`scripts/verify-degraded-page-uncacheable.mjs`, `skillcentral/sync-worktree-agents.py`.

**Owed, and NOT this seat's to make — named with an owner rather than left as a wish:**

| File | Edit | Owner |
|---|---|---|
| `docs/boardroom/decision-log.md`, `docs/boardroom/ceo-memory.md` | restate 12.2× as 7.5×/6.5× with the interval and both classifiers named; put 9.8 beside decision 187's 21.7 | `ceo-hellokahwin` |
| `docs/boardroom/decision-log.md` | add `CARRIED: <KEY> — <what it was traded for>` for every item deliberately held out of Sprint 07 | `ceo-hellokahwin` |
| `docs/design/des-03-spesifikasi.html` §5.1 | which rail blocks are conditional; the SUMBER ruling has a gate and no home in the spec | `creative-director` (DES-21) |
| `docs/design/des-03-spesifikasi.html` §2.4 | display face on an `h2` — the premise has moved | `creative-director` |
| `src/lib/inspire/article-file.ts` | `cover: ESCALATE` is unreachable; the schema and the persona contradict | `design-systems-engineer` (DES-19) |
| `.github/workflows/` | a job running `pnpm lint` and `pnpm test` | `design-systems-engineer` (PLAT-21) |
| sprint tooling / brief template | an item declares the **surface** it owns, not only the files | `ceo-hellokahwin` |
| `docs/asset-register/` outreach list | the DBP *Pedoman Transliterasi* edition, unresolved; two weak covers named by CONT-18; the "woman in doa" commission gap named by CONT-17 | `managing-editor` / `editorial-verification-lead` |

### 3.3 What did we do twice?

- **Carried a figure that was wrong, for the fourth and fifth consecutive session.** `UI-19`:
  *"Four consecutive sessions have now found a carried figure wrong."* The corpus moved
  **92 → 95 → 96 → 97 → 102 inside single items**. The fix that works is already in place and it
  is not better carrying: **the DoD says re-derive**, and every item that did got the right number.
  The sources figure moved the same way — decision 190's "52 of 86" is **79 of 92** when
  re-measured by UI-19's own instrument, and the error was in the understating direction again.
- **Measured the same element on the same day and shipped opposite answers.** §2.1.
- **Specified the same rendition key at two different sizes on the same day.** Caught by a dry
  run's surprising count, **not by any gate**. `UI-23`.
- **Nearly orphaned a gate check by merge position, twice in one sprint.** `UI-15`'s `continue`
  would have silently retired `UI-16`'s R2 and R6 for every non-grid image; `UI-19` reported the
  same shape. Caught by reading the merge conflict instead of accepting either side.
- **`gh auth status` lied about the active account**, costing `UI-16` a merge and hitting
  `CONT-15` and `UI-20`. Only `gh api user --jq .login` is reliable, and it must be re-checked
  immediately before **each** merge.
- **Re-derived the CEO's `docs/` routing rule from scratch, in two separate items** (`UI-15`,
  `UI-20`), before anyone fixed the source. Decision 203; now corrected in `startsprint/SKILL.md`.
- **Reasoned about a live page instead of fetching it, in two consecutive sittings by this seat.**
  01 Sept: an image takedown with five green internal signals and the public URL still serving the
  file. 02 Sept: three documents saying a line was gone while the line was being served.

### 3.4 What did we nearly ship, and what caught it?

| Nearly shipped | Caught by |
|---|---|
| **A gendered religious restriction nobody issued**, in FAQPage JSON-LD, live ~40 minutes | an adversarial reviewer with blocking authority, told not to praise |
| **A citation invented while every sentence checked out** — a 12-item wali ordering attributed to a Mufti WP page that does not contain it; the real list is on a different page of the same site | fetching the cited page. *"The summary did not invent the content, it invented the citation."* |
| **A 4.7 MB live regression on the fallback path**, mean 790 KB on the LCP element | another session weighing the **served** objects. No rule this repo owns could see it: 4:3 box, 4:3 file, named crop, downscale — a pure byte defect has no rule behind it |
| **A second `borang nikah` page on a 2,500/mo term with a green gate** | opening the page the advisory line named |
| **A fabricated bug written into a source comment as fact** (`DES-15`) | putting the code back and running the suite: 3/3 |
| **`git reset --hard` in a live worktree** (`SEO-14`), discarding four tracked edits | nothing. *"The recoverable part is luck, not design"* — everything expensive happened to be untracked |
| **Overwriting 96 live R2 objects at the wrong size under the same name** | a dry run's surprising count being checked rather than accepted |
| **A gate that fails a correct icon** (`UI-20`) | running the **positive** control; the negative control passed happily |
| **The wrong empty state** — `"Kategori ini masih kosong"` on a pillar holding six published articles, from an approved spec | the brief naming the trap, and the census run **before** a line was written |
| **A repo-wide pnpm "fix"** for a failure called transient | checking whether the failure window had a **closing** edge, not only an opening one |

### 3.5 What did the sprint PROCESS get wrong?

1. **Nothing made the CONT-15 / UI-16 collision visible until a merge.** §2.1.
2. **A decision became a gate on arithmetic nobody wrote down.** Decision 207.
3. **A routing rule of the CEO's was wrong and two items re-derived it** before anyone fixed the
   source. Decision 203.
4. **A correlation was reported as a cause** (decision 200) while praising an agent for the rule
   that catches exactly that.
5. **The CEO's watchers were killed twice and the fleet stalled ~4 hours unnoticed.** The owner
   found it by asking. Sprint 03's lesson, recurring.
6. **The eleven `## Retrospective` sections were the best material in the sprint and were
   synthesised by one reader instead of collided.** That is why this document exists.
7. **Item state was changed in place of doing work.** §4.3.

**What went right and must not be lost.** Every item was left `in_progress` for CEO verification
rather than self-marked done, and **all eleven were verified against production or by running the
item's own instrument**. Two agents corrected the CEO's own figures at source and both were
right. `SEO-14` was deliberately sequenced first so it could kill `CONT-17`; it did not kill it,
it **re-aimed** it, and corrected two board numbers on the way. **That is the review gate working
in the direction it was built for**, and it is the strongest thing in this sprint.

---

## 4. ⚠ The owner's question — *"Why is there so much deferred work?"*

**Answered by command, not by opinion.** The gate this retrospective ships is
`scripts/measure/check-backlog-deferral.mjs`. Its live run is quoted throughout.

### 4.1 Was 55/55 bought by deferral? Partly — and the mechanism is three separate things

**Not one phenomenon.** The room separated three, and only the third is a velocity problem.

**(a) Genuine discoveries that belong in a backlog.** `UI-21` (the portrait synthesis — both
seats reached it independently and both said do not rush it), `UI-23` (the rendition-identity
gap), `DES-19` (the schema/persona contradiction), `CONT-19` and `CONT-20`. Sixteen of these
points are content items with 8-point DoDs that could not have been absorbed by anything that
ran. **This is the system working.**

**(b) Small things that were filed instead of done.** The CEO conceded five and the room agrees
on all five: `UI-22` (one `og:image`, on the single most-shared URL on the site), `DES-20` (one
retired magenta), `COPY-02` (one number, 155 vs 160), `DES-21` (a spec paragraph), and `PLAT-21`.
**Thirteen points.**

> 📈 **`head-of-seo-content`:** *"A good DoD is what makes deferral **safe**, not what makes it
> **right**. The quality of the filing has no bearing on whether the thing should have been done.
> UI-22 has a beautiful DoD. It is also thirty minutes of work that has now cost more in prose
> than it would have cost in code."*

**(c) The velocity problem, and it is a shape rather than a quantity.** Creation timestamps,
read from the tracker:

```
20:22:07  CONT-19      20:32:56  UI-22        03:11:53  CONT-20
20:22:10  DES-19       20:32:59  DES-20       08:13:24  PLAT-21   ┐
20:22:16  UI-21        20:37:08  PLAT-20      08:13:31  COPY-02   │ four items,
                                              08:13:35  DES-21    │ 11 points,
                                              08:13:40  UI-23     ┘ 16 seconds
```

**Four items and eleven points were filed in sixteen seconds at 08:13, after the work was
finished.** That is a sprint being closed, not a backlog being planned. **43 points filed in one
night against 67 points open: 64% of everything owed was created by this sprint.**

### 4.2 Is "file it with a full DoD" rigour, or a clean velocity number?

**The seats have standing here and they split.**

**Position A — it is rigour, and Sprint 05 proves it.** Sprint 05 moved 30 points out at close
having never run at all, with no DoDs on any of them. Sprint 06's eleven carry real ones:
`CONT-20`'s names the instrument and forbids grepping for the string `Sumber`; `PLAT-20`'s says
the pin is inert without corepack and **do not ship the repo half alone**. Whoever picks these up
starts three hours ahead.

**Position B — it is a clean number, and the arithmetic says so.** 55/55 is a perfect score in a
sprint that generated 43 points of newly-known work. A velocity that counts what was completed
and is silent on what the completing produced will read 100% every time the work is generative.
**Both are true and they are not reconcilable into one sentence, so both are recorded.**

**Where the room did converge:** the two are separable and should be reported separately.
**Sprint velocity should carry a `filed` figure beside `completed`** — "55 of 55, and 43 points
of new work discovered" is an honest sentence that neither position objects to. **Owner:
`ceo-hellokahwin`, at Sprint 07 planning.**

### 4.3 A state change is not work — and it is R1 in the gate

At **10:42:46, 10:42:49 and 10:42:52** — three seconds apart — `PLAT-21`, `DES-20` and `COPY-02`
were set `in_progress`. **Zero evidence rows on all three. No work-done log. No commit.** No
other backlog item was touched at 10:42.

Those are exactly the three items the CEO conceded were small enough to have simply been done.
**They were marked as being done instead.**

`in_progress` on a backlog item has no closing mechanism: it is not `todo`, so it does not read
as pending, and it is not `done`. **It is a state that reports work nobody claimed** — the
sprint's own central finding, committed inside the tracker by the person writing that finding up.
`scripts/measure/check-backlog-deferral.mjs` **R1** now fails on it, and does today:

```
R1  3 violation(s)  — a backlog state that reports work nobody claimed
      PLAT-21  (3pt, design-systems-engineer)  state 'in_progress' with 0 evidence rows
      DES-20   (2pt, design-systems-engineer)  state 'in_progress' with 0 evidence rows
      COPY-02  (3pt, managing-editor)          state 'in_progress' with 0 evidence rows
```

**One of those three is this chair's.** `COPY-02` is owned by `managing-editor` and it is in the
same state for the same reason.

### 4.4 `PLAT-21`, deferred three times — and re-filing reset its clock

`PLAT-21` was **created 2026-09-02T08:13:24**. The finding is three sprints old. It was raised by
`UI-13`, then by `UI-19` (*"OPEN, second sprint, named rather than taken inside a design item"*),
then by `UI-15` from a third item. Each refusal was correct. Each re-raise produced a new record.

> ⚙️ **`design-systems-engineer`:** *"I refused to absorb an infrastructure job into UI-19, a
> design item. That was right by the DoD standard — and it left the thing undone for a second
> sprint. **Being right about scope is how it survived.**"*

**A three-sprint-old failure now reads as a one-day-old backlog item to anyone scanning the
board.** That is the mechanism, and it is the actual answer to the owner's question. It is also
general: it will happen to every finding any item correctly refuses to absorb.

### 4.5 The mechanism, proposed concretely — three clauses and one open disagreement

> 📈 **`head-of-seo-content`:** *"Name a number or it's a wish."*

**Clause 1 — the reserved slice.** Sprint capacity reserves **10%, floor 3 points, for
cross-cutting infrastructure with no natural owner.** Sprint 06 was 55 points; 5.5 points would
have taken PLAT-21 (3) twice over.

**Clause 2 — re-filing may not reset the clock.** An item refused by a second item for scope
reasons is **re-filed under its ORIGINAL key with its original creation date**, or the new key
carries `supersedes: <old key>` and inherits the date. `PLAT-21` should read 2026-08-30, not
2026-09-02.

**Clause 3 — carrying is allowed; carrying silently is not.** An item refused for scope in two
consecutive sprints is **drawn into the next sprint automatically**, and can be kept out only by
a decision-log entry reading `CARRIED: <KEY> — <what it was traded for>`. **Clause 3 is the
load-bearing half because it is the falsifiable one:** if `PLAT-21` is not in Sprint 07, there
must be a numbered decision naming which three points beat CI.

**Clause 3 is shipped as R2 of the gate, not as a paragraph.** It exits 1 today, on eight items,
because **no `CARRIED:` marker exists anywhere yet** — nothing has ever been deliberately carried
on the record:

```
R2  8 violation(s)  — carried past two plannings with no decision naming it
      PLAT-13 (3pt) · PLAT-14 (3pt) · PLAT-17 (2pt) · SEO-04 (5pt)
      DES-14 (3pt) · DES-16 (3pt) · UI-12 (3pt) · UI-14 (2pt)
```

The escape hatch is deliberately **exact** and not a substring match: `UI-12` appears in decision
196 only because that decision quotes UI-12's +8.2 MB pricing while ruling on a different item.
**A gate clearable by an accident of prose is a gate that passes for the wrong reason**, which is
the failure this whole sprint is about. Self-test case:
`"CARRIED marker is exact: a bare mention of UI-12 does NOT exempt it"` — PASS.

**⚠ THE OPEN DISAGREEMENT, printed rather than resolved.** Who takes an unowned item?

> 🎨 **`creative-director`:** *"An infrastructure item has no natural owner, so it should have a
> **rotating** one. Every seat in this room refused PLAT-21 correctly. Four correct refusals is an
> unowned item, not a badly-briefed one."*

> ⚙️ **`design-systems-engineer`:** *"I'd rather it were **assigned** than rotated. Rotation means
> it lands on someone with no context and takes four hours instead of one."*

> 🎨 **`creative-director`:** *"Then it's assigned to you and it doesn't get done, because you're
> carrying five design items a sprint."*

> ⚙️ **`design-systems-engineer`:** *"That's true and I don't have an answer to it."*

**Rotation versus assignment: unresolved. Owner of the call: `ceo-hellokahwin`, at Sprint 07
planning.** The room notes that in Sprint 06 `design-systems-engineer` owned **six of eleven
items and 27 of 55 points**, which is the evidence behind the creative-director's objection.

### 4.6 Item by item — all 25, named

**Six are `done` and are inflating the backlog number. Clear them out. (13pt)**

| Item | pt | Verdict |
|---|---|---|
| `RISK-10` `PLAT-10` `PLAT-11` `PLAT-18` `SEO-07` `PROBE-99` | 13 | **Housekeeping.** Complete work sitting in the backlog. Not deferral. Owner: `ceo-hellokahwin` |

**One is deliberately parked with a decision behind it.**

| Item | pt | Verdict |
|---|---|---|
| `SEO-04` venue entity pages | 5 | **Stays parked** — decision 165 is explicit and it parked twice at the same gate. R2 fires only because the marker syntax does not exist yet; add `CARRIED: SEO-04` and it clears. ⚠ **Check the Setiawangsa control** decision 83 retained, which rode inside SEO-04 when it parked |

**Eighteen are genuinely owed. Recommendation per item.**

| Item | pt | Owner | Sprint 07? | Reason |
|---|---|---|---|---|
| `PLAT-21` CI runs lint and test | 3 | DSE | **PULL — first** | Three sprints, three refusals, all correct. CI runs 0 of 2 lint commands and 1 of 42 test files. It is the reserved-slice item and Clause 3's test case |
| `UI-22` homepage `og:image` | 3 | DSE | **PULL** | The single most-shared URL on the site renders imageless in WhatsApp. Conceded as should-have-been-done |
| `DES-20` logo magenta | 2 | DSE | **PULL** | Same defect UI-20 just fixed on the favicon, still served to Facebook, WhatsApp, X and the Organization schema on four surfaces. Do it with UI-22 — one asset pipeline, one sitting |
| `COPY-02` 155 vs 160 | 3 | ME | **PULL** | One number. It refused two of four CONT-18 drafts **at ingest, after writing**. This chair's own item and its `in_progress`-with-no-evidence state is R1 |
| `DES-21` spec §5.1 conditional blocks | 2 | CD | **PULL** | An engineer building from §5.1 today builds the collapsed rail the CEO ruling forbids. The gate exists; the spec contradicts it |
| `UI-23` rendition identity | 3 | DSE | **PULL** | UI-15 closed half. The open half is a year-long symptomless cache poisoning that was one command from happening |
| `CONT-20` 79 of 92 without sources | 8 | ME | **PULL** | The largest open question this sprint produced, on a site whose competitive claim is that its numbers carry sources. Fourth consecutive carried figure found wrong, understating again |
| `DES-19` `cover: ESCALATE` unreachable | 3 | DSE | **PULL** | It already forced CONT-18 to ship two weak covers under time pressure. It is how 25 of 61 covers drifted originally |
| `PLAT-20` pnpm determinism | 3 | DSE | **Defer, with a named trigger** | Nothing is blocked; `allowBuilds` is a proven defence. Needs a Vercel env var, which is the owner's, not an agent's. **Trigger: the next 11.x builder selection** |
| `UI-21` portrait synthesis | 5 | CD | **Defer to 08** | Genuinely blocked: needs a portrait rendition at sane weight first (`crop-4x5-mobile-cover` is 943 KB–2.0 MB). Both seats said do not rush it. Sequence the rendition, then this |
| `CONT-19` lafaz taklik, 14 states | 8 | writer-adat | **Defer or PULL — the CEO's call on capacity** | Real content work with a real DoD. Sizeable. If content capacity exists after CONT-20, this is next |
| `PLAT-13` watch-agent finish detection | 3 | BMAD | **Decide it, either way** | 28 Aug. Two plannings. R2 fires |
| `PLAT-14` state-transition log | 3 | BMAD | **PULL — it is this retro's own fix** | A per-item state-transition log with a `waiting_on_ceo` state is exactly what would have made the 10:42 batch visible. Filed 29 Aug, unconnected to the problem it solves |
| `PLAT-17` creative-director name collision | 2 | BMAD | **Decide it, either way** | 31 Aug. Two plannings. R2 fires |
| `DES-14` `.s-row` call sites | 3 | DSE | **Defer, explicitly** | 30 Aug. Genuine cleanup, no reader impact. Needs `CARRIED:` |
| `DES-16` optical size runs backwards | 3 | CD | **Defer, explicitly** | 30 Aug. Related to the open §2.4 question; sequence behind it |
| `UI-12` pillar hub opens on an index | 3 | CD | **Defer, explicitly** | 30 Aug. Real editorial improvement, no acute defect |
| `UI-14` unmatched CSS class fails the build | 2 | DSE | **Fold into PLAT-21** | It is a CI job. Both items are "the build should check this and does not". Do them in one sitting or PLAT-21 will refuse it again |

### 4.7 The recommendation to the CEO, in one paragraph

**Pull 8 items and 27 points into Sprint 07** — `PLAT-21`, `UI-22`, `DES-20`, `COPY-02`, `DES-21`,
`UI-23`, `CONT-20`, `DES-19` — plus `PLAT-14` (3pt) as this retrospective's own fix, and fold
`UI-14` into `PLAT-21`. **Five of those eight are the ones already conceded as should-have-been-
done**; taking them clears the whole of category (b) and the sprint stops carrying the charge
that its velocity was bought. **Then write `CARRIED:` for every one of the eight R2 items you
keep out, and clear the six `done` rows.** After that the gate exits 0 and the backlog number
means something for the first time.

---

## 5. What this retrospective changed

**Prose rules do not fire. Three artefacts changed, one of them executable.**

1. **`scripts/measure/check-backlog-deferral.mjs`** — new. Self-test **16/16, both directions,
   `DEFERRAL SELFTEST EXIT: 0`**; against the live tracker **`DEFERRAL EXIT: 1`, 11 violations**.
   It refuses to report a pass on a list it could not build: a parse returning zero items exits
   **2** with *"that is a claim about this parser, not about the backlog."*
2. **Style guide §4.4** — a dated box recording that this rule existed, was a week old, and did
   not fire; **new reviewer check S19 Scope of authority**, added to the un-waivable set, because
   §4.4 was the only mandatory rule in the guide with no row in the reviewer's checklist.
3. **`managing-editor` persona** — counting agreement by seats rather than items, and the
   re-filing clock.

**And one thing this room deliberately did not do.** `COPY-02` is this chair's item and it sat in
front of us. Doing it here would have been exactly the scope-widening the room spent an hour
criticising. It is recommended for Sprint 07 and its `in_progress` state is reported as a
violation of this retrospective's own gate.

---

*Sprint 06 is NOT closed by this document. `sprint state 6 done` is the owner's call via
`/endsprint` and it is a one-way door.*
