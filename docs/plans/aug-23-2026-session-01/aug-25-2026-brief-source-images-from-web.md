# Brief — Managing Editor — Source real photographs from the web, licensed and credited

**Status:** APPROVED — executing. Owner directive, 25 Aug 2026:
*"For all the articles you're producing, start sourcing relevant images from the
web to use."* Legacy images are explicitly **out of scope** — the owner will
handle those manually.

**Dispatch with `-PermissionMode bypassPermissions`.**

---

## What is being asked, and the one line I am drawing

Our articles need real photographs. Typography-only articles are worse articles,
and on P4 and P5 — baju pengantin, pelamin, hantaran, dekorasi — they are close
to useless.

**Source from the web. Do not take from the web.** Those are different acts and
only one of them is available to a commercial site that has staked its
credibility on traceable attribution.

Every image you bring back must have: a **licence that permits commercial use**,
a named **photographer or rights holder**, and a **URL that proves it**. If you
cannot produce all three, the image does not come.

That is not caution for its own sake. The parser enforces it, the owner's rule
demands it, and the 682-item legacy library is the exact mess this prevents.

## Where to source — the licence class decides

The parser already accepts stock as first-class. From
`src/lib/inspire/article-file.ts`:

```
V: vendor or photographer licence
C: couple submission
O: commissioned
S: stock            ← this is your lane
G: our own graphic
```

**Use `licenseClass: S` for everything you source.** Work in this order:

1. **Wikimedia Commons** — genuinely the best source for Malaysian and Malay
   cultural subject matter. Check each file's specific licence: CC0, CC BY and
   CC BY-SA are usable; **CC BY-NC and CC BY-ND are not** — non-commercial and
   no-derivatives both fail for us, and no-derivatives also breaks our crop
   pipeline. Record the exact licence string.
2. **Unsplash, Pexels, Pixabay** — clear commercial licences. Credit the
   photographer by name even where the licence does not strictly require it;
   that is our rule, not theirs.
3. **Openverse** — aggregates CC-licensed work across sources; useful for the
   long tail. Verify the licence at the origin, not from the aggregator's label.
4. **Government and authority images** — JAKIM, state Jabatan Agama, tourism
   boards. Often usable with attribution. Check the terms on the site itself.

**Not acceptable, whatever the article needs:** Google Images results, Pinterest,
another wedding blog, a vendor's site without written permission, or anything
whose licence you cannot read. "It was on the internet" is not a licence.

## The honest problem you will hit, and I want it reported

**Stock libraries are thin on authentic Malay wedding imagery.** Searching
"wedding" returns Western church and white-dress photography that is wrong for
this audience and would make the site look like a translation of somebody else's
site — which is the single worst outcome for a Malay-first brand.

So search in Malay and for the specific thing: `pelamin`, `baju melayu songket`,
`hantaran`, `akad nikah`, `bersanding`, `inai`, `kenduri`. Then **tell me
honestly what does not exist.** A short list of "no usable image exists for X"
is a genuine finding — it is the evidence for whether we commission photography
or open a vendor programme, and I would rather have it than a set of generic
substitutes that quietly cheapen the site.

**Never use a culturally wrong image because a correct one was unavailable.** An
article with fewer images beats an article with the wrong ones.

## What to do, concretely

**Scope: the articles we are producing.** Not the legacy 29.

- 8 live C2.4 articles (`/artikel/hantaran-mas-kahwin/`)
- 8 in review — P1 nikah procedure, P6 cost
- 12 being written now — P3, P4, P5, P7

For each article, decide honestly whether a photograph **helps**. Procedural and
numeric articles often do not — C2.4 is a state comparison and its own review
concluded photography adds nothing. **Do not force an image into an article that
does not want one.**

Where one helps:

1. Find it, verify the licence at source, and **download it** beside the article
   in `docs/plans/aug-23-2026-session-01/drafts/`.
2. Add it to the article's `images:` entry with **real Malay alt text** written
   for someone who cannot see it, an optional caption, `credit` in the
   licensor's own wording, `licensorName`, and `licenseClass: S`.
3. **Record every one in the asset register you built** — file, source URL,
   photographer, exact licence, date retrieved, and which article uses it. That
   register is how we answer the question years from now.

## Quality bar

- **Resolution** must survive the crop pipeline — `crop-16x9-og`,
  `crop-4x3-article-card`, `crop-4x5-mobile-cover`, `crop-4.3x1-desktop-hero`.
  A small image that pixelates on a phone is not usable.
- **Culturally correct.** Malay wedding, Malaysian context. Judge it as a reader
  in Kuala Lumpur would.
- **Not obviously stock.** A staged smiling couple against a white background
  makes us look like everyone else.

## Rules

- Never fabricate a photographer, a licence, or a source URL. If you are unsure
  what licence applies, the answer is no.
- Do not alter an image beyond the crop pipeline's own processing.
- No outbound contact with any photographer or vendor — that is the owner's
  decision and a separate list is already being prepared for them.
- Do not ingest or publish. Images go beside their articles; publishing is a
  separate act.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report: every image with its
article, photographer, licence and source URL; the register updated; **the list
of subjects for which no usable licensed image exists**; and your recommendation
on what that gap is worth spending to close.
