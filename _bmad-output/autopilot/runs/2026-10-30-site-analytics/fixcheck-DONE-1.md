STATUS: done

- **Verdict: `findings`**, with 1 finding still open (minor). The verdict was re-stamped at `C:/Users/Ian Ng/.claude/review-log/hellokahwin/ianng89-hellokahwin-site-analytics.json`.
- **HEAD stamped:** `8d61eaf98c91207c2da36077a18a0b510c2610dc`. `sha` and `reviewedCodeHead` are both set to it, and the reviewed delta is `ceceb17..8d61eaf`.
- **How it ran:**
  - One headless `claude -p --model claude-opus-5-5` session at rung 0, in the Orca terminal `reviewer (opus) fix-check`. Policy is claude-primary with Codex disabled.
  - It took 111 s of wall time and exited 0.
  - It answered all 46 findings, one line each. Raw output is in `fixcheck-1-raw.txt` and the prompt is in `review-prompt-fixcheck.txt`.
- **Round result:**
  - 45 resolved: 37 closed plus 8 rebuttals accepted.
  - 1 still open.
  - 1 class override.
  - `by_class`: defect-user 5, defect-edge 27, test-gap 3, paperwork 1, rebutted 8, duplicate 2.

## Still open

- **F17**: `src/lib/analytics/resolve-page-titles.ts:49` (lookup at :100-104), minor. **Rebuttal rejected.**
  - The fixer's rebuttal holds for the wrong-category half: the page issues a `permanentRedirect` before render.
  - It does not hold for the unpublished half. The title lookup has no `status = 'published'` filter. Meanwhile the article page 404s on unpublished slugs (`artikel/[category]/[slug]/page.tsx:193`) inside the tracked public layout.
  - Result: a 404 pageview on an unpublished or withdrawn article still shows that article's real title in the admin panels.
  - To close it: add a published-status filter to the article title lookup and leave unpublished paths unresolved, with a test.

## Rejected rebuttals

- **F17**, as above. The other 8 rebuttals were accepted, each with the spec or decisions.md reference the fix-check cited:
  - F15: the only writer of the cookie sets it host-only.
  - F16: twn-new parity, recorded in decisions.md:257.
  - F23: CAP-6 and CAP-3, plus decisions.md:258.
  - F24: CAP-8, plus decisions.md:302 and :311.
  - F25: CAP-6.
  - F27 and F28: CAP-9 and CAP-6, plus decisions.md:268.
  - F31: CAP-15 and the "used as-is" constraint.

## Class overrides (1)

- **F17**: the fixer's class was `rebutted` and the fix-check's is `defect-edge`. The rebuttal was rejected, and only unpublished or withdrawn article URLs that still get traffic trigger it. It is marked `class_overridden: true`.

## Runner judgement call (recorded in the verdict `note`)

- **F26**: the fix-check wrote `REBUTTAL_ACCEPTED`, but the evidence on that same line says "this is a fix, not a rebuttal; the line should read CLOSED".
  - The fixer reported it as fixed. The code at `sql-filters.ts:88-91,137-141` shows the normalisation landed.
  - I recorded it as **closed**, class `defect-edge`. That is the fixer's class, which the fix-check's CLASS tag repeated, so it is not an override.

## Next

- One fix pass for F17 only, then fix-check round 2, scoped to F17. Per the procedure there is no fresh full review.
