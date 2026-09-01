# UI-20 — The favicon is a PINK 'H' from the retired palette - the brand system says it must be the HK monogram

**Sprint 06 — *Deepen where the click is*** · `design` · **3 points** · owner `design-systems-engineer`
**Dispatched:** 02 September 2026 · space: **the SITE space** · integration branch **`master`**
**Your row:** `pnpm --silent sprint get UI-20 --sprint 6` (from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

â€”

## DEFINITION OF DONE — verbatim, and it is not narrowed

LIVE PRODUCTION serves a favicon derived from public/brand/logos/hellokahwin-monogram.svg, and the pink is gone. OBSERVABLES, each checkable by command: (1) https://hellokahwin.com/favicon.ico returns 200 (it currently 404s) and https://hellokahwin.com/icon.svg returns 200 with image/svg+xml; (2) the served raster favicon's dominant non-transparent colour is drawn from the shipped palette - state the hex and name which palette token it is - and NO pixel matches the retired magenta; (3) an apple-touch-icon of at least 180x180 returns 200, because it currently 404s; (4) the homepage HTML carries <link> or Next metadata entries for icon, apple-touch-icon and a shortcut icon, quoted from the live response; (5) public/favicon-32.png is either WIRED UP or DELETED - it exists today and nothing references it, and a dead asset that looks live is how the wrong icon survives a redesign. RENDER-CHECK, because a status code proves nothing about an icon: capture the mark at 16px and confirm BOTH glyphs of HK are legible and separated - the brand module's own warning is that at opsz 11 the hairline erases at small sizes, so use the opsz 6 cut the marks are already set in and state which you used.

## BRIEF

THE FINDING, verified by the CEO on 02 Sept: the live site serves ONE icon link, <link rel="icon" href="/favicon.png">, and that file is a 48x48 PNG showing a PINK/MAGENTA rounded square with a serif capital H. Two things are wrong with it and both are evidenced. (1) WRONG MARK: brand-assets.ts describes the monogram as 'HK. The only mark that survives a favicon, an app icon or a social avatar', minHeight 14. The favicon is an H alone, which is not any mark in the registry. (2) WRONG PALETTE: the shipped brand is a warm-neutral ink-on-paper monotone - brand.css declares #edeae1, #ede8dc, #e4e0d4, #dad5c6, #c6bfac and #c9a45c gold - and magenta appears nowhere in it. ceo-memory records that globals.css was TWN's 'Plum Forward' palette ported wholesale and that UX-03 re-skinned the public site to the monotone on 27 Aug (78cd345). THE FAVICON IS A SURVIVOR OF THE PALETTE THE SITE RETIRED. Also missing: /favicon.ico, /icon.svg and /apple-icon.png all return 404 today, so there is no icon for a browser tab pinned on Windows, no vector for modern browsers, and nothing for an iOS home screen. USE THE COMMITTED MARK, do not draw a new one: every logo in public/brand/logos is an OUTLINED SVG with fill=currentColor, cut at opsz 6 specifically because the marks are used small, and the module warns that at opsz 11 the hairline erases at favicon size. Read src/components/brand/brand-assets.ts before touching anything - it is the single source of truth and it already anticipated this surface. BRANCH: this is site code and merges to master, NOT to the docs line.

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state UI-20 in_progress --sprint 6
pnpm --silent sprint add-evidence UI-20 --sprint 6 \
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
