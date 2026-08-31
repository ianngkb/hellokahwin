# The live image census, grouped by photographer or source — and the rights we hold on each group

**Owner:** managing-editor · **Item:** RIGHTS-02, Sprint 05 · **Measured:** 01 September 2026
**Status:** RECORD — current as at the measurement date; re-runnable in one command
**Refreshes:** `docs/plans/aug-23-2026-session-01/aug-25-2026-rights-risk-and-request-list.md` (25 Ogos 2026)
**Reproduce:** `python scripts/measure/rights-census.py --fetch --out <dir>`

> **Nobody has been contacted by us, and nothing has been deleted.** Outbound
> contact is carve-out 3 and the owner has taken it (decision 176). Deletion
> belongs to RIGHTS-03 and to its two named files only. This document is a
> record.

---

## 1. What is actually on the site

Every article URL in `https://hellokahwin.com/sitemap.xml` was fetched on
01 September 2026 and parsed. Each page's own images were counted; images inside
`<a href="/artikel/…">` were excluded, because those are cards advertising a
*different* article and counting them adds about 350 phantom placements.

| | Measured 01 Sept 2026 |
|---|---|
| Live article URLs in the sitemap | **86** |
| URLs returning HTTP 200 | 86 |
| Pages carrying exactly one `<h1>` | 86 |
| **Distinct image assets across all of them** | **808** |
| Image placements (asset × article) | 815 |
| Assets appearing on a second article | 7 |

### How this differs from 281 and from 307

Neither figure was ever a count of images on live pages, and that is the whole
difference.

- **281** is what `docs/asset-register/asset-register.csv` held on 25 Ogos 2026
  in `status_guna: jangan-guna` — 269 `IN-` files plus 12 others. A register
  status.
- **307** is the same column today. The register grew; the site grew more.
- **808** is what a reader can load right now.

The two numbers are not wrong. They answer a different question. The register
answers *what did the audit classify*; this census answers *what is published*.

The register cross-check, for anyone who needs to reconcile the two:

| Register `status_guna` | Rows | Reached from a live page |
|---|---|---|
| `kuarantin` (the Real Wedding sets) | 401 | 294 |
| `jangan-guna` | 307 | 192 |
| `boleh-guna` | 81 | 77 |
| `belum-dihasilkan` | 10 | 0 |
| **Total rows** | **799** | **563 distinct rows** |

**One number in the 25 Ogos document is confirmed exactly.** That document said
383 of the 401 Real Wedding files are embedded, 18 are orphans. The fourteen
Real Wedding articles carry **383** images today, counted from the live HTML by
a method that knew nothing about the register. Two independent routes, same
number.

**A caveat you need before trusting the register column above.** The R2 object
key truncates long filenames, so 82 of the 808 assets matched a register row
only on an ambiguous prefix, and a prefix can land on the wrong row inside a
numbered set (`…-1-1024x683` and `…-11-1024x683` share one). 75 of those 82
sit inside the Real Wedding sets. **This does not move any group in this
document**, because the rights state of a Real Wedding image comes from the
photographer credited on the page, not from the register row. It does mean the
"reached from a live page" column is a floor, not a headcount.

---

## 2. How rights state was decided

Four states. Each one answers a single question: if this image's owner wrote to
us tomorrow, what would we be able to show them?

| State | What it means | How an asset gets it |
|---|---|---|
| **Covered — photographer permission** | Decision 176: the owner obtained permission from the photographers | The article credits a named photographer in its `Kredit Vendor` block |
| **Licensed in its own right** | We hold a licence that has nothing to do with decision 176 | The page shows a licence with the credit — CC BY, CC BY-SA, Pexels, public domain |
| **Institutional** | The rights holder is an organisation with a rights desk | The two files named in decision 167 / RIGHTS-03 |
| **Unknown, and named** | Nothing on record establishes a right to publish it | Everything else, including every image with no credit at all |

**Evidence is read off the page first and the register second.** The page is
what a reader sees and what a rights holder would find, and the register is one
merge behind production — this run found 21 licensed photographs live on the
site with no register row at all (§5.3).

**"Licensed in its own right" is not a fourth way of saying covered.** Azlan
DuPree's photographs are ours to publish because of CC BY 2.0, not because of
anything the owner obtained in August. Folding them into the permission group
would overstate what that permission did.

### The result

| State | Assets | Groups | Articles |
|---|---|---|---|
| Covered — photographer permission | **383** | 12 credit strings = **10 studios** | 14 |
| Licensed in its own right | **216** | 40 | 61 |
| Institutional (RIGHTS-03's two) | **2** | 2 | 2 |
| **Unknown, and named** | **207** | **93** | **14** |
| Total | 808 | 147 | 86 |

**72 of the 86 live articles carry no image of unknown rights.** The problem is
not spread thin across the site; it sits on fourteen pages, and §4 lists all of
them with their slugs.

---

## 3. Covered by the owner's obtained permissions — 383 assets, ten studios

Each row is a photographer credited by name in the article's own `Kredit Vendor`
block, read off the live page today. This is the group decision 176 speaks to.

| Studio, as the page credits it | Assets | Articles (slug) |
|---|---|---|
| Nicholas Ng `@nicholas_nyy` | 46 | `moden-kontemporari/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` |
| Whitenery — credited `Whitenery.co` ×2, `Whitenery` ×1 | 66 | `minimalis-mewah/the-danna-langkawi` (26), `moden-kontemporari/marriott-putrajaya` (19), `moden-kontemporari/sime-darby-convention-centre` (21) |
| Bonjo, Terralogical | 44 | `glamor-eksklusif/amankila-bali` |
| Ameir Fikri | 44 | `real-wedding/cheong-fatt-tze-mansion` (23), `real-wedding/perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat` (21) |
| Candid Pictures Studio | 37 | `pantai-santai/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` |
| Manoj Photography | 34 | `real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan` |
| Azizul Azman — credited `Azizul Azman & Sentralismo` ×1, `Azizul Azman` ×1 | 44 | `real-wedding/sentosa-janda-baik` (25), `glamor-eksklusif/grand-hyatt-kuala-lumpur` (19) |
| Studio Deru | 23 | `real-wedding/villa-warisan` |
| Asmaradara, Redhu Malek | 23 | `moden-kontemporari/jw-marriott-kuala-lumpur` |
| The Vallure | 22 | `real-wedding/yasaka-shrine` |
| **Total** | **383** | **14 articles** |

**Twelve credit strings, ten studios.** Whitenery is credited two ways and
Azizul Azman two ways. Both collapses are the same business under a different
label, and both are visible on the pages themselves.

### Three things the permission does not answer, and they were open on 25 Ogos too

1. **A second name in the EXIF on three of these sets.** The Danna set carries
   `Tommy Teh`; the Amankila set carries `Irezz Pratama`, `WIRA DARMAJA` and a
   personal email address; 16 files of the JEN Shangri-La set carry
   `KennyLooiPhotography`, a photographer who has never been credited anywhere
   on our site. Permission from the credited studio does not reach a co-holder
   nobody asked about. Unchanged since 25 Ogos.
2. **The couples.** Fifteen weddings, fifteen couples, none of whom has been
   asked anything. A photographer's permission is not a subject's.
3. **The Vallure's Kyoto set** — `RW-TheVallureAjmalNanakoKyoto`, 5 files — is
   in the library and on no page. It does not appear in this census because
   this census counts published images.

None of these is a reason to move the group. They are the questions that remain
inside it, and they belong in the file where the permission itself is recorded.

---

## 4. Unknown, and named — 207 assets on 14 articles

Nothing in this section is assumed covered, and every group is listed with the
slugs it appears on. That is the Definition of Done's requirement, verbatim.

Two halves: 112 assets carry a credit naming somebody, and **95 carry no credit
at all** — not on the page, not in the register.

### 4.1 Where they are

| Article slug | Unknown | Of which uncredited | Total images on the page |
|---|---|---|---|
| `idea-dan-nasihat/garden-wedding` | 49 | 26 | 49 |
| `idea-dan-nasihat/majlis-kahwin` | 21 | 12 | 21 |
| `fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik` | 20 | 5 | 20 |
| `idea-dan-nasihat/kursus-kahwin` | 18 | 1 | 19 |
| `idea-dan-nasihat/tempat-honeymoon-di-malaysia` | 16 | 1 | 17 |
| `idea-dan-nasihat/wedding-planner-terbaik-di-malaysia` | 15 | 1 | 15 |
| `hantaran-mas-kahwin/hantaran-tunang` | 13 | 11 | 14 |
| `hiasan-dekorasi/goodies-kahwin` | 12 | 12 | 12 |
| `idea-dan-nasihat/dewan-kahwin` | 12 | 5 | 12 |
| `idea-dan-nasihat/hadiah-untuk-pengantin` | 11 | 5 | 11 |
| `idea-dan-nasihat/sewa-dewan-kahwin` | 9 | 9 | 9 |
| `idea-dan-nasihat/cara-buat-kad-kahwin-digital` | 6 | 6 | 6 |
| `idea-dan-nasihat/pelamin-kahwin-dewan` | 4 | 0 | 5 |
| `hantaran-mas-kahwin/hantaran-kahwin` | 1 | 1 | 3 |
| **Total** | **207** | **95** | |

`garden-wedding` draws 28% of all site impressions and every image on it is in
this table.

### 4.2 The named groups, per article

Counts are assets. A name here is what the page prints; it is not a licence.

**`idea-dan-nasihat/garden-wedding` — 23 assets across 22 names**
Sangkot Place (2) · The Waterway Villa · Aman Rimba Private Estate · Puncak
Rimba · Boathouse Ampang · Jardin Event Venue · Mutiara Hillhomes, Bentong ·
Anantara Desaru Coast Resort & Villas · a-park · glasshouse at seputeh ·
IHSANSINSUN · TR.BAN PHOTOGRAPHY · zach chin · and nine credits that name
*another publisher's article* rather than a rights holder: "12 Affordable Wedding
Venues in KL & Selangor", "A Beautiful Tiarasa Escape Wedding Celebration",
"A Cosy Floral Wedding at Rowan & Parsley", "A DIY Garden Wedding at The
Smokehouse, Cameron Highlands", "A Refreshing Forest Wedding at Cameron
Highlands", "A Rustic Wedding with Old-World Charm at Kebun Rimba, Janda Baik",
"A Tropical Wedding with Refreshing Vibes at Rama V, Kuala Lumpur", "Henry
Golding and Liv Lo Breezy, Laid-Back Wedding in Cove 55, Kuching", "Luscious
Green And Blush Rustic Garden Wedding At Pulai Spring Resort Johor".

**`idea-dan-nasihat/kursus-kahwin` — 17 assets, 1 name**
SPPIM (17). Screenshots of the government marriage-course portal. Seventeen
images and one rights holder, which is the best ratio on this list.

**`idea-dan-nasihat/tempat-honeymoon-di-malaysia` — 15 assets across 14 names**
tripadvisor (2) · klook · traveloka · ck travels · go where · holidaygogogo ·
on tour malaysia · pahang tourism · RIVER JUNKIE · Janda Baik ATTRACTION ·
RESORT WORLD GENTING · pulau Mabul · **BERITA HARIAN** · **focus malaysia**.
The last two are news publishers and §5.1 is about them.

**`fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik` — 15 assets across 15 names**
Irene Yap Photography · England House · Sunlight Suites, Cameron Highlands ·
Taman Saujana Hijau · tropical spice garden · and ten credits naming another
publisher's article: "15 Stunning and Intimate Wedding Venues in Penang",
"26 Stunning Pre-Wedding Photoshoot Location For Every Style", "A Walk Down
Memory Lane In Petaling Street", "An Adventurous Duo Takes on Fraser's Hill for
Their Bridal Portraits", "An Ethereal Azure Blue Beach Wedding Styled Shoot at
Four Seasons Resort Langkawi", "Bridal Portraits Set Against Gorgeous Blue Skies
at Pantai Klebang and Jonker Walk, Melaka", "Gorgeous Traditional Indian Bridal
Portraits in White and Earth Tones Taken at Putrajaya, Malaysia", "Marvel-lous
Bridal Portraits For This Superhero and His Missus", "Minimalist and
Industrial-esque Bridal Portraits at Tamarind Square, Cyberjaya", "Two Parts Of
A Whole".

**`idea-dan-nasihat/wedding-planner-terbaik-di-malaysia` — 14 assets across 14 names**
Asian Atelier Weddings · Dsanding Aziey · Farah Hanafiah Bespoke Events · Flair
Designs · Jasamoure Wedding Concept · Kayangan Gallery · KL Wedding Ministry ·
MAJHLIS · Munstara Event · Reka Teemor · Terusik Event · Weddings by Emma ·
"8 Wedding Planners for Every Couple" · "A Romantic, Moody Floral Wedding at
Sentul Depot, Kuala Lumpur".

**`idea-dan-nasihat/majlis-kahwin` — 9 assets across 9 names**
Glass Garden House · Laman Kayangan · Maison Eleven Lifestyle Event Venue ·
OKAD · Petals Event Space · Setia City Convention Center · The Saujana Hotel ·
The Venue Shah Alam · Villamay Shah Alam.

**`idea-dan-nasihat/dewan-kahwin` — 7 assets across 6 names**
perbadanan putrajaya (2) · Dewan Komuniti AU2 Taman Keramat · Pusat Komuniti
Setiawangsa · Syafiq Lomotech · TEMPAH KL · vmo.

**`idea-dan-nasihat/hadiah-untuk-pengantin` — 6 assets across 6 names**
abstract house · bodaq · Kendra scott · lilin + co · simple smart home · UBUY.
Six retailers' product photographs.

**`idea-dan-nasihat/pelamin-kahwin-dewan` — 4 assets across 4 names**
Hilton Kuala Lumpur · Tanarimba at Janda Baik · Villamay Shah Alam · "Wedding
Sequel Oozing With Elegance and Sentiment".

**`hantaran-mas-kahwin/hantaran-tunang` — 2 assets across 2 names**
petals · quran hantaran.

### 4.3 Five credits that look like photographers but are not in the ten

`Irene Yap Photography`, `TR.BAN PHOTOGRAPHY`, `Syafiq Lomotech`, `IHSANSINSUN`
and `zach chin` are credited on legacy pages, and all five read as photographers
rather than venues. None is among the ten Real Wedding studios, so decision 176
as recorded does not reach them. Five assets, and one question to the owner
settles all five.

### 4.4 Twelve covers whose file is named only `cover`

Twenty-six live assets have an R2 object named `cover` and nothing else.
Fourteen sit on Real Wedding articles, where the page's photographer credit
tells you whose they are. **Twelve do not, and their origin is unrecoverable
from the file, the page or the register:**

`hantaran-mas-kahwin/hantaran-kahwin` · `hiasan-dekorasi/goodies-kahwin` ·
`fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik` ·
`idea-dan-nasihat/cara-buat-kad-kahwin-digital` · `idea-dan-nasihat/dewan-kahwin` ·
`idea-dan-nasihat/garden-wedding` · `idea-dan-nasihat/hadiah-untuk-pengantin` ·
`idea-dan-nasihat/kursus-kahwin` · `idea-dan-nasihat/majlis-kahwin` ·
`idea-dan-nasihat/sewa-dewan-kahwin` ·
`idea-dan-nasihat/tempat-honeymoon-di-malaysia` ·
`idea-dan-nasihat/wedding-planner-terbaik-di-malaysia`

The owner's standing rule is that an image whose origin nobody can name does not
publish. These twelve are already published, and one of them is the cover of the
site's highest-impression page.

### 4.5 The reading that would move 195 of these, and why this document does not take it

Decision 161 records the owner's words as *"I will obtain permissions to use it,
just take it, photographers have good relationships with us"*, and summarises
them as *"the `jangan-guna` legacy assets are not stripped; the owner will
license them"*. Read against the register column, that sentence covers **195 of
the 207 assets in this section**, and this document would be four pages shorter.

It is not taken, for one reason: **decision 167 already refused that reading.**
It ruled that the Getty file and the press photograph come down *because the
rights holder is an institution rather than a photographer who knows us* — a
carve-out by the kind of rights holder, not by register status. Klook,
Tripadvisor, Berita Harian, Hilton Kuala Lumpur and Kendra Scott are the same
kind of holder as Getty and a different kind from Ameir Fikri. A reading that
covers them would have covered Getty too.

**One sentence from the owner closes this**, and until it exists these 207 are
recorded as unknown with their slugs, which is what the DoD requires.

---

## 5. Three findings that belong to other items

### 5.1 RIGHTS-03 is scoped to two files. The live pages name four institutions.

Decision 167 named the Getty/iStock image and a press photograph. Both are
still live and both are confirmed here by exact register match:

| Asset id | File | Article | Credit shown on the page |
|---|---|---|---|
| `HK-L-0592` | `IN-TempatHoneymoondiMalaysia-CameronHighland.jpg` | `idea-dan-nasihat/tempat-honeymoon-di-malaysia` | none — the name is EXIF `Getty Images/iStockphoto` |
| `HK-L-0347` | `IN-KursusKahwin-Kelas.jpg` | `idea-dan-nasihat/kursus-kahwin` | **`Kredit: UTUSAN MALAYSIA`** |

The 25 Ogos document inferred the second was a newspaper photograph from its
EXIF caption and Malaysian house style, and did not name the paper. **The live
page names it.** That is an upgrade to the evidence, not a contradiction.

**Two more institutions are credited on the live site and RIGHTS-03 does not
cover them**, both on the same article:

| Asset id | Article | Credit shown on the page |
|---|---|---|
| `HK-L-0677` | `idea-dan-nasihat/tempat-honeymoon-di-malaysia` | **`Kredit: BERITA HARIAN`** |
| `HK-L-0595` | `idea-dan-nasihat/tempat-honeymoon-di-malaysia` | **`Kredit: focus malaysia`** |

Berita Harian is a national newspaper and Focus Malaysia is a business
publication. Decision 167's own reasoning — *a news organisation has a rights
desk, a wedding hall does not* — applies to both without modification. **This
is for the CEO to decide, not for me:** RIGHTS-02 deletes nothing, and I am not
widening someone else's item on my own authority. But RIGHTS-03 will push an
UNDO and take two files down, and a second UNDO for two more files a week later
costs more than doing it in the same pass.

### 5.2 One article is a rights concentration of its own

`idea-dan-nasihat/tempat-honeymoon-di-malaysia` carries 17 images. One is
Getty's. Two more are newspapers'. Thirteen are credited to travel sites, OTAs
and resorts — Klook, Traveloka, Tripadvisor twice, and nine others. The
seventeenth is a cover nobody can trace. **Not one of the seventeen has a right
on record**, and these are the largest organisations named anywhere in this
document.

Whatever is decided about the other thirteen articles, this one is a separate
problem, and a small one: seventeen images on a single page.

### 5.3 Twenty-one licensed photographs are live with no register row

Thirty R2 objects, 21 distinct source files, all `S-` sourced photographs, all
carrying a full open licence in their on-page credit, **none of them in
`asset-register.csv`**:

| Licensor | Licence shown on the page |
|---|---|
| Azlan DuPree | CC BY 2.0 |
| Mohd Fazlin Mohd Effendy Ooi (Phalinn Ooi) | CC BY 2.0 |
| Mohd Nasir Mat Noor | CC BY 2.0 |
| Sham Hardy | CC BY-SA 2.0 |
| Nuraishah Bazilah Affandi | CC BY 2.0 |

Phalinn Ooi and Nuraishah Affandi appear **nowhere in the register at all** —
not as a licensor, not as a creator, not in any filename.

The pages themselves are correct, so this is the record lagging rather than a
rights problem. It still matters: the register is what we would reach for if one
of these five ever wrote to us, and it would not have them. §7 turns this into a
check that fires.

---

## 6. What is not in this census, and why

- **Category, homepage and index pages.** The 17 non-article URLs in the
  sitemap. Their images are article covers, already counted where they live.
- **Card thumbnails.** An article's cover shown on a sibling's page. Counting
  them would inflate placements by roughly 350 without adding one asset.
- **The 18 Real Wedding files that are in the library and on no page.** An image
  nobody can load is not published, and exposure is mostly about what is.
- **Anything about outbound contact.** Not this item's, not this document's.

---

## 7. How to keep this true

Two checks, both executable rather than written down.

1. **Re-run the census.** `python scripts/measure/rights-census.py --fetch --out <dir>`
   fetches the sitemap and every article, then prints the state counts. It takes
   about two minutes, and it re-derives the numbers instead of carrying them
   forward, which is how the 281/307 gap opened in the first place.
2. **The register-vs-production gate.** Add `--gate` and the same script
   **exits 1**, listing filenames and slugs, when the site is carrying an image
   `asset-register.csv` does not know about. That is how §5.3 was found. It read
   **56** on 01 September 2026: 30 objects for the 21 unregistered licensed
   photographs, and 26 covers named only `cover`. Proven both ways the same day
   — exit 1 against those 56, exit 0 against a five-article control with none.
   It is now rule 6 in `docs/asset-register/README.md` §7.

**Those 21 rows are deliberately not written by this item.** The register's own
§2 forbids copying a name off a page into `licensor_name`, and a `Kredit:` line
is a claim the page makes rather than a grant. Opening them properly means going
to each licence at origin, which is a sourcing job and not a census.

---

## 8. Open questions, in the order they should be taken

1. **Do the obtained permissions reach the five photographer credits in §4.3?**
   Five assets. They are photographers, so this is the likeliest yes on the
   list, but nothing on record says so.
2. **Do they reach the venues, vendors and retailers in §4.2, or only the
   photographers?** 195 assets turn on this. §4.5 sets out why this document
   assumes the narrower answer.
3. **Does RIGHTS-03 take four files instead of two?** §5.1. The CEO's call.
4. **The twelve untraceable covers in §4.4.** Their origin cannot be recovered
   from anything we hold. Replacing them is Stage 6b work and it is the only
   item on this list that cannot be closed by a decision.
