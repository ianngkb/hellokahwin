# DES-13 evidence — the display typeface decision

Everything here was produced on **28 Ogos 2026**. Each script prints its own
numbers; each `out-*.txt` is that script's output, captured unedited. Nothing in
the decision document is stated that is not printed by one of these.

## Reproduce

You need Python 3.13 with `fonttools`, `brotli`, and one font file the repo does
not carry (it is 162 KB of upstream binary and has its own home):

```bash
curl -Lo BodoniModa-var.ttf \
  'https://raw.githubusercontent.com/google/fonts/main/ofl/bodonimoda/BodoniModa%5Bopsz%2Cwght%5D.ttf'

python charset.py  <live-html-files...>          > out-charset-census.txt
python verify.py   BodoniModa-var.ttf charset.json svgs-as-measured/  > out-verify.txt
python opsz.py     BodoniModa-var.ttf            > out-opsz.txt
python hairline.py                               > out-hairline.txt
python subset.py   BodoniModa-var.ttf charset.json > out-subset.txt
```

`charset.py` takes saved production HTML as arguments. The seven pages used were
`/`, `/artikel`, `/artikel/hantaran-mas-kahwin`, `/artikel/venue-perancangan`,
and the articles `mas-kahwin-ikut-negeri`, `dulang-hantaran` and
`inai-tangan-pengantin`, all fetched 28 Ogos 2026 and all HTTP 200. The corpus
TSV it also reads is `docs/design/des-06-evidence/corpus-2026-08-28.tsv`,
produced by DES-06 on the same day.

## What is here

| File | What it is |
|---|---|
| `charset.py` · `charset.json` · `out-charset-census.txt` | Every codepoint the site's display type sets, counted from live HTML plus all 86 article titles and 15 category names. 69 distinct, 2 of them non-ASCII. |
| `verify.py` · `out-verify.txt` | Coverage against Bodoni Moda's cmap, and the provenance check that identifies which face and which optical-size instance the five shipped SVGs were cut from. |
| `opsz.py` · `out-opsz.txt` | What the `opsz` axis moves: set width, sidebearings, and the hairline. |
| `hairline.py` · `out-hairline.txt` | What a sub-pixel hairline does to the mark's contrast, at real mark heights and real device pixel ratios. |
| `subset.py` · `out-subset.txt` | The webfont's byte cost, subsetted, in woff2, against decision 127's 20–30 KB budget. |
| `svgs-as-measured/` | The five lockups exactly as they exist on `origin/feat/des-10-brand-page` in the site repo, copied so the provenance check runs without that repo. |
| `bodonimoda-OFL.txt` · `bodonimoda-METADATA.pb` | Bodoni Moda's licence and Google Fonts metadata, from `google/fonts@main`, `ofl/bodonimoda/`. |
| `Adobe-Fonts-Product-Specific-Terms-en_US-20241007.pdf` | The binding Adobe Fonts licence. Effective 7 October 2024, fetched 28 Ogos 2026 from `wwwimages2.adobe.com`. This is the contract; the FAQs below are Adobe's gloss on it. |
| `adobe-font-licensing-faq-wayback-20260825.txt` | `helpx.adobe.com/fonts/using/font-licensing.html`, text extracted from the Internet Archive snapshot of **25 Aug 2026** (`web.archive.org/web/20260825171158id_/…`). |
| `adobe-webfont-licensing-faq-wayback-20260410.txt` | `helpx.adobe.com/fonts/using/webfont-licensing.html`, snapshot of **10 Apr 2026** (`web.archive.org/web/20260410181644id_/…`). |
| `caratsandcake-typekit-irr0rbw-2026-08-28.css` | The Typekit kit Carats & Cake serve, fetched today. One family, `ivyora-display`, weight 300, `font-display:auto`. |

## Why two Adobe pages come from the Internet Archive

`helpx.adobe.com` and `www.adobe.com` refused every direct request from this
machine on 28 Ogos — `Invoke-WebRequest` timed out at 40 s and 45 s, `curl`
exited 56, and the fetch tool timed out at 60 s, across the global, `sa_en`,
`ae_en`, `my_en` and `/content/help/en/` paths. The Internet Archive served the
same URLs. Snapshot dates are stated above and beside every quotation, because a
licence quotation without its date is worth nothing. The **binding** document —
the Product Specific Terms PDF — came from Adobe directly and needed no archive.
