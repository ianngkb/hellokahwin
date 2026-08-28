# Brief - Sprint 02 - SEO-04: Venue entity pages — commercial brands with real demand, not council halls

**Status:** APPROVED - executing. The LAST undispatched item in Sprint 02.
**Repo:** `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.**

## Why (verbatim from the tracker)

The premise was right — entity pages beat listicles — and the target list was wrong. nikahsatu.com (DR 14) earns ~4,900 traffic from /venue/[slug] ENTITY pages against ~293 from its geographic hubs. Roughly 17x. Their winners are COMMERCIAL VENUE BRANDS with real brand demand: arjuna-melaka 882 traffic at volume 2,400; arjuna-johor-bahru 691 at 1,800; villa-rimba-flora-gombak 670 at 1,800; jiwa-damansara 431 at 1,200. THE FOUR HALLS THIS ITEM ORIGINALLY NAMED ARE COUNCIL HALLS TOTALLING ~30 SEARCHES A MONTH: setiawangsa 10, perdana keramat mall 20, keramat 0, mpaj tasik tambahan 0. Two structural problems, neither fixable with a better template — almost no brand search demand, and what exists is held at position 1–2 by the council's own booking portal (tempahkl.dbkl.gov.my, DR 64). We could build those four perfectly and earn near zero. Commercial venues have the inverse profile: high volume, no competing official portal, and the incumbent is a DR 14 site with thin pages carrying no capacity data. Multi-location brands multiply one template into N pages — Rumah Abang Jamil alone gives nikahsatu seven pages worth ~1,070 combined.

## Correction added 28 Aug 2026 by SEO-10 — the FAQPage part of the DoD

The DoD below asks venue pages for `EventVenue + LocalBusiness + FAQPage` schema.
**Build all three; the DoD is not narrowed.** But do not cost `FAQPage` as a rich
result, and do not report it as one. Google restricted FAQ rich results to
well-known government and health sites on 8 Aug 2023 and retired the feature
outright on 7 May 2026 — it no longer appears in Google Search for anybody. The
markup is still valid, still free, and still read by consumers other than Google
Search, which is why it stays in the spec. `EventVenue` and `LocalBusiness` are
unaffected.

Measured and evidenced by SEO-10: site repo
`docs/work-done/2026-08-28-seo-10-faq-schema.md`.

## Definition of done (verbatim - the bar, NOT narrowed)

GATE FIRST, BEFORE ANY PAGE IS BUILT: one hour confirming we can SOURCE real prices and capacities at scale for commercial venues, and whether nikahsatu's venue pages are paid listings or partnerships giving them data access we lack. Report the answer. If sourcing fails, STOP and bring it back — do not build pages with invented or boilerplate figures, and do not quietly downgrade to council halls. Then: at least EIGHT entity pages across two or more multi-location venue brands at 400+ monthly brand volume each — eight is the cluster floor, below which it does not read as coverage. PLUS Dewan Komuniti Setiawangsa as a DELIBERATE CONTROL, the only council hall with measured demand (~150 GSC impressions across its name variants): if a properly built Setiawangsa page still earns nothing while the commercial pages rank, that confirms the council-hall category is structurally dead for us and no later sprint rediscovers it. Every page carries alt_names — GSC proves one building is searched three ways. Every fact carries its source and the date checked. Route /dewan/[negeri]/[slug], separate from /artikel/. EventVenue + LocalBusiness + FAQPage schema. Venue name in the first two words of a sub-60-character title. Proof: quote capacity and booking line from live HTML for two venues, with a negative control. EXPECT POSITION 3–5, NOT 1 — the venue's own site holds 1 and nikahsatu is entrenched at 2. Say so in the report rather than promising position 1.

## READ THIS BEFORE YOU BUILD ANYTHING: the gate is real and it can stop the item

The DoD opens with a one-hour sourcing check, and **it is allowed to kill this
item**. That is not a formality:

- Can we obtain **real prices and capacities at scale** for commercial venues?
- Are nikahsatu's venue pages **paid listings or partnerships** giving them data
  access we do not have?

**If sourcing fails, STOP and report.** Do not build pages with invented or
boilerplate figures, and do not quietly downgrade back to council halls - the
whole point of the re-scope was that council halls have ~30 searches/month and
sit behind the operator's own DR 64 booking portal.

A parked item with a clear reason is a good outcome here. A directory of
plausible-looking invented capacities is the worst possible one: this site's
entire competitive claim is that its numbers carry sources.

## What was already established, so you do not re-derive it

- nikahsatu.com (DR 14) earns **~4,900 traffic from /venue/[slug] entity pages**
  against ~293 from its geographic hubs. Roughly 17x.
- Their winners are **commercial venue brands**: arjuna-melaka 882 traffic at
  volume 2,400; arjuna-johor-bahru 691 at 1,800; villa-rimba-flora-gombak 670 at
  1,800; jiwa-damansara 431 at 1,200.
- **Multi-location brands multiply one template into N pages** - Rumah Abang
  Jamil alone gives nikahsatu seven pages worth ~1,070 combined.
- **Expect position 3-5, not 1.** The venue's own site holds 1 and nikahsatu is
  entrenched at 2. Say so in your report rather than promising position 1.
- `alt_names` is REQUIRED per venue: GSC proves one building is searched three
  ways ("Dewan Komuniti Setiawangsa", "Pusat Komuniti Setiawangsa", "Dewan
  Setiawangsa AU2").

## The Setiawangsa control is part of the deliverable, not a leftover

Keep **one** council hall - Dewan Komuniti Setiawangsa, the only one with
measured demand (~150 GSC impressions across its name variants). If a properly
built Setiawangsa page still earns nothing while the commercial pages rank, that
**proves the council-hall category dead** rather than leaving it to be
rediscovered as a finding two sprints from now.

## Live state - CEO-verified tonight, do not regress it

- **UX-01 is on master**: the mobile header is restored on article pages, nav tap
  targets are 44px. Your new route must not reintroduce `data-hide-mobile-nav`.
- **RISK-06**: `stale-while-revalidate` capped at 3000s. Re-check it reads 3000
  after anything you merge.
- **RISK-04**: ingest resubmits the sitemap, so a new route reaches Google fast.
  **Put the venue pages in the sitemap** or they inherit the exact invisibility
  this sprint opened by fixing.
- **RISK-05**: an indexing monitor now runs from master and alarms on dark URLs.
  Your pages will be watched automatically - which also means a broken one will
  file an issue.
- **The cover rule changed**: the "photograph of people" requirement is RETIRED.
  Quality bar instead - never upscaled (source >= 2464x2400), sharp subject,
  contrast that survives a 320px card. Venue photos must carry full credit like
  any other image.
- **UX-02 is live in `article-renderer.tsx` right now** adding heading ids and
  ItemList/Place JSON-LD. **Coordinate rather than race** - if your venue schema
  touches the same renderer, say so and sequence.

## Shipping

- **Committed is not shipped.** Two items tonight were found finished but
  unpushed; the CEO had to push and merge them.
- **Verify by CONTENT on the default branch, never ancestry** -
  `git merge-base --is-ancestor` returns false forever for a squash-merged branch.
- **Prove it from the response body plus a negative control.** A status code
  proves nothing; `/dewan/<nonsense>` returning 404 is what shows real routing.

## Report format

**CLAIM + EVIDENCE + LIVE LINK.** Quote literal output. If the sourcing gate
fails, that report IS the deliverable - make it a good one, with what you tried
and what it would take.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** - Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship
and what caught it. **Then make the edit.**
