# Done — CONT-02: supporting images to target across the live articles

**Date:** 26 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-cont-02-image-enrichment.md`
**By:** managing-editor
**Sprint 01, item CONT-02, 3 points.**

**Nothing was ingested. Nothing was published. No production database write of any
kind, and the ingest script was not run — not even `--dry-run`, which still opens a
connection.** The drafts are staged and validated; RISK-01 gates the ingest.

---

## Where the content IS

- **The 28 articles**, front matter only, no body prose changed:
  - `docs/plans/aug-23-2026-session-01/drafts/ingest/*.md` — 20 files (the copies that ingest)
  - `docs/plans/aug-23-2026-session-01/drafts/{borang-nikah,lafaz-taklik,rukun-nikah,syarat-sah-nikah}.md`
  - `docs/plans/aug-23-2026-session-01/drafts/C6-2-A{1,2,3,4}-*.md`
    (these eight P1/P6 files have no `ingest/` twin — the drafts-root copy *is* what ingests)
  - the twelve drafts-root copies of the C4/C5/P3/P7 articles, regenerated from `ingest/`
- **15 new photographs:** `docs/plans/aug-23-2026-session-01/drafts/images/S-*.jpg|png`
- **Asset register:** `docs/asset-register/asset-register.csv`, 778 → 793 rows

---

## 1. The number

**121 photographs across 28 articles, up from 77. Text cards: 17 → 0.**

| Pillar | Before | After |
|---|---|---|
| **P3** ucapan/doa | 3, 2, 3 | **5, 4, 5** |
| **P7** sebelum nikah | 3, 2, 3 | **5, 4, 5** |
| **P1** nikah | 4, 4, 6, 5 *(9 of those were cards)* | **4, 4, 5, 5** — all photographs |
| **P6** kos | 5, 4, 6, 5 *(8 of those were cards)* | **5, 5, 5, 5** — all photographs |
| **P2** mas kahwin | 4, 4, 2, 2, 2, 2, 2, 4 | **4, 4, 4, 4, 4, 5, 4, 4** |
| **P4** busana | 3, 4, 2 | **3, 5, 4** |
| **P5** pelamin/kad | 3, 2, 3 | **3, 4, 3** |

P1 and P6 look flat and are not. Their "before" counts were inflated by seventeen
typographic data cards; strip those and the real photograph counts were 1, 2, 4, 3
and 2, 2, 4, 4. Every one of those is now a photograph.

### The command

`table.sh`, reproduced in full in §9. It counts **both** front-matter spellings —
`  file:` for the cover and `  - file:` for list entries — which is the dash that
made the hand-counts wrong twice. AFTER is measured live; BEFORE is the recorded
output of the same counter over the same 28 files before any edit. None of these
files is tracked in git, so there is no committed state to diff against, and I
say so rather than implying a diff I did not run.

```
PIL  SLUG                                    SECT  BEFORE   CARDS   AFTER   CARDS
P2   mas-kahwin-ikut-negeri                     7       4       0       4       0
P2   apa-itu-mas-kahwin                         8       4       0       4       0
P2   mas-kahwin-johor                           6       2       0       4       0
P2   mas-kahwin-kelantan-terengganu             6       2       0       4       0
P2   mas-kahwin-perak                           7       2       0       4       0
P2   mas-kahwin-pahang-negeri-sembilan          9       2       0       5       0
P2   mas-kahwin-sabah-sarawak                   7       2       0       4       0
P2   mas-kahwin-melebihi-kadar-minimum          6       4       0       4       0
P4   baju-pengantin-sewa-atau-beli              8       3       0       3       0
P4   songket-tenunan-tangan-atau-cetak          9       4       0       5       0
P4   inai-tangan-pengantin                     10       2       0       4       0
P5   pelamin                                    8       3       0       3       0
P5   contoh-kad-jemputan-kahwin                 8       2       0       4       0
P5   bunga-telur                                8       3       0       3       0
P3   ucapan-pengantin-baru                     12       3       0       5       0
P3   doa-pengantin-baru                         8       2       0       4       0
P3   doa-majlis-perkahwinan                    12       3       0       5       0
P7   cincin-tunang                              8       3       0       5       0
P7   taaruf-maksud                             10       2       0       4       0
P7   doa-majlis-pertunangan                     9       3       0       5       0
P1   borang-nikah                               8       4       3       4       0
P6   harga-sewa-dewan-kahwin                    8       5       3       5       0
P6   checklist-kahwin                          11       4       2       5       0
P6   pakej-dewan-kahwin                         7       6       2       5       0
P6   bajet-kahwin                               6       5       1       5       0
P1   lafaz-taklik                               8       4       2       4       0
P1   rukun-nikah                                9       6       2       5       0
P1   syarat-sah-nikah                           8       5       2       5       0
--------------------------------------------------------------------------
     TOTAL (28 articles)                               94      17     121       0

photographs: 77 -> 121   |   text cards: 17 -> 0
kad-tajuk references: 0
```

---

## 2. The brief's gap table was stale, and that is the first finding

The brief opens with a measured gap — P3 at 1.3 average, P4/P5 at 3.7 — and asks
for P3, P7, P1 and P6. **Those numbers were already out of date when the brief was
written.** They are the *pre-run* figures from
`aug-25-2026-brief-enrich-supporting-images`, which ran on 25 Ogos and lifted every
one of them. Worse, they counted front-matter entries that named files which did not
exist, which is why P4 reads 11 there and 9 in reality.

I measured before I moved. The real gap on 26 Ogos was not the one the brief
described:

- **P3 was not at 1.3.** It was at 2.67, and evenly spread.
- **The actual worst articles were P1 and P6** — the two pillars the brief treats as
  mid-table — because most of what they carried was not photographs at all.
- **P2, which the brief does not mention, had five articles sitting at 2**, the
  lowest real count on the site.

Executing the brief's stated priority order literally would have spent the budget
on the pillar that needed it least. I worked the measured gap instead, covered
everything the brief named, and am flagging the discrepancy rather than quietly
reordering.

---

## 3. Seventeen text cards removed — the real body of this job

`kad-tajuk` was already at zero when I started, so that clause of the definition of
done was already met. What was not met is the rule the brief states one line above
it: **no text cards anywhere, cover or in-article.** Seventeen were still on the
page — nine across P1, eight across P6 — all typographic panels rendering a title, a
figure pair and four or five rows of text as pixels.

They were added in good faith on 25 Ogos, one day *after* the owner's directive, by
a job whose brief predated it.

**Before removing any of them I checked every card's content against its article
body.** The finding is that nothing is lost:

| Card | Where its facts already live in the body |
|---|---|
| `cover-rukun-nikah.png` | block 5 — the numbered list of the five rukun |
| `rukun-nikah-wali-hakim.png` | block 22 — the four keadaan, in prose |
| `cover-lafaz-taklik.png`, `lafaz-taklik-ke-mana-perginya.png` | blocks 24–27 — s.22(1), s.26(2), Borang 5 fi RM15 |
| `cover-syarat-sah-nikah.png`, `syarat-sah-nikah-lelaki-perempuan.png` | blocks 5 and 9 — the two syarat lists |
| `C6-2-A2-checklist-kahwin-garis-masa.png` | blocks 8–24 — the month-by-month H2s |
| the four P6 cover cards, `borang-nikah-*`, `C6-2-A1-*`, `C6-2-A3-*` | body tables — 8, 26, 16 and 6 markdown tables respectively |

**So I changed no body prose at all.** I had drafted summary tables to replace the
four cards in the four articles that carry no body table, and then dropped them: the
facts are already there as headings and lists, which is *more* indexable than a
table, and adding prose to an image brief while SEO-02 is queued against the same
files would have been the exact collision the brief warns about. One thing genuinely
worth upgrading later is `rukun-nikah` block 22 — the four wali-hakim keadaan are
really a table and are currently a sentence. That is a writer's edit, not mine, and
it is logged in §8.

**The PNGs are still on disk and were not deleted**, as instructed. Nothing
references them.

---

## 4. What was sourced, and how the licence was verified

**20 candidates downloaded, 15 kept, 5 rejected after looking at them.**

Three subagents swept Wikimedia Commons, Openverse, Pexels and Unsplash. **All three
reported, unprompted, that they could not open a single frame** — every "what is
visible" line they returned was inferred from a file name or a description. So none
of their licence readings and none of their content claims were taken on trust:

1. **Licence re-read at origin, by me**, in one batch against the Commons API
   `extmetadata` block — `LicenseShortName`, `Artist`, `UsageTerms`, `Restrictions`.
   One correction came straight out of that: the JAWI signboard was reported as
   CC BY-SA 3.0 and is **CC BY-SA 4.0**. The register records what I read, not what
   was reported.
2. **Every frame opened and looked at** before a word of alt text was written. That
   caught all five rejections below.

No CC BY-NC, no CC BY-ND, no GFDL-only file entered the shortlist. Final licences:
2 × CC0, 2 × CC BY, 11 × CC BY-SA.

### The 15 kept

| File | Licence | Where |
|---|---|---|
| `S-papan-tanda-jawi-kuala-lumpur-aranas.jpg` | CC BY-SA 4.0 | borang-nikah |
| `S-kaunter-utc-keramat-angys.jpg` | CC BY-SA 4.0 | borang-nikah |
| `S-maij-ledang-johor-chongkian.jpg` | CC BY-SA 4.0 | mas-kahwin-johor |
| `S-bangunan-maik-kelantan-masmy86.jpg` | CC BY-SA 4.0 | mas-kahwin-kelantan-terengganu |
| `S-maipk-perak-chongkian.jpg` | CC BY-SA 4.0 | mas-kahwin-perak |
| `S-rumah-gadang-negeri-sembilan-adhmi.jpg` | CC BY-SA 4.0 | mas-kahwin-pahang-negeri-sembilan |
| `S-balai-seri-andika-rembau-ayyand.jpg` | CC BY-SA 4.0 | mas-kahwin-pahang-negeri-sembilan |
| `S-pejabat-agama-cameron-highlands-gula-kapas.jpg` | CC BY 3.0 | mas-kahwin-pahang-negeri-sembilan |
| `S-mahkamah-syariah-keningau-sabah-aranas.jpg` | CC BY-SA 3.0 | mas-kahwin-sabah-sarawak |
| `S-bacaan-yasin-terengganu-akramgl1479.jpg` | CC BY-SA 4.0 | doa-pengantin-baru |
| `S-khutbah-masjid-jamek-kuala-lumpur-taufik.jpg` | CC0 | doa-majlis-perkahwinan |
| `S-cincin-perak-dalam-kotak-netha-hussain.jpg` | CC BY-SA 4.0 | cincin-tunang |
| `S-kedai-emas-johor-bahru-chongkian.jpg` | CC BY-SA 4.0 | cincin-tunang |
| `S-hidangan-bufet-pulau-pinang-ciksitimelati.jpg` | CC BY-SA 4.0 | pakej-dewan-kahwin |
| `S-menenun-songket-alor-setar-british-official.png` | CC0 | songket-tenunan-tangan-atau-cetak |

The strongest idea in this batch is giving each state article **its own state's
religious authority**: MAIJ Ledang for Johor, MAIK for Kelantan, MAIPk Ipoh for
Perak, the Cameron Highlands PAID signboard for Pahang, the Keningau Syariah Court
for Sabah. These articles are about *who sets the rate in your state*, and a
photograph of that office answers the question the reader actually arrived with. A
generic wedding photograph does not.

### The 5 rejected, and on what ground

| File | Why |
|---|---|
| `Sungai-Sungai Sabah JAKIM-Office-01.jpg` | Licence fine, CC BY-SA 3.0. The frame is **two kampung stilt houses across a grass field**. It does not show what its title says. |
| `Hiasan di Dewan Komuniti Dataran Bengkoka Pitas.jpg` | CC0, and the only Malaysian community-hall *interior* on Commons. The frame is a **Kaamatan festival pavilion with trade stalls and banners** — a harvest festival in Sabah, not a hall dressed for a kenduri. Same failure as the collectors'-toy-fair dewan rejected on 25 Ogos. |
| `Pejabat Majlis Agama Islam Negeri Perak, Tapah.jpg` | CC BY 4.0, honest, but a **generic grey office with unreadable signage**. Superseded by the Ipoh MAIPk building, which is unmistakable. |
| `Atap rumah bergonjong di Negeri Sembilan.jpg` | CC BY-SA 4.0, correct subject. Cut as **padding** — the rumah gadang already makes the bergonjong point better, and a second roof is a second roof. |
| `Eid al-Fitr sermon, Rantau, Negeri Sembilan.jpg` | CC BY-SA 4.0. Shot from behind at head height: **mostly backs of heads**. Superseded by the Masjid Jamek khatib at the mimbar, which is CC0 and clear. |

### Reuse

Reuse did more work than sourcing. **29 of the 44 added images are photographs we
already held** — `S-serah-hantaran-akad-mylifestory` onto the Sabah/Sarawak and
Pahang/N9 articles, `S-dewan-awam-renggam` and `S-dewan-majlis-daerah-labis` across
both P6 hall articles, `S-kad-jemputan-tangan-sham-hardy` onto both the checklist
and the ucapan article, `S-keluarga-payung-kuning` onto ucapan and taaruf,
`S-lelaki-menadah-doa` onto doa-pengantin-baru.

**Alt text is reused verbatim** — it describes the picture, and the picture has not
changed. **The caption is rewritten every time**, because what a photograph teaches
on one page is not what it teaches on another. Reused credit metadata is copied out
of the front matter programmatically (§9), never retyped, so a photographer's name
or a source URL cannot drift.

---

## 5. THE LICENCE GAP LIST — the deliverable for the commissioning decision

Subjects for which **no usable freely-licensed image exists**, after three parallel
sweeps of Commons, Openverse, Pexels and Unsplash. This is the evidence for whether
we commission photography.

### Total misses — nothing exists, and the search terms are not the problem

| # | Subject | What is actually out there |
|---|---|---|
| 1 | **Interior of a `dewan orang ramai` / `dewan serbaguna` set for an event** | Every Malaysian community hall on Commons is photographed **from the road**. Not one interior. The two fallbacks are a KL hotel ballroom (wrong price point for an article about RM160 council halls) and the Sabah Kaamatan pavilion I rejected above. **This is the single most wanted subject on the site** — four P6 articles are about renting one. |
| 2 | **Khemah / kanopi in a residential street or house compound** | Zero results in all three sources. Commons "khemah" returns camping tents in Norway, Japan and Russia, and an Indian haldi pandal. |
| 3 | **Signing the marriage register / a Malaysian marriage certificate** | `Category:Marriage certificates` holds ~100 files: German, French, Polish, Dutch, American, Cuban, Indian, Hungarian, Persian. **Not one Malaysian.** Every nikah-signing photograph is South Asian, Indonesian or American. |
| 4 | **Sampul duit / a gift or money envelope being handed over at a Malay wedding** | The only true money-envelope handover on Commons is **Ugandan**. Openverse returns zero for "sampul duit", "dulang hantaran", "angpow wedding malaysia". |
| 5 | **A Muslim wedding or Malay community event in Sabah or Sarawak** | The one exact hit — Bajau *syair buka tabir* at Kota Belud — is **640 × 426**, far under any usable floor. `Category:Weddings in Sabah`, `Weddings in Sarawak`, `Islam in Sarawak`, `Malays of Sarawak` are **empty or do not exist**. This is a hole in the commons for East Malaysia, not a search failure. |
| 6 | **Suapan — feeding the couple** | Nothing, either source. `Category:Wedding food of Malaysia` contains exactly two plates of food from one Kedah wedding and nothing else. |
| 7 | **A Malay wedding invitation card** | Commons has no Malay-language wedding invitation at all. The one Flickr candidate is a 771 × 1024 phone snapshot. |

### Partial gaps — something exists but it is thin

| # | Subject | The limit |
|---|---|---|
| 8 | **Service counter or queue inside a pejabat agama** | Plenty of buildings and one signboard. **No interior, no counter, no queue** at any religious office in Malaysia. The UTC Keramat frame I used is a directory board, and its caption says so. |
| 9 | **Henna / inai on a Malay bride's hands** | One genuinely Malay photograph, 1024 px, and the tags raise a real possibility the hands are a child's. Everything else is Indian mehndi, Moroccan, Sudanese, Palestinian or Egyptian. We are living on two frames by one photographer. |
| 10 | **Pelamin confirmed in a hall rather than a house** | Nothing confirmed. The two best-described pelamin images are GFDL-only or 640 px. |
| 11 | **Bunga telur at a wedding** | We hold exactly one true bunga telur photograph. The largest, cleanest Commons set filed under `bunga telur` is a **khatam Al-Quran majlis at a surau**, not a wedding. |
| 12 | **Tok kadi conducting the akad** | The one file whose description says exactly that is **500 × 336**. Our four working frames all come from a single Flickr photostream whose owner's real name is not published anywhere. |
| 13 | **Malay groom, clean detail shot of songkok and samping** | No file combines Malaysian + large + a description confirming what is in frame. |

**My recommendation:** items 1, 2 and 5 are the ones to commission. A single
half-day shoot at one booked kampung wedding — the hall interior before guests
arrive, the khemah going up outside, the buffet line, the register being signed,
guests in the salam queue — would close items 1, 2, 3, 4, 6 and 8 at once, and those
six subjects are load-bearing across eleven articles. Item 5 needs someone in Sabah
or Sarawak and cannot be solved from the peninsula.

---

## 6. What I left thin, and why

Three articles finish at 3 images. Each is a deliberate call under the two rules
that beat the count, not a shortfall.

- **`baju-pengantin-sewa-atau-beli` (3, 8 sections).** The only two unused Malay
  costume photographs we hold are **museum display-case shots of historical costume
  behind glass**, with reflections and exhibit labels in frame. I opened both. They
  are culturally correct and they teach "heritage garment", not "what you rent in
  2026" — on a price article they would be decoration. Left unused, and the reason is
  written into their register rows rather than left for someone to rediscover.
- **`pelamin` (3, 8 sections).** Three pelamin photographs are already on it. We hold
  six in total and a fourth pelamin is the same subject a fourth time. What this
  article needs and the commons does not have is a pelamin **in a hall** and a
  pelamin **being installed** — gap items 10 and 1.
- **`bunga-telur` (3, 8 sections).** It already carries the **only true bunga telur
  photograph we hold**, plus bunga pahar, plus guests arriving. There is no fourth
  correct image in existence to add — gap item 11.

---

## 7. Three defects found and fixed, outside the brief

1. **Three body images carried no caption at all** — the first body image on
   `mas-kahwin-ikut-negeri`, `apa-itu-mas-kahwin` and
   `mas-kahwin-melebihi-kadar-minimum`. Inherited, not introduced here; found by the
   validator in §9, not by reading. Each now carries a caption that restates a
   distinction its own article already makes, so no new fact enters at the caption
   layer where nobody fact-checks.

2. **The drafts-root and `ingest/` copies were being edited separately.** That is
   how thirteen front-matter entries came to name graphics deleted from one copy and
   not the other, on 25 Ogos. The twelve drafts-root copies are now **regenerated
   from their `ingest/` twin** by `sync.py` — path prefix swapped, `status:` line
   preserved. The two cannot drift again by hand.

3. **The path-spelling rule cannot be literal, and should be restated.** The brief
   says one spelling, `images/S-name.jpg`, no `./`. The parser resolves image paths
   **against the article file**, so an `ingest/` copy one level down must say
   `../images/`. Both are correct; which one is correct depends on the directory.
   The rule that holds is *no `./` prefix, and one spelling per directory*, and the
   validator enforces exactly that.

---

## 8. What I did not do, and why

- **`/humanizer` was not run.** No body prose changed in this job — front matter
  only. The new writing is Malay caption and alt-text micro-copy, and the tool's
  ruleset is English-language "signs of AI writing"; running it over Malay fragments
  risks damage with no matching benefit. The humanizer pass these articles already
  carry still stands. Flagging the decision rather than burying it, and it is the
  same call the 25 Ogos job made for the same reason.
- **The ingest script was not run at all**, not even `--dry-run`. Dry run still
  opens a database connection and one wrong flag commits. RISK-01 is open. The
  validator in §9 covers every gate the parser applies to images.
- **I did not touch the five articles another agent created during this run.** See
  §10.
- **I did not retire the text-card generator.** It is still live and anyone running
  `pnpm covers` regenerates all seventeen cards. Recommendation in the retrospective.
- **`rukun-nikah` block 22** — the four wali-hakim keadaan are really a table and are
  currently one sentence. A writer's edit, deliberately not made inside an image
  brief with SEO-02 queued behind me.

---

## 9. How it was checked

Four commands, **checked into the repo at `docs/asset-register/tools/`** with a
README, so the next image job measures instead of hand-counting. They were written
here because the count had been hand-counted wrong twice.

- **`table.sh`** — the before/after count in §1. Counts both front-matter spellings
  (`  file:` and `  - file:`), reads only inside the front matter so a body image
  cannot inflate it, and classes any front-matter image that is not an `S-`
  photograph as a text card.
- **`harvest.py`** — reads every image's `credit` / `creditUrl` / `licenseClass` /
  `licensorName` out of the article files into `meta.json`, keyed by basename. The
  placement script draws reused credit from there and **exits rather than emit an
  entry it has no metadata for**. "Never fabricate a URL" enforced by construction
  instead of by care.
- **`validate.py`** — the gate. All 28 articles, 121 image references, **PASS**:
  1. every `file:` resolves to a real file, relative to the article
  2. `credit`, `creditUrl`, `licenseClass`, `licensorName` all present and non-empty
  3. `alt` and `caption` present and substantive
  4. no `placeAfter` points past the end of the body
  5. no article carries the same photograph twice
  6. zero `kad-tajuk`, zero non-photograph images
  7. no `./` prefix; one spelling per directory

`blocks.py` prints the top-level block index of an article body, so every
`placeAfter` was chosen against the section it sits under rather than guessed. That
is why the Cameron Highlands signboard lands in the Pahang half of the
Pahang/Negeri Sembilan article and the rumah gadang lands under *Apa itu adat
perpatih*.

---

## 10. FILE CONFLICT — observed, contained, and reported

The brief told me to stop and report if article files changed under me. **Files did
appear under me. They did not overlap, and here is the evidence.**

Five new articles were created in the same directories during my run, by another
agent:

| File | Written at |
|---|---|
| `ingest/C2-3-A1-dulang-hantaran.md` | 00:25:15 |
| `ingest/C2-3-A3-sirih-junjung.md` | 00:27:31 |
| `ingest/C2-3-A2-gubahan-hantaran.md` | **00:31:38** |
| `P3-A4-walimatul-urus.md`, `P3-A5-skrip-pengacara-majlis-perkahwinan.md` | 00:10:16 |

`gubahan-hantaran` landed **seven seconds after my own batch write at 00:31:31**.
That is genuinely concurrent, and it is almost certainly CONT-01.

**Why I continued rather than stopped.** The hazard the brief names is two agents
rewriting *the same* files, where ingest is whole-file and the loser's work publishes
anyway. That is not what happened:

- The five files are **new and disjoint**. None is one of my 28.
- **My eight P1/P6 files all still carry my own 00:29:00 mtime**, untouched since.
- I re-read all 28 after the event and the validator passes — my edits are intact.
- The five new files already carry **4, 4, 4, 6 and 6 images and zero text cards**,
  so the other agent is doing its own image work correctly and needs nothing from me.

**I did not touch any of the five.** Editing them would have *created* the collision
the brief warns about. They are excluded from the count in §1 by an explicit filter
in `table.sh`, and they are excluded from the validator, so no number here silently
includes another agent's work.

**For the lead:** SEO-02 is now clear to run against these 28 files. But CONT-01
appears to still be writing, and SEO-02's internal-linking pass will want to touch
the five new articles too — so the ordering question is between SEO-02 and CONT-01,
not between SEO-02 and me.

---

## 11. Files changed

**This repo, and only this repo. No site-repo change, no build, no deploy.**

| Path | What |
|---|---|
| `docs/plans/aug-23-2026-session-01/drafts/ingest/*.md` (20) | front matter only |
| `docs/plans/aug-23-2026-session-01/drafts/{borang-nikah,lafaz-taklik,rukun-nikah,syarat-sah-nikah}.md` | front matter only |
| `docs/plans/aug-23-2026-session-01/drafts/C6-2-A{1,2,3,4}-*.md` | front matter only |
| 12 drafts-root copies of C4/C5/P3/P7 | regenerated from `ingest/` |
| `docs/plans/aug-23-2026-session-01/drafts/images/` | 15 photographs added, 75 files total |
| `docs/asset-register/asset-register.csv` | 778 → 793 rows; 47 `digunakan_dalam` values rebuilt |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` | §13.1, §13.3, **new §13.4**, §14, §15 — the retrospective edit |
| `docs/asset-register/tools/` (new) | `table.sh`, `before.tsv`, `validate.py`, `harvest.py`, `blocks.py`, `README.md` |

**Not deleted, as instructed:** every `kad-tajuk` PNG and every data-card PNG is
still on disk. Nothing references them.

**Register, both directions.** 15 new `HK-P-0062`–`HK-P-0076` rows, each with the
`extmetadata` reading that licensed it. `digunakan_dalam` **rebuilt from the
articles, not hand-written** — 47 rows changed. Three photographs are held but on no
article, and all three are explained: two are the museum costume shots from §6, and
the third is `HK-P-0053`, already flagged `jangan-guna` as a known duplicate.

---

## Retrospective

### 1. What did we learn that is not already written down?

**The style guide was still authorising the thing the owner banned.** §13.1 blessed
`Grafik: HelloKahwin` for "our own original graphic, **chart, table or diagram**".
That single phrase is why text cards keep being commissioned: a writer or a brief
author reading the guide on 25 Ogos would have found rendering a table as a PNG
explicitly sanctioned, with a credit format ready for it. The owner's directive lived
in a chat message and in agent personas. It was not in the document people work from.

Second: **the brief's own measurement was a day stale, and stale measurements
misdirect work more efficiently than no measurement at all.** The brief's priority
order would have sent three points at the pillar that needed them least. Measuring
first cost about ten minutes.

Third: **a subagent that cannot see cannot source images.** All three reported this
honestly, and all three still returned confident content descriptions inferred from
file names. Two of my five rejections were files whose *titles were simply wrong*
about their own contents. Sourcing can be delegated; looking cannot.

### 2. Which document must change, and who owns the edit?

**`docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` — Managing Editor,
me, done in this run.** Four edits:

- **§13.1** — "chart, table or diagram" narrowed to "a diagram, a map, an
  illustration", with the struck words called out so the change is visible rather
  than silent.
- **§13.4, new — "No text cards"** — the owner directive quoted verbatim, the
  definition (an image whose content is words), the reason (a markdown table is
  readable by a screen reader, selectable, translatable, indexable, and free to
  change; a PNG of the same table is none of those), the line that keeps genuine
  graphics legal, and a test a reviewer can actually apply: **if you could paste the
  content as a markdown table and lose nothing, it is a text card.**
- **§13.3** — write alt text from the pixels, not the file name, with the two
  wrong-title files from this run as the worked example.
- **§14 items 7a and 7b, and §15 checklist rows S14a and S14b** — so the review board
  can catch a text card and an unviewed image, which it previously could not.

### 3. What did we do twice that we should never do again?

**Removed the same text cards twice.** The eight `kad-tajuk` cards were stripped once
already; nine P1 and eight P6 cards were then *added* on 25 Ogos, one day after the
owner banned them, and stripped again today. Three separate jobs have now spent time
on the same pixels. The brief was not wrong — it predated the directive — and the
guide it pointed at still said cards were fine. **That is a document defect, and it
is now fixed at the document.**

**Edited two copies of the same article by hand.** The drafts-root and `ingest/`
copies drifted on 25 Ogos and produced thirteen references to files that never
existed. Fixed structurally, not by care: the drafts-root copies are now derived from
`ingest/`.

**Open recommendation the CEO must decide, because it is a code change in another
repo and outside this brief:** the generator that produces text cards is still live.
`pnpm covers --set kad-tajuk,p1-body,p6-body` regenerates all seventeen. Until those
sets are retired, a future run can put them back with one command.

> `scripts/generate-cover-graphics.mts` — remove `kad-tajuk`, `p1-body`, `p6-body`
> from the `SETS` register and from the `both` / `c2-4` / `all` aliases
> `scripts/covers/c2-4-kad-tajuk-specs.mts`, `kad-tajuk-template.mts`,
> `p1-body-specs.mts`, `p6-body-specs.mts` — delete
> (repo `hellokahwin-site`, worktree `pillars-ingest-redirects`)

The cover sets (`p1-cover-specs`, `p6-cover-specs`, `c2-4-cover-specs`) are a
separate question: covers are now licensed photographs of people, so those sets are
also dead, but they are board-approved artefacts and retiring them is the CEO's call.

### 4. What did we nearly ship, and what caught it?

**Three images with no caption at all**, on three live articles. Caught by
`validate.py`, not by review — I had read past them twice. The mechanism worth
keeping is that the validator checks `caption` as a *required* field alongside the
four credit fields, even though the definition of done only names credit,
`licensorName` and `licenseClass`. Checking slightly more than the spec asks is what
found it.

**A Kaamatan festival pavilion nearly went onto a Malay wedding article.** It is
CC0, it is a genuine Malaysian community-hall interior, and it was the *only* one in
existence — exactly the pressure the "worse than no image" rule exists to resist.
What caught it was opening the file: trade stalls and exhibition banners across the
back of the frame. The mechanism is the hard rule that **no image gets alt text
before someone has looked at it**, and that is now §13.3 and checklist row S14b.

**A wrong licence version nearly entered the register.** The JAWI signboard was
reported as CC BY-SA 3.0 and is 4.0. Caught by re-reading every licence at origin
myself instead of trusting the sweep. The register records the reading, not the
report.

### Files touched by this retrospective

- `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md` — §13.1, §13.3,
  §13.4 (new), §14 (7a, 7b), §15 (S14a, S14b)
