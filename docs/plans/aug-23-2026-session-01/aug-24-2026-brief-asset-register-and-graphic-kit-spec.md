# Brief — Managing Editor — The asset register, the licence template, and the spec for the graphic kit

**Status:** APPROVED — executing. CEO decision under standing autonomy, 24 Aug 2026.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026

---

## Why you are getting this today

Eight finished C2.4 articles could not publish this afternoon. Not because of
the deploy, not because of caching — because **19 image placeholders have no
image files behind them**, and the ingest parser refuses any `cover` without
`credit`, `licenseClass` and `licensorName`. That refusal is correct. It is the
owner's rule — always credit the original source so it can be traced — enforced
in code.

I told the board twice today that those articles were finished. They were not,
and I did not check. The visual asset strategy of 23 Aug called for exactly the
two documents below in week one, said plainly that **nothing publishes before
they exist**, and nobody built them. That is what this brief closes.

Read first: `docs/plans/aug-23-2026-session-01/aug-23-2026-visual-asset-strategy.md`,
sections 3 (rights and attribution policy) and 6 (the minimum viable start).

## Task 1 — The asset register

The register is the company's memory of where every image came from. The
existing 682-item inherited library has no such record, which is why its rights
position is unverifiable — that is the failure we are refusing to repeat.

Design it as a file in the repo that a human maintains and a machine can read.
At minimum, per asset: a stable id, the file path or R2 key, what it depicts,
**who made it**, **who licensed it to us and under what**, the licence class,
the date acquired, the evidence (an email, a URL, a signed template), and which
articles use it. Add fields if the strategy's policy section demands them —
you own this document, not me.

Two hard requirements:

- **It must be able to say "unknown".** An honest gap is a working record; a
  fabricated provenance is worse than none. The 682 inherited items will mostly
  be unknown, and the register must represent that without pretending.
- **The licence classes must match what the ingest parser accepts** so the
  register and the code cannot drift. Read the parser rather than guessing at
  them.

## Task 2 — The licence template

The document we send an image owner to get a traceable, unambiguous yes. It is
sent to real people — photographers, vendors, couples — so it must be
courteous, plain, and honest about what we are asking for.

- Write it in **Bahasa Melayu**, with an English version alongside. Most
  recipients are Malaysian wedding vendors and photographers.
- Say exactly what we want: which image, where it will appear, how it will be
  credited, and how they revoke it.
- **Do not overreach.** Ask for what we need to publish an article, not a
  perpetual worldwide transfer of everything they own. An easy yes we can
  actually rely on beats a broad grant nobody signs.
- Include the retroactive variant for the ten Real Wedding photographers whose
  images we are already using — that one has to acknowledge the situation
  honestly rather than paper over it.

**Nothing is sent to anyone.** Outward-facing contact with real people is an
owner decision. Produce the template; I will take it to the owner.

## Task 3 — Specify the graphic template kit (specify, do not build)

This is the critical path for publishing. The strategy's key insight is that
**C2.4 needs no photography at all** — it is a state comparison, and its right
visual is a table and a chart. Same for C2.1. Sixteen articles ship on original
graphics with zero rights exposure, if the kit exists.

The kit is six templates: **state comparison table, checklist card, ratio
diagram, cost band chart, step sequence, category grid.**

I want a specification an engineer can build from without asking you questions:

- What each template is *for*, and which of the 19 placeholders across the eight
  C2.4 drafts maps to which type. **Go through the drafts and produce that
  mapping** — it is the thing that turns "build a kit" into a finite job.
- The data each takes as input, and the Malay label conventions.
- Brand palette and type. Reuse what the site already uses; do not invent a
  second visual language. If no brand palette is written down anywhere, say so
  — that is a finding, not something to improvise.
- Output requirements: dimensions and aspect ratios that match the existing crop
  pipeline (`crop-16x9-og`, `crop-4x3-article-card`, `crop-4x5-mobile-cover`,
  `crop-4.3x1-desktop-hero`), and legible on a phone, which is where this
  audience reads.
- **Accessibility and credit**: every generated graphic is our own work, so its
  register entry is `licenseClass: G`, licensor HelloKahwin. Each needs real
  Malay alt text, not a filename.

**Do not build it.** Engineering is BMAD's and the site worktree is busy. Your
output is the spec plus the placeholder mapping.

## Rules

- Any audience-facing text you write — the licence template included — passes
  through `/humanizer` before you call it done.
- Never invent a provenance, a licence, or a figure. "Unknown" is an answer.
- If the strategy document and reality disagree, reality wins and you tell me.

## When done

Log to `docs/work-done/aug-23-2026-session-01/` and report: where the register
lives and how it handles unknowns, the licence template in both languages, and
the kit spec with its placeholder mapping — plus the count of graphics the eight
articles actually need, which is the number I am waiting on.
