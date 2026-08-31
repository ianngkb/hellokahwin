# SEO-13 — 39 of 85 live articles emit no FAQPage schema

**Sprint 05 — *Build where the click is*** · track `seo` · **5 points** · owner `head-of-seo-content`
**Dispatched:** 01 September 2026
**Your item in the tracker:** `pnpm --silent sprint get SEO-13 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

CENSUS RUN LIVE 01 Sept 2026 across every article in the sitemap: 46 carry FAQPage, 39 do not, 1 failed to fetch. ceo-memory.md carried '31 articles emitting no FAQ schema' - THAT FIGURE WAS STALE and the corpus has grown since it was written. The missing set includes pages we actively rank on: /idea-dan-nasihat/dewan-kahwin (142 impressions, 2.82% - one of our better converters), /idea-dan-nasihat/garden-wedding (the 28%-of-impressions page), /hantaran-mas-kahwin/hantaran-tunang (291 impressions), /nikah-undang-undang/borang-nikah, rukun-nikah, syarat-sah-nikah. On a site whose measured problem is losing SERP real estate to answers printed above us, giving Google structured Q&A on pages we already rank on is the cheapest square metre available.

## DEFINITION OF DONE — verbatim, and it is not narrowed

Every article with genuine question-and-answer content emits valid FAQPage JSON-LD on live production. The count is proved by a COMMITTED SCRIPT that walks the sitemap and reports present/absent/not-applicable per URL - before (46/39) and after both pasted. Validity is checked, not assumed: every emitted block parses as JSON and passes Google's Rich Results structured-data test (or schema.org validation) with the result quoted for at least five URLs including the three highest-impression ones. Articles with NO genuine Q&A are recorded as not-applicable WITH THEIR SLUGS and a one-line reason - they are not padded with invented questions to make a number.

## BRIEF

DO NOT INVENT QUESTIONS TO RAISE THE COUNT. A fabricated FAQ block is a structured-data violation and on a site whose whole claim is that its numbers carry sources it is the worst kind of shortcut. If an article genuinely has no Q&A, that is a legitimate not-applicable and the count lands where it lands. Branch feat/seo10-faq-schema exists from an earlier sprint - read what SEO-10 already built before writing new emission code; this may be a coverage job rather than a build job. The corpus is MOVING (CONT-13/16 add 8 articles) - re-derive at run time.

## HOW TO RECORD YOUR RESULT

Run from `~/Documents/Code/buddy`:

```
pnpm --silent sprint set-state SEO-13 in_progress --sprint 5
pnpm --silent sprint add-evidence SEO-13 --sprint 5 \
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
