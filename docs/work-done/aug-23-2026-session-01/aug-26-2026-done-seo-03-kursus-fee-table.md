# Done — SEO-03: the kursus kahwin fee table, all fourteen jurisdictions

**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-seo-03-kursus-fee-table.md`
**Writer:** `writer-adat-agama-prosedur` · **Date:** 26 Ogos 2026
**Status:** researched, drafted, `/humanizer` complete. **NOT ingested** — the
production write is gated on RISK-01 and the brief forbids it. Nothing was
written to the production database.

---

## Where the work IS

All in `docs/plans/aug-23-2026-session-01/drafts/`:

| File | What it is |
|---|---|
| `kursus-kahwin-yuran-section.html` | The replacement section, 8,146 bytes, in the TipTap HTML shape this site already stores. **This is the deliverable.** |
| `kursus-kahwin-yuran-section.md` | The same section in Markdown, for review. |
| `kursus-kahwin-yuran-SWAP-INSTRUCTIONS.md` | The exact find-string, the swap, and the pre-write checks. |
| `kursus-kahwin-yuran-SOURCES.md` | Every figure, its primary source, the date checked, and the currency register entries it creates. |
| `kursus-kahwin-body-RENDERED-2026-08-26.html` | Reference only. **Not** the stored value — see the retrospective. |

## Definition of done, against the sprint file

> Fourteen rows, each sourced primarily and dated, does-not-publish recorded
> where true, Penang's change stated with both figures and the changeover date.
> Government PDFs read by word coordinate, never `pdftotext -layout`.

| Requirement | Status |
|---|---|
| Fourteen rows | 14. Thirteen states plus Wilayah Persekutuan. |
| Each sourced primarily | Yes. One state authority notice (Pulau Pinang), nine from SPPIM's live listing (JAKIM's own system), four dated negatives taken from the authority's own portal. No aggregator contributed a figure. |
| Each dated | Every row carries **26 Ogos 2026** in the published table, not only in this log. |
| Does-not-publish recorded | Four: Pahang, Kelantan, Sabah, Sarawak. Each gets its own paragraph saying what we checked and what was there instead. |
| Penang, both figures + date | RM100 now, RM120 from 1 September 2026, in the opening paragraph and in the table cell. |
| PDFs by word coordinate | Yes. PyMuPDF word extraction, rows grouped by y-midpoint, sorted by x0. `pdftotext -layout` was not used on anything. |

## The table, in one line each

RM80 Terengganu · RM100 Perlis, Kedah, Perak, Selangor · RM100 rising to
**RM120 on 1 Sep** Pulau Pinang · RM100 or RM115 Negeri Sembilan · RM120
(RM180 at one organiser) Wilayah Persekutuan · free in Sep, RM118.80 in Okt
Melaka · RM150 or RM165 Johor · **no published rate** Pahang, Kelantan, Sabah,
Sarawak.

## Three findings worth more than the table

**1. There is no national rate, and JAKIM does not set one.** Its guideline for
marriage administration requires the MBKPPI certificate and contains no fee, no
ringgit figure and no occurrence of *yuran* — verified by word coordinate across
all five pages. Its own course page publishes no rate either. The "RM120 JAKIM
ceiling" repeated across aggregator sites has no primary source, and four live WP
courses are listed at RM180, above it. That claim is used nowhere in the article.

**2. Nine of fourteen publish their fee only inside SPPIM, per course, per
organiser.** That is why Johor shows RM150 and RM165 in the same week, and why any
single national range is wrong by construction. SPPIM exposes this publicly at
`GET https://www.sppim.gov.my/v2/biz/api/jadual-param`, read-only. Counts and the
endpoint are in the source register.

**3. Selangor is the only state where the department runs every course itself.**
All 75 Selangor courses listed are `JNS_PGJR = P` and every organiser account is a
JAIS district office body. Not one private organiser. That is why its RM100 is
flat while Johor's is not, and no competitor states it.

## Frictions the brief warned about, resolved

- **Pulau Pinang's e-Munakahat was down on 25 Ogos.** It was **up** on 26 Ogos and
  served the fee notice directly. Going to JHEAIPP another way was not needed.
- **JHEAINS Sabah still publishes no rate.** Confirmed on its own iKursusKahwin
  portal, whose "Yuran Kursus" section names no amount, and in its official
  `kadar fii` PDF, which covers kebenaran berkahwin, registration, sijil digital
  and kad nikah but not the course. A dated negative, and it strengthens the page.

## What was not touched

Nothing else on the article. The `<h2>Bayaran Yuran</h2>` text is unchanged, so
the heading structure and any anchor to it survive. No production database read
or write. No ingest.

---

## Retrospective

*Stage 9. Chaired by `managing-editor`; written by the writer.*

### What we learned that is not written down

**A live article's stored body cannot be recovered from its rendered page, and
the workflow currently implies that it can.** Stage 7 says "updating a live
article is `--update` on the same slug", and this brief asked for "the updated
article body". Both are reasonable to read as *reconstruct the body and write it
back*. On this legacy row that would have been a quiet disaster: the stored value
is TipTap HTML, and the rendered page returns `<img>` tags carrying Next.js Image
attributes (`data-nimg`, `loading`, `decoding`, generated `class` and `style`)
that do not exist in the source. Rebuilding from the render would have rewritten
all 18 image nodes on a page whose other content is explicitly out of scope.

The second thing, smaller but costly: **SPPIM's public read API is where nine of
fourteen states actually publish this fee**, and finding it meant walking the
Angular bundle down to an environment chunk. Nobody should repeat that.

### Which document must change, and who owns the edit

**`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
Stage 7.** Owned by me, edited in this run. It gains the rule that a live
article's body is never reconstructed from its rendered page, and that an update
to one section of a legacy row is a substring swap against a recorded
before-state.

**`.claude/agents/writer-adat-agama-prosedur.md`**, source landscape. Owned by me,
edited in this run. SPPIM is now named as the place the fee data actually lives
for the SPPIM states, alongside the existing PDF word-coordinate rule.

### What we did twice

Re-checking Penang's portal after the 25 Ogos outage was correct, not waste. The
standing rule is to re-derive an inherited block rather than cite it, and
re-running it is exactly what showed the host had recovered.

The real waste: rediscovering the SPPIM API from the JS bundle, which the persona
edit now prevents, and a batch of state-portal fetches thrown away because a
`curl -w` format string was consumed as an argument. Small, but it cost a round
trip across ten sites.

### What we nearly shipped, and what caught it

**The reconstructed body**, above. Caught by reading the `<img>` attributes in
the extracted body before writing it anywhere. No gate would have caught it.

Three claim-level errors, all caught in the verification pass before
`/humanizer`:

- *"RM180 di Kuala Lumpur."* The data says Wilayah Persekutuan, district id 243.
  I never verified that district is Kuala Lumpur. Changed to Wilayah Persekutuan,
  which is what the source supports.
- *"Pulau Pinang dan Sabah kedua-duanya menyatakan [bayaran tidak dikembalikan]
  secara jelas."* Sabah's rule is blanket. Penang's applies to failing to attend
  without notice. Two different rules flattened into one sentence. Split.
- *"RM100 di lima negeri."* Four: Perlis, Kedah, Perak, Selangor. Penang is RM100
  only until 1 September, and Negeri Sembilan only for some courses. Counted and
  named.

The pattern in all three is the same and worth naming. **Each was a summary
sentence written from memory of the table rather than from the table.** The rows
were right every time; the prose around them was not. The fix that worked was
re-deriving every prose figure from the data file once the table was final, and
that check belongs before `/humanizer`, not after, because the humanizer pass
does not read the source data.
