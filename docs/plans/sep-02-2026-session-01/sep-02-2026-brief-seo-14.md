# SEO-14 — Re-run the SERP-shape census - RUNS FIRST, and its answer decides whether CONT-17 writes at all

**Sprint 06 — *Deepen where the click is*** · `seo` · **3 points** · owner `head-of-seo-content`
**Dispatched:** 02 September 2026 · space: **the DOCS space** · integration branch **`feat/command-centre-dashboard`**
**Your row:** `pnpm --silent sprint get SEO-14 --sprint 6` (from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

Decision 171 recorded the caveat that must travel with the split-CTR figure: eleven clicks carry the document arm, six of them from one query, and the confidence intervals bound the true ratio only at NO LESS THAN 2.3x. The 12.2x number governs every content-selection decision this company now makes, and it rests on 14 clicks in the matched band. This sprint adds eight document-intent articles - which is exactly the intervention that should move it, and therefore exactly the condition under which re-measuring is worth something.

## DEFINITION OF DONE — verbatim, and it is not narrowed

âš  THIS ITEM RUNS FIRST IN THE SPRINT AND ITS ANSWER STEERS CONT-17. The SERP-shape census is re-run over a window that includes Sprint 05's six new doa articles, the CSV re-issued, and the ratio restated with its n, its Fisher exact p and its confidence interval. The frozen intent_of in serp-shape-census.py is NOT quietly edited - import the gate's classifier and re-issue, per the comment in the file, and state which classifier produced which figure. Every SERP row carries its serp_update_date and the RANGE is reported (decision 174). The finding ships with its value under at least two re-cuts. âš  REPORT THE ANSWER TO THE CEO BEFORE CONT-17 SELECTS TARGETS: if the document/number split has collapsed below decision 171's conservative 2.3x bound, CONT-17's premise is gone and it must STOP and come back rather than write six articles on a dead thesis.

## BRIEF

RUNS AT SPRINT CLOSE, not at the start - it needs CONT-13 and CONT-16 live and long enough to have data, and it is the item that scores this sprint's central bet. If the new articles are too fresh to have meaningful impressions, SAY SO and report the census without them rather than reading noise as a result. Uncrawled and year-stamped queries are written 'unknown', never 'false' (decision 173).

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state SEO-14 in_progress --sprint 6
pnpm --silent sprint add-evidence SEO-14 --sprint 6 \
  --claim "<what is now true>" --proof "<literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or by running the item's own instrument. Record evidence and report.

---

## ⚠ WHERE YOUR WORK MERGES — NAMED, BECAUSE FIVE ITEMS GOT THIS WRONG LAST SPRINT

You are working in the DOCS space. **Your integration branch is `feat/command-centre-dashboard`.**

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
- **Never open a PR into `master` (site).**

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
