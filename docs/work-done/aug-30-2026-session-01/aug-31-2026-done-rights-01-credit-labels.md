# RIGHTS-01 — one Malay image-credit label, one casing, sitewide

**Sprint:** 04 · **Item:** `RIGHTS-01` · 3 points · track `content`
**Owner seat:** managing-editor
**Date:** 31 August 2026
**Status:** COMPLETED — merged, deployed, verified on live production

| | |
|---|---|
| PR | [#14](https://github.com/ianngkb/hellokahwin/pull/14) |
| Merge commit on `master` | `fec3c02` |
| Commits | `ab70a2f`, `24b998d`, merge `0d9deb5` |
| Deploy | Vercel status `success` on `fec3c02` |
| Live proof | <https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding> |
| Committed check | `scripts/audit-image-credits.mts` · `pnpm --silent audit:credits` |
| Raw sweep output | `aug-31-2026-rights-01-EVIDENCE/` |

---

## The definition of done, and where each clause was met

> ONE Malay label, ONE casing, sitewide. `sOURCE:` returns ZERO across all 86
> article URLs. Verified by a COMMITTED SCRIPT that sweeps the sitemap and
> reports label variants — run it BEFORE and AFTER and paste both counts.
> Uncredited images are reported as a count WITH THEIR SLUGS and either credited
> or listed for a decision.

| Clause | Met | Where |
|---|---|---|
| One Malay label, one casing, sitewide | ✅ | `Kredit:` — 178 in markup, 174 in the flight payload, nothing else |
| `sOURCE:` zero across all 86 article URLs | ✅ | 0, confirmed by the sweep and by an independent raw `grep -c` on the live page |
| Committed script, run before and after | ✅ | `scripts/audit-image-credits.mts`, both runs below |
| Uncredited images counted **with slugs** | ✅ | 17 pages listed below, split into two populations |

---

## BEFORE and AFTER, from the committed script

Both runs are `pnpm --silent audit:credits` against **live production**, sweeping
the 86 `/artikel/<category>/<slug>` URLs in `sitemap.xml`.

### BEFORE — 31 Aug 2026, `master` at `105e79d`

```
sweeping 86 article URLs at https://hellokahwin.com

LABEL VARIANTS — visible markup          LABEL VARIANTS — RSC flight payload
     63  Kredit:                              63  Kredit:
     52  source:                              48  source:
     37  SOURCE:                              37  SOURCE:
     21  Source:                              21  Source:
      4  sOURCE:                               4  sOURCE:
      1  image:                                1  image:

separator after the colon that is not U+0020: 10
credit figcaptions:                            345
FAIL — 5 non-canonical label variant(s) in markup, 5 in the flight payload,
       10 odd separator(s). Expected one label: "Kredit:".
```

exit code **1**

### AFTER — 31 Aug 2026, `master` at `fec3c02`, deploy `success`

```
sweeping 86 article URLs at https://hellokahwin.com
build fingerprint: c7e8a9c3 (32 chunks)

LABEL VARIANTS — visible markup          LABEL VARIANTS — RSC flight payload
    178  Kredit:                             174  Kredit:

separator after the colon that is not U+0020: 0
credit figcaptions:                            345
PASS — every credit on 86 article pages reads "Kredit: ".
```

exit code **0**

**115 non-canonical labels in markup → 0. `sOURCE:` 4 → 0. Odd separators 10 → 0.**

### Independent of my own script

Raw `grep` on the live highest-impression article, so the result does not depend
on the audit script being right:

```
$ curl -s https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding \
  | grep -oiE "(source|kredit|sumber|image|foto|grafik|jurugambar)[ ]?:" \
  | sort | uniq -c | sort -rn
     42 Kredit:
      8 image:

$ grep -c "sOURCE:"    →  0
```

The eight `image:` are `og:image:width`, `og:image:height`, `og:image:alt`,
`background-image:url(…)` and `data:image/webp` — Open Graph meta and CSS
properties, not credit labels. The sweep excludes them because its pattern
requires a `^`, `"`, `>` or `\` boundary before the word.

### Structural comparison, because a status code is not evidence

Same URL, before and after the fix:

| | BEFORE | AFTER |
|---|---:|---:|
| `<img>` | 51 | 51 |
| `<figcaption>` | 22 | 22 |
| `<title>` | `20 Venue Garden Wedding Paling Cantik di Malaysia \| HelloKahwin` | identical |

Sitewide: **345 credit figcaptions before, 345 after**; **171 descriptive
captions before, 171 after**. Nothing was added, dropped or reworded — only the
label word changed.

---

## The label is `Kredit:`, and that was not mine to choose

**Style guide §13.1** already fixes the on-page credit format as
`Kredit: {Nama pemilik}`, under the owner-level rule that every image is
credited to its original source. The 63 conforming credits in the BEFORE table
are that rule already working, on the articles written since it was written.
This item made the other 111 match it. It did not introduce a label.

I nearly chose a different one. The outside evidence, gathered by fetching the
pages and enumerating what is actually on them, points at `Sumber:`:

| Publisher | What the artefact shows |
|---|---|
| Sinar Harian | `Foto:` — 8 on the front page, 3 in an article body |
| Astro Awani | `Sumber: Azrul Rafie/Astro`, `Sumber: FB Maybank Marathon` as the image credit; `FOTO: ADOBE STOCK` for stock |

`Sumber:` credits both a photographer and an organisation, which fits our data —
most of our credits name a venue, a vendor or a source article rather than a
photographer. On outside evidence alone it was the right answer.

**It would have been wrong here, and the site's own data is why.** `Sumber:` is
already in use on hellokahwin.com for something else: **87 occurrences in article
body prose citing the authority behind a FACT.**

> `Sumber: seksyen 2 Enakmen Undang-Undang Keluarga Islam (Negeri Pulau Pinang) 2004`
> `Sumber: senarai kadar sewaan Dewan Banquet, Dewan Sivik MBPJ, tahun 2024`
> `Sumber: mpsepang.gov.my, halaman Kemudahan Awam & Kadar Sewaan`

Using one word for *where this photograph came from* and *where this legal rate
came from* would have made the two indistinguishable to a reader. That is very
likely why the style guide picked `Kredit:` in the first place. Sentence case,
one space after the colon.

`/humanizer` on the shipped copy: **passes unchanged**. The only editorial
content is the word `Kredit`; the rest is the owner's name verbatim, and proper
names are out of scope. Clean against inflated claims, sales language, filler,
em dashes, bold, emoji and chatbot artifacts.

---

## What was deliberately left alone, and why

All three verified against the live site before the code was written.

**171 descriptive teaching captions.** A figcaption on this site is not
necessarily a credit:

> *"Setiap barang duduk atas dulangnya sendiri, dan itulah sebabnya bilangan
> dulang dikira berasingan…"*

So there are two functions, not one. `formatCreditLabel` always labels and is
used only on the cover's dedicated `media.credit` field, which is only ever a
credit. `normaliseCaptionLabel` relabels a figcaption **only** when it already
opens with a recognised image-credit label, and returns everything else exactly
as written.

**`Grafik:`** — style guide §13.1 makes it a permitted specialisation of
`Kredit:` for our own original graphics. Not in the strip list, never rewritten.

**`Sumber:` and `Jurugambar:`** — live conventions for other things.
`Jurugambar:` is a line inside the body's `Kredit Vendor` block on the 17
real-wedding articles (`Lokasi:` · `Jurugambar:` · `Juruvideo:` · `Perancang
Majlis:`). Neither word is in the strip list, so neither can be silently
converted into an image credit.

---

## Uncredited images — the count, with slugs

**17 of 86 article pages carry no per-image credit caption.** They are two
different problems and the report keeps them apart, because merging them would
overstate how much of the library is untraceable.

### 14 pages: credited once, in a body `Kredit Vendor` block — attributable, not per-image captioned

| Slug | `<img>` |
|---|---:|
| `/artikel/glamor-eksklusif/amankila-bali` | 46 |
| `/artikel/glamor-eksklusif/grand-hyatt-kuala-lumpur` | 21 |
| `/artikel/real-wedding/villa-warisan` | 29 |
| `/artikel/moden-kontemporari/marriott-putrajaya` | 23 |
| `/artikel/real-wedding/cheong-fatt-tze-mansion` | 29 |
| `/artikel/real-wedding/sentosa-janda-baik` | 31 |
| `/artikel/minimalis-mewah/the-danna-langkawi` | 26 |
| `/artikel/real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan` | 40 |
| `/artikel/moden-kontemporari/jw-marriott-kuala-lumpur` | 27 |
| `/artikel/moden-kontemporari/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` | 50 |
| `/artikel/real-wedding/perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat` | 27 |
| `/artikel/pantai-santai/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` | 37 |
| `/artikel/real-wedding/yasaka-shrine` | 28 |
| `/artikel/moden-kontemporari/sime-darby-convention-centre` | 25 |

Every one of these names its photographer. The owner rule — *an image whose
origin nobody can name does not publish* — is satisfied; the format is not
§13.1's. **This is an undocumented second credit format, now written into the
style guide as §13.1a rather than left as folklore.**

### 3 pages: NO CREDIT ANYWHERE — these need a decision

| Slug | `<img>` |
|---:|---:|
| `/artikel/idea-dan-nasihat/cara-buat-kad-kahwin-digital` | 8 |
| `/artikel/hiasan-dekorasi/goodies-kahwin` | 15 |
| `/artikel/idea-dan-nasihat/sewa-dewan-kahwin` | 16 |

**39 images with no named owner on three live pages.** I have not credited them,
because I cannot invent an origin, and tracing them needs the media records and
in some cases the original vendor contact — which is RIGHTS-02's job, deferred
to Sprint 05. **Listed here for a decision, not silently omitted.** They are now
the standing output of `pnpm audit:credits`, so they cannot be forgotten.

---

## How it was built

**A render-time function, not a data migration.** The label is presentation. An
editor typing `source:` tomorrow still gets `Kredit:` on the page; a one-off
`UPDATE` would have fixed the 86 pages that exist and none written next week.

Measured precondition, because this only works if it is true: on the live page
the RSC flight payload mirrored the visible markup **20-for-20 with an identical
variant distribution**, so the payload is post-render and normalising at render
clears both. The AFTER numbers confirm it — 178 markup, 174 payload, zero
non-canonical in either.

| File | Role |
|---|---|
| `src/lib/inspire/image-credit-label.ts` | `CREDIT_LABEL`, `formatCreditLabel`, `normaliseCaptionLabel`, `normaliseCreditParagraphs`, `hasCanonicalCreditLabel` |
| `src/lib/inspire/__tests__/image-credit-label.test.ts` | 52 tests, including one per live variant and one per thing that must NOT be rewritten |
| `src/components/inspire/article-renderer.tsx` | figcaption (React + Tiptap HTML paths) and the body-paragraph path |
| `src/components/inspire/image-credit.tsx` | the cover credit |
| `scripts/audit-image-credits.mts` | the sweep · `pnpm audit:credits` |

Verification: `pnpm test` 444 passed · `pnpm typecheck` clean · `pnpm lint` 0
errors. The three Prettier warnings that remain are `src/app/(public)/brand/*`
and `src/components/brand/brand-assets.ts`, pre-existing from DES-12 and not
touched here.

**The sweep enumerates rather than asserts.** The check that started this item
was `grep -c 'Kredit'`, which returned zero on a page carrying forty credits
because the credits were labelled in English — and zero would have read as
*worse than reported* rather than *wrong regex*. The script therefore never
tests for a string it expects: it takes whatever single word sits before the
first colon and counts what it finds. That is not decoration. The item was
briefed as four casings of `source:`; enumeration also turned up `image: zach
chin` and a second variant axis nobody had recorded — **`U+00A0` instead of a
space after the colon on 10 credits**, which a casing-only fix would have left
behind.

---

## Retrospective

### 1. What did we learn that is not written down?

**The site runs three label conventions and they mean different things.**
`Kredit:` is the image credit (§13.1). `Sumber:` is the fact citation, 87 times
in body prose. `Jurugambar:` is a line in an imported vendor block. Only the
first was written down. A reasonable person — me, four hours ago, holding real
publisher evidence — would have collided the first two.

**A second, undocumented credit format is in production.** 14 real-wedding
articles credit the whole photo set once, in prose, as `Kredit Vendor` with
`Lokasi:` / `Jurugambar:` / `Juruvideo:` lines. It satisfies the owner rule and
violates §13.1's shape, and nothing said whether that was allowed.

**A figcaption on this site is not necessarily a credit.** 171 of 345 are
teaching captions. Any rule phrased as "the caption is the credit" is false here.

**Three live pages carry 39 images with no named owner.** Not a policy question
until someone counts them; now counted.

### 2. Which document must change, and who owns the edit?

| File | Edit | Owner |
|---|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` | §13.1 gains the reserved-label list (`Sumber:`, `Jurugambar:`, `Grafik:` are not image credits) and a new §13.1a documenting the `Kredit Vendor` block | managing-editor (me) |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` | Stage 6b gains `pnpm audit:credits` as the executable credit gate | managing-editor (me) |

**Both edits are made.** File paths and diffs logged at the bottom of this entry.

### 3. What did we do twice that we should never repeat?

**We measured a server we had not built. Twice, in one item.**

- The sweep's `--base-url` was honoured for `sitemap.xml` but not for the page
  fetches, because the sitemap emits absolute URLs from the deployment's own
  configured site URL. Pointed at a local build, it followed
  `http://localhost:3200/...` to **another session's dev server** and reported
  its numbers as the build under test.
- After fixing that, a rebuild-and-restart hit `EADDRINUSE`; the previous
  build's process kept answering on the port, and the run reported the **old
  build's** numbers as the new build's. That is what made a working fix look
  broken and nearly sent me hunting a bug that did not exist.

Neither run looked wrong. Both produced a confident, precise, false number.

**FORM — code, not prose, because prose would not have fired:**
- every sitemap path is re-homed onto the requested base URL;
- the sweep prints a **build fingerprint** (a hash of the content-hashed
  `/_next/static/chunks/*.js` names the host serves) in its header, so "is this
  the same code I just built?" is checkable by comparing two runs. It earned its
  place immediately: `87ee814a` → `7ebb0886` after the merge build proved I was
  measuring the merged tree, and production reads `c7e8a9c3`.

**Also twice: a scripted edit that silently did nothing.** Two `python`
search-and-replace patches did not match and were not asserted, so one console
block kept printing the old format and I only noticed from the output. **FORM:**
every scripted edit in this item now carries `assert s.count(old)==1` before the
write. The one time it fired, it correctly refused to write.

### 4. What did we nearly ship, and what caught it?

**`Sumber:` as the sitewide image-credit label.** Derived from real publisher
evidence, defensible, and wrong — it would have collided with the fact-citation
convention already carrying 87 occurrences. **Caught by reading the style guide
I own before writing the code**, and confirmed by enumerating body prose. The
outside research was not wasted; it was necessary to know the choice was close.

**`Kredit:` prefixed onto all 171 descriptive teaching captions.** The first
version of `formatCreditLabel` labelled unconditionally, and the renderer applied
it to every figcaption. It would have shipped `Kredit: Setiap barang duduk atas
dulangnya sendiri…`. **Caught by the sweep's own "captions that are not a
`word:` credit" enumeration** — a number I had added to count credits, which
turned out to be the regression guard.

**Four credits that are body paragraphs, not captions.** `<p>source: kek
hantaran kahwin</p>` on `hantaran-tunang` never reaches the figcaption path.
Unit tests were green and the fix was incomplete. **Caught by running the sweep
against a real local production build** rather than trusting the tests.

**One thing I nearly reported that was not real:** a `U+FFFD` after `Source:` on
the live page. It was my terminal's encoding of the `U+00A0`, not a defect —
`s.count('�')` on the fetched bytes returned 0. The real finding underneath
it (the non-breaking space) was worth having. Checking the codepoint instead of
trusting the rendered character is what separated them.

**The pattern in all four: every one was caught by enumerating the artefact, and
none by reasoning about the code.**

---

## Documents changed by this retrospective

| File | Change |
|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` | §13.1: reserved-label list added; §13.1a added for the `Kredit Vendor` block; §13.5 added for the executable check |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` | Stage 6b: `pnpm audit:credits` added as the credit gate |
| `docs/work-done/README.md` | this entry indexed |
