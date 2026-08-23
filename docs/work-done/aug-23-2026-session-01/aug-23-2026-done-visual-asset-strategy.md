# Visual asset strategy: media audit, sourcing model, rights policy and a hire recommendation, 23 Aug 2026

**Session:** aug-23-2026-session-01  ·  **Owner:** head-of-seo-content  ·  **Status:** completed
**Plan:** [aug-23-2026-framework-content.md](../../plans/aug-23-2026-session-01/aug-23-2026-framework-content.md) (the document whose image mandates had no source behind them)
**Brief:** [aug-23-2026-brief-production-and-visuals.md](../../plans/aug-23-2026-session-01/aug-23-2026-brief-production-and-visuals.md), Part B

## What was done

Part B of the CEO's brief, all six numbered items. Strategy only, no content.

**Audited the media library by direct inspection rather than by reading the
export summary.** File census over 6,312 files on disk, plus a field-level
parse of all 682 records in `content/media.json` including the WordPress
`media_details.image_meta` block, which is where EXIF and IPTC survive.
Cross-referenced against `posts.json` and `users.json`.

**The audit found something more serious than "we have no source for new
photographs".** We cannot demonstrate a licence, a permission or ownership for
a single one of the 682 images already in the library. The WordPress
attachment schema has no field to record one, none was recorded anywhere else,
and 96 images carry an EXIF copyright string naming a third party. Zero name
HelloKahwin or TWN as the holder.

**Separated what is verifiable from what is an open legal question**, as the
brief required. Section 1.3 is measurement. Section 1.4 is five questions for
somebody qualified, and the document states plainly that it is not legal
advice.

**Recommended a disposition for the existing library** in four classes,
including a quarantine that explicitly does not mean deletion, because
deleting destroys both the evidence trail and the only recoverable asset.

**Proposed a source per content type** with the trade-offs, covering vendor
and photographer partnerships, couple submissions, stock, original graphics
and AI imagery, and sized the twelve-month demand at roughly 1,550 to 2,300
images against a library that maps 48 usable-looking items to cluster one.

**Gave a clear recommendation on AI imagery and flagged the part of my
reasoning that is untested.** My expectation that current image models render
Malay adat specifics poorly is stated as an expectation, not a finding, with a
cheap twenty-prompt test attached that I will run on request. The
recommendation holds either way and the document says why.

**Recommended one hire without making one**, per the brief. A Visual & Rights
Coordinator at 20 to 25 hours a week, with the work breakdown that produces
the 22 to 28 hour weekly figure, the fallback if it is not approved, and an
explicit statement that if the board can approve only one thing it should be
the writers rather than this role.

The document was drafted, run through /humanizer, and re-checked. The
humanizer pass changed nine passages: two announcing-the-next-point openings,
two self-praising uses of "honest" or "honestly", one deeper-truth framing,
two formulaic sayings, one double negative, and one not-X-but-Y that
overclaimed. Final check confirms zero em dashes, zero en dashes, zero curly
quotes and zero flagged AI vocabulary. Bold density is 17 spans per 100 lines,
matching the approved cluster plan exactly.

## Evidence

**File written**

`docs/plans/aug-23-2026-session-01/aug-23-2026-visual-asset-strategy.md`,
713 lines, covering all six items in Part B: the library audit with rights
findings separated from legal questions; a source recommendation per template
with trade-offs; the rights and attribution policy including the asset
register schema; the pipeline; cost, capacity and the hire recommendation; and
the minimum viable start for cluster one.

**Audit findings, all from direct inspection of `data/hellokahwin-export/` on
23 Aug 2026 (export of 21 Aug 2026)**

| Finding | Evidence |
|---|---|
| The library is 682 pictures, not 6,759 | 6,312 files on disk, of which 5,400 carry a `-WxH` derivative suffix. Median 41 WordPress derivatives per item |
| **No rights field exists anywhere** | Key-set scan of the attachment schema found no licence, rights, permission, usage or consent property. The only custom metadata is analytics and survey flags |
| **96 items (14%) carry a third-party EXIF copyright string** | Nicholas NYY Photography (26), "© 2024 ameirfikri" (24), KennyLooiPhotography (16), WIRA DARMAJA with a personal email (7), Tommy Teh (5), asmr (5) |
| **Zero items name an entity we control as copyright holder** | Full scan of `image_meta.copyright` and `image_meta.credit` |
| Real Wedding files look like photographer originals; article files do not | 295 of 401 RW items (74%) carry camera EXIF across 22 camera bodies. 16 of 269 IN- items (6%) do |
| The article library is named after the businesses it depicts | 26 files named for individual wedding planners, 40 for individual garden venues, 19 for wedding halls. Combined with the 6% EXIF rate, the probable origin is each vendor's own site or Instagram |
| Individual items point at external origins | A Shopee CDN filename, a Shopify CDN resize parameter, a named US jewellery brand's product shot, two files in TheWeddingNotebook's own filename convention, three `.jpg.webp` double extensions, one EXIF caption in Malaysian newspaper style ending "-Gambar hiasan", one in stock-library phrasing |
| Credit was given editorially but never recorded per asset | All 14 Real Wedding posts carry a "Kredit Vendor" block naming the jurugambar. Ten named studios. No licence anywhere |
| 40% of the Real Wedding library is not Malay-adat Malaysian weddings | 80 items shot in Bali or Japan; a further 57 from weddings the posts themselves describe as Peranakan or Chinoiserie themed; 23 more from one described as "pelbagai budaya" |
| Alt text is a keyword-stuffing failure, not a gap | 38 of 682 items have any (5.6%). The string "wedding planner terbaik di malaysia" is 22 of those 38. 644 items have none |
| The library would fail our own page-speed bar | Median 467 KB, files up to 6,912px wide, 86% JPEG, no AVIF |
| Cluster one has 33% image coverage before rights, 0% after | 48 relevant items (26 hantaran, 14 hantaran tunang, 8 mas kahwin) against roughly 144 slots across its 24 mapped articles |
| Nothing has been added to the library since 15 Jan 2026 | Upload dates: 567 in Nov 2025, 22 in Dec 2025, 93 in Jan 2026 |
| 79 of 682 items are not referenced in any post body | `source_url` cross-reference against the rendered HTML of all 29 posts |

**Method, reproducible.** File census by extension, derivative-suffix
classification and filename prefix extraction over
`media/wp-content/uploads/`. Python parse of `content/media.json` for
dimensions, filesize, mime type, upload date, author, alt text, caption,
parent post, derivative counts and the full `image_meta` EXIF block.
Credit-block extraction from `content/posts.json`; author identification from
`content/users.json`.

**No Ahrefs or Search Console data was needed for this document and none was
pulled.**

**Estimates, explicitly labelled as such in the document:** the 55 to 70%
graphics coverage of the article layer, the partnership programme time cost,
the per-article visual time budget and the 22 to 28 hour weekly figure, the
salary shape, and the expectation about AI image model weakness on Malay adat
subjects.

## What it changed

**A gap in an approved framework is now named and sized.** The framework
mandates one image per H2, 8 to 15 per Real Wedding and photos on every
directory page across 204 topics, which is roughly 1,550 to 2,300 images over
twelve months. Until today nothing said where one of them comes from.

**The company now knows it owns no images.** That is a different position from
"we have a library of 682 images", which is what every earlier document
assumed, including the CEO memory and the brief that commissioned this work.

**The default visual for most of the map changed from photography to original
graphics**, on the reasoning that the largest and best-sequenced clusters are
procedural and comparative, where a graphic is the better asset and is also
the specific checkable fact that quality-bar line 4 demands.

**Cluster one is unblocked without resolving any rights question.** C2.4 and
C2.1, sixteen articles, ship entirely on original graphics. C2.3 needs
photographs and is already third in the approved sequence, which buys four to
six weeks.

**Three items that need no approval start immediately:** the asset register,
the licence template, and ten retroactive licence requests to the Real Wedding
photographers. The first two block publishing and I own them.

**A hire is on the table with a case behind it**, and deliberately ranked
below the writer hires rather than competing with them.

## Follow-ups

Owned by the CEO and the board:

1. **Decide on the Visual & Rights Coordinator hire.** 20 to 25 hours a week,
   contract or part-time, two quarters minimum. The case is section 5 of the
   strategy. The fallback if declined is section 5.3 and it ships cluster one
   and cluster two on time without a photographic library, a directory or Real
   Weddings.
2. **Get a legal read on the twelve live listicles carrying class B imagery.**
   Not urgent unless somebody complains, but it is the owner's decision and
   not mine.
3. **Decide whether the already-published Real Wedding posts stay up** while
   the retroactive licences are chased. The strategy quarantines the files for
   new use and leaves the published pages to the owner.
4. **Note that no salary figure in this document is sourced.** Two real quotes
   are needed before it enters a budget.

Owned by head-of-seo-content:

5. Create the asset register and the licence template. Week one, no approval
   needed, and nothing publishes before they exist.
6. Build the six-type graphic template kit.
7. Send the ten retroactive licence requests to the Real Wedding studios.
8. Open the vendor programme with five gubahan and hantaran vendors, weeks two
   to four.
9. Run the twenty-prompt AI imagery test if the CEO wants the assumption in
   section 2.7 settled rather than assumed.

Engineering, small but blocking at publish time:

10. **Confirm the R2 bucket, access and upload path** for HelloKahwin media.
    CEO memory records R2 buckets in the TWN Cloudflare account, but the
    live-site repo is not cloned on this machine and I could not verify bucket
    names or access. This blocks publishing rather than production.
