# UI-13 — Build the homepage diversity rule

**Sprint 05** - `design` - **5 points** - owner `creative-director`
**Dispatched:** 01 September 2026, after DES-17 landed
**Tracker:** `pnpm --silent sprint get UI-13 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

MEASURED LIVE ON PRODUCTION 01 Sept 2026, not carried forward: the homepage links 13 distinct articles across 26 links and ALL 26 are /artikel/hantaran-mas-kahwin/. The DES-03 spec measured this same condition on 28 August. Two sprints and four days later it is unchanged, because the rule it pointed to was never written (DES-17). This is the single most visible half of the owner's 'it does not look premium' complaint - a magazine front page that runs one section thirteen times does not read as a publication.

## DEFINITION OF DONE - verbatim, and it is not narrowed

The live homepage satisfies DES-17's H6 rule, verified by a COMMITTED SCRIPT that fetches https://hellokahwin.com/ and ENUMERATES the category segment of every article link (grep -oE '/artikel/[a-z0-9-]+/' | sort | uniq -c) rather than testing for an assumed class - the pre-fix baseline of 26/26 hantaran-mas-kahwin and the post-fix distribution are both pasted. The script exits non-zero when the rule is violated and is wired into the UI-06 layout gate so a future regression fails a build rather than waiting for a board meeting. A negative control is shown: the script run against the pre-fix HTML (committed as a fixture) exits non-zero.

## BRIEF

DO NOT test for .hk-eyebrow. UI-07 REMOVED that class and a selector matching it now matches zero elements - a check that would pass forever. That exact vacuous selector nearly got accepted on 31 Aug. Enumerate what IS there. Blocked on DES-17: do not invent the rule yourself, and if DES-17's rule turns out unbuildable, say so and hand it back rather than substituting your own.


## ⚠ DES-17 HAS LANDED. THE RULE EXISTS AND IT IS EXECUTABLE. USE IT.

You are no longer blocked. Do NOT invent the rule.

**The rule:** `docs/design/des-03-spesifikasi.html` section 7, rule H6, on branch
`feat/command-centre-dashboard` (merged as 8a05951). Read it there.

**Your instrument, already written and already proven:**

```
bash scripts/measure/check-h6.sh --corpus https://hellokahwin.com/sitemap.xml https://hellokahwin.com/
```

The CEO ran it against the live homepage before dispatching you. It exits **1** and prints:

```
H6.1  SHARE CAP  FAIL - hantaran-mas-kahwin=13, over ceil(N/3)=5
H6.2  RUN CAP    FAIL - 12 adjacent same-category pairs
H6.3  FLOOR      FAIL - 1 distinct categories, floor min(4,K,N-cap+1)=4
corpus: 86 published articles across 15 categories
        capacity at cap 5 = 47, required = 13
        H6 IS SATISFIABLE at N=13. A failure above is a build defect, not a corpus limit.
```

**That last line is your mandate.** The corpus can satisfy H6; the build does not. So
this is a selection/ordering defect in the homepage, not a content shortage, and
"there aren't enough articles" is not an available answer.

Fixtures to develop against: `docs/fixtures/2026-09-01-h6/` - pass 0, fail-run 1,
fail-share 1, fail-floor 1, fail-empty 1, pass-short 0. All six re-verified by the CEO.

**Your DoD is unchanged**, and `check-h6.sh` exiting 0 on the live homepage is now the
cleanest way to satisfy it. Wire it into the UI-06 layout gate so a regression fails a
build. Show the pre-fix output (above) beside the post-fix output.

**DO NOT test for `.hk-eyebrow`** - UI-07 removed that class and a selector on it matches
zero elements, i.e. a check that passes forever. Enumerate what IS there.

⚠ **Branch discipline, because it has bitten TWICE today.** `master` is the SITE space;
`feat/command-centre-dashboard` is the DOCS space. Site code goes to master; anything
under `docs/` goes to the docs line. CONT-14 pushed its paper trail to a feature branch
nobody reads, and DES-17 opened a PR from the docs line INTO master which would have
dumped the company record into the site source. Do not repeat either.

## HOW TO RECORD YOUR RESULT

```
pnpm --silent sprint set-state UI-13 in_progress --sprint 5
pnpm --silent sprint add-evidence UI-13 --sprint 5 --claim "..." --proof "..." --link "..."
```

**Do NOT set your own item to done.** The CEO verifies against production first.

---

## STANDING RULES

**DONE MEANS SHIPPED** - merged to the right branch AND deployed AND visible on a live URL.

**YOUR DoD IS NEVER NARROWED.** Bigger than expected: stay open, park with a reason, or
carry forward. Never rewrite the DoD to fit what you achieved.

**VERIFY YOUR OWN CHECKS.** When a check returns a surprising ABSENCE, verify the CHECK
first. Enumerate what IS there rather than testing for what you assume. **Never combine
`grep -o -i -F`** - it returns 0 in GNU grep 3.0 and reproduces on a 23-byte file; use
`bash scripts/measure/count-in-html.sh`. **A fix is not verified until it is run against
the failing case.**

**A status code proves nothing on its own.** Prove layout from COMPUTED values.

**STAGE 9 RETROSPECTIVE is part of this item.** In your `docs/work-done/` entry under
`## Retrospective`: what did we learn that is not written down; **which document must
change and who owns the edit - name the file**; what did we do twice; what did we nearly
ship and what caught it. **Then make the edit.** Prefer a gate or a script over prose -
prose rules do not fire.

**Report a block the moment it happens.**

## When you finish

Print your completion sentinel as the FIRST THING ON A LINE: the word `ITEM`, a space,
`EXIT:`, a space, then your exit code. Nothing else on that line. (Written out this way
deliberately - printing it literally in a brief made agents trip their own watchers.)
