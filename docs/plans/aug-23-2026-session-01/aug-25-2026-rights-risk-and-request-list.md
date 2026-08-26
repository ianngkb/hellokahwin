# The inherited image library — ranked rights risk, and the request list

**Owner:** managing-editor · **Date:** 25 Ogos 2026
**Brief:** `aug-25-2026-brief-supporting-images-and-credit.md`, Task 2
**Register:** `docs/asset-register/asset-register.csv`
**Templates:** `docs/licensing/lesen-imej-BM.md` (primary), `image-licence-EN.md`

> **NOTHING HAS BEEN SENT TO ANYONE.** No email, no message, no contact of any
> kind. Outbound contact with real people is the owner's decision. This document
> is a list waiting on it.

---

## 1. What the audit found, and where the register was wrong

The 682 rows were built on 24 Ogos 2026 by direct parse of `media.json`. That
parse was accurate. **What it got wrong was where the images actually are**, and
that is the thing rights risk turns on.

### 1.1 Confirmed

| Register claim | Verdict |
|---|---|
| 682 items, all `license_class: TIADA` | **Correct.** Confirmed 1:1 against `media.json`; 682 originals present on disk |
| 401 `kuarantin` — the `RW-` Real Wedding sets | **Correct** |
| 281 `jangan-guna` — 269 `IN-` plus 12 others | **Correct.** The 12 are 10 unprefixed plus 2 `KR-` |
| 120 carry an EXIF-asserted creator name | **Correct.** 106 `copyright`, 96 `credit`, 82 both → 120 distinct files |
| 562 read `TIDAK DIKETAHUI` | **Correct**, and it is a finding rather than a gap |
| Every `licensor_name` reads `TIDAK DIKETAHUI` | **Correct.** Credit was given on the old site. Credit is not a licence |
| 38 have alt text | **Correct** |
| Ten Real Wedding photographers | **Correct.** Ten distinct studios across 15 sets |

### 1.2 Corrected

**The `digunakan_dalam` column was wrong on 67 of 682 rows.** It was populated
from the WordPress *attachment parent* — which post an image was uploaded to —
not from whether the image is actually embedded anywhere. Resolving every
`featured_media` id and every `/wp-content/uploads/` URL in every post body,
with WP size suffixes normalised back to originals and **zero unresolved
references**, gives the real picture:

| | Count |
|---|---|
| Media items | 682 |
| **Embedded in a published post** | **618 (90.6%)** |
| **Orphaned — in the library, on no article** | **64 (9.4%)** |

So 64 rows named an article for an image that is not on it, and 3 rows
under-reported cross-post reuse. The column now carries real usage. **This
matters because an image that is not on a page is not published, and unpublished
is most of what rights exposure is.**

**"22 of the 38 alt strings are `wedding planner terbaik di malaysia`" is wrong.
The real number is 17.** No case or whitespace variant reaches 22. Corrected in
the register.

**Zero of the 682 carry alt text that describes what the image shows.** Five of
the six distinct strings are the article's target keyword repeated across every
image on that page; the sixth is a raw filing path leaked into the attribute.

### 1.3 Four creator leads the EXIF-only parse missed

Six items carry a WordPress caption, and four of those captions assert a creator
that `pencipta` does not hold:

| File | Caption |
|---|---|
| `mas-kahwin-in-frame-jpg.webp` | `Credit: Reke Gubahan` |
| `IN-SewaDewanKahwin-FeaturedImage.jpg` | `Credit: Candid Photos` |
| `IN-MasKahwinIkutNegeri-SentosaJandaBaik.jpg` | `Ameir Fikri` |
| `RW-WhitenerySharinaSeanTheDannaLangkawi-19.jpg` and `-6.jpg` | `Source: Whitenery` |

Loaded into the register with `bukti_pencipta: kapsyen-wordpress`. **`licensor_name`
stays `TIDAK DIKETAHUI` on all of them.** A caption is a claim the old site made
about a file. It is a lead, not a grant.

### 1.4 One thing that genuinely cannot be established

**Whether the WordPress attachment pages are reachable on the live site today.**
Every one of the 682 has a public attachment URL in `media.json` — for example
`hellokahwin.com/hadiah-untuk-pengantin/kendrascottengravingnecklaces/` — and the
file itself is served at `source_url`. Whether those routes still resolve after
the migration cannot be determined from the export.

**This is the difference between 618 published images and 682**, and it is a
one-line check somebody with the live site can run in a minute. Until it is run,
"orphaned" in this document means *not on an article*, and does not mean *not
publicly served*.

### 1.5 There is no EXIF `artist` field in the export

WordPress's `image_meta` block carries `copyright` and `credit` and nothing else
rights-bearing. Any Artist, Licence or Usage-Terms EXIF that existed in the
originals is not in `media.json` and would have to be re-read off the files on
disk with `exiftool`. **Not done.** If the clearance programme goes ahead, that
is the cheapest remaining source of evidence and it is worth an hour.

---

## 2. The ranked rights-risk list

Ranked by **expected exposure**, which is probability of pursuit multiplied by
what pursuit would cost us — not by volume. A flat inventory of 682 says
everything is equally a problem, and it is not.

### Rank 1 — the Getty/iStock image. One file.

`credit: Getty Images/iStockphoto`, asserted by the file about itself.

**Highest probability of pursuit by a very large margin, and it is the only row
where that is true.** Getty runs automated reverse-image matching and sends
demand letters as routine business. Every other rights holder in this library is
a Malaysian small business that would send an email.

**Action: remove it. Today. This is a delete, not a spend.** One image, on one
legacy article, of no strategic value. `status_guna` becomes `ditarik-balik` with
the reason in `log_takedown`. There is no version of this where keeping it is
worth anything.

### Rank 2 — the press photograph. One file.

`IN-KursusKahwin-Kelas.jpg`. Its EXIF `credit` field holds a truncated newspaper
caption — `TINDAKAN menambahbaik kursus kah` — and the caption ends
`-Gambar hiasan`, which is Malaysian newspaper house style.

A news organisation has a rights desk. A wedding hall does not.

**Action: remove.** Same reasoning as Rank 1 at a lower probability. One image,
no strategic value, and the cost of removal is a minute.

### Rank 3 — the 401 Real Wedding photographs. Ten studios, 14 live articles.

This is the whole of the serious volume, and the honest position is more
complicated than "we are exposed".

**What raises the exposure:**

- Every set is **credited by studio name in the post body** — `Jurugambar: Ameir
  Fikri`, `Jurugambar: Whitenery.co`. A credited photographer can find their own
  work in one search, and the credit is evidence we knew whose it was.
- They are **professional wedding photographers**, for whom image licensing is
  the business rather than an incidental.
- **On several sets the EXIF name and the credited studio disagree** — the
  Bonjo/Terralogical set carries three different individual names, Nicholas Ng's
  set carries a second photographer (Kenny Looi) on part of it, and Azizul's
  Grand Hyatt set carries `Joods`. **That is potentially a second rights holder
  per set who was never credited at all**, which is worse than the first problem.
- **There is a separate, non-copyright exposure that nobody has raised: these
  are photographs of identifiable people at their own weddings.** Fifteen
  couples. A photographer's permission does not cover the couple's, and the
  couple is the party most likely to object and least likely to negotiate.

**What lowers it:**

- Real Wedding features are a **reciprocal arrangement in this industry**. A
  studio supplies the set, the publisher credits and links, and both benefit.
  The absence of a written licence is normal for the category rather than
  suspicious.
- The predecessor site plausibly had relationships. **We cannot demonstrate one**
  — that is the whole finding — but "no evidence of a licence" is not the same as
  "evidence of no licence", and the register should not be read as if it were.
- **None of the 401 is load-bearing for the strategy.** The traffic plan is
  procedural and religious text content. Not one of these 401 images appears in
  any brief, any cluster, or any article being written.

**Action: do not spend money on this. Send template B, and read what it is
actually for.**

Template B offers takedown as **option 1**, and option 1 is a real option. If
every studio takes it we lose 401 images of no strategic value and gain a clean
library. That is a good outcome, not a bad one.

**The reframe that makes the ten emails obviously worth sending: these are the
same ten studios whose photography P4 and P5 will need.** The clearance letter
and the sourcing letter are the same conversation, and a straight approach about
an overdue permission is the cheapest possible way to open it. Ten Malaysian
wedding photographers who each get an honest email saying *"we found no licence,
here are three options, one of them is that we take it all down"* is a better
introduction than a cold request would be.

**Cost: ten emails and the owner's time. Not money.**

### Rank 4 — the 269 IN- vendor and venue images. 225 published.

Hall interiors, decor, pelamin, package photographs, garden venues. Almost
certainly supplied by or lifted from vendor marketing material.

**Low probability of pursuit and low cost if it happens.** A venue wants to be
photographed and named on a wedding site; that is the whole reason the images
exist. The realistic worst case is an email asking for a credit or a link, and
we would say yes.

**Action: do not spend on it. Record honestly, leave them up, respond to any
request within five working days.** Recommend against a clearance campaign here
— 269 emails to venues that did not ask for one, about images they are pleased
to have shown, to solve a problem nobody has raised.

The exception, and it is small: **two EXIF fields contain direct contact details
rather than names** — `wira_gitar1@hotmail.com` on 7 files and a Malaysian mobile
number `0126809058` on 1. Someone put their own contact details in a file they
expected to be traced. Those eight are the only `IN-`/loose files worth a
targeted approach, and they belong in the request list at low priority.

### Rank 5 — the 64 orphans.

Not on any article. Zero page exposure **if** the attachment routes are dead.

**Action: run the one-line check in §1.4 before anything else in this document.**
If the attachment pages resolve, we are publicly serving 64 images we do not use
and get no benefit from, which is exposure for nothing and the fix is a redirect
rule. If they are dead, these 64 drop out of the risk picture entirely and the
number to worry about is 618, not 682.

### 2.1 The recommendation, in one paragraph

**Exposure is low and we should not spend money on it.** Two images come down
today because their rights holders are institutions rather than individuals. The
401 Real Wedding photographs get ten honest emails, sent because the ten
recipients are the ten people we most want a relationship with in the next
quarter, not because we are frightened of them. The 269 vendor images stay and
are left alone. Nothing here justifies a clearance budget, a rights coordinator,
or a lawyer. **The single highest-value action in this document is the one-line
check on whether attachment pages still resolve**, because it is free and it
changes the denominator by 64.

---

## 3. The consolidated request list

### 3.1 What the two halves are, and where each came from

**Retroactive (§3.2)** is the ten Real Wedding studios whose photographs are
already on the live site with no written licence. It comes from the register
audit and pairs with **template B**.

**Forward-looking (§3.3)** is the vendors and photographers who would fill the
holes in P4 and P5. It comes from the two writers' gap lists and pairs with
**template A**.

**A correction against my own earlier draft of this document.** When I started,
neither gap list existed and only one writer had been asked for one, and I wrote
that the forward-looking half could not be built. **Both landed during the day**,
both verified business-by-business against pages loaded on 25 Ogos 2026, and the
P4 list explicitly consolidates itself with the P5 one. §3.3 is now built on them
rather than on the fragments I had. I am leaving this note because the earlier
version of the claim reached the CEO.

### 3.2 Retroactive — template B, the ten Real Wedding studios

Every studio below is named in the post body of a live article as
`Jurugambar: <name>`. File counts are exact. **Template B, `lesen-imej-BM.md` §B.**

Priority is set by published footprint first, and by whether a second
uncredited rights holder appears in the EXIF second — because that is the
question only they can answer.

| # | Studio, as credited | Sets | Files | Articles | Second name in EXIF | Priority |
|---|---|---|---|---|---|---|
| 1 | **Whitenery** (credited `Whitenery.co` on two of three) | 3 | 69 | `marriott-putrajaya`, `the-danna-langkawi`, `sime-darby-convention-centre` | `Tommy Teh`, on part of the Danna set only | **1** |
| 2 | **Bonjo, Terralogical** | 1 | 53 | `amankila-bali` | **Three** — `Irezz Pratama`, `WIRA DARMAJA`, `wira_gitar1@hotmail.com` | **1** |
| 3 | **Nicholas Ng** (`@nicholas_nyy`) | 1 | 46 | `perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` | **`KennyLooiPhotography`** on 16 files — a second photographer, never credited | **1** |
| 4 | **Azizul Azman** (one set credited `Azizul Azman & Sentralismo`) | 2 | 45 | `grand-hyatt-kuala-lumpur`, `sentosa-janda-baik` | `Joods`, on the Grand Hyatt set | 2 |
| 5 | **Ameir Fikri** | 2 | 44 | `cheong-fatt-tze-mansion`, `perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat` | — (EXIF agrees) | 2 |
| 6 | **Candid Pictures Studio** | 1 | 37 | `perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` | `Nafis Abman` | 2 |
| 7 | **Manoj Photography** | 1 | 34 | `perkahwinan-di-ruma-hotel-kuala-lumpur` | none | 3 |
| 8 | **The Vallure** | 2 | 27 | `yasaka-shrine` — **and one set of 5 that is on no article at all** | none | 3 |
| 9 | **Asmaradara / Redhu Malek** | 1 | 23 | `jw-marriott-kuala-lumpur` | `VEGGYSTWN`, `asmr` | 3 |
| 10 | **Studio Deru** | 1 | 23 | `villa-warisan` | none | 3 |
| | **Total** | **15** | **401** | **14 articles** | | |

**Four notes that change what goes in the letters.**

- **The `{number}` in template B is the count of files actually embedded, not the
  file count above.** 383 of the 401 are embedded; 18 are orphans. Sending a
  photographer a count that includes images not on the site overstates what we
  did, and the letter's whole purpose is that it is accurate.
- **Priority 1 is the three studios where a second, uncredited name appears in
  the EXIF.** Those letters must ask the extra question: whether the second name
  is a second rights holder we have never credited. Add one line to template B
  for those three:

  > *Fail-fail ini turut mencatatkan nama {name} dalam metadatanya. Jika beliau
  > pemegang hak bersama, tolong beritahu kami. Kami tidak pernah memberikan
  > kredit kepada beliau dan itu perlu dibetulkan.*

  `/humanizer`-passed, 25 Ogos 2026.

- **The Vallure's Kyoto set — `RW-TheVallureAjmalNanakoKyoto`, 5 files, Ajmal &
  Nanako — is on no article.** It sits in the library and nowhere else. Say so in
  their letter rather than omitting it; a photographer who finds it later has a
  worse question to ask.
- **Template B already asks about the couple** — *"Your permission alone isn't
  enough for photographs of identifiable people"*. That paragraph is the most
  important one in the letter and it stays in every one of the ten. Fifteen
  couples are in these photographs and none of them has been asked anything.

### 3.3 Forward-looking — template A

**Correction, and it went the right way.** When I began, neither gap list existed
and only one writer had been asked for one. **Both landed during the day**, both
are verified business-by-business against pages loaded on 25 Ogos 2026, and both
declare that nobody has been contacted. They are at the foot of
`aug-25-2026-done-write-p4.md` and `aug-25-2026-done-write-p5.md`. The P4 list
consolidates itself with the P5 list, so the two do not double-count.

A separate sourcing run also closed part of the gap before this list was written:
**thirteen openly-licensed photographs, `HK-P-0001` to `HK-P-0013`, seven placed
across six articles.** Everything below is stated net of those.

**Two things I am not repeating from the writers' lists**, because a consolidated
list that restates two good documents at length is worse than one that points at
them: their full reasoning per business, and their per-article "what we would
want" shot briefs. Those are the useful part and they are already written.

#### The priority order, and it is not the order either list is in

| # | Candidate | For | Why it is here | Template |
|---|---|---|---|---|
| **1** | **Inai Republic** (inairepublic.com) | `inai-tangan-pengantin` | **The only entry on this list that is not a traffic decision.** One natural-henna stain photographed at 24 hours, 48 hours and one week on the same hand, plus the paste ingredient list. That sequence *is* the article's safety argument, and today it is asked of the reader on trust | A |
| **2** | **Perbadanan Kemajuan Kraftangan Malaysia** / **Karyaneka** | `songket-tenunan-tangan-atau-cetak` | A federal craft agency. **A public-body grant is the cleanest licence available anywhere on this map.** The article teaches one physical test — *belek belakang kain* — and we hold a photograph of the front and nothing of the reverse | A |
| **3** | **The Dulang** with **PP Signature** | `pelamin` | Four styles, four paragraphs, zero images, on the single most photographed object at a Malay wedding. The only decorator found publishing a full inclusion list line by line | A |
| **4** | **PP Signature Bridal** (ppsignature.com) | `baju-pengantin-sewa-atau-beli`, and P4 generally | Every rental price in that article is theirs. DR 4, position 1 on `baju nikah`, and the shop that out-publishes every wedding media company in this market — **which means it already understands why a credit is worth having** | A |
| **5** | **ADNAA** (adnaa.com.my) | `baju-pengantin-sewa-atau-beli` | All eight purchase prices are theirs. DR 0 at position 3 with 3,394 visits a month, the highest-traffic organic result on that page one | A |
| **6** | **Sampin Exclusive** (sampinexclusive.com) | `songket-tenunan-tangan-atau-cetak` | Every handwoven price in the article — RM2,800, RM7,500, RM11,500. Front and reverse of the cheapest and dearest would put pictures on the price ladder | A |
| **7** | **Yayasan Tuanku Nur Zahirah** | `songket-tenunan-tangan-atau-cetak` | Registered proprietor of the Songket Terengganu geographical indication. A direct institutional interest in the woven-versus-printed distinction the article draws | A |
| **8** | **Songket Dunia** (songketdunia.my) | `songket-tenunan-tangan-atau-cetak` | **Approach with care.** The article uses their collection page to observe that a product can be sold under the songket name without stating how the cloth is built. Put that to them as an observation and ask for a straight answer, so we can correct it or confirm it | A |
| **9** | **NikHamidi Photography** | P4 and P5 both | Verified trading, with published terms. Akad and sanding coverage carries baju and inai detail as a matter of course. **One licensed set serves both pillars — approach once, not twice** | A |
| **10** | **Hijabista Hub** (hijabistahub.com) | C4.1, cluster topic 10 | Modest-bridal imagery. That topic has no visual coverage anywhere in this market | A |
| **11** | **mohd hasan** (pexels.com/@mdkamal) | P5 generally | **Zero cost and the licence is already settled** — four of his images are registered and placed. Asking is courtesy rather than necessity, and it is the cheapest possible relationship to open | A |
| 12 | **Rico Rinaldi** (ricorinaldi.com) | C4.1 | DR 17, the highest-authority name on that page one. Our price ladder does not reach the top of the range. Not re-verified in that session | A |

**Held pending verification, and deliberately not sent to the owner as a list:**

- **Nur Songket** and **Camellia Empire** both returned HTTP 403 to every fetch.
  Existence established, trading status not. **Confirm before either goes on a
  contact list.**
- **Individual Malaysian inai artists.** The P4 writer looked and declined to
  name any: *"Instagram and TikTok handles for inai artists are everywhere and
  none of them establishes a trading business from a page load. I am not naming
  handles I could not confirm."* That is the correct call and I am upholding it.
  Filling this needs a verification pass of its own.
- **The `says.com` list of ten photographers** cited in the P5 log is dated
  **6 Ogos 2015**. Eleven years old. Verify before use.

#### One thing worth saying about candidates 4, 5 and 8

They are competitors. PP Signature is the DR-4 dress shop currently
out-publishing every media company in Malay wedding search, and we quote its
prices in our article. Approaching it for photography is approaching the site we
are trying to beat.

**Do it anyway, and be straight about it.** We already cite them by name with a
dated price, which is a link and an endorsement they did not have to ask for. The
relationship is real whether or not we acknowledge it, and a vendor who sees
their price quoted accurately and their name credited is not being taken from.
The one thing that would poison it is asking for photographs while presenting
ourselves as something other than what we are.

### 3.4 What the owner is being asked to decide

Nothing here is sent. Four decisions, in the order they should be taken:

1. **Remove the Getty/iStock image and the press photograph.** No contact
   required. Two deletes.
2. **Run the attachment-page check.** No contact required, one minute, and it
   changes the denominator by 64.
3. **Send the ten template B letters, or not.** My recommendation is yes, and
   the reason is the relationship rather than the risk. If the answer is no, the
   401 stay quarantined and nothing breaks.
4. **Send template A to candidates 1 to 3, or not.** Both gap lists have landed,
   so this is decidable now. Candidate 1, Inai Republic, is the one I would send
   first and it is not a traffic decision — that article tells brides how to
   avoid permanent scarring and currently asks them to take a colour difference
   on trust. Candidates 4 to 12 can follow as one batch; **the two 403 sites and
   the 2015 photographer list are verified before they are sent anything.**

**And the one thing that is not a decision:** every new image from here forward
carries `credit`, `licenseClass` and `licensorName` before it is attached to a
draft, because the ingest parser refuses the file otherwise. That part is already
enforced and needs nothing from anybody — except on the path described in
`aug-25-2026-enforcing-credit-everywhere.md`, which is where it is not.
