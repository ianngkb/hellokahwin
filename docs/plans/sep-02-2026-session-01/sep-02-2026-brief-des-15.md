# DES-15 — s-h2's font-weight 600 and letter-spacing -0.01em are dead on every public page - a declaration that never wins

**Sprint 06 — *Deepen where the click is*** · `design` · **3 points** · owner `design-systems-engineer`
**Dispatched:** 02 September 2026 · space: **the SITE space** · integration branch **`master`**
**Your row:** `pnpm --silent sprint get DES-15 --sprint 6` (from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

â€”

## DEFINITION OF DONE — verbatim, and it is not narrowed

components.css declares .s-h2 { font-weight: 600; letter-spacing: -0.01em }. On every public page .hk-public h1,h2,h3,h4 { font-family: var(--font-serif); letter-spacing: -.018em; font-weight: 400 } has specificity (0,1,1) and beats the bare class at (0,1,0), so neither declaration ever applies. VERIFIED on live production 31 Ogos 2026 at both breakpoints: h2.s-h2 on artikel/hantaran-mas-kahwin computes font-weight 400 and letter-spacing -0.399px at 390px, and 400 / -0.468px at 1280px - the -0.018em from the wrapper, not the -0.01em the class asks for. The specificity ladder is consistent: .s-row .t (0,2,0) > .hk-public h2 (0,1,1) > .s-h2 (0,1,0), which is why .s-row h2.t DOES render 600. Done when .s-h2 either wins its own declarations or stops making them, decided deliberately - NOTE this is a real design decision, not a cleanup: making 600 win would change every public h2 on the site. SAME CLASS AS UI-14 but a different mechanism - UI-14 catches a class matching no rule, this is a rule that matches and never wins - so a check for one will not catch the other. Found by the creative-director while correcting their own reasoning in UI-05, and verified on the live artefact before being recorded.

## ⚠ CORRECTION TO THE DoD ABOVE, FROM THE EVIDENCE — design-systems-engineer, 02 Sept 2026

The DoD's sentence *"making 600 win would change every public h2 on the site"* is
wrong, and the number matters because it is the sentence that makes this a
3-point item rather than a site-wide art-direction change.

**It changes 26 elements, all `<h2>`, on the 7 pillar hubs.** Zero `.s-h2` on the
homepage, the catalogue and article pages. Enumerated at 390px across 12
production URLs before the fix (`/` 0, `/artikel` 0, `hantaran-mas-kahwin` 5,
`nikah-undang-undang` 4, `sebelum-nikah` 5, `ucapan-doa` 4, `busana-pengantin` 2,
`pelamin-kad-cenderahati` 4, `venue-perancangan` 2, `real-wedding` 0,
`glamor-eksklusif` 0, an article page 0).

The change that WOULD move every public h2 is a different one and was NOT made:
de-specifying `.hk-public h1,h2,h3,h4` so a design-system class always wins. That
additionally moves **27** other classed public headings (`.s-h1`, `.s-h3`,
`.hk-display`, `.hk-eyebrow`, `.hk-card-title`) and is listed as a follow-up with
its own owner.

The DoD is otherwise met exactly as written and was not narrowed. Everything
else in it reproduced on production: 400 / −0.399px at 390 and 400 / −0.468px at
1280, and the (0,2,0) > (0,1,1) > (0,1,0) ladder.

Full account, evidence and the three findings raised:
`docs/work-done/sep-02-2026-session-01/sep-02-2026-done-des-15-h2-weight.md`.

## BRIEF

â€”

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state DES-15 in_progress --sprint 6
pnpm --silent sprint add-evidence DES-15 --sprint 6 \
  --claim "<what is now true>" --proof "<literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or by running the item's own instrument. Record evidence and report.

---

## ⚠ WHERE YOUR WORK MERGES — NAMED, BECAUSE FIVE ITEMS GOT THIS WRONG LAST SPRINT

You are working in the SITE space. **Your integration branch is `master`.**

`hellokahwin` and `hellokahwin-site` are ONE git repository kept apart by
convention only. `master` carries `next.config.ts` and no `docs/boardroom`; the
docs line is the reverse. **Test by content, never by branch name** —
`docs/plat-10-11-12` is site source.

**What went wrong in Sprint 05, so you do not repeat it:** CONT-13 pushed 29
commits to its own feature branch and its entire paper trail was invisible on the
docs line. CONT-14, RIGHTS-02 and RIGHTS-03 did the same. DES-17 opened a PR from
the docs line INTO `master` carrying 1,078 files — it would have moved the company
record into the branch the public site is built from, and the owner had to close
it. **"Commit and push" is not an instruction that lands work where a reader
finds it.**

- Site code (`src/`, `public/`, `scripts/` in the site clone) → **`master`**
- Anything under `docs/` → **`feat/command-centre-dashboard`**
- If your item produces both, say in your log which went where.
- **Never open a PR into `feat/command-centre-dashboard` (docs).**

## ⚠ CODE REVIEW IS DONE BY CLAUDE. NOT BY OPENAI. — owner directive, 02 Sept 2026

Verbatim: *"also ensure code review is done by claude not openAI."*

**This reverses a default that would otherwise apply silently.** The machine-level
`codex-reviewer` agent describes itself as *"Runs code review through OpenAI Codex
(gpt-5.6-sol)… Use for EVERY code-review step in BMAD/autopilot flows — this
replaces Claude-run review"*, and the BMAD and `/autopilot` flows reach for it by
default.

**On HelloKahwin work: do NOT dispatch `codex-reviewer`, and do not route review
through Codex, `/autopilot`'s default reviewer, or any OpenAI-backed path.** Use
`/bmad-code-review` (Claude-run) or your own adversarial pass, and **state in your
work-done log which reviewer you used**, so the next reader can tell.

If something you invoke would silently reach for the OpenAI reviewer, stop and say
so rather than letting it run.

---

## STANDING RULES

**DONE MEANS SHIPPED.** Merged to your named integration branch AND deployed AND
visible on a live URL (site), or ingested to production and returning 200
(content), or committed and pushed where a reader looks (documents).

**YOUR DoD IS NEVER NARROWED.** Bigger than expected: stay open, `park` with a
reason, or carry forward. **Rewriting the DoD to fit what you achieved is the one
thing that makes velocity a lie.** Bringing it back is a good outcome; UI-17 did
exactly that last sprint and was right to.

**A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE.** Name the
failing case, run your fix against it, and show it now passes. "I understand the
cause" is not a test — on 01 Sept a confident, specific, wrong diagnosis was
caught only because the fix was run and still failed.

**VERIFY YOUR OWN CHECKS.**
- A surprising ABSENCE means verify the CHECK first.
- **Enumerate what IS there** (`grep -oai <pat> | sort | uniq -c`), never test for
  what you assume is there.
- **Never combine `grep -o -i -F`** — it returns 0 in GNU grep 3.0 and reproduces
  on a 23-byte file. Use `bash scripts/measure/count-in-html.sh`.
- **Read exit codes directly, not through a pipe.** `cmd | tail` gives you
  `tail`'s status; the CEO got this wrong four times in one session.
- **Quote a path with a space.** `C:/Users/Ian Ng/...` unquoted has broken a
  command five separate times in this repo.

**A STATUS CODE PROVES NOTHING ON ITS OWN.** A 200 carrying your marker string can
still be a shell. For layout, prove it from COMPUTED values, not markup presence.

**PRODUCTION WRITES: record and push a precise UNDO first**, naming exact slugs,
paths or row ids.

**STAGE 9 RETROSPECTIVE is part of this item.** In your `docs/work-done/` entry
under `## Retrospective`: what did we learn that is not written down; **which
document must change and who owns the edit — name the file**; what did we do twice;
what did we nearly ship and what caught it. **Then make the edit.** Prefer a gate
or a script over prose — prose rules do not fire.

⚠ **A persona edit made inside a worktree reaches NOTHING** — `.claude/agents/` is
gitignored by design. Persona edits go to
`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/`.

**LOG YOUR WORK** in `docs/work-done/sep-02-2026-session-01/` with evidence a
reader who was not here can verify, and update `docs/work-done/README.md`.

**REPORT A BLOCK THE MOMENT IT HAPPENS.** If you are blocked on a credential, say
so precisely — that usually means your SESSION lacks permission, which is a
different problem from the company lacking the credential.

**When your evidence contradicts something the CEO wrote, the evidence wins** and
the file gets corrected at source. Four agents corrected the CEO last sprint and
every one was right.

## When you finish

Print your completion sentinel as the FIRST THING ON A LINE: the word `ITEM`, a
space, `EXIT:`, a space, then your exit code. Nothing else on that line.

> Written this way deliberately: printing it literally in a brief made ten agents
> trip their own watchers last sprint by displaying it.

Use a non-zero code if you are stopping without completing the DoD, and say why
immediately above it.
