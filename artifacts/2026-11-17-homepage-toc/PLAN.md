# HelloKahwin — new homepage, better article contents, UI audit

Branch `ianngkb/homepage` · Batch run · 17 Nov 2026

## What changes for readers

1. **Homepage (`/`) gets the TWN /inspire layout.** Today it is one big photo plus a plain
   list. It becomes: three featured stories as a photo mosaic (one large, two small, titles
   over the photo), a "Terkini" grid of article cards (photo cards, 8 of them), a
   "Teroka ikut kategori" row of category pills, and a "Lihat semua artikel" button.
   HelloKahwin's own colours, fonts and Malay copy, not TWN branding. The same building
   blocks `/artikel` already uses, so the two pages look like one site.
2. **Article contents box ("Dalam artikel ini") is fixed and improved.**
   - Today on desktop it is pushed ~120px in from the article's left edge and sits as a
     big box above the first paragraph. On phones it is a long, fully open list that
     pushes the article down a whole screen.
   - Desktop: the list moves to the right-hand column and **stays on screen while you
     scroll** (sticky), highlighting the section you are reading. Nothing above the first
     paragraph any more.
   - Phone: a compact one-line box, "Dalam artikel ini · 7 bahagian", aligned with the
     text. Tap to open the list.
   - The links stay in the page's HTML, so Google still sees them.

## What changes for admins

3. **Homepage gets its own controls.** `/admin/inspire/homepage` today only controls
   `/artikel`. It gains a switch between **Laman utama (/)** and **Artikel (/artikel)**,
   each with its own pinned stories (3 featured + 8/9 grid) and its own "fill the rest
   from newest / from a category" rule, plus the live preview. Saving one page never
   changes the other. With nothing saved, the homepage shows the newest articles with a
   cover.

## Audit

4. **Fable UI audit** of the whole public site (homepage, /artikel, a category page, an
   article, search), desktop and phone. Published separately to buddy. Findings that fit
   this run's pages feed this build; the rest is a ranked list for later.

## Not in this run

- No new database tables (settings live in the existing `admin_settings` row store).
- No change to article URLs, the menu, search, or ads.

## Checks

- Unit tests for the curation config per page and the contents box; typecheck, lint,
  full test suite once on the final branch.
- Screenshots at 1440px and 390px of `/`, `/artikel`, and an article, before and after.
- One independent review, then queue (`/imdone`). Nothing goes live until Ian says ship.
