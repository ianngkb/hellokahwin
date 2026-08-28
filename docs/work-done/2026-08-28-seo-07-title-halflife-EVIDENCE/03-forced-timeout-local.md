# Forcing the timeout, against the fix

NEW CODE. Local production build — `pnpm build && pnpm start -p 3209` — against
the production database, so the render is the real one. `NEXT_PUBLIC_SITE_URL`
is the local origin, which is why the canonical URLs below say `localhost`.

The condition is stated so it can be reproduced: the metadata deadlines are
environment-tunable (`INSPIRE_META_DEADLINE_MS`,
`INSPIRE_META_FALLBACK_DEADLINE_MS`, defaults 1500/1200). Setting a tier's
deadline to `1` makes that tier lose its race on every request, deterministically.

---

## Tier 2 — `INSPIRE_META_DEADLINE_MS=1`, fallback at its normal 1200ms

The full payload can never win. Googlebot user-agent, ISR cache deleted first.

```
/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
  cold   http=200  cache=MISS
    <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin
    <desc>  Bilangan dulang hantaran tunang yang lazim, siapa yang mula menyebut a…
  cache  http=200  cache=HIT
    <title> Berapa dulang hantaran tunang, dan siapa yang tentukan | HelloKahwin
    <desc>  Bilangan dulang hantaran tunang yang lazim, siapa yang mula menyebut a…

/artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
  cold   http=200  cache=MISS
    <title> Barang hantaran perempuan: senarai ikut kategori dan kos | HelloKahwin
    <desc>  Barang hantaran perempuan ikut kategori: kelengkapan solat, pakaian, b…
  cache  http=200  cache=HIT
    <title> Barang hantaran perempuan: senarai ikut kategori dan kos | HelloKahwin
    <desc>  Barang hantaran perempuan ikut kategori: kelengkapan solat, pakaian, b…

/artikel/ucapan-doa/ucapan-pengantin-baru
  cold   http=200  cache=MISS
    <title> Ucapan pengantin baru: apa yang ditulis ikut siapa dia | HelloKahwin
    <desc>  Ucapan pengantin baru untuk kawan, adik-beradik, rakan sekerja dan ora…
  cache  http=200  cache=HIT
    <title> Ucapan pengantin baru: apa yang ditulis ikut siapa dia | HelloKahwin
    <desc>  Ucapan pengantin baru untuk kawan, adik-beradik, rakan sekerja dan ora…
```

`x-nextjs-cache: MISS` then `HIT` on the same URL: the response the reader gets
under a forced timeout carries the article's real title AND its real
description, and the CACHE ENTRY WRITTEN FROM THAT RENDER carries them too.
Under the old code this exact condition produced the homepage title, cached.

All three are the pages the baseline sweep found broken on production, and all
three are in the family SEO-05 repaired.

Server log for the same three requests (`03-forced-tier1-timeout-server.log`):

```
[inspire-article-meta:berapa-dulang-hantaran-tunang] degraded to tier=fallback (deadlines 1ms/1200ms): deadline_exceeded:inspire-article-meta:berapa-dulang-hantaran-tunang
[inspire-article-meta:barang-hantaran-perempuan] degraded to tier=fallback (deadlines 1ms/1200ms): deadline_exceeded:inspire-article-meta:barang-hantaran-perempuan
[inspire-article-meta:ucapan-pengantin-baru] degraded to tier=fallback (deadlines 1ms/1200ms): deadline_exceeded:inspire-article-meta:ucapan-pengantin-baru
```

The old `catch { return {} }` logged NOTHING. A defect that reproduces on ~9% of
cold renders spent a whole sprint without one line naming it.

---

## Tier 3 — both deadlines at 1ms. The database answers nothing, ever.

```
/artikel/real-wedding/sentosa-janda-baik
  chrome    #1     http=200  cache=MISS  prerender=1  <title> Sentosa janda baik | HelloKahwin
  googlebot #2     http=200  cache=HIT   prerender=1  <title> Sentosa janda baik | HelloKahwin
  googlebot #3     http=200  cache=HIT   prerender=1  <title> Sentosa janda baik | HelloKahwin

/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
  chrome    #1     http=200  cache=MISS  prerender=1  <title> Songket tenunan tangan atau cetak | HelloKahwin
  googlebot #2     http=200  cache=HIT   prerender=1  <title> Songket tenunan tangan atau cetak | HelloKahwin
  googlebot #3     http=200  cache=HIT   prerender=1  <title> Songket tenunan tangan atau cetak | HelloKahwin
```

A degraded title, derived from the slug with no I/O. Never the homepage title.

---

## Why tier 3 is a slug and not a `throw` — the run that changed the design

The first version of the fix ended tier 3 with `throw`, reasoning that an
errored render caches nothing. Measured under the same 1ms/1ms condition, that
is USUALLY true — first request `500` with no entry written, second `200` with
the correct title, third a `HIT`:

```
/artikel/real-wedding/sentosa-janda-baik  (curl default UA, throw version)
  req1     http=500  cache=-      prerender=-  <title> (none)
  req2     http=200  cache=MISS   prerender=1  <title> Majlis Perkahwinan Penuh Nilai Budaya di Sentosa…
  req3     http=200  cache=HIT    prerender=1  <title> Majlis Perkahwinan Penuh Nilai Budaya di Sentosa…
```

Usually. One run in the same session answered:

```
  HTTP/1.1 200 OK   x-nextjs-cache: MISS   x-nextjs-prerender: 1   Content-Length: 145313
  <h1> Barang hantaran perempuan: senarai ikut kategori dan kos
  <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
```

The whole article, a correct `<h1>`, and the ROOT LAYOUT'S TITLE in the head —
with `x-nextjs-prerender: 1`, meaning that entry was being written. The exact
defect, straight back, through Next's own error path rather than through our
`catch`.

It was not reproduced on demand, and that is precisely why the design changed.
Next 16 decides PER REQUEST whether to stream metadata or block on it, from the
user agent (`serveStreamingMetadata`, `next/dist/server/app-render/app-render.js`),
so the unwind path after a throw is not even the same for a reader and for
Googlebot. An invariant this item exists to guarantee cannot rest on that.

The slug is already in hand, costs no I/O, has no deadline and cannot fail. It
turns "the site default is unlikely" into "the site default is unreachable".
