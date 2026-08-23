# Visual Asset Strategy: where every photograph comes from, and who owns it

**Owner:** head-of-seo-content · **Date:** 23 Aug 2026
**Session:** aug-23-2026-session-01
**Brief:** `aug-23-2026-brief-production-and-visuals.md`, Part B
**Fills a gap in:** `aug-23-2026-framework-content.md`, which mandates images
without naming a source for one of them

Strategy document. No content is written here.

The brief is right that this is the more important half. The framework
requires one image per H2 minimum, 8 to 15 images per Real Wedding, photos on
every directory page, and forbids a stock photo of a non-Malay wedding on a
page about adat. Across 204 mapped topics that is well over a thousand images
with no source named anywhere.

**The headline finding, and it is worse than "we have no source".** I
inspected the export directly. **We cannot demonstrate a licence, a
permission, or ownership for a single one of the 682 images in the library.**
The WordPress schema has no field to record one, none was recorded anywhere
else, and 96 images carry an EXIF copyright string naming somebody else.

---

## 1. Audit: what is actually in the library

**Method.** Direct inspection of `data/hellokahwin-export/` on 23 Aug 2026:
file census on disk, and a field-level parse of
`content/media.json` (682 records, 19.3 MB) including the WordPress
`media_details.image_meta` block, which is where WordPress preserves EXIF and
IPTC. Cross-referenced against `content/posts.json` (29 posts) and
`content/users.json`. Every figure in this section is reproducible from those
files.

### 1.1 The census

| Measure | Value |
|---|---|
| Media library items | **682** |
| Files on disk | **6,312** (3.3 GB) |
| Of those, WordPress size derivatives | **5,400** (a `-WxH` suffix) |
| Median derivatives generated per item | **41** |
| Distinct originals | **682**, of which 244 are WordPress `-scaled` downsizes of images over 2,560px |
| Total weight of the originals | **546 MB**, median 467 KB per file |
| Uploaded | Nov 2025 (567), Dec 2025 (22), Jan 2026 (93). **Nothing since 15 Jan 2026** |

**Formats, at library level:** 588 JPEG, 70 WebP, 23 PNG, 1 GIF. No AVIF.

**Dimensions:** 140 items at 2,400px wide or more, 225 at 1,600 to 2,399, 85
at 1,200 to 1,599, 176 at 800 to 1,199, and 56 under 800px which are not
usable at article width. Widest is 6,912px.

**Orientation:** 374 landscape, 288 portrait, 20 square. The portrait share
matters for the pipeline: a third of the library will not fill a hero slot.

**So the "6,759 files" in the export summary is one library of 682 pictures
multiplied by WordPress thumbnail generation.** Nobody should plan against the
larger number.

### 1.2 What the pictures are of

The filenames are systematic, which makes this classifiable rather than
guessable. Every file carries a prefix and a subject.

| Class | Items | Share | With camera EXIF |
|---|---|---|---|
| **RW-** Real Wedding sets | **401** | 58.8% | **295 (74%)** |
| **IN-** article and listicle imagery | **269** | 39.4% | **16 (6%)** |
| Other (screenshots, loose product shots) | 12 | 1.8% | 1 |

**That EXIF split is the whole audit in one row.** Three quarters of the Real
Wedding library carries the camera model, aperture, shutter speed and
timestamp of the shot that made it, across 22 distinct camera bodies, which is
what an original file straight from a photographer looks like. Six percent of
the article library does, which is what images pulled off the web look like
after a CMS or a converter has stripped them.

**The Real Wedding library is fifteen named sets.** The filename convention is
photographer, then couple, then venue:

| Set (photographer / venue) | Items |
|---|---|
| Nicholas Ng / Hotel Puteri Harbour | 46 |
| Bonjo Terralogical / Amankila, Bali | 53 |
| Candid / Villa Port Dickson | 37 |
| Manoj Photography / Ruma Hotel | 34 |
| Whitenery / The Danna Langkawi | 27 |
| Azizul / Sentosa Janda Baik | 27 |
| Asmaradara / JW Marriott KL | 23 |
| Ameir Fikri / Cheong Fatt Tze Mansion | 23 |
| Studio Deru / Villa Warisan | 23 |
| The Vallure / Yasaka Shrine, Kyoto | 22 |
| Ameir Fikri / Tema Kahwin Melayu Klasik | 21 |
| Whitenery / Marriott Putrajaya | 21 |
| Whitenery / Sime Darby Convention Centre | 22 |
| Azizul / Grand Hyatt KL | 21 |
| The Vallure / Kyoto | 5 |

**Ten named photography studios**, and every one of them is credited by name
in the body of its post under a "Kredit Vendor" block. So credit was given.
Credit is not a licence.

**A subject problem inside the Real Wedding library.** Using each post's own
description rather than any inference: **80 items (20%) were shot outside
Malaysia** (Amankila in Bali, Yasaka Shrine and Kyoto in Japan). A further 57
are from weddings the posts themselves describe as Peranakan or Chinoiserie
themed, and 23 more from one the post calls "pelbagai budaya". **Roughly 160 of
401 Real Wedding images, 40%, are not Malay-adat Malaysian weddings**, which
is exactly the material the framework's own quality bar forbids on adat pages.

**The article library maps poorly to the approved cluster plan.** Classifying
all 682 items against the 26-cluster map:

| Serves | Items |
|---|---|
| C6.1 dewan, venue, garden wedding | 92 |
| Vendor roundup imagery (wedding planners) | 30 |
| C2.1 / C2.3 hantaran kahwin and gubahan | 26 |
| C5.4 doorgift, goodies, hadiah | 22 |
| Honeymoon destinations (off-map) | 20 |
| Pre-wedding photoshoot locations (off-map) | 19 |
| C1.3 kursus kahwin | 19 |
| C5.2 kad kahwin | 14 |
| C2.2 hantaran tunang | 14 |
| C2.4 mas kahwin | 8 |
| C5.1 pelamin | 5 |
| Real Wedding sets | 401 |
| Unclassified | 12 |

**Cluster one, the three clusters approved to launch first, has 48 relevant
images in the library** (26 hantaran, 14 hantaran tunang, 8 mas kahwin) against
roughly 144 image slots across its 24 mapped articles. **That is 33% coverage
before any rights question is asked, and 0% after.**

### 1.3 What is verifiable about rights

**Verified, by direct inspection:**

- **There is no rights field.** The WordPress attachment schema in this export
  has no licence, permission, usage, consent or rights property. I scanned the
  full key set. The only custom metadata present is analytics and survey flags.
  **Provenance is unrecorded. Not incomplete: absent.**
- **96 of 682 items (14%) carry a third-party copyright or credit string in
  EXIF**, naming: Nicholas NYY Photography (26), "© 2024 ameirfikri" (24),
  KennyLooiPhotography (16), WIRA DARMAJA with the email address
  wira_gitar1@hotmail.com (7), Tommy Teh (5), asmr (5).
- **Zero items name HelloKahwin, The Wedding Notebook, or any entity we
  control as the copyright holder.** Not one.
- **586 items have an empty EXIF credit field**, which proves nothing either
  way. An empty credit field is equally consistent with an unmarked original
  and with a stripped copy.
- **Alt text is effectively absent.** 38 of 682 items (5.6%) have any, and
  those 38 are keyword-stuffed duplicates: the string "wedding planner terbaik
  di malaysia" appears 22 times. **644 images have no alt text at all.** Six
  items have a caption.
- **603 of 682 items are referenced in a post body; 79 are not.**
- **Uploaded by three accounts**: Hanee Johari (421), Matthew Tan (259), and
  ianng@theweddingnotebook.com (2). The last is the owner, and the address ties
  this library to the TWN organisation.

**Specific items whose filenames or metadata point at an external origin.**
These are individually checkable and I list them because they change the
character of the question:

| Item | What the evidence is |
|---|---|
| `my-11134207-7rasc-m19cvpmmnk35d1.webp` | Shopee's CDN filename convention. A marketplace product photo. |
| `IMG_2045cccc_2890x.jpg.webp` | `_2890x` is a Shopify CDN resize parameter. An e-commerce product photo. |
| `KendraScottEngravingNecklaces.webp` | A named US jewellery brand's product image, 2,500 x 1,667. |
| `19-996-tk-teo-photography-suki-oska-15_TKTP3352.jpg` and `20-1074-irene-yap-photography-evonne-desmond-7_23.jpg.webp` | TheWeddingNotebook's own filename convention (year, post id, photographer, couple, frame). |
| Three files with a `.jpg.webp` double extension | Downloaded in one format and converted in another, which is a web-scrape signature, not a camera output. |
| One EXIF caption reads "...TINDAKAN menambahbaik kursus kahwin wajar dilakukan... -Gambar hiasan." | "Gambar hiasan" is the sign-off convention of a Malaysian newspaper photo caption. This is wire or newsroom imagery. |
| One EXIF caption reads "View over the bright green tea plantations of the Cameron Highlands in Malaysia" | Stock-library caption phrasing. |
| 28 `Screenshot-2025-11-24-at-*.png` files | Screenshots of something. Of what is not recorded. |

**The article library's naming pattern is itself evidence.** The 269 IN- items
are named after the vendor or venue they depict: 26 files named for individual
wedding planners in the "14 Wedding Planner Terbaik" roundup, 40 named for
individual garden venues, 19 named for wedding halls. Combined with the finding
that only 6% carry camera EXIF, **the most probable origin of this library is
each vendor's own website or Instagram.** I state that as the probable
reading, not as a proven one.

### 1.4 The open legal questions, stated as questions

I am not a lawyer and this document does not give legal advice. These are the
questions somebody qualified needs to answer, in the order they matter.

1. **Under what terms did the ten Real Wedding photographers supply their
   files?** There may well be a real arrangement. It exists, if it exists, in
   emails or WhatsApp threads that are not in this repo. **Until it is
   produced, we have credit but no licence on 401 images.**
2. **Did the vendors depicted in the listicles permit use of their imagery?**
   The pages named them and linked them, which is how most Malaysian wedding
   media operates and is often tacitly accepted. Tacit acceptance is not a
   licence, and a vendor who later objects is entitled to.
3. **What is the status of the couples in the Real Wedding features?** These
   are identifiable private individuals at a family event. Malaysia's PDPA and
   ordinary reputational care both bear on republishing them under a new URL
   structure on a new platform. **Nothing in the export records a couple's
   consent.**
4. **Do the two TWN-convention files, and any others sharing that origin, sit
   under TWN's own photographer agreements?** Same-owner does not mean
   sub-licensable. TWN's agreements govern.
5. **What is our exposure on the twelve listicles already live?** That is a
   question about published pages, not about new production, and it is the
   owner's decision, not mine.

### 1.5 The disposition I recommend for the existing library

| Class | Items | Disposition |
|---|---|---|
| **A. Real Wedding sets** | 401 | **Quarantine for new use.** Named photographer per set, so retroactive clearance is achievable: write to all ten studios for a written licence. Do not use in any new article until one is on file. |
| **B. Article and listicle imagery** | 269 | **Do not reuse.** Presumed third-party marketing imagery. No credit, no camera metadata, named after the businesses depicted. |
| **C. Other** | 12 | **Do not use.** Includes a marketplace product shot and a named brand's product photo. |
| **D. Assets we can prove we own** | **0** | There are none. |

**Quarantine means do not publish and do not delete.** Deleting destroys the
evidence trail if a question is ever raised, and it destroys the only asset
worth recovering. The 401 Real Wedding files are genuinely valuable if ten
emails come back signed.

**What already-published pages do** is a separate decision and sits with the
owner. My recommendation is that the twelve listicles carrying class B imagery
get a legal read before they are re-promoted or rebuilt, and that this is not
treated as urgent unless somebody complains.

---

## 2. Sourcing strategy, by content type

The framework's five templates need five different things. Treating them as
one problem is why the gap opened.

### 2.1 The demand, sized

| Need | Basis | Images |
|---|---|---|
| Article layer | 204 mapped topics at 6 to 8 image slots (one per H2 minimum) | **1,224 to 1,632** |
| Real Weddings | 2 per month for 12 months, 8 to 15 each | 192 to 360 |
| Directory | 40 to 60 venues at 3 to 5 each | 120 to 300 |
| Pillar pages | 7 at 3 each | 21 |
| **Twelve-month total** | | **roughly 1,550 to 2,300** |

At 6 to 7 articles a week the article layer alone needs 36 to 56 images a
week. That is the number the pipeline in section 4 has to carry.

### 2.2 The recommendation, per template

| Template | Primary source | Secondary | Never |
|---|---|---|---|
| **Panduan** (procedure, rukun nikah, mas kahwin ikut negeri, kursus kahwin) | **Original graphics** | One licensed photo for the hero | Stock photo of a non-Malay wedding |
| **Senarai** (pelamin styles, gubahan dulang, doorgift ideas) | **Vendor-licensed photography** | Original graphics for categories and price bands | Vendor imagery without a written licence |
| **Soal-jawab** (short answers, nisbah, adat questions) | **Original graphics**, often one diagram | No hero required | Anything decorative that implies a claim |
| **Real Wedding** | **Photographer licence, per feature** | Nothing else | Publishing without both photographer licence and couple consent |
| **Direktori** (venue and vendor entity pages) | **Venue-supplied photography under licence** | Our own photography where a venue will not supply | Scraped venue marketing shots |

### 2.3 Original graphics: the load-bearing recommendation

**The rest of this strategy rests on this recommendation, so it is worth
setting out why.**

Cluster one is mas kahwin by state (a comparison table), hantaran categories
(a taxonomy), and dulang ratios (a diagram). P1 is procedure and legal
conditions. Much of P5 is cost and options. **The largest and best-sequenced
clusters on the map are procedural and comparative, and for that kind of
content a well-made graphic outperforms a photograph rather than standing in
for one.**

It is also the only visual class where we can satisfy quality-bar line 4. A
state-by-state mas kahwin table built from named enactments is simultaneously
the specific checkable fact and the image. The incumbents publish neither.

**My estimate: original graphics can serve 55 to 70% of the article layer's
image slots**, concentrated in P1, P2 (mas kahwin and nisbah), P6, and every
Soalan Lazim block on the map. **That estimate is mine, derived by classifying
the 204 mapped topics by template type. It is not a measurement.**

**What is needed to make it real:** a template kit of roughly six graphic
types, built once, in a fixed brand palette and typeface, with Malay labels.
State comparison table, checklist card, ratio diagram, cost band chart, step
sequence, and category grid. After the kit exists, a graphic is a data-entry
job of 20 to 30 minutes, not a design job.

**The trade-off.** Graphics do not carry a Senarai. A list of
pelamin styles or gubahan ideas needs real photographs, and a reader can tell
instantly when a visual-idea page has no visuals. Graphics also do not
generate Pinterest or Instagram traffic, and they will not win an image pack.
They are the right default for two thirds of the map and the wrong answer for
the other third.

### 2.4 Vendor and photographer partnerships: the photography engine

This is how TWN, nikahsatu and most wedding media work, and the credit
convention already exists in our own posts. What is missing is the paperwork.

**The offer.** A vendor or photographer grants us a non-exclusive, perpetual,
worldwide licence to publish named images on hellokahwin.com and its social
accounts, with the right to resize and crop, with credit. In return they get:

- A named credit on every image or gallery, in Malay, in the form they specify.
- A free directory entry at `/direktori/...`, which is a page that ranks for
  their own business name and which they otherwise cannot get.
- A followed link from that entry to their site and Instagram.
- Their work in front of the audience they sell to.

**Why they say yes.** For a photographer or a gubahan vendor, being seen is
the business. The directory entry is worth more to a small vendor than the
photographs cost them, and it is worth more to us than it costs us, because
the directory is separately the highest traffic-per-hour item on the whole
framework.

**What it costs us to run, and this is the part usually left out.** A vendor
partnership programme is not a document, it is an ongoing operation:
identifying and contacting vendors, explaining the offer, negotiating credit
wording, receiving and organising files, checking they are usable, recording
the licence, building the directory entry, and chasing the 60% who do not
reply. **My estimate is 6 to 8 hours a week to run a 40-vendor programme from
a standing start, falling to 3 to 4 hours a week once it is established.**
Estimate, from the shape of the work, not a measured figure.

**Sequencing.** Open with gubahan hantaran and dulang vendors, not with
photographers. They are the easiest yes, their imagery serves the cluster that
launches third, and they have the least to lose.

### 2.5 Real Wedding submissions

The classic supply engine, and the audit already told us what it is worth:
TWN's best-performing Real Wedding earns 132 visits a month and earns them for
the venue's name; our own drew 1 to 4 impressions each in 28 days (carried
forward from `aug-23-2026-audit-baseline.md`).

**So Real Wedding submissions belong in the plan as a supply mechanism and a
partnership incentive rather than as a traffic play.** They deliver venue
photography for the directory and they give photographers a concrete reason to
enter a licensing relationship with us. They do not earn clicks and the plan
should not expect them to.

**One requirement here is absolute:** a submission is publishable only with
both a photographer licence and a written couple consent, with no exceptions
for a good story or a tight week.

### 2.6 Stock

**What exists.** Generic Malay and Muslim wedding stock does exist on the
large libraries. What it looks like, consistently, is a couple in nikah attire
against a plain or generic backdrop, and Middle Eastern or Indonesian
weddings mislabelled as Malay.

**Where it runs out.** There is effectively no stock coverage of the specific
things our clusters are about: a properly arranged dulang hantaran, sirih
junjung, bunga telur, a Malaysian pelamin, mas kahwin in a frame, an akad
nikah in a Malaysian pejabat agama, berinai. Those are the subjects of the
map. **Stock covers the generic parts we could most easily do without and
misses the parts the clusters are built on.**

**Recommendation:** stock is permitted only for non-cultural, non-claim
imagery, which in practice means location and landscape shots for venue and
honeymoon content. It is banned outright on any page about adat, agama or
procedure, which the framework's quality bar already says. Every stock
purchase keeps its licence receipt in the asset register.

### 2.7 AI-generated imagery: recommendation and reasoning

**Recommendation: do not use AI-generated imagery for anything depicting a
Malay wedding, an adat object, a real venue, or a person. Permit it narrowly
for abstract backgrounds and for illustrative elements inside original
graphics where no factual or cultural claim is made, and label it either way.**

**The reasoning, in the order it convinced me.**

**One: the failure lands on our differentiator.** Our whole competitive claim
on the adat clusters is that we know this material and the incumbents do not.
A hantaran tray with the wrong objects, a pelamin with the wrong form, a baju
melayu with the sampin worn wrongly, or invented Jawi lettering reads as a
site that does not know its subject, on the exact page where knowing the
subject is the product. **A wrong image on an adat page costs more than no
image.**

**Two: our reader is an insider.** A Malaysian Malay couple planning a wedding
recognises these objects the way anyone recognises the furniture of their own
house. They will notice.

**Three: the models are probably weak here, and I want to say "probably"
rather than assert it.** My professional expectation is that current
image models render Malay wedding specifics poorly, because the training
material for Malaysian adat is thin next to Western, Indian and Indonesian
wedding imagery, and generations tend to drift towards Javanese or generic
Southeast Asian aesthetics. **I have not tested this and I am not going to
present it as a finding.** If the board wants it settled rather than assumed,
the test is cheap: twenty prompts across dulang hantaran, sirih junjung,
pelamin, bunga telur and akad nikah, reviewed by a Malay reviewer against a
simple pass or fail. I will run it on request. My recommendation stands
either way, because even a pass rate of 70% means three pages in ten carry an
error we would have to catch.

**Four: reader trust is the thing this whole programme is accumulating.**
Publishing generated photographs of ceremonies that never took place, in a
market where the subject is somebody's family tradition, trades that trust for
a saving of a few hours per article.

**Where it is fine.** Background textures, abstract pattern work, decorative
elements inside a graphic, and icon sets. None of those assert anything about
the world.

**The labelling rule.** Anything generated is tagged as such in the asset
register whatever it depicts, so that a future policy change is executable
rather than archaeological.

---

## 3. Rights and attribution policy

Strict by design. This section is the one that protects the company, and the
audit in section 1 is the argument for why it needs to be strict.

### 3.1 The rule

**Nothing publishes without a recorded licence.** Five permitted classes and
no sixth:

| Class | What it requires |
|---|---|
| **V. Vendor or photographer licence** | A signed or written grant naming the images or the shoot, the scope, and the credit wording |
| **C. Couple submission** | A signed release from the couple **and** a licence from their photographer |
| **O. Commissioned** | A commissioning agreement assigning or licensing the rights to us |
| **S. Stock** | A retained licence receipt with the licence type and the purchase date |
| **G. Our own graphic** | Produced by us, with any third-party font or icon licence recorded |

**Never publish, under any circumstance:**

- An image taken from a vendor's website, Instagram, Facebook or a marketplace
  without a written grant. Being credited and linked does not make it lawful.
- Anything from the current library's class B or class C, per section 1.5.
- Anything whose EXIF names a third party we have no agreement with.
- An identifiable private person, at a wedding or otherwise, without consent.
- A generated image of a Malay wedding, an adat object, a real venue or a
  person, per section 2.7.

### 3.2 The asset register

One row per image, kept outside the CMS so it survives a platform change. This
is the artefact whose absence is the entire finding in section 1.3.

| Field | Why it is there |
|---|---|
| Asset id and stored filename | The join key to everything else |
| Source class (V / C / O / S / G) | Determines what evidence must exist |
| Licensor legal name and contact | Who to ask, years from now |
| Date of grant | When the clock started |
| Scope granted | Site, social, derivatives, perpetual or term |
| Credit string, exactly as agreed | So credit is reproducible, not remembered |
| Evidence pointer | The email, message, form or receipt that granted it |
| Article or page it was supplied for | Whether the grant covers reuse elsewhere |
| Review or expiry date | Term licences that nobody remembers become liabilities |
| Generated flag | Executable policy later |

**The register is what makes the images usable.** A thousand images with no
register is the position we are in today, and it is worth less to the company
than two hundred images with one.

### 3.3 Credit

- Every licensed photograph carries a visible credit in Malay, per image or
  per gallery, in the licensor's own preferred wording.
- The existing "Kredit Vendor" block convention in Real Wedding posts is kept
  and formalised into the template. It is the one thing the old site did well.
- Credit links are followed links. A nofollow credit is worth much less to the
  vendor, and vendor goodwill is what keeps the programme supplied.
- Credit is never a substitute for a licence, and the policy says so in the
  same sentence every time it is explained to a vendor.

### 3.4 Takedown

- A named contact and a published route to reach it.
- A commitment to respond within five working days.
- Unpublish first, investigate second, on any credible claim.
- Every claim and its resolution recorded against the asset's register row.

This costs nothing to set up, and it is usually what stops a complaint turning
into a dispute.

---

## 4. The pipeline

### 4.1 Storage

CEO memory records R2 media buckets in the TWN Cloudflare account, and the
live site is Next.js on Vercel with content in Supabase. **I have not verified
bucket names, access, or whether a HelloKahwin-specific bucket exists; the
live-site repo is not cloned on this machine.** Treat storage as a small
engineering item to confirm, not as a solved problem.

Whatever the bucket is, the requirement is: originals kept unmodified in a
cold path, derivatives served from a hot path, and neither ever the only copy.

### 4.2 Naming

`<cluster>/<article-slug>/<nn>-<malay-descriptor>.<ext>`

The Malay descriptor is not decorative. It is the first draft of the alt text
and it makes a misfiled image findable. The current library's convention
(subject, then vendor, then index) was actually good, and it is the only reason
this audit was possible; the improvement is adding the cluster and the article.

### 4.3 Alt text

- Malay, descriptive, written for somebody who cannot see the image.
- Never the target keyword repeated. **The current library shows exactly what
  that failure looks like: 38 of 682 items have alt text, and "wedding planner
  terbaik di malaysia" is 22 of the 38.** That is keyword stuffing in an
  accessibility field, in English, on a Malay-first site.
- Written at brief time by whoever specifies the image, not retrofitted.
- Quality-bar line 14 already requires it. This is the mechanism.

### 4.4 Sizing and format

| Slot | Long edge | Format | Target weight |
|---|---|---|---|
| Hero | 2,000px | AVIF, WebP fallback | under 200 KB |
| In-article | 1,600px | AVIF, WebP fallback | under 150 KB |
| Directory and card thumbnails | 800px | AVIF, WebP fallback | under 60 KB |
| Graphics | SVG where possible, otherwise PNG at 1,600px | | under 100 KB |

**The current library would fail this badly if reused as is:** median 467 KB,
files up to 6,912px wide, 86% JPEG, no AVIF anywhere. Anything recovered from
quarantine gets reprocessed before it is published.

### 4.5 Who does the work at 6 to 7 articles a week

Per article, at the framework's minimum of six images:

| Task | Time |
|---|---|
| Select and source from the register or the library | 20 min |
| Produce 2 to 3 original graphics from the kit | 60 to 90 min |
| Process, name, write alt text, write register rows | 25 min |
| **Per article** | **roughly 2 hours** |

**At 6 to 7 articles a week that is 12 to 14 hours on the article layer
alone.** Add the partnership programme (6 to 8 hours a week initially),
directory photo intake across 40 to 60 venues, and the retroactive licence
recovery project across ten photographers. **Roughly 22 to 28 hours a week in
the first quarter.**

That is not work a writer absorbs. Two reasons. First, it is more than half a
role and the writers are already the binding constraint on the article count.
Second, the licence record is a legal artefact, and legal artefacts produced
part-time by four different people in a rush are how organisations end up
where this library is today.

---

## 5. Cost, capacity, and the hire

### 5.1 The recommendation

**Recommend one hire: a Visual & Rights Coordinator, 20 to 25 hours a week,
contract or part-time, for at least two quarters.**

This is an operational role rather than a photographer's or a designer's, and
the priority order is: run the licence programme, keep the register, produce
graphics from the kit, then process and publish assets.

**What they own:**

1. The asset register, and the authority to block a publish without one.
2. The vendor and photographer partnership programme, including the
   retroactive clearance of the ten Real Wedding studios.
3. Original graphic production from the template kit.
4. Processing, naming, alt text and the R2 pipeline.
5. The directory photo intake as the directory is built.

**What they do not own:** editorial judgment, keyword strategy, or what an
article says. Those stay with me and the writers.

**Why the role is one person and not two.** The register is a single point of
truth and it should have a single owner. Splitting graphics from rights
produces exactly the situation where nobody is quite responsible for whether
we are allowed to publish something.

### 5.2 The cost

**I have no sourced salary data for this role in Malaysia and I am not going
to invent one.** What I can give is the shape of the cost and an explicitly
labelled estimate.

- **Shape:** 20 to 25 hours a week, part-time or contract, junior to
  mid-level, requiring competent Malay, basic design tool fluency, and
  organised administrative habits. It does not require an SEO background and
  it does not require a photographer's skill set.
- **Estimate, unsourced, my judgment only:** a part-time or contract
  arrangement at this level in Malaysia is plausibly in the low four figures
  in ringgit per month. **This is an estimate with no market data behind it and
  it should not go in a budget until somebody gets two real quotes.** I can
  produce a proper costing if the CEO wants one; it needs recruitment data I
  do not have access to.
- **Tooling:** a design tool licence and a stock subscription. Both small, and
  the stock subscription is optional under section 2.6.

**How this ranks against the other open hire.** The two writer hires are still
unapproved and they are the binding constraint on the whole 90-day target.
**If the board can approve only one thing, approve the writers.** The
visual role is necessary for the programme to be sustainable and defensible;
the writers are necessary for it to exist at all. I would rather say that
plainly than compete with my own priority.

### 5.3 What happens if the hire is not approved

The fallback is doctrine-consistent and it is not a disaster, but it is worth
seeing before deciding.

- **Graphics only for the first two clusters.** No photography, no Senarai
  templates until later, which means C2.3 (gubahan dulang) moves back in the
  sequence and the pelamin cluster in P5 stays shut.
- **No vendor programme**, which means no directory photography, which slows
  the highest traffic-per-hour item on the framework.
- **No retroactive clearance**, which means the 401 Real Wedding images stay
  quarantined indefinitely and the Real Wedding format is paused.
- **The register still gets built.** It is a spreadsheet and a discipline, and
  I will own it myself rather than let production proceed without one.

That fallback ships cluster one and cluster two on time. It does not ship a
photographic library, a directory, or Real Weddings.

---

## 6. The minimum viable start

The question is what does not block cluster one (mas kahwin, hantaran, gubahan
dulang) while the fuller pipeline is built. The approved launch sequence makes
this easier than it could have been.

**Two of the three launch clusters need almost no photography.**

- **C2.4 mas kahwin ikut negeri** is a state comparison. Its ideal visual is a
  table and a state-by-state chart. Photography adds nothing.
- **C2.1 hantaran kahwin** is a category taxonomy. Its ideal visual is a
  category grid and a checklist card, with photographs as a bonus.
- **C2.3 gubahan dulang hantaran** genuinely needs real photographs, and it is
  third in the sequence, which buys four to six weeks.

**Week one, in priority order:**

1. **Create the asset register and the licence template.** Two documents. No
   engineering, no budget, no approval needed. **Nothing publishes before
   these exist**, because starting without them is precisely how the current
   library happened.
2. **Build the graphic template kit.** Six types, one brand palette, Malay
   labels: state comparison table, checklist card, ratio diagram, cost band
   chart, step sequence, category grid. One focused block of work, and after
   it exists each graphic is 20 to 30 minutes.
3. **Send the ten retroactive licence requests** to the Real Wedding
   photographers. They cost an hour to write and the replies take weeks, so
   they should be in flight before they are needed.

**Weeks two to four:**

4. **Open the vendor programme with five gubahan and hantaran vendors.**
   Easiest yes, and their imagery is exactly what C2.3 needs.
5. **Confirm the R2 bucket and the upload path** with whoever owns the
   live-site repo. Small engineering item, and it blocks publishing rather
   than production.

**What ships under this start.** C2.4 and C2.1, sixteen articles, entirely on
original graphics, with no rights exposure and no dependency on anyone
replying to an email. C2.3 ships when the first vendor licences land, and the
sequence already places it third.

**What does not ship.** Real Weddings, the directory's photography, and any
Senarai that depends on many real photographs. All three wait on section 5.

---

## Sources and method

**Direct inspection, 23 Aug 2026**, of `data/hellokahwin-export/` (export of
21 Aug 2026):

- File census over `media/wp-content/uploads/` (6,312 files, 3.3 GB):
  extension counts, derivative-suffix classification, filename prefix and set
  extraction.
- Field-level parse of `content/media.json` (682 records): dimensions,
  filesize, mime type, upload date, author, alt text, caption, parent post,
  derivative size counts, and the full `media_details.image_meta` EXIF block
  including credit, copyright, camera, caption and created timestamp.
- Key-set scan of the attachment schema for any licence, rights, permission,
  usage or consent field. **Result: no such field exists.**
- Cross-reference of every `source_url` against the rendered HTML of all 29
  posts in `content/posts.json` to establish which items are in use.
- Credit-block extraction from `content/posts.json` and author identification
  from `content/users.json`.

**Carried forward, not re-measured:** the Real Wedding traffic finding (TWN's
best feature at 132 visits a month; our own at 1 to 4 impressions each) from
`aug-23-2026-audit-baseline.md`; the 204-topic map and the launch sequence
from `aug-23-2026-clusters-launch-plan.md`; the image mandates and quality bar
from `aug-23-2026-framework-content.md`; the R2 and Vercel infrastructure
notes from `docs/boardroom/ceo-memory.md`.

**No Ahrefs or Search Console data was needed for this document and none was
pulled.**

**Explicitly marked as estimates, not measurements:** the 55 to 70% graphics
coverage of the article layer (section 2.3), the partnership programme time
cost (2.4), the per-article visual time budget and the 22 to 28 hour weekly
figure (4.5), the salary shape (5.2), and the expectation about AI image model
weakness on Malay adat subjects (2.7), which is flagged as untested with a
proposed test attached.

**Not legal advice.** Section 1.4 lists questions for a qualified person. This
document identifies risk; it does not resolve it.
