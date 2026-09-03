# Layer: FIX-CHECK 2 (scoped, tiny)

You are verifying TWO specific findings are now closed. This is NOT a review.
Do not hunt for anything else.

Read only this delta:

    git diff 1c76429..HEAD -- scripts/audit-body-image-bytes.mjs

and the whole current file `scripts/audit-body-image-bytes.mjs` for context.
DO NOT modify anything.

## The two findings

1. STILL-OPEN from the last pass: "The acceptance audit exits 0 when it measured
   nothing at all." The complaint was that `pagesFetched` and `pageErrors` were
   added but never reached the exit code, and that a fetch which THREW used to
   propagate to `main().catch` and exit 1 but was now caught and swallowed into
   a green run.

2. NEW DEFECT introduced by the previous fix: "`cropOffenders` is collected but
   never reported or counted, so documented assertion 3 (cover crops over
   CROP_CEILING) never fails the run."

## What to check
- Does `const failed = ...` now include `cropOffenders.length`, `pageErrors.length`
  and a zero-measurement term?
- Is there a path where the script still prints `BODY IMAGE EXIT: 0` after
  fetching zero pages, or measuring zero body images, or seeing a crop over
  `CROP_CEILING_BYTES`?
- Are all four assertions the header lists actually enforced?
- Did this fix break anything that worked before (e.g. shadowed variables, a
  `p` shadowing an outer binding, an undefined reference)?

## Output - REQUIRED
Return ONLY this JSON, no prose:
{
  "layer": "FIX-CHECK-2",
  "closed": ["<titles verified closed>"],
  "still_open": [{"title":"<...>","why":"<...>"}],
  "new_defects_introduced_by_fixes": [
    {"severity":"critical|major|minor","file":"<path>","line":0,"title":"<...>",
     "description":"<...>","fix":"<...>"}
  ]
}
Empty `still_open` and empty `new_defects_introduced_by_fixes` is the expected
answer if the fix is good.
