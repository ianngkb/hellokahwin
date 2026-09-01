# CONT-15 — Portrait article covers have no thumbnail-sized landscape crop - re-derive the count, the carried '12 of 86' predates a 92-article corpus

**Sprint 06 — *Deepen where the click is*** · `design` · **5 points** · owner `creative-director`
**Dispatched:** 02 September 2026 · space: **the SITE space** · integration branch **`master`**
**Your row:** `pnpm --silent sprint get CONT-15 --sprint 6` (from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

FOUND BY UI-12 WHEN IT STOPPED AT ITS GATE, 31 Aug, and it is a CONTENT PIPELINE gap rather than a CSS one. The last image-aspect violation on the site cannot be fixed in CSS: the article tempat-beli-hantaran has a 1200x1800 PORTRAIT cover, and low.webp is a resize not a crop, so it cannot satisfy a landscape thumbnail box at any breakpoint. UI-03 measured 12 of 86 published articles as portrait or near-portrait (0.667 x6, 0.750 x4, 0.748, 0.753). ANY of those landing in a .s-row row reproduces the defect. The existing crops are all too heavy for a thumbnail: CEO-verified sizes are low 53 KB, crop-16x9-og 223 KB, crop-4x3-article-card 488 KB, so substituting a correctly-shaped asset across twelve homepage rows costs about +8.2 MB on cheap Android over Malaysian mobile data. UI-12 correctly refused to spend that to clear five gate points, and correctly refused to loosen the threshold.

## DEFINITION OF DONE — verbatim, and it is not narrowed

Every article cover satisfies UI-06's aspect and upscale rules at thumbnail size on live production - the gate reports 0 violations sitewide with the pre-fix count pasted. âš  RE-DERIVE THE AFFECTED COUNT AT RUN TIME: the carried figure was '12 of 86' and the corpus is now 92 articles and still moving (CONT-17 and CONT-18 add ten more in this same sprint). DO NOT solve it by substituting an existing crop - UI-12 priced that at +8.2MB across the homepage and that route stays FORBIDDEN. DES-18's mid-size variant shipped in Sprint 05 and is the intended route; state the byte cost per affected article.

## BRIEF

â€”

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state CONT-15 in_progress --sprint 6
pnpm --silent sprint add-evidence CONT-15 --sprint 6 \
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
