# Brief — Head of SEO & Content — Production Doctrine & Visual Assets

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Board status:** the cluster launch plan is **APPROVED**. Writer hires and
pillar pages are still pending; this brief does not need them.

The board approved the plan, then asked two questions. One you have largely
answered and need to sharpen. The other is a genuine hole in our production
system and is the more important half of this brief.

> "I want to know your plan on how you are planning to write your articles,
> the framework of how you are planning on writing it so it **overtakes the
> competitors over time**, also **how are you sourcing your photos and visual
> aids**."

Still strategy. **Write no content**: no articles, drafts, outlines or sample
paragraphs. A worked *example* of a structure is fine where it makes a rule
concrete; a finished article is not.

---

## Part A — The competitive mechanism (sharpen what exists)

Your framework already specifies templates, a 21-point quality bar and
linking rules. What it does not yet state plainly is **why this system beats
the incumbents over time, and what happens when they react.** That is the
board's actual question. Deliver
`aug-23-2026-production-doctrine.md` covering:

1. **The mechanism of overtaking.** Two quality-bar lines carry the whole
   strategy — "no competitor page on page one answers something this page
   does not" and "at least one specific, checkable fact a competitor does not
   have". Make that explicit as doctrine: what a writer concretely does,
   article by article, to guarantee it. How do they establish what the
   incumbents cover before writing? What is the check before QC passes?
2. **Why we beat ppsignature.com, nikahsatu.com and songketdunia.my
   specifically.** You have their numbers. What is each one weak at that we
   are structurally strong at, and what is each strong at that we cannot
   easily take? Be honest about the second half — ppsignature at DR 4 with
   1,493 top-three keywords is not weak.
3. **Compounding.** How does article 60 rank faster than article 6? Name the
   assets that accumulate — cluster completeness, internal link equity,
   entity recognition, refresh cadence — and the point at which we expect
   each to start paying.
4. **The counter-attack case.** If an incumbent notices us and starts
   publishing properly, what is our defensible position? What could we lose?
5. **Failure modes and the stop rule.** What would tell us the doctrine is
   not working, at 30/60/90 days, distinguished from normal SEO lag and from
   the noise of the 21 Aug URL migration. State the number that would make
   you tell the CEO to change course.

## Part B — Visual assets (the gap)

Nothing in the framework or the plan says where a single photograph comes
from. Meanwhile the framework mandates "one image per H2 minimum", "8-15
images" for Real Weddings, photos on every directory page, and forbids "stock
photo of a non-Malay wedding on a page about adat". Across 204 mapped topics
that is well over a thousand images we have no source for. Deliver
`aug-23-2026-visual-asset-strategy.md` covering:

1. **Audit what we already own.** The export at `data/hellokahwin-export/`
   holds 682 media library items (~6,759 files). What is actually in there,
   what is reusable, and — critically — **what do we know about rights?**
   These came off the old WordPress site; some may be vendor-supplied, some
   may be TWN's, some may be licensed. Report what is verifiable and what is
   an open legal question. Do not assume we own anything.
2. **The sourcing strategy, per content type.** Different templates need
   different visuals: a *panduan* on rukun nikah needs explanatory graphics
   more than photography; a *senarai* of pelamin styles needs many real
   photos; a *direktori* page needs venue photos; a Real Wedding needs a full
   set. Propose a source for each, with the trade-offs:
   - **Vendor/photographer partnerships** — photos in exchange for credit and
     a directory link. This is how TWN and most wedding media work. What
     would the offer be, and what does it cost us to run?
   - **Real Wedding submissions** from couples — the classic supply engine.
   - **Stock** — what actually exists for Malay/Muslim weddings, and where it
     runs out.
   - **Original graphics** — checklists, cost tables, procedure diagrams,
     comparison charts. Cheap, ownable, and often better than a photo for
     procedural clusters. Say how much of the map this can serve.
   - **AI-generated imagery** — give a clear recommendation with reasoning.
     Consider authenticity risk on cultural/adat content, reader trust, and
     that a Malay wedding rendered wrongly is worse than no image.
3. **Rights and attribution policy.** What we will and will not publish, how
   credit is given, what we record per asset so a rights question years from
   now is answerable. This protects the company; be strict.
4. **The pipeline.** Where images live (R2 buckets exist in the TWN
   Cloudflare account), naming, alt text in Malay, sizing/format for page
   speed, and who does the work at 6-7 articles a week.
5. **Cost and capacity.** What this needs in money, time, or people. **If it
   needs a dedicated hire — a visual content lead or similar — recommend it
   with the case.** Do not hire; recommend, and I will take it to the board.
6. **The minimum viable start.** What is the smallest visual approach that
   does not block cluster one (mas kahwin, hantaran, gubahan dulang) from
   shipping while the fuller pipeline is built?

## Rules

- Strategy only; no content.
- Every number cites tool + date; never fabricate one.
- Flag legal/rights uncertainty as uncertainty — never assert we have rights
  we have not verified.
- Prose passes /humanizer before you call it done.

## When done

Log both documents in `docs/work-done/aug-23-2026-session-01/` per the README
format, add your index rows, and report in this terminal: the single
strongest reason we overtake the incumbents, the visual sourcing model you
recommend, and whether you need a hire.
