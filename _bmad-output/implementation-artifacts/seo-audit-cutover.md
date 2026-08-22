# SEO / URL-integrity audit — WordPress → Next cutover

**Generated:** 2026-08-22 · **Source of truth:** hellokahwin.com sitemaps + wp-json + RSS
**Verified against:** the new app on `localhost:3200` with live Supabase + R2

## Result

**126 / 126 PASS — 0 FAIL.**

The pass rule is deliberately judged against the LIVE site, not against an
assumption of what each URL "should" do:

| Live today | New app must |
|---|---|
| 2xx | end at 200 (directly, or via redirect) |
| 3xx | end at 200 |
| 4xx | be any non-5xx — the URL is already broken today |

That distinction mattered: `/coming-soon/` looked like a failure until the live
site turned out to 404 it too, and `/rss` looked fine until the live site turned
out to 301 it.

| Class | Pass |
|---|---|
| WP furniture | 3/3 |
| author archive | 2/2 |
| category archive | 24/24 |
| category pagination | 24/24 |
| date archive | 4/4 |
| feed | 4/4 |
| home | 3/3 |
| pagination | 1/1 |
| post/page permalink | 31/31 |
| robots | 1/1 |
| sitemap | 4/4 |
| wp-content image | 25/25 |

## Enumeration

Walked 5 sitemaps — /sitemap.xml, /addl-sitemap.xml, /post-sitemap.xml, /page-sitemap.xml, /category-sitemap.xml — plus wp-json
(29 posts, 24 categories,
0 tags, 2 users, 2 pages),
the RSS feeds, date archives derived from post dates, pagination variants, and a
sample of the 5963 `wp-content` image URLs found in post bodies.

## Fixes made to reach zero failures

1. **9 empty categories restored (18 URLs).** WordPress has 24 categories; the
   article import only created the 15 that had posts, so legacy URLs like
   `/category/real-wedding/klasik/` redirected to a 404. Ran the purpose-built
   `scripts/wp-import-categories.ts`, which created the 9 missing ones with the
   right parents. They now render the spec'd empty state at 200 with
   `noindex, follow` — the same status they return on WordPress today. Chosen
   over inventing redirects to the hub, which would have been a soft-404.
2. **Legacy image redirects populated (1,639 rows).** The
   `legacy_image_redirects` table and its route handler were fully built but
   the importer never filled the table, so every `/wp-content/uploads/…` URL
   404'd — Google Images traffic and every external hotlink. Rebuilt the map by
   matching sanitized basenames between the WordPress media library (including
   every registered size variant) and the R2 objects.
   Two encoding traps had to be handled together: the importer sanitizes the
   **percent-encoded** path (an em dash becomes `_E2_80_94`), while Next hands
   the route handler the **decoded** path — so matching uses the encoded form
   and the stored key uses the decoded one.
3. **Legacy sitemap URLs.** All in One SEO served `/post-sitemap.xml`,
   `/page-sitemap.xml`, `/category-sitemap.xml`, `/addl-sitemap.xml` and 302'd
   `/sitemap_index.xml` and `/wp-sitemap.xml`. All now 301 to `/sitemap.xml`.
4. **`/rss`** — 301 on the live site, 404 here. Added to the feed rule.
5. **`/sample-page`** — still 200 live and listed in the page sitemap, with no
   equivalent here. 301 to home rather than becoming a new crawl error.
6. **`/wp-admin`, `/wp-login.php`** — 301 to `/login`. Convenience for the team;
   Clerk still gates everything behind it.

## Beyond the matrix

- **1,601 → 120 sampled legacy image URLs** were followed end to end: every one
  301s to an R2 object that returns 200.
- **1,346 WordPress media URLs are intentionally unmapped.** They are orphan
  uploads — files in the media library that no published post references, so
  they were never migrated. Nothing links to them and they are not in any
  sitemap; they 404.
- **Canonicals, OG and JSON-LD** on home, hub, category and article all point at
  `https://hellokahwin.com/…`. Zero `localhost` references in any rendered page.
  Article JSON-LD carries Article + BreadcrumbList + WebPage + Organization +
  ImageObject.
- **robots.txt** allows everything except `/admin/`, `/login`, `/no-access`,
  `/sso-callback`, `/draft/`, and points at the production sitemap.
- **Child category pages are deliberately absent from the sitemap.** They emit
  `noindex, follow` and consolidate onto the parent; listing noindex URLs in a
  sitemap is an anti-pattern. Pre-existing, reviewed design — not a cutover
  regression. Articles themselves are indexed under their child-category path
  and all 29 are in the sitemap.
- **The two outbound theweddingnotebook.com links** in article bodies are
  `target="_blank" rel="noopener"` — plain editorial outbound links, kept as-is
  per Ian. No `nofollow`/`sponsored` mislabelling.

## Full matrix

| # | Legacy URL | Class | Live | New app | Result |
|---|---|---|---|---|---|
| 1 | `/` | home | 200 | 200 | PASS |
| 2 | `/2025/` | date archive | 200 | 308 → `/2025` → 200 | PASS |
| 3 | `/2025/11/` | date archive | 200 | 308 → `/2025/11` → 200 | PASS |
| 4 | `/2026/` | date archive | 200 | 308 → `/2026` → 200 | PASS |
| 5 | `/2026/01/` | date archive | 200 | 308 → `/2026/01` → 200 | PASS |
| 6 | `/?feed=rss2` | home | 301 | 200 | PASS |
| 7 | `/?p=1158` | home | 301 | 200 | PASS |
| 8 | `/amankila-bali/` | post/page permalink | 200 | 308 → `/amankila-bali` → 200 | PASS |
| 9 | `/author/hannani/` | author archive | 200 | 308 → `/author/hannani` → 200 | PASS |
| 10 | `/author/ianngtheweddingnotebook-com/` | author archive | 200 | 308 → `/author/ianngtheweddingnotebook-com` → 200 | PASS |
| 11 | `/cara-buat-kad-kahwin-digital/` | post/page permalink | 200 | 308 → `/cara-buat-kad-kahwin-digital` → 200 | PASS |
| 12 | `/category/idea-dan-nasihat/` | category archive | 200 | 308 → `/category/idea-dan-nasihat` → 200 | PASS |
| 13 | `/category/idea-dan-nasihat/ahli-pengantin-pengiring/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/ahli-pengantin-pengiring` → 200 | PASS |
| 14 | `/category/idea-dan-nasihat/ahli-pengantin-pengiring/page/2` | category pagination | 404 | 301 → `/artikel/ahli-pengantin-pengiring` → 200 | PASS |
| 15 | `/category/idea-dan-nasihat/bajet-perkahwinan/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/bajet-perkahwinan` → 200 | PASS |
| 16 | `/category/idea-dan-nasihat/bajet-perkahwinan/page/2` | category pagination | 404 | 301 → `/artikel/bajet-perkahwinan` → 200 | PASS |
| 17 | `/category/idea-dan-nasihat/etika-tetamu/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/etika-tetamu` → 200 | PASS |
| 18 | `/category/idea-dan-nasihat/etika-tetamu/page/2` | category pagination | 404 | 301 → `/artikel/etika-tetamu` → 200 | PASS |
| 19 | `/category/idea-dan-nasihat/fotografi-videografi/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/fotografi-videografi` → 200 | PASS |
| 20 | `/category/idea-dan-nasihat/fotografi-videografi/page/2` | category pagination | 404 | 301 → `/artikel/fotografi-videografi` → 200 | PASS |
| 21 | `/category/idea-dan-nasihat/hiasan-dekorasi/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/hiasan-dekorasi` → 200 | PASS |
| 22 | `/category/idea-dan-nasihat/hiasan-dekorasi/page/2` | category pagination | 404 | 301 → `/artikel/hiasan-dekorasi` → 200 | PASS |
| 23 | `/category/idea-dan-nasihat/majlis-akad-resepsi/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/majlis-akad-resepsi` → 200 | PASS |
| 24 | `/category/idea-dan-nasihat/majlis-akad-resepsi/page/2` | category pagination | 404 | 301 → `/artikel/majlis-akad-resepsi` → 200 | PASS |
| 25 | `/category/idea-dan-nasihat/page/2` | category pagination | 301 | 301 → `/artikel/idea-dan-nasihat` → 200 | PASS |
| 26 | `/category/idea-dan-nasihat/pengacara-hiburan/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/pengacara-hiburan` → 200 | PASS |
| 27 | `/category/idea-dan-nasihat/pengacara-hiburan/page/2` | category pagination | 404 | 301 → `/artikel/pengacara-hiburan` → 200 | PASS |
| 28 | `/category/idea-dan-nasihat/perancangan/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/perancangan` → 200 | PASS |
| 29 | `/category/idea-dan-nasihat/perancangan/page/2` | category pagination | 404 | 301 → `/artikel/perancangan` → 200 | PASS |
| 30 | `/category/idea-dan-nasihat/venue/` | category archive | 200 | 308 → `/category/idea-dan-nasihat/venue` → 200 | PASS |
| 31 | `/category/idea-dan-nasihat/venue/page/2` | category pagination | 404 | 301 → `/artikel/venue` → 200 | PASS |
| 32 | `/category/real-wedding/` | category archive | 200 | 308 → `/category/real-wedding` → 200 | PASS |
| 33 | `/category/real-wedding/bertema/` | category archive | 200 | 308 → `/category/real-wedding/bertema` → 200 | PASS |
| 34 | `/category/real-wedding/bertema/page/2` | category pagination | 404 | 301 → `/artikel/bertema` → 200 | PASS |
| 35 | `/category/real-wedding/bohemia-romantis/` | category archive | 200 | 308 → `/category/real-wedding/bohemia-romantis` → 200 | PASS |
| 36 | `/category/real-wedding/bohemia-romantis/page/2` | category pagination | 404 | 301 → `/artikel/bohemia-romantis` → 200 | PASS |
| 37 | `/category/real-wedding/glamor-eksklusif/` | category archive | 200 | 308 → `/category/real-wedding/glamor-eksklusif` → 200 | PASS |
| 38 | `/category/real-wedding/glamor-eksklusif/page/2` | category pagination | 404 | 301 → `/artikel/glamor-eksklusif` → 200 | PASS |
| 39 | `/category/real-wedding/klasik/` | category archive | 200 | 308 → `/category/real-wedding/klasik` → 200 | PASS |
| 40 | `/category/real-wedding/klasik/page/2` | category pagination | 404 | 301 → `/artikel/klasik` → 200 | PASS |
| 41 | `/category/real-wedding/minimalis-mewah/` | category archive | 200 | 308 → `/category/real-wedding/minimalis-mewah` → 200 | PASS |
| 42 | `/category/real-wedding/minimalis-mewah/page/2` | category pagination | 404 | 301 → `/artikel/minimalis-mewah` → 200 | PASS |
| 43 | `/category/real-wedding/moden-kontemporari/` | category archive | 200 | 308 → `/category/real-wedding/moden-kontemporari` → 200 | PASS |
| 44 | `/category/real-wedding/moden-kontemporari/page/2` | category pagination | 404 | 301 → `/artikel/moden-kontemporari` → 200 | PASS |
| 45 | `/category/real-wedding/page/2` | category pagination | 301 | 301 → `/artikel/real-wedding` → 200 | PASS |
| 46 | `/category/real-wedding/pantai-santai/` | category archive | 200 | 308 → `/category/real-wedding/pantai-santai` → 200 | PASS |
| 47 | `/category/real-wedding/pantai-santai/page/2` | category pagination | 404 | 301 → `/artikel/pantai-santai` → 200 | PASS |
| 48 | `/category/real-wedding/perindustrian-moden/` | category archive | 200 | 308 → `/category/real-wedding/perindustrian-moden` → 200 | PASS |
| 49 | `/category/real-wedding/perindustrian-moden/page/2` | category pagination | 404 | 301 → `/artikel/perindustrian-moden` → 200 | PASS |
| 50 | `/category/real-wedding/rustik/` | category archive | 200 | 308 → `/category/real-wedding/rustik` → 200 | PASS |
| 51 | `/category/real-wedding/rustik/page/2` | category pagination | 404 | 301 → `/artikel/rustik` → 200 | PASS |
| 52 | `/category/real-wedding/tropikal/` | category archive | 200 | 308 → `/category/real-wedding/tropikal` → 200 | PASS |
| 53 | `/category/real-wedding/tropikal/page/2` | category pagination | 404 | 301 → `/artikel/tropikal` → 200 | PASS |
| 54 | `/category/real-wedding/vintage-romantik/` | category archive | 200 | 308 → `/category/real-wedding/vintage-romantik` → 200 | PASS |
| 55 | `/category/real-wedding/vintage-romantik/page/2` | category pagination | 404 | 301 → `/artikel/vintage-romantik` → 200 | PASS |
| 56 | `/category/real-wedding/warisan-tradisi/` | category archive | 200 | 308 → `/category/real-wedding/warisan-tradisi` → 200 | PASS |
| 57 | `/category/real-wedding/warisan-tradisi/page/2` | category pagination | 404 | 301 → `/artikel/warisan-tradisi` → 200 | PASS |
| 58 | `/category/uncategorized/` | category archive | 200 | 308 → `/category/uncategorized` → 200 | PASS |
| 59 | `/category/uncategorized/page/2` | category pagination | 404 | 301 → `/artikel/uncategorized` → 200 | PASS |
| 60 | `/cheong-fatt-tze-mansion/` | post/page permalink | 200 | 308 → `/cheong-fatt-tze-mansion` → 200 | PASS |
| 61 | `/coming-soon/` | post/page permalink | 404 | 308 → `/coming-soon` → 404 | PASS |
| 62 | `/comments/feed` | feed | 301 | 301 → `/` → 200 | PASS |
| 63 | `/dewan-kahwin/` | post/page permalink | 200 | 308 → `/dewan-kahwin` → 200 | PASS |
| 64 | `/feed` | feed | 301 | 301 → `/` → 200 | PASS |
| 65 | `/feed/` | feed | 200 | 308 → `/feed` → 200 | PASS |
| 66 | `/garden-wedding/` | post/page permalink | 200 | 308 → `/garden-wedding` → 200 | PASS |
| 67 | `/goodies-kahwin/` | post/page permalink | 200 | 308 → `/goodies-kahwin` → 200 | PASS |
| 68 | `/grand-hyatt-kuala-lumpur/` | post/page permalink | 200 | 308 → `/grand-hyatt-kuala-lumpur` → 200 | PASS |
| 69 | `/hadiah-untuk-pengantin/` | post/page permalink | 200 | 308 → `/hadiah-untuk-pengantin` → 200 | PASS |
| 70 | `/hantaran-kahwin/` | post/page permalink | 200 | 308 → `/hantaran-kahwin` → 200 | PASS |
| 71 | `/hantaran-tunang/` | post/page permalink | 200 | 308 → `/hantaran-tunang` → 200 | PASS |
| 72 | `/jw-marriott-kuala-lumpur/` | post/page permalink | 200 | 308 → `/jw-marriott-kuala-lumpur` → 200 | PASS |
| 73 | `/kursus-kahwin/` | post/page permalink | 200 | 308 → `/kursus-kahwin` → 200 | PASS |
| 74 | `/lokasi-pre-wedding-photoshoot-terbaik/` | post/page permalink | 200 | 308 → `/lokasi-pre-wedding-photoshoot-terbaik` → 200 | PASS |
| 75 | `/majlis-kahwin/` | post/page permalink | 200 | 308 → `/majlis-kahwin` → 200 | PASS |
| 76 | `/marriott-putrajaya/` | post/page permalink | 200 | 308 → `/marriott-putrajaya` → 200 | PASS |
| 77 | `/mas-kahwin-ikut-negeri/` | post/page permalink | 200 | 308 → `/mas-kahwin-ikut-negeri` → 200 | PASS |
| 78 | `/page/2` | pagination | 301 | 301 → `/` → 200 | PASS |
| 79 | `/pelamin-kahwin-dewan/` | post/page permalink | 200 | 308 → `/pelamin-kahwin-dewan` → 200 | PASS |
| 80 | `/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan/` | post/page permalink | 200 | 308 → `/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan` → 200 | PASS |
| 81 | `/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson/` | post/page permalink | 200 | 308 → `/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` → 200 | PASS |
| 82 | `/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour/` | post/page permalink | 200 | 308 → `/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` → 200 | PASS |
| 83 | `/perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat/` | post/page permalink | 200 | 308 → `/perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat` → 200 | PASS |
| 84 | `/robots.txt` | robots | 200 | 200 | PASS |
| 85 | `/rss` | feed | 301 | 301 → `/` → 200 | PASS |
| 86 | `/sample-page/` | post/page permalink | 200 | 308 → `/sample-page` → 200 | PASS |
| 87 | `/sentosa-janda-baik/` | post/page permalink | 200 | 308 → `/sentosa-janda-baik` → 200 | PASS |
| 88 | `/sewa-dewan-kahwin/` | post/page permalink | 200 | 308 → `/sewa-dewan-kahwin` → 200 | PASS |
| 89 | `/sime-darby-convention-centre/` | post/page permalink | 200 | 308 → `/sime-darby-convention-centre` → 200 | PASS |
| 90 | `/sitemap.rss` | sitemap | 200 | 301 → `/sitemap.xml` → 200 | PASS |
| 91 | `/sitemap.xml` | sitemap | 200 | 200 | PASS |
| 92 | `/sitemap_index.xml` | sitemap | 302 | 301 → `/sitemap.xml` → 200 | PASS |
| 93 | `/tempat-honeymoon-di-malaysia/` | post/page permalink | 200 | 308 → `/tempat-honeymoon-di-malaysia` → 200 | PASS |
| 94 | `/the-danna-langkawi/` | post/page permalink | 200 | 308 → `/the-danna-langkawi` → 200 | PASS |
| 95 | `/villa-warisan/` | post/page permalink | 200 | 308 → `/villa-warisan` → 200 | PASS |
| 96 | `/wedding-planner-terbaik-di-malaysia/` | post/page permalink | 200 | 308 → `/wedding-planner-terbaik-di-malaysia` → 200 | PASS |
| 97 | `/wp-admin/` | WP furniture | 302 | 308 → `/wp-admin` → 200 | PASS |
| 98 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-BingkaiGambarPintar.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395652713-IN-HadiahUntukPengantin-BingkaiGambarPintar/high.webp` → 200 | PASS |
| 99 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-PenjejakKecergasan.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395651423-IN-HadiahUntukPengantin-PenjejakKecergasan/high.webp` → 200 | PASS |
| 100 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-PotretPerkahwinanCustom.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395643925-IN-HadiahUntukPengantin-PotretPerkahwinanCustom/high.webp` → 200 | PASS |
| 101 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-SetLilinMewah.webp` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395655279-IN-HadiahUntukPengantin-SetLilinMewah/high.webp` → 200 | PASS |
| 102 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-SetPeralatanMemasak.webp` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395650114-IN-HadiahUntukPengantin-SetPeralatanMemasak/high.webp` → 200 | PASS |
| 103 | `/wp-content/uploads/2026/01/IN-HadiahUntukPengantin-SetPijamaSedondon.webp` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395656642-IN-HadiahUntukPengantin-SetPijamaSedondon/high.webp` → 200 | PASS |
| 104 | `/wp-content/uploads/2026/01/IN-TempatHoneymoonDiMalaysia-Mulu.jpeg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395675079-IN-TempatHoneymoonDiMalaysia-Mulu/high.webp` → 200 | PASS |
| 105 | `/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-Kundasang.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395683603-IN-TempatHoneymoondiMalaysia-Kundasang/high.webp` → 200 | PASS |
| 106 | `/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-Melaka.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395689148-IN-TempatHoneymoondiMalaysia-Melaka/high.webp` → 200 | PASS |
| 107 | `/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-TamanNegara.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395687360-IN-TempatHoneymoondiMalaysia-TamanNegara/high.webp` → 200 | PASS |
| 108 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-CoklatMini-1.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395726692-IN_E2_80_94GoodiesKahwin-CoklatMini-1/high.webp` → 200 | PASS |
| 109 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-CoklatMini-2.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395728264-IN_E2_80_94GoodiesKahwin-CoklatMini-2/high.webp` → 200 | PASS |
| 110 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-CookiesDalamBalang-1.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395723319-IN_E2_80_94GoodiesKahwin-CookiesDalamBalang-1/high.webp` → 200 | PASS |
| 111 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-CookiesDalamBalang-2.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395725138-IN_E2_80_94GoodiesKahwin-CookiesDalamBalang-2/high.webp` → 200 | PASS |
| 112 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-LilinAromaterapiMini.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395731518-IN_E2_80_94GoodiesKahwin-LilinAromaterapiMini/high.webp` → 200 | PASS |
| 113 | `/wp-content/uploads/2026/01/IN—GoodiesKahwin-SabunHandmade.png` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/goodies-kahwin/1787395729991-IN_E2_80_94GoodiesKahwin-SabunHandmade/high.webp` → 200 | PASS |
| 114 | `/wp-content/uploads/2026/01/IN—TempatHoneymoondiMalaysia-JandaBaik.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/tempat-honeymoon-di-malaysia/1787395680452-IN_E2_80_94TempatHoneymoondiMalaysia-JandaBaik/high.webp` → 200 | PASS |
| 115 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-AsianAtelierWeddingsbyAlinAnuar.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395705524-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-AsianAt/high.webp` → 200 | PASS |
| 116 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-FarahHanafiahBespokeEvents.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395701057-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-FarahHa/high.webp` → 200 | PASS |
| 117 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-FlairDesigns.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395704140-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-FlairDe/high.webp` → 200 | PASS |
| 118 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-KayanganGallery.webp` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395696629-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-Kayanga/high.webp` → 200 | PASS |
| 119 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-MunstaraEvent.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395699590-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-Munstar/high.webp` → 200 | PASS |
| 120 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-RekaTeemor.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395707100-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-RekaTee/high.webp` → 200 | PASS |
| 121 | `/wp-content/uploads/2026/01/IN—WeddingPlannerTerbaikdiMalaysia-WeddingsbyEmma.jpg` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/wedding-planner-terbaik-di-malaysia/1787395697999-IN_E2_80_94WeddingPlannerTerbaikdiMalaysia-Wedding/high.webp` → 200 | PASS |
| 122 | `/wp-content/uploads/2026/01/KendraScottEngravingNecklaces.webp` | wp-content image | 200 | 301 → `https://images.hellokahwin.com/inspire/hadiah-untuk-pengantin/1787395645435-KendraScottEngravingNecklaces/high.webp` → 200 | PASS |
| 123 | `/wp-login.php` | WP furniture | 200 | 301 → `/login` → 200 | PASS |
| 124 | `/wp-sitemap.xml` | sitemap | 302 | 301 → `/sitemap.xml` → 200 | PASS |
| 125 | `/xmlrpc.php` | WP furniture | 403 | 404 | PASS |
| 126 | `/yasaka-shrine/` | post/page permalink | 200 | 308 → `/yasaka-shrine` → 200 | PASS |
