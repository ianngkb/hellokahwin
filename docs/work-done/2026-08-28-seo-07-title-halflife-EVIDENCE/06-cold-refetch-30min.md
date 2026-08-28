# The 30-minute cold re-fetch

NEW CODE, production. Run at **04:43:15Z**, 39 minutes after the post-fix sweep
finished (04:04:02Z) and 2h47m after the deploy. Googlebot user-agent,
sequential, one second apart. Script: `cold-refetch.sh`, committed alongside.

The eight URLs are the exact eight the OLD code was serving the site-default
title on at 03:19Z.

Edge entries live at most 15 minutes (`Vercel-CDN-Cache-Control: s-maxage=300,
stale-while-revalidate=600`). Nothing had touched these URLs for 39. So every
row below answering `x-vercel-cache: MISS, age=0` is a genuine cold fetch
through to the origin — which is what the DoD asks for, and which is precisely
the condition that produced 7 site-default titles on the old code.

```
### PLAIN — what a reader and Googlebot receive  (2026-08-28T04:43:15Z)

/artikel/ucapan-doa/ucapan-pengantin-baru
  http=200  x-vercel-cache=MISS  age=0
  <title> Ucapan pengantin baru: apa yang ditulis ikut siapa dia | HelloKahwin

/artikel/real-wedding/sentosa-janda-baik
  http=200  x-vercel-cache=MISS  age=0
  <title> Majlis Perkahwinan Penuh Nilai Budaya di Sentosa, Janda Baik dengan Inspirasi Warisan Diraja | HelloKahwin

/artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
  http=200  x-vercel-cache=MISS  age=0
  <title> Barang hantaran perempuan: senarai ikut kategori dan kos | HelloKahwin

/artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-lelaki
  http=200  x-vercel-cache=MISS  age=0
  <title> Hantaran tunang untuk lelaki: apa yang dibalas dan harganya | HelloKahwin

/artikel/real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan
  [row corrupted by a script bug — see below; re-probed at 04:45:42Z:]
  http=200  x-vercel-cache=HIT  age=45
  <title> Perkahwinan di Ruma Hotel Kuala Lumpur Dengan Sentuhan Warisan Peranakan | HelloKahwin
  <h1>    Perkahwinan di Ruma Hotel Kuala Lumpur Dengan Sentuhan Warisan Peranakan

/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
  http=200  x-vercel-cache=MISS  age=0
  <title> Kain songket tenunan tangan atau cetak: beza dan harga | HelloKahwin

/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
  http=200  x-vercel-cache=MISS  age=0
  <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin

/artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-perempuan
  http=200  x-vercel-cache=MISS  age=0
  <title> Hantaran tunang untuk perempuan: apa yang dibawa masuk | HelloKahwin
```

**Eight of eight carry their article's own title.** Zero carry
`HelloKahwin — Idea & Panduan Perkahwinan Malaysia`.

Five of these eight were serving a tier-3 SLUG title at 04:04Z, on the deploy's
cold caches. All five now serve the full row title — `barang-hantaran-perempuan`
has gone from `Barang hantaran perempuan` to
`Barang hantaran perempuan: senarai ikut kategori dan kos`. The degraded tier is
transient by construction: it is replaced by the next revalidation that wins,
which is the opposite of the old fallback's behaviour.

---

## Two things this run got wrong, recorded because they are the point

**1. `?_t=` is not a cache-buster on this route.** A second pass at 04:44:25Z
appended a unique query per request, intending to force an edge miss. Every row
came back `x-vercel-cache: HIT` with an `age` matching the entry the plain pass
had created 70 seconds earlier — Vercel's cache key for this route ignores the
query string. The pass measured nothing it was not already measuring.

That is the same shape of error as Sprint 02's six-wide sweep: a knob that looks
like it changes the measurement, does not, and produces a confident number
either way. The claim above therefore rests on the plain pass and on the elapsed
time, both of which are checkable, and not on the buster. The script's header
now says so.

**2. A failed request reported the previous URL's title.** Row 5 printed an
empty HTTP status and the title belonging to row 4, because `curl` failed and
`cold.html` still held the previous page. The row was re-probed and is correct,
and the script now truncates the file before every request. A measurement script
that reuses a stale file on failure is a measurement script that lies — quietly,
and in the direction of "everything is fine".
