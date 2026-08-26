# Brief — Managing Editor — Supporting images, and the credit chain that makes them usable

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`.**

---

## The gap the owner named, stated honestly

Eight articles are live. **Every one carries a cover and nothing else.** No
in-article image has ever been produced, credited, or published on this site
under the new pipeline.

Separately, the 682 media items inherited from WordPress have **unverified
rights** — nobody recorded where any of them came from. They are on the live
site today inside the 29 legacy articles.

The owner's requirement is that supporting images exist **and that they credit
their original source so it can be traced back.** That is a standing rule, it is
enforced in the parser, and right now we satisfy it only by having no images at
all. That is compliance by absence, not by design.

You built the asset register and the licence template yesterday. This brief makes
them do work.

## Task 1 — Specify the supporting graphics we can make ourselves

The kit spec names six templates. `kad-tajuk` is built and rendering covers. The
remaining ones — `jadual-perbandingan`, `urutan-langkah`, `grid-kategori`, the
cost-band and ratio forms — are what turn our articles from text into something
worth citing.

**These are ours, so the credit chain is trivial and honest:**
`credit: HelloKahwin`, `licenseClass: G`, `licensorName: HelloKahwin`.

Do three things:

1. **Finish the specs** for the remaining templates to the same standard as
   `kad-tajuk` — inputs, Malay label conventions, brand tokens read from
   `globals.css`, output geometry, and the crop behaviour. Remember the lesson
   from `kad-tajuk`: a data-bearing card went **portrait 2464×3080** rather than
   2464×700 because blind cropping slices figures apart.
2. **Map every published and in-review article to the graphics it should carry.**
   Eight live C2.4, eight in review (P1, P6), twelve more being written now
   (P3, P4, P5, P7). For each, name the template, the data, and the Malay alt
   text. That mapping is what an engineer builds from without asking questions.
3. **Reopen the A1 in-article card decision you won.** You proved 13 of 13
   cluster keywords carry image SERP features, with the image pack at **position
   1 on `mas kahwin johor` (1,000/mo), above the AI Overview**, occupied by
   typographic data cards. A markdown table is not indexable as an image; a PNG
   of it is. **That argument generalises beyond A1** — tell me which of the live
   eight should get an in-article data card on the same evidence, and what it is
   worth.

## Task 2 — The credit chain for images that are NOT ours

This is the part that actually needs building, and it is where the owner's
requirement bites.

1. **Audit what is on the live site now.** The 29 legacy articles carry inherited
   images with no recorded provenance. For each, record what can be established
   and what genuinely cannot. **"Unknown" is the correct entry where it is true**
   — a fabricated provenance is worse than an honest gap. Load the findings into
   the register you built.
2. **Tell me the actual risk.** Which of those images are plausibly a real rights
   problem — a photographer's work on a Real Wedding feature — versus a stock or
   vendor image nobody will pursue. I want a ranked list, not a flat inventory.
   If the answer is that the exposure is low and we should not spend on it, say
   that and show me why.
3. **Build the request list.** Both writers are producing photography gap lists
   naming the vendors and photographers whose work would fill the holes in P4 and
   P5. Consolidate them into a single prioritised list, each paired with the
   right variant of your licence template — retroactive for the ten Real Wedding
   photographers whose images we already use, forward-looking for new vendors.
4. **Nothing is sent.** Outbound contact with real people is the owner's decision
   alone. Your output is a ready-to-send list; the owner decides if and when.

## Task 3 — Make the rule enforceable, not aspirational

Right now "always credit the original source" is enforced only at ingest, for
`cover`. Tell me what it would take to enforce it for **every** image, including
the legacy 682, and whether that is worth doing. A rule that only binds new
content while 682 unattributed files sit on the live site is half a rule.

## Rules

- Never invent a provenance, a licence, or a licensor.
- Any audience-facing text passes `/humanizer`.
- No outbound contact. No production writes.
- If the strategy document and reality disagree, reality wins — as it did when
  you found the "well over a thousand images" figure was derived from a rule that
  applies to SENARAI and not to the procedural templates carrying most of the map.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report: the finished template
specs, the article-to-graphic mapping with alt text, your ranked rights-risk
list, the consolidated request list, and your answer on enforcing credit for the
legacy 682.
