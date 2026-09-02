# Sprint 06 retrospective — *Deepen where the click is*

**Held:** 02 September 2026 · **55 of 55 points, 11 of 11 items, nothing parked, nothing moved out.**
**Chaired by:** `ceo-hellokahwin`, from the eleven Stage 9 retrospectives the seats wrote.
**Input:** every item's `## Retrospective` section — 13 logs, 756 lines, all read.
**Not held as a live party-mode session**, and that is stated rather than implied: the seats'
input here is written, not spoken, because the fleet-wide `Login expired` made teammate
dispatch unreliable all night. Their words are quoted, not summarised into agreement.

---

## 1. The finding, and it is one finding rather than eleven

> **An instrument reports success about something it is not looking at.**

Seven seats reached this independently, in different tracks, on different surfaces, in one
sprint. That is not a coincidence of phrasing. It is the failure this company is currently
built to produce, because we have spent three sprints replacing prose rules with gates — and
a gate is exactly the thing that can be green about the wrong object.

`UI-16` counted **six comfortable numbers in one evening on a single image slot**:

> a green merge over a stale cache; a peer census that `continue`d past its rows; a `tsc`
> exit 0 over an excluded directory; a `tsc` exit 0 over a file that did not parse; an audit
> quiet because a fallback absorbed the defect; and a repo-wide pnpm diagnosis built on a
> failure window with no closing edge. **Not one was caught by a check going red. Every one
> was caught by somebody distrusting a number that looked fine.**

The same shape, in the seats' own words:

| Seat | The shape it took |
|---|---|
| `CONT-18` | *"A gate's advisory line is not a gate."* PRE-FLIGHT #3 printed the page that owned the family, immediately above the word FREE, and exited 0. **A printed warning attached to a passing exit code is a prose rule.** |
| `CONT-15` | *"A prose rule that contains a number gets read as the number."* The persona said **OPEN THE IMAGE** in capitals and carried a ~33% floor; fifteen covers sat at 50.0–56.4%, so the rule's number said *fine* while its instruction said *look*. Three shipped not depicting their subject. |
| `PLAT-16` | *"`next start` does not enforce `maxDuration`."* The fix was correct; **the evidence was for an artefact that does not exist** — the stalled render is killed at 5,000ms on Vercel, so neither the throw nor its log ever runs. |
| `UI-19` | *"A gate can be silent on a failure mode by design, and that silence can be mistaken for coverage."* Check 10's three-paragraph explanation of why it does not fire was read for a sprint as *the rail is gated*. |
| `UI-15` | *"A rule that cannot see a defect is worse than a missing rule, because it reports 0."* R1 read 0.0% on five differently-shaped plates. |
| `SEO-14` | Nearly reported *"12.2× → 7.5×, the effect is weakening."* It is not — 7.5× sits inside the prior interval. Caught by restating the **old** census with the same code. |
| **`ceo-hellokahwin`** | Reported PR #66 as the cause of a green deploy. `pnpm-workspace.yaml` present, `Age: 0`, a fresh `X-Vercel-Id`, UI-16's variant live — **every one proves a new build shipped; not one proves the fix caused it.** |

**The countermeasure is not vigilance.** Three things recur across every instance, and all
three are now implemented in the repo rather than written down:

1. **Assert against the SERVED object**, not the expected one — `audit-cover-rendition.mjs`, hero-rules **R12**.
2. **Prove a check FIRES as well as CLEARS.** UI-20's counter check reported a correct icon as broken and *"the negative control passed happily"*. UI-16 proved its checker both ways (`0 mismatched` / `102 mismatched`) *"because a checker that reads the DB, builds the expected URL and then finds it in the page is one typo away from comparing a string to itself."*
3. **Treat a comfortable number with the suspicion normally reserved for a red one.** CONT-15: *"it was caught by noticing the number was pleasant. It confirmed a decision already made, which is exactly when scrutiny is lowest."*

---

## 2. What the sprint's own instruments did to the board

Two numbers in the company record were wrong, and **both were found by the items the board
commissioned to check them** rather than by the board.

**Decision 187's `doa` at "mean position 21.7" — the sentence that bought CONT-17 its twelve
points — is the *unweighted* mean. The impression-weighted position is 9.82.** Twenty queries
carrying 29 of 221 impressions drag it; one query at position 3.74 carries 38% of the
family's impressions and 8 of its 10 clicks. *"We are barely competing on our own best
territory"* is false as stated.

SEO-14 did not stop at the correction, which is why it is worth more than a fix: the build
signal survives in a **sharper** form. 99 document-intent queries carry 295 impressions and
zero clicks; in-curve that is 6.89 expected clicks and **P(zero) = 0.001**. *"A page at
position 4.27 earning nothing from 15 impressions is not waiting for a ranking. It is a
coverage or a snippet problem."* The thesis held; the diagnosis moved from *depth* to
*conversion at positions we already hold*. **Decision 206.**

**Decision 171's "2.3×" carried a stop condition whose arithmetic was never written down**,
and decision 188 made it CONT-17's kill gate. SEO-14 reverse-engineered it from a committed
CSV to find which of **three plausible readings** was meant — *"and under one of them the
answer would have been COLLAPSED."* A twelve-point item was one interpretation away from
being stopped by a number nobody could reproduce. **Decision 207.**

**This is the review gate working in the direction it was built for.** SEO-14 was sequenced
first precisely so it could kill CONT-17. It did not kill it — it re-aimed it, and corrected
the board on the way.

---

## 3. What we did twice

- **Carried figures were wrong for the fourth and fifth consecutive session.** UI-19: *"Four
  consecutive sessions have now found a carried figure wrong."* The corpus moved **92 → 95 →
  96 → 97 → 102 inside single items**. The fix that works is already in place and it is not
  better carrying: **the DoD says re-derive**, and every item that did got the right number.
- **Two seats measured the same element on the same day and shipped opposite answers.**
  CONT-15 and UI-16 both correctly diagnosed the article cover; one keeps the box and re-cuts
  the photograph, the other keeps the photograph and moves the box. *"Nothing in the sprint
  made that collision visible until one of them merged."* **This is a scoping defect, not an
  agent defect, and it is the CEO's to prevent.**
- **Two items specified the same rendition key at different sizes on the same day** — one
  command from a year-long symptomless cache poisoning under `immutable, max-age=31536000`.
  Caught by a dry run's surprising count, **not by any gate**. Filed as **UI-23**.
- **`gh auth status` lied about the active account**, costing UI-16 a merge and hitting
  CONT-15 and UI-20. Only `gh api user --jq .login` is reliable, and it must be re-checked
  immediately before **each** merge.

## 4. What we nearly shipped

- **A religious restriction nobody issued.** CONT-17 quoted JAKIM 2026 clause 7.2(i) —
  *"pembaca doa hendaklah seorang lelaki"* — verbatim, with its clause number, checked against
  the PDF. The guideline binds majlis organised by government or attended by pembesar; **a
  kenduri kahwin in somebody's front yard is neither.** It was headed into FAQPage JSON-LD,
  where Google shows it without the page around it. The seat names a third failure mode: *"not
  fabrication and not misquotation — a rule that nobody issued, wearing the authority of
  somebody who could have."*
- **A citation that was invented while every sentence checked out.** A search summary
  attributed a 12-item wali ordering to a Mufti WP page that does not contain it; the real
  list is on a different page of the same site. *"The summary did not invent the content, it
  invented the citation"* — much harder to spot than a fabrication.
- **A 4.7 MB live regression on the fallback path**, invisible to every rule the repo owns.
- **A fabricated bug written into a source comment as fact** (DES-15) — confident, specific
  and wrong; killed by putting the code back and running the suite.
- **`git reset --hard` in a live worktree** (SEO-14), discarding four tracked edits. *"The
  recoverable part is luck, not design"* — everything expensive happened to be untracked.

## 5. What the sprint process itself got wrong — the CEO's column

1. **Nothing made the CONT-15 / UI-16 collision visible until a merge.** Two items were scoped
   onto one element with no check between them. The `/startsprint` conflict rule covers two
   agents editing the same *files*; these edited different files that render the same *pixel*.
2. **A decision of mine became a gate on arithmetic I never wrote down** (207).
3. **A routing rule of mine was wrong and two items re-derived it** before anyone fixed the
   source (203) — now corrected in `startsprint/SKILL.md`.
4. **I reported a correlation as a cause** (200), while praising an agent for the rule that
   catches exactly that.
5. **My watchers were killed twice and I did not notice the fleet had stalled for ~4 hours.**
   The owner found it by asking. Sprint 03's lesson, recurring.
6. **What went right and must not be lost:** every item was left `in_progress` for CEO
   verification rather than self-marked done, and **all eleven were verified against production
   or by running the item's own instrument.** Two agents corrected the CEO's own figures at
   source and both were right.

## 6. Carried forward

`CONT-19` `CONT-20` `DES-19` `DES-20` `DES-21` `UI-21` `UI-22` `UI-23` `PLAT-20` `PLAT-21` `COPY-02`
— eleven new items, filed with full DoDs rather than left as notes.

**The heaviest is `CONT-20`: 79 of 92 articles carry no source citation**, against a carried
figure of "52 of 86". On a site whose competitive claim is that its numbers carry sources,
that is the largest open question this sprint produced.

**`PLAT-21` is the most overdue: there is still no CI job running `pnpm lint` or `pnpm test`,
and lint is red on `master`.** Named OPEN in two consecutive sprints by an item that correctly
refused to absorb an infrastructure job into a design ticket.
