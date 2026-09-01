# PLAT-16 — A soft-failed pillar render is cached forever - one DB blip can pin an empty topic hub indefinitely

**Sprint 06 — *Deepen where the click is*** · `platform` · **3 points** · owner `design-systems-engineer`
**Dispatched:** 02 September 2026 · space: **the SITE space** · integration branch **`master`**
**Your row:** `pnpm --silent sprint get PLAT-16 --sprint 6` (from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

â€”

## DEFINITION OF DONE — verbatim, and it is not narrowed

renderPillarPage catches a failed or timed-out getPillarView and renders SUCCESSFULLY with clusters: [], while the route declares revalidate = false. Next therefore has a valid page to cache and caches it indefinitely; only revalidateTag('articles') or revalidateTag('inspire-categories') from an admin write can clear it, and there is no time-based revalidation to heal it. Done when a degraded render is provably not persisted as the long-lived ISR entry - either re-throw after logging so Next does not cache it, or set a short revalidate window on the degraded path - demonstrated by forcing the deadline miss and showing the next request re-renders rather than serving the empty page. The same soft-fail pattern exists on the category grid route; say whether it has the same exposure. Mitigated but NOT fixed by UI-05, which added an empty state so the page says something instead of rendering a bare div.

## BRIEF

â€”

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state PLAT-16 in_progress --sprint 6
pnpm --silent sprint add-evidence PLAT-16 --sprint 6 \
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
