# Done — Writer (Inspirasi, Vendor & Venue) — P4, three articles

**Date:** 25 Ogos 2026 · **Session:** aug-23-2026-session-01
**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-write-p4-p5.md` (P4 half only; a sibling agent took P5)
**Status:** three drafts delivered, `/humanizer` run on all three after revision. Not published.

---

## What was written

| File | Cluster | Target term | Words |
|---|---|---|---|
| `drafts/C4-1-A1-baju-pengantin-sewa-atau-beli.md` | C4.1 | `baju pengantin` (1,700/mo, KD 0) | 1,274 |
| `drafts/C4-1-A2-songket-tenunan-tangan-atau-cetak.md` | C4.1 | `kain songket` (1,400/mo) + `baju pengantin songket` (900) + `baju songket` (1,100) | 1,414 |
| `drafts/C4-2-A1-inai-tangan-pengantin.md` | C4.2 | `inai tangan` (900/mo) + `corak inai` (500) + `pokok inai` (500) | 1,419 |

All volume figures are the launch plan's own Ahrefs pull, `my`, 23 Ogos 2026. **The Ahrefs MCP
tools were not exposed to this agent session**, so nothing was re-pulled; no figure in the
articles or in this log depends on a volume I could not attribute to that document.

## Why these three, and not the head terms

The plan is explicit that P4's head terms cannot be taken by an article. `baju nikah` (2,000/mo)
returns nine boutique product pages out of ten. `inai simple` (3,800/mo) returns Google Shopping
redirects, Pinterest, the Instagram homepage, Lazada and Shopee. Both are §1.2 rejections and
both were respected.

What was written instead is the decision layer the plan names: rent versus buy with real costs,
handwoven songket versus printed, and the informational shoulder under `inai simple`.

**Solekan was not written.** The plan records that solekan returned nothing above 100/mo at
KD under 25 on five Malay seeds. That finding was accepted rather than re-tested.

## The rule that shaped every article

No authority sets a price for anything in P4. There is no equivalent of the council rate sheets
that carried C6.2. The substitute used here is the same discipline applied to a different kind of
source: **a named vendor's own published price page, quoted as a published price, dated, and
never described as a market rate.** Every article says so in its own body.

Where the number does not exist anywhere, the article says that instead of estimating. Three
such statements were made:

- No tailoring-fee schedule for bridal wear is published by any Malaysian trade body.
- No published price band exists for mid-market cotton handwoven songket.
- No Malaysian authority statement naming black henna or PPD in henna could be found.

## Style-guide note for the chair

The C6.2 reference article uses `kami` in body copy several times (`kami tidak mengambil harga
daripada blog`, `kami kumpulkan semuanya`). Style guide §2.2 bans `kami` in body copy outright,
and §14.5 repeats it. These three articles follow the style guide, not the reference article, and
carry zero instances of `kami`, editorial `kita`, or `korang`. If the board has since ruled that
sourcing statements may use `kami`, these three should be revised for consistency, not the
other way round.

## Internal links, and what is missing

Nothing in P4 is live. There is no P4 pillar page in the sitemap and no legacy article on baju,
songket, inai or solekan. Framework rule L4 (no article-to-article links across pillars) and the
requirement that links resolve to published pages cannot both be satisfied here.

What was done: only live-resolving URLs were placed in `internalLinks`, and only where the link
is genuinely useful to the reader.

| Article | Internal link | Why it is honest |
|---|---|---|
| C4-1-A1 | `/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin` | The bride's outfit is commonly paid from wang hantaran, which readers confuse with mas kahwin. Cross-pillar, flagged. |
| C4-1-A2 | `/artikel/hiasan-dekorasi/hantaran-kahwin` | Kain and pakaian sepersalinan are hantaran items; the legacy article names *pakaian sepersalinan*. Live. |
| C4-2-A1 | none | No live page is genuinely related. A forced link would be worse than none. |

**To add at ingest, once the three publish together** (these are the architecturally correct
sibling links, L3):

- C4-1-A1 → `songket-tenunan-tangan-atau-cetak`, anchor *songket tenunan tangan*
- C4-1-A2 → `baju-pengantin-sewa-atau-beli`, anchor *sewa baju pengantin*
- C4-2-A1 → `baju-pengantin-sewa-atau-beli`, anchor *baju pengantin*
- All three → the P4 pillar page `/artikel/busana-pengantin` when it exists (L1)

## Graphics specified

Six in-article graphics, all originable by us, all `credit: HelloKahwin`, `licenseClass: G`,
`licensorName: HelloKahwin`, all with Malay alt text in the `images:` front matter. No
`*[IMEJ N di sini]*` markers anywhere. Three covers named in `cover.alt` on the `kad-tajuk`
pattern.

| Article | Graphic | Template family |
|---|---|---|
| C4-1-A1 | Sewa vs beli price bands, with vendor and date | `jadual-perbandingan` |
| C4-1-A1 | How many outfits, by majlis structure (1 / 2 / 3 sets) | ratio or count diagram |
| C4-1-A2 | Cross-section: floating supplementary weft vs printed surface | explanatory diagram |
| C4-1-A2 | Songket price bands, handwoven to branded set | `jadual-perbandingan` |
| C4-2-A1 | Three inai types by colour, development time, duration, risk | `jadual-perbandingan` |
| C4-2-A1 | PPD reaction window against the countdown to the majlis | timeline |

## Verification checks run

- Every ringgit figure traced to a page I fetched myself on 25 Ogos 2026, except the FDA line
  (see the report's caveat).
- Style sweep: zero hits on the §5 Indonesian tables, zero `kami` / editorial `kita` / `korang`,
  zero exclamation marks, zero em or en dashes in prose (en dashes appear only inside table
  cells, which style guide §7.1 permits), no heading over 60 characters, no paragraph over three
  sentences or 55 words, no sentence over 25 words without a clause break.
- Article sentence averages: 10.9, 11.9, 11.0 words. Titles 52, 54, 54 characters. Metas 150,
  150, 149 characters. Four `Soalan lazim` questions each.
- `/humanizer` run on all three after revision, per §12.4 and quality-bar point 21.

---

# The P4 photography gap list

For `managing-editor`, Task 3 of `aug-25-2026-brief-supporting-images-and-credit.md`.
Consolidates with the P5 list in `aug-25-2026-done-write-p5.md`.
**Nobody has been contacted. Outbound contact is the owner's decision.**

## What a concurrent run already closed

After this log was first written, a separate run sourced openly-licensed photographs and
added `licenseClass: S` entries to two of my three articles. They are registered in
`docs/asset-register/asset-register.csv` and the files sit in `drafts/images/`. They are
good, they stay, and the gap below is stated net of them.

| Article | Photograph added | Register row | What it closes |
|---|---|---|---|
| `C4-1-A1-baju-pengantin-sewa-atau-beli` | Malay couple at a pelamin in full sanding dress, baju melayu with songket samping and tanjak, matching baju kurung | `HK-P-0003`, Fyruz Alqadiri, CC BY-SA 4.0 | Shows what "satu set berdua" means. Real help on the article's most misread term. |
| `C4-1-A2-songket-tenunan-tangan-atau-cetak` | Macro of a mid-19th-century Terengganu kain limar songket bertabur, raised gold thread on red silk, Textile Museum GWU | `HK-P-0006`, Daderot, public domain | Shows raised supplementary weft on the **front**. Closes about half of this article's visual need. |
| `C4-2-A1-inai-tangan-pengantin` | none | — | Nothing closed. |

Two further registered assets, `HK-P-0007` and `HK-P-0008` (early-19th-century Melaka bridal
costume, male and female, Muzium Negara, Marcin Konsek, CC BY-SA 4.0), carry
`digunakan_dalam: BELUM DIISI`. They are reserved for a C4.1 history article that does not
exist. They do not belong in any of my three, because none of the three is about historical
costume and the register note itself requires the caption to say it is a museum exhibit.

## Which of the three actually need photographs

| Article | Verdict |
|---|---|
| `C4-1-A1-baju-pengantin-sewa-atau-beli` | **Stands up on original graphics, and now has one good photograph on top.** It is a numbers article: published price bands, an outfit-count diagram, ten questions to ask before paying a deposit. The comparison table and the count diagram carry it. Complete as it stands. |
| `C4-1-A2-songket-tenunan-tangan-atau-cetak` | **Still weaker than it should be, even with the museum macro.** The article teaches a physical test, and the test is *belek belakang kain*. The photograph we now hold shows the front. Nothing in the article shows the reverse of a woven cloth, and nothing shows a printed one for contrast, so the one instruction a reader will actually carry into a shop is still delivered in prose. |
| `C4-2-A1-inai-tangan-pengantin` | **The weakest of the three, and it received nothing.** The entire safety argument is a colour claim: natural inai goes orange to brown over a day or two, PPD-blackened paste goes jet black in hours. That is a claim about how something looks, argued in text, on a page whose head SERP is nothing but images. |

**The one I would flag to the board: `C4-2-A1-inai-tangan-pengantin`.** One honest
side-by-side would carry a public-safety point that paragraphs cannot.

## Named candidates

Every business marked *verified* below was reached by loading its own page on 25 Ogos 2026.

### Songket, the biggest remaining hole

| Business or body | Where | Why them | What we would want |
|---|---|---|---|
| **Perbadanan Kemajuan Kraftangan Malaysia**, and its retail arm **Karyaneka** | kraftangan.gov.my, outlets nationwide | *Verified.* The federal craft agency, with its own weaving centres. Already cited in the article for placing songket weaving in Kelantan, Terengganu and Pahang. A public-body grant is the cleanest licence we could hold anywhere on the map. | Process photography of the *kek* two-pedal loom in use, and a macro pair of the **front and the reverse** of one woven cloth. The reverse is the single frame the article is missing. |
| **Yayasan Tuanku Nur Zahirah** | Terengganu | *Verified via the GI registration report.* Registered proprietor of the Songket Terengganu geographical indication, certificate presented 20 November 2025. They have a direct institutional interest in the woven-versus-printed distinction this article draws. | Authoritative imagery of GI-registered cloth, and permission to name it as such. |
| **Sampin Exclusive** (sampinexclusive.com) | Not stated on the site | *Verified.* Every handwoven price in the article is theirs: RM2,800, RM7,500, RM11,500. They also publish the one-to-three-month weaving time the article quotes. | Front and reverse detail of one RM2,800 sampin and one RM11,500 sampin, so the price ladder has pictures attached to it. |
| **Nur Songket** (nursongket.com.my) | Terengganu | Terengganu weaver selling handwoven sampin. **Site returned HTTP 403 to every fetch; existence verified, catalogue not.** No figure from it was published. | Weaver-at-loom documentary photography. **Confirm it is still trading before it goes on any contact list.** |

### Bridal boutiques, the DR 0 to 4 sites already ranking on our SERP

Positions and DR are from the launch plan's SERP read of 23 Ogos 2026.

| Business | Where | Why them | What we would want |
|---|---|---|---|
| **PP Signature Bridal** (ppsignature.com) | Kajang, Selangor | *Verified.* DR 4, position 1 on `baju nikah`. Every rental price in `C4-1-A1` is theirs. It is also the DR-4 shop that out-publishes every wedding media company in this market, so it understands why a credit matters. | The songket sanding sets behind the RM699 to RM1,099 band, plus one flat lay of the accessory set they describe: hiasan kepala, bunga tangan, tanjak, keris. |
| **ADNAA** (adnaa.com.my) | Not stated on the site | *Verified.* DR 0 at position 3 with 3,394 visits a month, the highest-traffic organic result on that page one. All eight purchase prices in `C4-1-A1` are theirs. | Product photography of three of the eight named pieces, at the bottom, middle and top of the RM669 to RM879 ladder. |
| **Songket Dunia** (songketdunia.my) | Not stated on the site | *Verified.* DR 3, position 7. Its RM477 to RM587 nikah sets are the article's contrast case. **Approach with care and fairness:** the article uses its collection page to show that a product can be sold under the songket name without stating how the cloth is built. That is an observation about labelling, and it should be put to them as one. | Their nikah couple sets, and a straight answer on the cloth so we can correct or confirm the observation. |
| **Hijabista Hub** (hijabistahub.com) | Not stated on the site | *Verified.* DR 4, position 4. Bridal kurung, kebaya, dresses and veils. Prices sit behind the cart, so nothing of theirs is quoted. | Modest-bridal imagery. Cluster topic 10, "what a modest bride can wear that is still bridal", has no visual coverage anywhere in this market. |
| **Camellia Empire** (camelliaempire.com) | Not stated | DR 1 with 1,445 visits a month, position 9. **Site returned HTTP 403 to every fetch.** Named from the plan's SERP read; catalogue unverified. | Confirm trading first, then bridal product photography. |
| **Rico Rinaldi** (ricorinaldi.com) | Not stated | DR 17, position 10, the highest-authority name on that page one. Not individually re-verified in this session. | Designer bridal imagery for the top of the range, which our price ladder does not reach. |

### Inai

| Business | Where | Why them | What we would want |
|---|---|---|---|
| **Inai Republic** (inairepublic.com) | Not stated | DR 8, and per the plan's 23 Ogos read the only non-marketplace result on the `inai simple` page one. Not individually re-verified in this session. | The single most valuable image in this batch: one natural-henna stain photographed at 24 hours, 48 hours and one week, on the same hand, plus a photograph of the paste ingredient list. That sequence is the whole article. |

**I could not verify a single individual Malaysian inai artist to a standard worth putting
in front of the owner.** Instagram and TikTok handles for inai artists are everywhere and
none of them establishes a trading business from a page load. I am not naming handles I
could not confirm. If the Managing Editor wants this hole filled, it needs a verification
pass of its own, not a list from me.

### Photographers

I am not duplicating the P5 list. **NikHamidi Photography** (Klang Valley), verified there
as trading with a published *Terma dan Syarat Perkhidmatan*, would also serve P4: their akad
and sanding coverage carries baju and inai detail as a matter of course. One licensed set
could serve both halves, which is an argument for approaching them once rather than twice.

The `says.com` list of ten photographers named in the P5 log is dated 6 Ogos 2015 and needs
verification before use. Same caveat applies here.

### Retroactive

The **ten Real Wedding photographers** whose images already sit on the live site. I do not
have their names; they belong to the Managing Editor's asset-register audit and their brief
already pairs them with the retroactive licence variant. Flagged so the two lists consolidate
rather than duplicate.

## What the absence costs, stated plainly

For `C4-1-A2`, less than it did this morning. The public-domain Terengganu macro is a real
asset and the article is now the best-sourced page on the term by a distance, because nobody
else publishes a dated price beside a named vendor and a UNESCO definition. What it still
cannot do is show a reader the back of a cloth, which is the one thing the article asks them
to look at.

For `C4-2-A1`, the cost is higher and it is not about traffic. The plan already tells us this
SERP pays close to nothing in clicks, so the page was never a traffic bet. It is a page that
tells brides how to avoid permanent scarring, and it currently asks them to take a colour
difference on trust. That is the gap worth spending on.

