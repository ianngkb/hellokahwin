# The freeze, on production, one minute after the sweep created it

OLD CODE. `hellokahwin.com`, 28 Ogos 2026.

The sequential baseline sweep (`01-baseline-sweep-prod-OLD-CODE.log`, finished
03:22:05Z) found 8 article pages serving the root layout's `title.default`.
Seven of those eight answered `x-vercel-cache: MISS` — a cold origin render,
triggered by my own single request, at a concurrency of one.

Those same eight URLs, re-fetched at 03:22:31Z — twenty-six seconds later:

```
HIT    age=154   /artikel/ucapan-doa/ucapan-pengantin-baru
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=140   /artikel/real-wedding/sentosa-janda-baik
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=128   /artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=130   /artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-lelaki
         <title> Hantaran tunang untuk lelaki: apa yang dibalas dan harganya | HelloKahwin
HIT    age=122   /artikel/real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=103   /artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=84    /artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
HIT    age=83    /artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-perempuan
         <title> HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia
```

Seven of the eight are now `HIT`. The wrong title is no longer being computed —
it is being SERVED FROM CACHE, to every reader and every crawler, with an `age`
counting up. That is the half-life: the defect outlives the condition that
caused it.

The eighth row is the whole item in one line. `hantaran-tunang-untuk-lelaki` was
the only one of the eight that answered `STALE` (age 510) during the sweep
rather than `MISS`. Its background revalidation happened to win the 1.5s race,
so twenty-six seconds later it serves its real title. Same URL, same minute,
same code — a coin-flip. That is why a title verified immediately after a
repair proves nothing, and why the Sprint 02 verification was a false pass.

## Method, so the numbers can be checked

- `pnpm audit:titles` — `scripts/audit-rendered-titles.mts`, sequential, 300ms
  apart, 103 sitemap URLs, of which 86 are article pages.
- Verdict is an EXACT string match against the root layout's `title.default`,
  imported from `src/lib/seo/site-title.ts` rather than copied.
- Every row carries `x-vercel-cache` and `age`. A title without its cache state
  says nothing: the same URL answers differently from `HIT`, `STALE` and `MISS`.
- The re-fetch above is a plain sequential `curl` of the eight failing URLs, one
  second apart, printing `x-vercel-cache`, `age` and `<title>`.
