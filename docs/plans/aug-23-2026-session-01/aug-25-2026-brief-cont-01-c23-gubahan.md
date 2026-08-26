# Brief — Writer (Inspirasi, Vendor & Venue) — CONT-01: cluster C2.3, gubahan & dulang hantaran

**Status:** APPROVED — executing. Sprint 01, item CONT-01, 3 points.
**Dispatch with `-PermissionMode bypassPermissions`.**

## Write now. Publishing is gated on RISK-01.

Take these through the full workflow to Stage 9 — brief, source, draft, review
board, humanize, SEO QC, visual build. **Everything except the ingest.**
RISK-01 (a production recovery point) is still open and nothing writes to
production until it closes. Publishing is thirty seconds at the end; the writing
is the item.

---

## Why C2.3

Third cluster in the approved launch plan, and the one that **genuinely needs
real photography** — gubahan and dulang hantaran are objects, and an article
about how they look cannot be carried by typography.

P2 (`hantaran-mas-kahwin`) already has eight articles and the most traction on
the site, so depth compounds fastest here rather than opening an eighth pillar.

## Definition of done — verbatim from the sprint file

> Three articles through the full workflow to Stage 9, live, with photograph
> covers and full credit chains.

Since publishing is gated, the item is **ready-to-ingest** on your side: three
drafts, board-cleared, with covers attached and every credit field populated. I
release them when RISK-01 closes and then verify the live URLs myself.

## The standards, all of which have bitten us this week

- **Ingest-ready Markdown with real YAML front matter.** Not a deliverable
  document with a header table and an `## ARTICLE BODY` heading — that format
  left eight finished articles unpublishable for a day. Read
  `src/lib/inspire/article-file.ts` for the schema.
- **No `*[IMEJ N di sini]*` markers.** Ever. Describe the image in `images:`.
- **Covers are licensed photographs of people** — Malaysian Malay, Malay wedding
  context. **No text cards anywhere**, cover or in-article. Owner directive.
- **One path spelling**: `images/S-name.jpg`, no `./` prefix.
- **Every image**: real Malay alt text, a caption that teaches rather than
  describes, `credit` + `creditUrl` + `licensorName` + `licenseClass`, and an
  asset-register entry. CC BY-NC and CC BY-ND both fail us.
- **Aim for one supporting image per major H2** where it earns its place. An
  image that illustrates nothing is padding; a culturally wrong image is worse
  than none.
- **Prices carry their source and the date checked.** Style guide §7.1a, added
  25 Aug: *a price source showing no sign of life in 24 months does not publish,
  caveat or not.* Gubahan pricing is vendor-quoted and unreliable — where nobody
  publishes a real number, say so and tell the reader how to judge a quotation
  instead. That is often the better article.
- **Internal links must point at published articles.** Twenty-eight are live
  across seven pillars; take targets from the live sitemap, not from drafts.

## Rules

- `/humanizer` on everything before you call it done.
- Never fabricate a price, a material, a vendor or a source.
- No production database writes in this brief.

## When done

Drafts into `docs/plans/aug-23-2026-session-01/drafts/`, log to
`docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** —
Stage 9, mandatory. Name the file that must change, and edit it. Report that the
three are ready to ingest.
