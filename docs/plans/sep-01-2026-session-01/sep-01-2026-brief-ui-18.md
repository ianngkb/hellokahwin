# UI-18 — The in-article table of contents - DALAM ARTIKEL INI appears on 0 of 85 live articles

**Sprint 05 — *Build where the click is*** · track `design` · **5 points** · owner `design-systems-engineer`
**Dispatched:** 01 September 2026
**Your item in the tracker:** `pnpm --silent sprint get UI-18 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

CENSUS RUN LIVE 01 Sept 2026 across every article URL in the sitemap: 85 articles fetched, and 'DALAM ARTIKEL INI' appears on ZERO of them. The DES-03 spec mentions it twice. It is the second half of the composition the spec drew and the build never produced. It also has a reader argument independent of the design one: our best-converting pages are long documents (a full doa, a whole checklist) and a long document without a table of contents is harder to use than one with it.

> ### ⚠ CORRECTION — 01 September 2026, on completion
>
> **The census's number is wrong and the conclusion drawn from it is wrong.** The
> string `DALAM ARTIKEL INI` did appear on zero articles. The contents list it was
> standing in for appeared on **63 of 86**, labelled `Isi Kandungan`, with 822
> anchors and none dangling — `.hk-eyebrow` uppercases, so the source is mixed
> case, which is the same trap this brief documents four sections later for
> `REKOD`. Testing for the casing you assume returns a number about your
> assumption; the fix is to enumerate what IS there.
>
> The DoD was met as written and was not narrowed. What was actually missing: the
> component's floor was four `<h2>` rather than two (withholding the list from two
> articles), and the label was not DES-03's. Production now renders it on **65 of
> 86**, corpus re-derived at run time. Corrected at source in
> `docs/boardroom/ceo-memory.md` and
> `docs/plans/aug-30-2026-session-01/aug-31-2026-audit-spec-vs-build.md`.

## DEFINITION OF DONE — verbatim, and it is not narrowed

A generated table of contents renders on every article carrying two or more h2 headings, with each entry linking to a working in-page anchor - verified by a committed script that walks the sitemap, counts articles with >=2 h2, and asserts the TOC is present on all of them and absent on the rest, pasting the before (0 of 85) and after counts. Every TOC link resolves to an id that exists in the same document - the script checks the anchor targets, not just the link text. Tap targets meet UI-11's 24px floor (the in-article TOC was explicitly named in UI-11's scope). The article corpus count is re-measured at run time rather than assuming 85 - CONT-13 and CONT-16 are adding eight articles in this same sprint.

## BRIEF

The corpus is MOVING this sprint - do not hardcode 85. Re-derive from the sitemap when you run, and say what number you got. Coordinate with UI-17 on the rail container. UX-02 shipped heading anchors in an earlier sprint (branch feat/ux-02-heading-anchors) - check whether the ids you need already exist before generating new ones.

## HOW TO RECORD YOUR RESULT

Run from `~/Documents/Code/buddy`:

```
pnpm --silent sprint set-state UI-18 in_progress --sprint 5
pnpm --silent sprint add-evidence UI-18 --sprint 5 \
  --claim "<what is now true>" --proof "<the literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or the artefact itself before that happens — that is the standing rule,
and it exists because agent completion reports have been wrong in the optimistic
direction. Record your evidence and report; the CEO closes it.

---

## STANDING RULES — these bind you, and they are not optional

**DONE MEANS SHIPPED.** Owner directive, 26 Aug 2026. Not built, not committed, not
"working locally" — shipped, and reachable by the owner. Site code: merged to the
default branch AND deployed AND visible on a live URL. Content: ingested to
production AND the URL returns 200 AND a reader can find it. A document or log:
committed and pushed — a file on one machine is not a deliverable.

**YOUR DoD IS NEVER NARROWED.** If the item turns out bigger than its DoD assumed,
it stays open, gets `parked` with a reason, or carries forward. Rewriting the DoD to
fit what you achieved is the one thing that makes velocity a lie. Bring it back
instead — a parked item with a clear reason is a good outcome.

**A GATE IN YOUR DoD IS ALLOWED TO KILL THIS ITEM.** If your brief opens with a
gate and the gate fails: STOP and report. Do not build with invented figures and do
not quietly downgrade to an option already rejected. On a site whose entire claim is
that its numbers carry sources, a plausible fabrication is the worst outcome
available and the hardest to detect later.

**VERIFY YOUR OWN CHECKS. The company has twelve tabulated instances of the same
failure: checked a proxy, with a pattern nobody tested.**
- When a check returns a surprising ABSENCE, **verify the CHECK first.**
- **Enumerate what IS there** (`grep -oai <pat> | sort | uniq -c`) rather than
  testing for what you assume is there. The second form can only ever return a
  number about your assumption.
- **NEVER COMBINE `grep -o -i -F`.** It returns **0** in GNU grep 3.0 (this Git Bash
  build) and reproduces on a 23-byte file. On 01 Sept it returned 0 for `REKOD` and
  `SUMBER` on a page carrying them ×24 and ×20. Use the committed helper:
  `bash scripts/measure/count-in-html.sh <url|file> "PATTERN" ...`
- **A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE.** The first fix
  for that grep bug was itself wrong, and was caught only by running it. "I
  understand the cause" is not a test.
- **A status code proves nothing on its own.** A 200 carrying the right string can
  still be a shell — a preview once returned 200 with the right marker and rendered
  zero articles. Compare structurally against production where it should not differ.

**PRODUCTION WRITES: record and push a precise UNDO first.** Name the exact slugs,
paths or row ids. That is what makes a write reversible in fact rather than in
principle. Additive and reversible writes proceed on your authority; anything with
no recovery path stops and comes back to the CEO.

**STAGE 9 — THE RETROSPECTIVE IS PART OF THIS ITEM, NOT AN EXTRA.**
Write it into your `docs/work-done/` entry under `## Retrospective`, answering:
what did we learn that is not written down; **which document must change and who
owns the edit — name the file**; what did we do twice that we should never repeat;
what did we nearly ship, and what caught it. **Then make the edit.** A retrospective
that names a document and does not change it has failed. Prefer an executable form —
a DoD clause, a script, a gate — over prose: **prose rules do not fire.**

**LOG YOUR WORK** in `docs/work-done/sep-01-2026-session-01/sep-01-2026-done-<slug>.md`
with evidence a reader who was not here can verify, and update
`docs/work-done/README.md`.

**REPORT A BLOCK THE MOMENT IT HAPPENS.** Do not sit on it. If you are blocked on a
credential, that means your SESSION lacks permission — say so precisely, because
that is a different problem from the company lacking the credential.

**When your work contradicts something the CEO wrote, the evidence wins** and the
file gets corrected at source. Four agents corrected the CEO in Sprint 04 and every
one was right. Put it in your log where it will be read.

**All reader-facing content passes `/humanizer` before it is done.**

---

## When you finish

Print, at the start of a line, exactly:

Print your completion sentinel as the FIRST THING ON A LINE, in the form
`ITEM` then a space then `EXIT:` then a space then your exit code — e.g. exit code zero.
Nothing else on that line.

> ⚠ This is deliberately NOT written out literally here. The watcher matches that
> exact line anchored to the start of a line, and on 01 Sept 2026 the wave-1 brief
> printed it verbatim in a code fence — so CONT-16 and SEO-13 tripped their own
> watchers within 90 seconds of dispatch, both still WORKING, simply by displaying
> their brief. Filed with the captured lines as evidence on PLAT-13.

`ITEM EXIT: <n>` is the ONLY string that means this ITEM is done. Gates you run may
print their own `NAME EXIT: n` lines — those are that gate's outcome, not yours, and
they wake the CEO for nothing. Use a non-zero code if you are stopping without
completing the DoD, and say why immediately above it.

## ⚠ WHERE THE CODE IS — and how the CEO nearly sent you on a hunt

A first pass ran `grep -rl "REKOD\|SUMBER" src/` in `hellokahwin-site` and got **nothing**,
on a repo that serves `REKOD` twenty-four times. **The check was wrong, not the repo.**
The served uppercase is a CSS text-transform; the source is mixed case:

```
$ grep -roih "rekod[a-z]*" --include=*.ts --include=*.tsx . | sort | uniq -c
     13 Rekod
      2 RekodField
      3 RekodPanel
      3 rekod
```

Start here:

- `src/design-system/components/content.tsx` — `RekodPanel`, `RekodField`
- `src/app/(public)/artikel/[category]/[slug]/page.tsx` — the article template
- `src/design-system/components/typography.tsx`, `src/design-system/token-values.ts`

**Enumerate what is there; never test for the casing you assume.** This is the
third instance of that shape in one day and all three were the CEO.
