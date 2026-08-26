# SEO-03 — kursus kahwin fee table: how to apply this

**Status:** researched, drafted, humanized. **NOT ingested.** Gated on RISK-01.
**Target:** `https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin`
**Verified:** 26 Ogos 2026.

## This is a surgical swap, not a body replacement

`articles.content` on this row is a **legacy jsonb object** holding a TipTap HTML
string. Do **not** rebuild the body from the rendered page. The rendered `<img>`
tags carry Next.js Image attributes (`data-nimg`, `loading`, `decoding`,
generated `class` and `style`) that are **not** in the stored source, so a
reconstructed body would silently rewrite all 18 image nodes. That is exactly
the collateral edit the brief forbids.

`kursus-kahwin-body-RENDERED-2026-08-26.html` is kept as the **rendered**
reference only. It is not the stored value and must not be written back.

## The swap

Replace this exact substring in `articles.content` (the whole `Bayaran Yuran`
section as it stands live today, one `<h2>` plus one `<p>`):

```
<h2>Bayaran Yuran</h2><p>Yuran kursus ditetapkan oleh Jabatan Agama Islam negeri masing-masing dan berbeza mengikut negeri. Sila semak kadar terkini dengan Jabatan Agama Islam negeri anda sebelum mendaftar.</p>
```

with the full contents of **`kursus-kahwin-yuran-section.html`** (8,146 bytes,
begins `<h2>Bayaran Yuran</h2>`, ends `</p>`).

Nothing else on the page changes. The `<h2>` text is unchanged, so the page's
heading structure and any anchor to it survive.

`kursus-kahwin-yuran-section.md` is the same section in Markdown, for review.

### Table markup

The HTML block uses the same TipTap table shape this site already stores and
renders (`<table><colgroup><col /></colgroup><tbody><tr><th colspan="1"
rowspan="1"><p>…`), verified on the live
`/artikel/venue-perancangan/harga-sewa-dewan-kahwin` on 26 Ogos 2026. If ingest
ever strips tables on this legacy row, stop and report rather than flattening the
table into prose: the table is the deliverable.

## Before you write

- Record the **exact before-state of `articles.content`** verbatim. Production
  runs `pitr_enabled=false` with zero backups.
- `--update`, same slug, same URL. Never a second article.
- Check `jsonb_typeof(content)`. This is a legacy row (`object`). Do not convert
  it.
- `--revalidate-url https://hellokahwin.com` is mandatory.
- Wait five full minutes after the write before any proof request, and do not
  baseline the article URL first.

## If it is applied after 1 September 2026

Pulau Pinang's row and the Pulau Pinang paragraph are written for a fee that
changes on **1 September 2026**. If the write happens on or after that date,
re-check `emunakahat.penang.gov.my` first: the RM100 clause becomes historical
and the sentence needs one edit. The rest of the section is unaffected.
