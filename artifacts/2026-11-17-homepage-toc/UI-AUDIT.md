# HelloKahwin UI audit — live site, 17 Nov 2026

Read-only audit of https://hellokahwin.com at desktop (1440x1000) and phone (390x844). Pages: `/`, `/artikel`, `/artikel/hantaran-mas-kahwin`, `/artikel/real-wedding`, `/artikel/busana-pengantin`, two articles (`hantaran-kahwin-bajet`, `amankila-bali`), `/cari?q=hantaran`, `/cari?q=zzzqqq`, a 404, and `/brand`. No code was changed.

## 1. Summary for the owner

1. The site looks calm and tasteful, but **the articles themselves are hard to read**: the text is small and, on a computer, the lines run almost the full width of the page. This is the single biggest fix.
2. **Most of the library is hidden.** The "all articles" page shows 12 of 102 articles and has no way to see the rest; guide category pages are plain lists of links with no photos.
3. **The pages do not feel like one publication yet.** Four different typefaces, two different category layouts, two footers, and photos that range from professional wedding shoots to old snapshots.
4. **On a phone, too much of the screen is furniture.** Two header bars at the top and a "read next" bar at the bottom take a fifth of the screen, and several buttons are smaller than a fingertip.
5. The search page's "no results" screen and the Real Wedding grid are the best parts of the site and are the standard the rest should be brought up to.

Already being handled by the parallel build and not repeated below: the homepage rebuild (mosaic + Terkini grid + category pills) and moving the "Dalam artikel ini" box to a sticky right column / collapsible box on mobile.

## 2. Findings, ranked by impact

Measurements were taken in the browser. Colour contrast was measured by painting each colour to a canvas and reading the pixel back, not from `getComputedStyle`. Screenshot names refer to the files listed at the end.

### 1. Article text is too small and far too wide — S

- **Pages:** every article.
- **Observed:** body text is 14px with 21px line height. On desktop the text column is 920px wide, giving 110–121 characters per line (`a1d-y900.png`, `a2d-y900.png`); comfortable reading is 60–75. On a phone it is still 14px (`a1m-y800.png`). The text starts at the page's left edge (x=104) while photos and the contents box sit in a narrower 680px column starting at x=224, so the two do not line up, and the right third of the page is empty below the first screen.
- **Why it matters:** these are long guides people read carefully. Small text on long lines makes readers lose their place and leave.
- **Fix:** body 17–18px with ~1.65 line height; cap the text column at about 680px so it shares one left edge with the photos and tables. Source: `.inspire-prose` in `src/app/globals.css` (`font-size: 0.875rem; line-height: 1.5`).

### 2. `/artikel` shows 12 of 102 articles with no way to see more — M

- **Pages:** `/artikel`.
- **Observed:** 3 featured + 9 "Terkini" cards, then category pills, then the footer. No pagination, no "load more" (`artikel-d-full.png`; 12 cards and zero pager links counted in the page). The search page states "Kami ada 102 artikel". The last row has one orphan card.
- **Why it matters:** a reader who wants to browse cannot reach 88% of the content from the page called "all articles".
- **Fix:** add pagination or a "Lagi artikel" button (the `/cari` pager already exists and looks right); show a multiple of 4 cards; move the category pills to the top of the page.

### 3. Guide category pages are bare link lists — M

- **Pages:** `/artikel/hantaran-mas-kahwin`, `/artikel/busana-pengantin` and the other guide categories.
- **Observed:** zero images on the page; 38 text links in a 768px column with the right 40% of a desktop screen empty (`cat-d-full.png`). `/artikel/real-wedding` uses a completely different layout: filter pills and a 4-column photo grid (`rw-d.png`). Busana holds only 3 articles (`busana-d.png`).
- **Why it matters:** for a wedding publication the category page is the shop window; this reads like a sitemap. The two layouts make the site feel like two products.
- **Fix:** keep the useful sub-topic grouping but render each article as a small thumbnail card (the search result row already does this well), and lead each category with one large featured story.

### 4. Gold labels are almost invisible on light backgrounds — S

- **Pages:** category pages ("PANDUAN"), mobile article header (category label), "Sebahagian daripada panduan" box.
- **Observed:** gold rgb(203,181,136) on the off-white page measures **1.93:1**; the minimum for small text is 4.5:1 (`cat-d.png`, `art1-m.png`).
- **Why it matters:** the label that tells readers which section they are in cannot be read in daylight on a phone.
- **Fix:** on light backgrounds use the darker gold the design system already defines (`--hk-gold-700`, #725825); keep the pale gold only on dark photos.

### 5. Phone article opens on a cropped photo; the headline starts two-thirds down — M

- **Pages:** every article on mobile.
- **Observed:** the cover fills 390x488px of an 844px screen as a tall 4:5 crop. On `hantaran-kahwin-bajet` this cuts a wide group photo down to its right half, with people sliced at both edges (`art1-m.png`); the headline starts at about y=590. With the two header bars (96px) the reader sees the title and no article text on the first screen.
- **Why it matters:** arriving from Google on a phone, the first screen should confirm "this is the answer to what I searched".
- **Fix:** use a 3:2 or 4:3 cover on mobile for guide articles (keep 4:5 only for Real Wedding where the photo is the point), and put the category + headline above or directly under a shorter image.

### 6. Headlines and captions are laid over busy photos — S

- **Pages:** `/artikel` mosaic, desktop article hero, in-article photo captions.
- **Observed:** the top-right mosaic tile puts a white headline and gold label straight across people's faces with almost no darkening (`artikel-d.png`, `artikel-m.png`). The desktop article title sits across a row of faces (`art1-d.png`). Photo captions are 12px bold italic underlined white text on top of the photo (`a1d-y2700.png`).
- **Why it matters:** the headline is hard to read and the photo is spoiled at the same time.
- **Fix:** a consistent bottom gradient (at least 60% black under the text) on every tile, or move the text below the image; move captions under the photo in plain 13px grey text. Note for the homepage rebuild: it copies this mosaic, so fix it once in the shared tile.

### 7. Photo quality is uneven and the same photos repeat — L (editorial)

- **Pages:** guide articles, `/artikel`, `/cari`.
- **Observed:** Real Wedding uses professional photography; guide articles use Creative Commons snapshots (an empty car park and a building exterior as card images on `/artikel`; a flash photo of trays on a green mosque carpet in `a1d-y4500.png`). On `/cari?q=hantaran` the first and last results on page 1 share one identical thumbnail, and the same fruit-tray photo appears in the article body and again as a "related" card (`cari-d.png`, `sd-y3500.png`, `a1m-y9300.png`).
- **Why it matters:** photography is the fastest signal of a premium publication, and repeated pictures make different articles look like the same article.
- **Fix:** a short picture standard (subject in focus, people or detail not buildings, no repeats inside one category), then replace the worst 15–20 covers first. Generated images go through the Codex route.

### 8. Two header bars, three search boxes, one menu item — S/M

- **Pages:** all.
- **Observed:** a white strip containing only "CARI", then the header with a search box, then on `/cari` a third search field (`cari-d.png`). Both bars stay pinned while scrolling: 106px on desktop, 96px on a phone. The only navigation word is "ARTIKEL"; the nine topics are hidden behind hover (`dropdown-d.png`).
- **Why it matters:** the first thing a new visitor sees is search repeated, not what the site covers.
- **Fix:** delete the top "CARI" strip; show 4–5 top topics directly in the desktop header (Nikah, Hantaran, Busana, Pelamin, Real Wedding) with "Semua" opening the full menu.

### 9. "Baca seterusnya" bar appears before the reader has read anything — S

- **Pages:** articles on mobile.
- **Observed:** a 70px bar is fixed to the bottom from the first scroll (`a1m-y800.png`). With the 96px header that is 166px of 844px, about 20% of the screen, permanently covered. Its right-hand button is an unlabeled grid icon (it opens the photos).
- **Why it matters:** it shrinks the reading area on the smallest screens and promotes leaving the article at paragraph one.
- **Fix:** show it only after about 60% of the article has been read, and hide the header on scroll-down (show on scroll-up). Give the icon a visible "Foto" label.

### 10. Four typefaces, used inconsistently — M

- **Pages:** all.
- **Observed:** Cormorant (page headings), Geist (interface), Now Alt (article body, article subheadings, article sidebar) and the device's system font (homepage list). Inside an article, the title is serif but every subheading is a geometric sans at 24px (`a1d-y900.png`); card titles sit inside serif headings but render in sans. The 404 message is the only body copy set in Cormorant (`404-d-full.png`).
- **Why it matters:** an editorial brand is mostly its typography; here each page speaks in a slightly different voice.
- **Fix:** two families only. Cormorant for all headings including article H2/H3; one sans for everything else. Retire Now Alt from the public pages or make it the only sans.

### 11. Real Wedding articles are one very long column of photos — M

- **Pages:** `/artikel/glamor-eksklusif/amankila-bali` (and the same template).
- **Observed:** 44 photos stacked one per row; the page is 37,712px tall on desktop (about 38 screens) and 24,181px on a phone. No subheadings in the body, no captions, and the cover photo is shown again as the first photo in the body (`art2-d.png`, `a2d-y3600.png`).
- **Why it matters:** readers cannot skim to the part they care about (pelamin, busana, dinner) and most will not reach the vendor credits at the bottom.
- **Fix:** lay portrait photos two-up on desktop, add 3–4 section headings (Persiapan, Akad, Resepsi, Vendor), drop the duplicated first photo, and put "Kredit vendor" in the side column.

### 12. Several phone buttons are smaller than a fingertip — S

- **Pages:** all, mobile.
- **Observed (width x height):** menu button 38x38, menu close 32x32, share 40x40, "Lihat semua foto" 24 tall, breadcrumb links 24 tall, footer links 20 tall, category labels on cards 13 tall. The usual minimum is 44x44.
- **Why it matters:** mis-taps, especially on the footer and breadcrumb where links sit close together.
- **Fix:** pad these to 44px; footer links to at least 40px row height.

### 13. Footer is thin, and different on `/artikel` — S/M

- **Pages:** all; `/artikel` specifically.
- **Observed:** on `/artikel` the footer has one link under "Teroka" and no "Topik" column at both screen sizes; every other page lists nine topics (`artikel-d-full.png` vs `404-d-full.png`). No About, Contact, Privacy or social links anywhere. "Jenama & Media" opens an English page of logo downloads (`brand-d.png`). The topic list omits "Sebelum Nikah", which the menu includes.
- **Why it matters:** readers taking religious and legal guidance look for who is behind the site; the footer is where they look.
- **Fix:** one footer everywhere; add Tentang Kami, Hubungi, Dasar Privasi, Instagram/TikTok; rename or remove the brand-assets link.

### 14. Keyboard users must tab through the whole menu; focus ring is faint — S

- **Pages:** all.
- **Observed:** no "skip to content" link; the first Tab lands on "Cari", and tabbing then walks through the ~35 links of the Artikel menu before reaching the page (`focus-d-3.png`). The focus outline is 1px at 50% opacity.
- **Fix:** add a "Langkau ke kandungan" link, keep menu links out of the tab order until the menu is opened, use a 2px solid focus ring.

### 15. Search page layout does not match the rest — S

- **Pages:** `/cari`.
- **Observed:** content is centred in a 720px column while every other page is left-aligned at x=104; the search field has a grey fill that looks disabled; result summaries are cut to two lines mid-sentence (`cari-d.png`). The no-results state is well done (suggested searches and topics with counts, `cari0-d-full.png`).
- **Fix:** white field with a clear border, align to the site grid, allow three summary lines.

### 16. Tables are clipped on phones with no hint they scroll — S

- **Pages:** articles with tables.
- **Observed:** the first table is 380px wide in a 358px space; the last column is cut ("Dulang, ala…") with no shadow or cue (`a1m-y2400.png`). Cells wrap to one or two words per line.
- **Fix:** add a right-edge fade when a table scrolls, or stack 4-column tables into cards below 480px.

### 17. Small polish items — S each

- **404:** the browser tab still shows the homepage title; there is no search field on the page (`404-d-full.png`).
- **Category tab title** reads "Hantaran & Mas Kahwin | Inspire | HelloKahwin" — "Inspire" is a leftover internal name.
- **Related articles on mobile:** six full-width cards add roughly 2,300px after the article (`a1m-y8000.png`); use a compact thumbnail list.
- **Portrait photos in articles** are 680x1020px on desktop, taller than the screen (`a1d-y2700.png`); cap height at about 80% of the screen.
- **Heading order:** footer column titles are H4 directly after H2; the sidebar "Tag"/"Kongsi" are H3s after the last body H2.
- **Menu promotes thin sections:** e.g. Busana has 3 articles; hide sub-topics with fewer than 3 articles until they fill.

## 3. Quick wins (under an hour each)

1. Raise article body text to 17–18px / 1.65 and cap the column at 680px (finding 1).
2. Switch gold labels on light backgrounds to `--hk-gold-700` (finding 4).
3. Remove the top "CARI" strip (finding 8).
4. Use the full footer on `/artikel`; add the missing "Sebelum Nikah" topic (finding 13).
5. Pad the menu, close, share, breadcrumb and footer tap targets to 44px (finding 12).
6. Delay the "Baca seterusnya" bar until 60% scroll (finding 9).
7. Darken the gradient under mosaic and hero headlines; move photo captions below the photo (finding 6).
8. Give the 404 its own tab title and a search field; remove "Inspire" from category tab titles (finding 17).
9. Add a skip link and a 2px focus ring (finding 14).
10. White background on the `/cari` search field (finding 15).
11. Show 12 or 16 "Terkini" cards so the last row is full (finding 2, stop-gap until pagination).

## Evidence

Screenshots and raw measurements are in a temporary folder that a reboot may clear:
`C:\Users\IANNG~1\AppData\Local\Temp\claude\8ea58c1a49c2740b\d1c2bad0-ee41-4ebe-8491-4e9417eef139\scratchpad\rig\audit`

Naming: `<page>-d.png` / `-m.png` are the first screen on desktop / phone, `-full` is the whole page, `<tag>-y<N>.png` is the screen at scroll position N. `*.json` files hold the measurements (fonts, sizes, contrast, tap targets, headings).

Not checked: real-device behaviour, screen-reader output, page speed, and numeric contrast of text laid over photos (judged by eye).
