# Done — supporting images across all 20 drafts and the 8 live C2.4 articles

**Date:** 25 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-enrich-supporting-images.md`
**By:** managing-editor
**Nothing was ingested. Nothing was published. No production write of any kind.**

---

## The number

**102 images now sit across 28 articles, up from 48.** 30 new assets were
created or sourced; the rest of the rise is real images replacing 13 references
to files that never existed. Every draft validates against the ingest parser's
rules, and every file named in front matter exists on disk — which was not true
when this job started.

| Pillar | Before | After | What changed |
|---|---|---|---|
| **P1** nikah | 3, 2, 2, 2 | **6, 5, 4, 4** | 5 new data cards + 3 akad photographs |
| **P6** kos | 3, 2, 2, 2 | **5, 4, 6, 5** | 4 new cost cards + 6 venue/food photographs |
| **C2.4** live | 3, 3, 2, 2, 2, 2, 2, 3 | **5, 5, 3, 3, 3, 3, 3, 5** | 12 akad/hantaran photographs |
| **P3** ucapan/doa | 1, 1, 2 | **3, 2, 3** | 3 photographs |
| **P7** sebelum nikah | 1, 1, 1 (real) | **3, 2, 3** | 5 photographs |
| **P4** busana | 2, 2, 1 (real) | **3, 4, 2** | 4 photographs |
| **P5** pelamin/kad | 3, 1, 1 (real) | **3, 2, 3** | 3 photographs |

P4, P5 and P7 "before" counts are lower than the brief's because the brief
counted front-matter entries, and 13 of those entries named files that do not
exist. See §4.

## 1. What was sourced, and how it was verified

**22 photographs downloaded, 21 kept.** Wikimedia Commons and Flickr only.

Nothing was taken on trust. Commons licences were read through the API's
`extmetadata` block (`LicenseShortName`, `Artist`, `UsageTerms`, `Restrictions`);
Flickr licences were read out of the photo page HTML at origin, independently,
after a subagent had reported them — and the independent read is what the
register's `bukti_lesen` records. **CC BY-NC and CC BY-ND were auto-rejected by
the verifier before a human judgement was ever made about the picture.**

Every kept photograph was **opened and looked at** before its alt text was
written. That is what caught three of the six rejections in §3.

## 2. Our own data graphics — the P1 and P6 lever

The brief said P1 and P6 should lean on kind 2, and that this is the right
answer rather than a compromise. It is.

**Nine new cards, generated from code**, added to the existing generator as two
new registered sets (`p1-body`, `p6-body`) in the `hellokahwin-site` repo,
worktree `pillars-ingest-redirects`:

- `scripts/covers/p1-body-specs.mts` — 5 cards
- `scripts/covers/p6-body-specs.mts` — 4 cards
- one entry each in the `SETS` register in `scripts/generate-cover-graphics.mts`

Rendered with `pnpm --silent covers --set p1-body,p6-body`. Contact sheet at
`drafts/p1-p6-body-graphics-contact-sheet.html`.

**Every figure on every card was taken from the article that card belongs to,
and from nowhere else.** The spec files say so in their headers and name the
two places where a count is stated rather than quoted.

The clearest one is `C6-2-A1-harga-sewa-dewan-kahwin-rm160.png`: the A1 article's
whole argument is that a hall published at RM160 costs RM860, and the card shows
the working line by line rather than asserting the total. A photograph of a hall
cannot do that.

### Six cards were drafted and then cut before they shipped

Thirteen were drafted. Six were cut because the **P1 and P6 cover cards, which
the owner's instruction of 25 Ogos moved into the article body, already carry
that data**: `cover-rukun-nikah.png` already lists the five rukun,
`cover-borang-nikah.png` already lists the forms and fees, `cover-lafaz-taklik.png`
already lists the three taklik conditions, `cover-syarat-sah-nikah.png` already
carries the enakmen additions, and the P6 covers already carry the pakej and
bajet splits. A second card saying the same thing is padding. The specs and the
PNGs were deleted, not left lying around.

## 3. What was rejected, and on what ground

| File | Why |
|---|---|
| `InaiNevesta.jpg` (Malay bride with henna) | Tagged **CC0, "self-photographed"** on Commons, but the frame carries a `facebook.com/lilySiti` watermark. A CC0 claim contradicted by a third-party watermark inside the picture is not a provenance we can stand behind. **This was the best inai photograph found.** |
| `Majlis kahwin tepi Sekolah Kebangsaan Tegayong` | Licence fine. The frame is two young men **boxing** by a roadside — it does not show what its title says. |
| `Mega Gathering 2.0` (Diamond Jubilee Hall interior) | The only free-licensed Malaysian dewan *interior* that exists. It is a **collectors' toy fair**, wall-to-wall with stalls and action figures. Unreadable as a wedding venue. |
| Mueaz Photography engagement frame | `www.MueazPhotography.com` watermark across the lower frame, over the ring-placing hand. Cropping it destroys the subject. |
| `Ustaz Kahwin.jpg` | Correct subject, clean CC BY 2.0. **500 × 336 is the maximum Flickr publishes.** Too soft to put on a page. |
| `KompangMelayu.png` | CC0, "own work", but the frame reads as a 3D render rather than a photograph. Our register requires a `dijana_ai` value, and we cannot honestly assign one. |
| `Akad nikah di pelaminan.jpg`, Nigerian nikah series, `Signing the Nikah.jpg` (Texas) | Culture rule. Indonesian, Nigerian and American ceremonies are not Malay Malaysian weddings, and we had Malaysian alternatives. |
| GFDL-only files (`YosriBungaTelur`, `YosriPelamin`) | Not NC and not ND, so they pass the brief's stated test — but GFDL-only requires shipping the full licence text with the work, which a one-line credit cannot do. |

**One duplicate caught:** `Dewan Orang Ramai Kampung Batu 26` was re-downloaded
under a new name before a SHA-256 sweep showed it byte-identical to `HK-P-0002`,
already in the register. The duplicate file and its front-matter entry were
removed.

## 4. A publication blocker found and fixed, outside the brief

**13 front-matter entries across 7 drafts named in-article graphics that do not
exist and were never made.** They were specified by the review board and then
cut by the CEO's scope reduction of 24 Ogos (graphic kit spec §0: *"All ten
in-article graphics are cut or absorbed into prose"*). The `ingest/` copies were
cleaned at the time; the `drafts/` copies were not.

`ingest-article.mts` refuses a file whose image is missing, so every one of these
seven drafts would have failed at ingest. All 13 were removed. The affected
drafts: P7 ×3, C4 ×3, C5 ×3 (counting files, 7 drafts / 13 entries).

**Register rows HK-G-0001 to HK-G-0010 were left as `belum-dihasilkan`,** which
is what they are: specified, not produced. The register doubles as the production
queue and that is the honest state.

## 5. The register

`docs/asset-register/asset-register.csv`: **741 → 771 rows.** 21 new `HK-P-*`
photographs and 9 new `HK-G-*` graphics.

**`digunakan_dalam` was rebuilt from the articles, not hand-written** — the same
discipline README §6.1 applied to the inherited library. Every `HK-P-*`,
`HK-G-*` and `HK-C-*` row now names the slugs that actually reference it, read
out of the front matter. Twelve rows changed. Three of those changed from
`BELUM DIISI` to `TIDAK BERKENAAN`, which is a finding, not a tidy-up: nobody had
looked, we looked, and those three images are on no article.

`skop_lesen` now records the actual condition rather than a generic phrase —
attribution for CC BY, attribution and share-alike for CC BY-SA, neither for CC0.

## 6. Two things the accuracy seat should see

1. **`cover-syarat-sah-nikah.png` and `syarat-sah-nikah.md` disagree.** The card's
   note reads *"Pindaan umur 18 tahun bagi kedua-dua pihak diwartakan 2018.*
   *Kuat kuasanya belum disahkan"*, and its rows still say *"Lelaki 18, perempuan 16"*.
   The article now states the commencement **was** confirmed: the Sultan set
   18 Mac 2019 through Sel. P.U. 11, Warta Selangor Jil. 72 No. 7, 1 April 2019.
   The card is board-approved and I have not touched it. **The article looks
   right and the card looks stale, and that is the verification seat's call, not
   mine.** I dropped my own P1B-4 card partly so nothing new ships carrying the
   contradiction.
2. **The eight C2.4 figure covers (`A1-…-cover.png` … `A8-…-cover.png`) were not
   placed.** They exist and they carry the state figures, but the accuracy seat
   blocked figure-bearing cards for six of eight and found the source table wrong
   in four rows. I did not overrule that block to raise an image count.

## 7. Alt text corrected on four existing graphics

The four P1 cover cards displaced into the body carried alt text describing a
*planned* graphic, not the card that renders. `cover-borang-nikah.png`'s alt
promised "six forms arranged horizontally, each with its printed fee"; the card
actually renders a title, two figure blocks and four rows. All four were rewritten
against the rendered pixels.

## 8. Three defects I introduced, caught by a final audit, and fixed

Recording these because the register's whole value is that it is checked, and a
job that only reports its wins is not a record.

1. **A photograph was downloaded twice under two names.**
   `S-majlis-doa-selamat-pernikahan-ahmad-ali-karim.jpg` is the same Wikimedia
   file as `HK-P-0005`, which we already held. A SHA-256 sweep did not catch it
   because I had baked an EXIF rotation into my copy, changing the bytes. Caught
   by noticing two register rows sharing one `credit_url`. The duplicate file was
   deleted and every reference repointed at `HK-P-0005`; the rotation fix was
   re-applied to `HK-P-0005` itself, where it was needed all along.
   **Row `HK-P-0053` was kept, not deleted** — README §7.5 — and marked
   `jangan-guna` with the reason.
   (A second duplicate, `S-dewan-orang-ramai-batu-26-*` vs `HK-P-0002`, was
   caught the same way earlier and is in §3.)

2. **A wrong `creditUrl` on `taaruf-maksud`.** I wrote
   `…Selangor_010.jpg` against `S-lelaki-menadah-doa-ahmad-ali-karim.jpg`, whose
   real source is `…Selangor_06.jpg`. A credit that points at the wrong file is
   the failure mode the "never fabricate a URL" rule exists to stop. Corrected
   against `HK-P-0019`, which is the authority.

3. **The eight C2.4 `kad-tajuk` entries were dropped from the ingest files**
   during the front-matter edits and were restored. **The alt strings put back
   are the board-approved ones from ruling 3 of 24 Ogos 2026, copied exactly**,
   not rewritten — those went through the board and are not mine to change. The
   restored entries carry a comment saying so.

**A same-file check and a creditUrl-shape check were added to the validator**, so
a page carrying one photograph twice, or a malformed credit link, now fails
rather than ships. That is how defect 3 was found.

## 9. What I did not run

**`/humanizer` was not run.** No article body prose changed in this job — only
front matter — so the humanizer pass those articles already carry still stands.
The new writing is Malay caption and alt-text micro-copy, and the tool's ruleset
is English-language "signs of AI writing"; running it over Malay fragments risks
damage without a matching benefit. Flagging the decision rather than burying it.

---

## Files changed

**This repo**
- `docs/plans/aug-23-2026-session-01/drafts/*.md` — 20 drafts, front matter only
- `docs/plans/aug-23-2026-session-01/drafts/ingest/*.md` — 17 files, front matter only
- `docs/plans/aug-23-2026-session-01/drafts/images/` — 21 photographs added, 55 total
- `docs/plans/aug-23-2026-session-01/drafts/*.png` — 9 data cards added
- `docs/plans/aug-23-2026-session-01/drafts/p1-p6-body-graphics-contact-sheet.html`
- `docs/asset-register/asset-register.csv` — 741 → 771 rows

**`hellokahwin-site`, worktree `pillars-ingest-redirects`** (no build, no deploy)
- `scripts/covers/p1-body-specs.mts` (new)
- `scripts/covers/p6-body-specs.mts` (new)
- `scripts/generate-cover-graphics.mts` — two entries in the `SETS` register

No slug, no URL, no `publishedAt` and no cover on any live article was changed.
