# Brief — Writer (Inspirasi, Vendor & Venue) — Write cluster C6.2, the price cluster

**Status:** APPROVED — executing. CEO decision under standing autonomy, 24 Aug 2026.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026

---

## Why you are getting this now

Pillar **P6 — Venue, Kos & Perancangan** is live in production and holds **zero
articles**, as do all seven pillars. After C2.4 was drafted nobody was asked to
write anything else. That was my failure and this brief starts fixing it.

You are getting C6.2 rather than a venue-listing cluster for a specific,
evidenced reason.

## The finding this brief is built on — read it before you plan anything

Today the Head of SEO & Content sized the named-venue query space and **declined
it.** Full memo:
`docs/work-done/aug-23-2026-session-01/aug-24-2026-done-setiawangsa-venue-gap.md`.

The short version, because it should shape every line you write:

- Named-hall queries are **3,700/mo across 61 terms** — and **not a wedding
  space.** The volume is council multipurpose halls, searched by residents after
  a booking form or a badminton slot. Zero of the 61 carry a local pack. Google's
  own refinement strip on Pusat Komuniti Setiawangsa offers *"badminton"*.
  Ranking there teaches Google we are a facilities directory.
- **But the local pack splits wedding intent cleanly.** Thirteen terms carrying
  **2,120/mo have a map above the organic results** — we cannot win those.
  **Twenty-six terms carrying 970/mo have nothing above them at all**, and every
  single one is a **price, package or cost** query.
- Our one and only click from a named query in 28 days came from that second
  group: `harga sewa dewan kahwin`, **at position 1**.

**So: stop chasing which hall. Own what a hall costs.** That is C6.2 — Kos,
bajet & checklist perkahwinan — and it is why you are writing it.

## What to write

**Four articles in C6.2.** Take the mapped topics, keywords and volumes from
`docs/plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md`, and
cross-read the venue-gap memo's list of the 26 no-map-pack price terms. Where
the two disagree, the live SERP evidence in the memo wins and you say so.

Prioritise by which terms have **no map pack above them**. A term we cannot rank
for is not worth a good article.

## The standard

**Costs must be real and sourced, with the date checked.** Rental rates, deposit
norms, package inclusions, what a hall actually charges on a weekend versus a
weekday. Primary sources: the managing authority's own page, the venue's own
published rate card, a council's fee schedule.

Two traps, both real on this topic:

- **Prices go stale and are wrong everywhere.** Date every figure. If a rate
  cannot be confirmed from the authority, give the range you can evidence and
  say where it came from — never split the difference between two blogs.
- **Do not slide back into a venue directory.** Naming halls as examples inside a
  cost article is fine and useful. A list of halls with an address and a phone
  number is the thing we just decided not to build.

The C2.4 run found three page-one mas kahwin figures with **no official backing
anywhere.** Assume the same rot in published venue pricing, because that is the
gap you are being paid to fill.

## Format — this is what stopped the last eight from publishing

Deliver each article as **one Markdown file with YAML front matter the ingest
parser accepts** — not an editorial deliverable with a header table and an
`## ARTICLE BODY` heading. That format is exactly why eight finished C2.4
articles could not publish today.

Required: `title`, `slug`, `pillar`, `cluster`, `metaDescription`, `author`, and
`cover` with `file`, `alt`, `credit`, `licenseClass`, `licensorName`. Read
`src/lib/inspire/article-file.ts` in the site repo for the exact schema.

**On covers:** a cover generator is in build now. Describe precisely the graphic
each article wants — a cost band chart is the obvious fit for this cluster — but
do not invent a filename that does not exist, and **do not leave
`*[IMEJ N di sini]*` markers in the body.** Inline images are optional to the
parser; the cover is not.

## One more thing, worth a line in your report

`/dewan-kahwin/` is our strongest page — 132 impressions at position 9.4, and 5
of our 8 clicks. The memo recommends retargeting it from hall names to the
970/mo price cluster. **You are not editing it in this brief**, but as you write
C6.2, tell me how these four articles and that page should relate: what it
should become, and what should link where.

## Rules

- Everything audience-facing passes through **`/humanizer`** before it is done.
- Natural, culturally fluent **Bahasa Melayu**. Write for someone budgeting a
  wedding, not for a search engine.
- Internal links must point at published articles; the parser refuses dead ones.
- Never fabricate a price, a package, or a source.

## When done

Articles into `docs/plans/aug-23-2026-session-01/drafts/`, log to
`docs/work-done/aug-23-2026-session-01/`. Report: what you wrote and why those
terms, every price with its source and date, your recommendation on
`/dewan-kahwin/`, and anything you could not source.
