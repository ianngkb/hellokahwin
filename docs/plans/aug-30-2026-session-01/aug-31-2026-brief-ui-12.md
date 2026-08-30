# Brief — UI-12: card thumbnails carry 25 upscale and 31 aspect violations

**Sprint:** 04 — *Fix what shipped* · **5 points** · owner `creative-director`
**Tracker:** `pnpm --silent sprint get UI-12 --sprint 4` (from `~/Documents/Code/buddy`)

**YOUR WORKTREE:** `~/orca/workspaces/hellokahwin-site/ui12-thumb-geometry`

---

## Why this item exists — verbatim from the tracker

FOUND BY UI-06 GATE ON ITS FIRST LIVE RUN, 31 Aug, and it is exactly what the gate was built to surface. Against live production the gate reports narrow-text-column 0 and viewport-overflow 0 - UI-01 and UI-02 independently confirmed clean - but still exits 1 on image-upscale 25 and image-aspect 31. The homepage carries 12 image-aspect violations at 390 and 768, and 11 upscale plus 1 aspect at 1024 and 1440. These are the 12 .s-row CARD THUMBNAILS, not the hero: they render 176x132 from a 176x117 source, and upscale at desktop widths. UI-03 fixed the HERO and was scoped to the hero; the same class of defect was never in scope for the thumbnails. This is not a regression from UI-03 - it is pre-existing and newly visible because we finally have a tool that measures computed image geometry.

---

## Definition of done — verbatim from the tracker, NOT negotiable

The UI-06 gate exits 0 against live production for the image-upscale and image-aspect checks specifically - quote the totals line before and after, currently image-upscale 25 and image-aspect 31. Apply the image rules UI-03 documented rather than inventing new ones; UI-03 shipped a hero image rules document precisely so the next slot inherits them, and card thumbnails are the next slot. If a source asset genuinely cannot satisfy the aspect rule at every breakpoint, say which asset and why rather than loosening the threshold - the gate thresholds are not to be relaxed to make this pass.

---

## Brief — verbatim from the tracker

GATE: if the fix requires re-cropping source assets at scale, STOP AND REPORT with the count rather than starting a bulk re-crop inside this item. Run the gate yourself from the site repo: node scripts/ui-layout-gate.mjs --base https://hellokahwin.com. Do NOT weaken any threshold in scripts/ui-layout-gate.mjs to make the run pass - the gate is the deliverable of UI-06 and its self-test asserts these checks fire; a threshold change would be caught there and would be the wrong fix anyway.

---

## What the CEO wants you to know beyond the tracker

**This item exists because a tool found it, not because a person noticed it — and
that is the point.** UI-06's rendered-layout gate merged an hour ago and its first
live run against production surfaced this. Every structural check we own was green.

**The gate is in your worktree.** Run it yourself, it is the specification:

```
node scripts/ui-layout-gate.mjs --base https://hellokahwin.com
```

Current live totals: `narrow-text-column 0 · clipped-text 6 · viewport-overflow 0
· image-upscale 25 · image-aspect 31`. **The two zeroes are UI-01 and UI-02,
already fixed and independently confirmed by this gate. Your job is the last two
numbers.**

**⚠ DO NOT WEAKEN A THRESHOLD TO MAKE THIS PASS.** The gate's own self-test
asserts these checks fire on committed known-bad fixtures, so a threshold change
would break that test — and it would be the wrong fix regardless. The gate is
UI-06's deliverable and it is not yours to relax.

**Inherit UI-03's rules rather than inventing new ones.** UI-03 shipped a hero
image rules document *specifically so the next slot inherits them*, and card
thumbnails are the next slot. Read it before you decide anything.

**GATE:** if the fix needs source assets re-cropped at scale, **STOP AND REPORT
with the count** rather than starting a bulk re-crop inside a 5-point item.

---

## Standing rules

**DONE MEANS SHIPPED** — merged to `master`, deployed, visible on a live URL.

**NEVER NARROW YOUR DoD.** If this is bigger than 5 points, say so and let it be
re-sized or parked. Rewriting the DoD to fit what you achieved is the one thing
that makes velocity a lie.

**VERIFY YOUR OWN CHECKS.** When a check returns a surprising absence, verify the
CHECK first. In this sprint: a grep for `Kredit` returned zero on a page carrying
forty credits; a 5-page sample "disproved" an agent's count until the CEO noticed
the sample was drawn entirely from the affected subset. Enumerate, do not assume.

**ONE WRITER PER CHECKOUT.** Six agents are working concurrently in their own
worktrees. Stay in yours, never `git checkout`/`reset`/`stash` a tree with work in
it, and merge with a merge commit rather than a squash if you conflict.

**Stage 9 retrospective is part of the item** — what did we learn that is not
written down; which document must change and who owns the edit; what did we do
twice; what did we nearly ship and what caught it. **Then make the edits**, and
prefer a DoD clause, a checklist item or a script over prose.

Log to `docs/work-done/aug-30-2026-session-01/`, keep the README current, and
print `ITEM EXIT: 0` at the start of a line when done.
