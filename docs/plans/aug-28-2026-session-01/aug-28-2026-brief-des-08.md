# DES-08 — Implement the redesigned homepage, catalogue and article pages

**Sprint 03 · design · 8pt · owner `BMAD`**

**ISOLATED WORKTREE of the site repo.** Your branch is cut and checked out. Do NOT
`git checkout`, do NOT `git stash`, do NOT touch the main checkout.

This is the item every other design item was built for. **Four things already exist
and are on `master`. Build against them; do not re-derive them.**

| What | Where |
|---|---|
| **The spec** — 13 states, 18 frames, 360px and 1200px, 47 measured contrast ratios | `docs/design/des-03-spesifikasi.html` in the DOCS repo, and https://claude.ai/code/artifact/82d4d556-db93-4139-b1ce-84db67010522 |
| **The design system** — tokens, 5 component modules, reference page | `src/design-system/` on master, shipped as `218ff04` |
| **The state set** — 39 screens, 5 surfaces, all 40 DoD cells | `aug-28-2026-done-des-07-state-set.md` |
| **The SEO guardrails, RUNNABLE** | `docs/work-done/aug-28-2026-session-01/aug-28-2026-des-09-EVIDENCE/check-guardrails.py` |

## DES-09 GATES THIS ITEM. Run its checker BEFORE and AFTER.

It already FAILS against current production on G01 (h1 count, five pages named) and
G02 (heading level skip, 7 of 9 ordered). **Those are pre-existing defects, not yours
— but you must not make them worse, and G06 (zero internal `rel=nofollow`) must stay
at zero.** SEO-02 removed 79 of those; re-introducing one regresses it.

## The register, and the two constraints that decide the build

**Direction A · Warkah — the record.** Chosen 28 Aug. Two things from that choice bind
you directly:

1. **Four of eleven photo frames survive enlargement; seven do not.** The spec says
   what happens when a cover is one of the seven. **Do not assume photography the
   library cannot supply.**
2. **Mobile is 64% of impressions at position 8.7, desktop 28.9.** Whatever makes A
   recognisable must survive at 360px. Verify at 360px FIRST, not last.

## Dark mode

The 2026-07-14 decision stands: dark is NOT user-reachable and you ship no toggle.
The system already defines both palettes. Consume the semantic tokens; expose light.

---

## Why this item exists

The design system is the vocabulary; this is the three pages actually built in it and shipped. Without this item the whole design track produces artifacts nobody outside the company ever sees.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: All three page types live in production on the new system, matching the DES-03 artifact. Each returns 200 on first request. The old generic styling is gone - verified by fetching the live page and confirming the new tokens are present and Geist-as-body is not. CHECKED BY: curl each live URL first-request; quote rendered CSS from the built page, not the source. Check at 360px and desktop, light and dark. BEWARE THE FALSE PASS: A status code proves nothing about whether a page renders correctly. Quote content only the real redesigned page contains. EVIDENCE LANDS: docs/work-done/ entry with live URLs and quoted CSS.

## Planning context

Build against the DES-03 artifact and the DES-05 system. If the spec is wrong, raise it as a finding - never narrow it to match what got built. head-of-seo-content SIGNS OFF post-deploy against DES-09's guardrails, with live numbers.

---

## The verification bar, and it is higher than a status code

A 200 carrying the right string is NOT health. On 27 Aug a preview returned 200 with
the exact marker string and rendered **zero articles** — a shell, because the database
role read 0 rows from a table holding 74. **Compare the built page against production
STRUCTURALLY**: count the headings, the images, the internal links, diff the title.
Quote both sides. A page that differs only where it is supposed to differ is verified;
a page that returns 200 is not.

## Standing rules — these bind you

- **DONE MEANS SHIPPED.** Not built, not committed, not "working locally".
  Merged to the default branch AND deployed AND visible, or ingested to
  production AND reachable. If your item's result is a document, it is
  committed and PUSHED. A file on one machine is not a deliverable.
- **Check the artefact the CONSUMER receives**, never the input you control.
  Reading your own source proves what you intended, not what shipped.
- **A status code is not a measurement.** If a check needs a header, a
  cookie, a session or a flag to reproduce, that condition goes in the claim
  itself. A reader who cannot reproduce your number will conclude you made
  it up.
- **Never narrow this DoD.** If the item turns out bigger than it assumed,
  stop and report — do not rewrite what "done" means to match what you got.
- **Verify, don't assert.** curl the URL, run the query, list the files.
- **/humanizer on any reader-facing copy.** Company rule.
- **Real Malay at real length** in anything user-facing. English placeholder
  text hides the wrap problems that are the whole point.

## Stage 9 — the retrospective is part of the item

Before you report done, write a `## Retrospective` section into your
`docs/work-done/` entry answering four questions:
1. What did we learn that is not written down anywhere?
2. **Which document must change, and who owns that edit?** Name the file.
3. What did we do twice that we should never repeat?
4. What did we nearly ship, and what caught it?

Then MAKE the edits you named. A retrospective that names a document and
does not change it has failed.

## When you finish

Report in this terminal with **CLAIM + EVIDENCE + LIVE LINK**, not a summary.
Print a line starting `ITEM EXIT: 0` (or non-zero) so the watcher wakes.


