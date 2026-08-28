# SEO-04 — Venue entity pages, sourced from PUBLISHED records

**Sprint 03 · content · 8pt · owner `head-of-seo-content`**

DOCS repo for planning and drafts. **Work on the current branch.** Commit and push.

## THE METHOD CHANGED — CEO decision, 29 Aug. Read this first.

This item was revived on **"phone-verify eight venues"**. That was the CEO's error:
you cannot make telephone calls, so the gate would have fired on every dispatch — the
gate working and the assignment being wrong.

**The method is now: source real prices and capacities from PUBLISHED records.**
Operator websites, official rate cards, dated venue listings, booking portals. Every
figure carries its source URL and the date you read it.

## THE GATE IS UNCHANGED IN FORCE

**Spend a bounded first pass confirming eight venues can be sourced that way. If they
cannot, STOP and bring it back.** A parked item with a clear reason is a good outcome
here and costs 8 points; a directory of plausible invented capacities costs the thing
the whole product sells.

Still forbidden, verbatim from the original brief:

- **Do NOT invent a capacity or a price.** Not one, not "approximately", not from a
  photograph.
- **Do NOT quietly downgrade to council halls.** Decision 83 killed them: about 30
  searches a month between four, with DBKL's own DR 64 portal at positions 1–2.
- **Where no published figure exists, record that as the finding**, dated — exactly as
  the mas-kahwin work records states that set no minimum.

## Setiawangsa is still the declared CONTROL

Decision 83 kept it deliberately so the council-hall category is PROVED dead rather
than quietly dropped. SEO-04's first park meant the control never ran. It runs this
time.

---

## Why this item exists

Parked in Sprint 02 at its own sourcing gate: real prices and capacities could not be sourced at scale. The gate firing was the correct outcome and the item built nothing rather than inventing capacities. Its own park recommendation is the way back in: PHONE-VERIFY eight venues and publish with 'disemak Ogos 2026' - the method that built mas-kahwin-ikut-negeri and the method our whole competitive claim rests on. CARRIED FROM THE SPRINT 02 RETRO, verbatim, because the planning pass lost this detail: RE-SCOPED 26 Aug on competitor data the CEO never pulled, correcting the CEO original finding AND the SEO review own first recommendation. The premise was right - entity pages beat listicles - and the target list was wrong. Evidence: nikahsatu.com (DR 14) earns about 4,900 traffic from /venue/[slug] ENTITY pages against about 293 from its geographic hub pages. Roughly 17x. Their winners are COMMERCIAL VENUE BRANDS with real brand demand: arjuna-melaka 882 traffic at volume 2,400, arjuna-johor-bahru 691 at 1,800, villa-rimba-flora-gombak 670 at 1,800, jiwa-damansara 431 at 1,200, rumah-abang-jamil-klang 275 at 600. THE FOUR HALLS THIS ITEM ORIGINALLY NAMED ARE COUNCIL HALLS TOTALLING ABOUT 30 SEARCHES A MONTH: setiawangsa 10, perdana keramat mall 20, keramat 0, mpaj tasik tambahan 0. Two structural problems, neither fixable with a better template - there is almost no brand search demand, and what exists is held at position 1-2 by the council own booking portal tempahkl.dbkl.gov.my at DR 64. We could build those four perfectly and earn near zero. Commercial venues have the inverse profile: high volume, no competing official portal, and the incumbent is a DR 14 site with thin pages carrying no capacity data. Multi-location brands multiply one template into N pages - Rumah Abang Jamil alone gives nikahsatu seven pages worth about 1,070 combined.

## Definition of done — verbatim from the tracker, NOT negotiable

GATE FIRST â€” GATE FIRST, BEFORE ANYTHING IS BUILT: phone-verify eight venues. If eight cannot be verified, STOP and bring it back. Do NOT invent a capacity or a price, and do NOT quietly downgrade to the council-hall target that decision 83 already killed. A parked item with a clear reason is a good outcome here. A directory of plausible invented capacities is the worst possible outcome on a site whose entire claim is that its numbers carry sources - and the hardest to detect months later. OBSERVABLE: Eight entity pages live, each returning 200 on first request, each carrying its source authority and the date checked. Sitemap count rises by exactly the number published. Setiawangsa published as the declared CONTROL. CHECKED BY: curl each page first-request. Quote the sourcing line from live HTML. Count the sitemap before and after. CONTROL: Setiawangsa runs as a deliberate control so the council-hall category is PROVED dead rather than quietly dropped. Decision 83 declared this control and SEO-04's park meant it never ran. It runs this time. EVIDENCE LANDS: docs/work-done/ entry with the phone-verification record per venue - who was called, when, what was confirmed. PLUS THE CARRIED-FORWARD DoD, which is more specific than the one written at planning and is NOT superseded by it: GATE FIRST, BEFORE ANY PAGE IS BUILT: spend one hour confirming we can SOURCE real prices and capacities at scale for commercial venues, and check whether nikahsatu venue pages are paid listings or partnerships giving them data access we lack. Report the answer. If sourcing fails, STOP and bring it back - do not build pages with invented or boilerplate figures, and do not quietly downgrade to council halls. At least EIGHT entity pages across two or more multi-location venue brands with 400+ monthly brand volume each - eight is the cluster floor, below which it does not read as coverage. PLUS Dewan Komuniti Setiawangsa as a DELIBERATE CONTROL: it is the only council hall with measured demand (about 150 GSC impressions across its name variants), so if a properly built Setiawangsa page still earns nothing while the commercial pages rank, that confirms the council-hall category is structurally dead for us and no later sprint rediscovers it. Every page carries alt_names because GSC proves one building is searched three ways. Every fact carries its source and the date checked - no invented capacities or prices. Route /dewan/[negeri]/[slug], separate from /artikel/. EventVenue + LocalBusiness + FAQPage schema. Title formula puts the venue name in the first two words, under 60 characters. Proof: quote the capacity and booking line from live HTML for two venues, with a negative control. Baseline per brand query on ship day. EXPECT POSITION 3-5, NOT 1 - the venue own site will hold position 1 and nikahsatu is entrenched at 2. Say so in the report rather than promising position 1.

## Planning context

Expected outcome is position 3-5, not 1 (decision 83). Commercial venue brands, not council halls. Resolve the operator before ranking a competitor - nikahsatu is the venue OPERATOR, not a competitor, which is the correction Sprint 02's retro made.

---

## Two standing rules that bind this item

- **Name the Ahrefs volume field** at every use — quote the 12-month average and say
  so. SEO-08, CONT-10 and CONT-11 all did this correctly; match them.
- **Apply the SERP-ownership rule to what you CHOOSE, not just to what you reject.**
  Volume AND who holds position 1. Expected outcome is position 3–5, not 1 — the
  venue's own site will hold 1 and nikahsatu is entrenched at 2. Say so in the report
  rather than promising position 1.

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


