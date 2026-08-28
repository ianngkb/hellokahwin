# SEO-10 — 31 articles emit no FAQ schema on a site whose long tail is question-shaped

**Sprint 03 · seo track · 3 points · owner `BMAD`**

ISOLATED WORKTREE of the site repo. Another agent works a sibling worktree on RISK-08 concurrently. Do NOT git checkout anything, do NOT touch the main checkout, and do NOT run git stash at all. Evidence from Sprint 02 already exists: docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json - read it rather than re-deriving the gap.

**Your branch is cut and checked out: `feat/seo10-faq-schema`.** Commit and push there; do not cut another.

## ⚠ CORRECTION — added 28 Ogos 2026 by head-of-seo-content (DES-09). Read this before you scope the emitter.

The title of this brief says 31 articles. **It is now 45**, and one of them will
break your emitter if you key it the obvious way.

Measured on 28 Ogos 2026 by a sequential sweep of all 103 sitemap URLs, reading
the delivered HTML — evidence and the re-runnable script are at
`docs/work-done/aug-28-2026-session-01/aug-28-2026-des-09-EVIDENCE/`:

| | Sprint 02 (26 Ogos, SEO-05) | Now (28 Ogos, DES-09) |
|---|---|---|
| articles carrying a "Soalan lazim" block | 31 of 69 | **45 of 85** |
| questions inside those blocks | not counted | **291** |
| pages emitting `FAQPage` | 0 | **0** — unchanged, still the whole gap |

The corpus grew from 69 to 86 articles between the two measurements. The gap
did not shrink; it got bigger.

**The thing that will bite you:** the "Soalan lazim" heading is **an `<h2>` on
39 articles and an `<h3>` on 6.** An emitter that matches `h2` silently skips
six articles, and the six are the mas-kahwin state cluster:

```
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri          <- highest-impression page on the site
/artikel/hantaran-mas-kahwin/mas-kahwin-johor
/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu
/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan
/artikel/hantaran-mas-kahwin/mas-kahwin-perak
/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak
```

Those six have no `<h2>` anywhere in the article body — their whole outline runs
`h1 h1 h3… h4… h2` where the only `h2` is the related-articles module at the
bottom. So matching on `h2` does not merely miss them; it would match the wrong
element if you widened the pattern carelessly. **Match on the heading TEXT
"Soalan lazim" at any level, and take the following headings at whatever level
they are, not at a level you assume.**

Two more things worth having:

- **`docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json` is
  not in this docs repo.** It is in the site repo. The DoD tells you to read it;
  look there, and if it is stale against the table above, the table above is
  newer.
- **What the site emits today**, per DES-09's census: articles emit `Article`,
  `BreadcrumbList`, `ImageObject`, `ListItem`, `Organization`, `WebPage` (85 of
  85), plus `Person` on 18, `ItemList` on 8 and `Place`/`PostalAddress` on 1.
  Category pages emit `BreadcrumbList`, `CollectionPage`, `ListItem`,
  `Organization`. **Homepage and `/artikel` emit no JSON-LD at all.** Your
  `FAQPage` block must be additive — DES-09's guardrails G13/G14 fail if any of
  those existing types stops being emitted.

---

## Why this item exists

Found during SEO-05. Question-and-answer blocks are earning no rich result on a site whose entire Malay long tail is question-shaped - which is the cheapest rich-result opportunity we have. Recorded as ONE emitter fix, not 31 article fixes. The original owner (full-stack-engineer) was retired to BMAD, which is why this has sat unowned.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: The emitter fixed. FAQPage JSON-LD present in the live HTML of at least five named articles that carry Q&A blocks. Validated against Google's Rich Results Test or the schema spec, with the result quoted. CHECKED BY: curl each of the five and extract the JSON-LD block literally. Do not infer from the route source. BEWARE THE FALSE PASS: Evidence file from Sprint 02 exists: docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json. Read it rather than re-deriving the gap. EVIDENCE LANDS: docs/work-done/ entry with the JSON-LD quoted from live HTML for five articles.

## Extra context from planning

Fix the emitter, THEN correct the writer instruction so it describes what actually happens - the instruction currently describes behaviour the code does not have.

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


