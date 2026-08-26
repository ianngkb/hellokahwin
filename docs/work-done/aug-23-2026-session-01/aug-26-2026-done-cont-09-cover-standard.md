# Done — CONT-09: covers must depict their subject

**Owner:** `managing-editor` · **Date:** 26 August 2026 · **Sprint 02**
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-09-cover-standard.md`

The standard was the deliverable. The re-selection is the proof it works.

---

## The audit, before anything changed

The brief required the count before the change, because the CEO reported two
image findings this week that measurement disproved. So: all 61 live articles
were audited by downloading every cover, rendering it at the card crop, and
looking at it. Not by reading filenames.

**The audit agrees with the CEO's framing on `dulang-hantaran` and goes further.**
It is a tight crop of two guests at a pertunangan with no tray anywhere in the
frame, on an article titled *"Dulang hantaran: jenis, saiz dan kos beli atau
sewa"*. The UX review called it systemic. It was.

Produced by `.tmp-cont09-table.mjs`, which joins a recorded verdict per slug
against the before and after cover state read from production:

```
========================================================================
LIVE ARTICLES AUDITED                    61
FAILED THE STANDARD (pre-change)         25
  of which re-selected 26 Aug            19
  of which CANNOT be fixed from the pool 6   <- the case for outreach
PASSED, Rule 3 but thin (upgrade wanted) 7
PASSED cleanly                           29
========================================================================
covers shared by more than one article    7 -> 1
covers with a full credit chain           33 -> 35
```

Full per-article table: `cont-09-undo/audit-table.txt`. Verdicts and their
reasons: `cont-09-undo/verdicts.json`.

### The sharpest single finding, and it is worse than irrelevance

**`mas-kahwin-perak` was fronted by a photograph taken in Melor, KELANTAN.**
Our own asset register said so, in the caption we wrote for it: *"Muzik
tradisional pada majlis kampung. Gambar di Melor, Kelantan."* Nothing in the
pipeline compares a photograph's stated location against the article's. That is
now Rule 4.

### The finding that changes what outreach is for

**The correct photograph was already ours.** Of the 19 covers re-selected, all
19 came from images already in the register under `licenseClass: S` — a sirih
junjung, a row of dulang hantaran on a mosque carpet, a bunga telur close-up, an
invitation card held in a hand, three council halls, five state religious
authorities. Every one had been ingested as a supporting image and never
promoted to cover, while the article it belonged on fronted a stranger's
wedding.

The pool is thin, but on the evidence of this audit **it was not the binding
constraint on relevance. The absence of a selection rule was.** Outreach remains
right, and the six escalations below are the honest measure of what it is for.

---

## The standard

Written where the next person reads it, not in a brief.

| File | What landed |
|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` | Stage 6b: seven rules, the people/subject reconciliation, and a six-point check |
| `.../skillcentral/agents/projects/hellokahwin/Editorial/writer-adat-agama-prosedur.md` | Writers specify the cover by SUBJECT — one noun phrase — with `cover: ESCALATE` as the only alternative |
| `.../skillcentral/agents/projects/hellokahwin/Editorial/writer-inspirasi-vendor-venue.md` | Same block |

The skillcentral originals were edited, not the deployed copies. The CEO runs
`install.sh` to re-wire.

The rules, in one line each:

1. Name the subject in one noun phrase, before you open the pool.
2. The subject is IN the frame, identifiable by a reader who has not read the article.
3. When the subject cannot be photographed, photograph the named place or moment where it is used, issued or spoken. "A Malay couple" is never the answer.
4. Malaysian Malay-Muslim context, and the photograph's own caption must not contradict the article's state or setting.
5. The subject survives all four crops — card, mobile, og, desktop hero — checked by opening all four URLs.
6. Nothing licensable depicts it → `cover: ESCALATE`, never a substitute.
7. Look in our own register first.

### One rule I reconciled rather than obeyed, and it needs the owner's eye

Stage 6b carried *"the cover is a licensed photograph of people"* (owner
directive, 25 Aug), whose stated contrast is *human, not text*. Read literally it
forbids a photograph of a dulang hantaran, a sirih junjung, a bunga telur or a
length of songket — and that reading is precisely what produced covers of
anonymous guests on articles about trays. CONT-09's approved definition of done
says the cover depicts the subject, and it is the later and more specific
instruction, so I resolved it in that direction and wrote the resolution down:
**the subject rules the frame**, with people handling the thing wherever such a
photograph exists, and a building or a counter only as a Rule-3 last resort.

**Six of the nineteen new covers are places rather than people** — three state
religious authorities, a syariah court, a council hall, a service counter, a
goldsmith's shopfront — every one on an article whose subject is an institution,
a rate or a form. If the owner wants the people rule read strictly instead, say
so and those six go back on the escalation list; the undo restores them exactly.

---

## What shipped

19 covers re-selected, all live, all serving, all credited.

```
LIVE — fetching 61 pages sequentially from https://hellokahwin.com
  non-200 responses:   0
  text cards served:   0
PASS — no published article references a text card.

serving the new cover: 19/19
still serving the old:  0
non-200:               0
pages with no credit:  0
```

| Article | Was | Now | Live credit line, read from the page |
|---|---|---|---|
| [apa-itu-mas-kahwin](https://hellokahwin.com/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin) | bride with a bouquet | the ijab qabul, where the mas kahwin is pronounced | `Kredit: MyLifeStory (CC BY 2.0)` |
| [dulang-hantaran](https://hellokahwin.com/artikel/hantaran-mas-kahwin/dulang-hantaran) | two guests' torsos | a row of dulang hantaran on a mosque carpet | `Kredit: MyLifeStory (CC BY 2.0)` |
| [sirih-junjung](https://hellokahwin.com/artikel/hantaran-mas-kahwin/sirih-junjung) | two women at a pertunangan | a sirih junjung | `Kredit: Mohd Nasir Mat Noor (CC BY 2.0)` |
| [mas-kahwin-perak](https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-perak) | a photograph taken in Kelantan | MAIPk, the Perak authority | `Kredit: Chongkian (CC BY-SA 4.0)` |
| [mas-kahwin-pahang-negeri-sembilan](https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan) | unmarked couple on a pelamin | Pejabat Agama Islam Daerah Cameron Highlands, Pahang | `Kredit: Gula Kapas (CC BY 3.0)` |
| [mas-kahwin-sabah-sarawak](https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak) | unmarked Pexels couple | Mahkamah Syariah Keningau, Sabah | `Kredit: CEphoto, Uwe Aranas (CC BY-SA 3.0)` |
| [mas-kahwin-melebihi-kadar-minimum](https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-melebihi-kadar-minimum) | couple on a pelamin | a kedai emas — the article answers *"boleh dalam bentuk emas"* | `Kredit: Chongkian (CC BY-SA 4.0)` |
| [songket-tenunan-tangan-atau-cetak](https://hellokahwin.com/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak) | couple on a floral pelamin | songket limar Terengganu, close up | `Kredit: Daderot (domain awam)` |
| [bunga-telur](https://hellokahwin.com/artikel/pelamin-kad-cenderahati/bunga-telur) | guests arriving | bunga telur | `Kredit: Fuzuri Design (CC BY 2.0)` |
| [contoh-kad-jemputan-kahwin](https://hellokahwin.com/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin) | family under yellow umbrellas | an invitation card held in a hand | `Kredit: Sham Hardy (CC BY-SA 2.0)` |
| [cincin-tunang](https://hellokahwin.com/artikel/sebelum-nikah/cincin-tunang) | henna-painted nails | two ring boxes on a hantaran tray | `Kredit: Mohd Nasir Mat Noor (CC BY 2.0)` |
| [doa-majlis-pertunangan](https://hellokahwin.com/artikel/sebelum-nikah/doa-majlis-pertunangan) | a lone man at a door (duplicated) | a majlis pertunangan — the image freed from `dulang-hantaran` | `Kredit: Mohd Nasir Mat Noor (CC BY 2.0)` |
| [doa-majlis-perkahwinan](https://hellokahwin.com/artikel/ucapan-doa/doa-majlis-perkahwinan) | a mosque congregation | a qari reading a doa into a microphone | `Kredit: Ahmad Ali Karim (CC0)` |
| [skrip-pengacara-majlis-perkahwinan](https://hellokahwin.com/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan) | family group on a pelamin | a man speaking into a microphone at a majlis | `Kredit: MyLifeStory (CC BY 2.0)` |
| [harga-sewa-dewan-kahwin](https://hellokahwin.com/artikel/venue-perancangan/harga-sewa-dewan-kahwin) | a kenduri food spread | Dewan Serbaguna Majlis Daerah Labis | `Kredit: Chongkian (CC BY-SA 4.0)` |
| [pakej-dewan-kahwin](https://hellokahwin.com/artikel/venue-perancangan/pakej-dewan-kahwin) | family group on a pelamin | a laid-out buffet — what a package delivers | `Kredit: CikSitiMelati (CC BY-SA 4.0)` |
| [borang-nikah](https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah) | a post-akad hand-kiss | a public-service counter — *"hantar ke mana"* | `Kredit: *angys* (CC BY-SA 4.0)` |
| [hantaran-tunang](https://hellokahwin.com/artikel/hiasan-dekorasi/hantaran-tunang) | a couple in white, **uncredited** | a fruit hantaran tray | `Kredit: mohd hasan / Pexels` |
| [pelamin-kahwin-dewan](https://hellokahwin.com/artikel/idea-dan-nasihat/pelamin-kahwin-dewan) | a lawn and the KL skyline, **uncredited** | an empty white pelamin in a dewan | `Kredit: shahnazshahizan (CC BY-SA 3.0)` |

Two of those (`hantaran-tunang`, `pelamin-kahwin-dewan`) were legacy WordPress
covers with no credit at all, so the swap also closed two of the 28 uncredited
covers.

### The crop half, which Rule 5 forced

**Seven of the nineteen were guillotined by the desktop hero before they
shipped.** The automatic focal point is `method: saliency` and on portrait
frames it lands high — `y` between 0.13 and 0.28 on six of the seven — so the
2464×700 letterbox kept a mosque ceiling, a shop's upper storey, or the top of a
songkok, and dropped the subject entirely. Fixed by regenerating the crops at a
hand-set focal point, verified by rendering all four windows locally before
writing anything:

```
apa-itu-mas-kahwin                 (0.833,0.156,saliency) -> (0.833,0.620,manual)
mas-kahwin-pahang-negeri-sembilan  (0.809,0.248,saliency) -> (0.809,0.620,manual)
mas-kahwin-melebihi-kadar-minimum  (0.167,0.219,saliency) -> (0.167,0.640,manual)
cincin-tunang                      (0.917,0.150,saliency) -> (0.917,0.450,manual)
doa-majlis-perkahwinan             (0.717,0.852,saliency) -> (0.717,0.300,manual)
skrip-pengacara-majlis-perkahwinan (0.747,0.156,saliency) -> (0.747,0.300,manual)
borang-nikah                       (0.907,0.133,saliency) -> (0.907,0.620,manual)
```

This is very likely not confined to the 19. It was not measured across the other
42 and should be — see the retrospective.

---

## The six that CANNOT be fixed from the current pool

This number is the ask, and it is more useful than a partial fix reported as
done. Each was searched against all 73 unique `licenseClass: S` images in the
register; none contains the subject or a defensible Rule-3 moment.

| Article | Subject | Why nothing in the pool serves it |
|---|---|---|
| [`mas-kahwin-ikut-negeri`](https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri) | minimum rates across all 14 states | Five single-state authority buildings exist; putting one on the all-states hub asserts something false. **This is the site's highest-impression page.** |
| [`checklist-kahwin`](https://hellokahwin.com/artikel/venue-perancangan/checklist-kahwin) | a 12-month preparation checklist | A checklist has no photographable moment. The current kompang photograph is one late item on the list, and is duplicated from `mas-kahwin-johor` — **the last remaining duplicate cover on the site.** |
| [`taaruf-maksud`](https://hellokahwin.com/artikel/sebelum-nikah/taaruf-maksud) | taaruf, and how it differs from bercinta | The current cover is a couple holding hands under a tree, which **contradicts the article's own text** (*"Selepas taaruf datang merisik…"*). A tepak sirih depicts merisik, the stage after. Highest-priority escalation. |
| [`hadiah-untuk-pengantin`](https://hellokahwin.com/artikel/idea-dan-nasihat/hadiah-untuk-pengantin) | wedding gifts, 17 options by budget | No wedding-gift photograph in the pool, and the current cover is a Western white-gown couple — a Rule 4 failure as well as a Rule 2 one. |
| [`kursus-kahwin`](https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin) | the pre-marriage course: registering, fees, venues | Nothing depicts a kursus kahwin in session. The one religious-office photograph went to `mas-kahwin-pahang-negeri-sembilan`, where it names the state. |
| [`majlis-kahwin`](https://hellokahwin.com/artikel/idea-dan-nasihat/majlis-kahwin) | 10 popular Shah Alam venues | No Shah Alam venue photograph exists in the pool; the current cover is a tropical resort at dusk. |

**What to ask a photographer for, in priority order:** a mas kahwin display at an
akad (unblocks the hub and improves four state pages); a kursus kahwin in
session; a merisik with the tepak sirih; wedding gifts and goodie bags; a named
Shah Alam venue set for a majlis.

Seven more articles pass on Rule 3 but thinly and would take an upgrade from the
same shoot — listed under `WEAK` in `audit-table.txt`.

---

## What was deliberately NOT touched

- **Premium.** A pool problem, and the brief says it is not this item's.
- **The lazy-loading grey-box card.** That is UX-04.
- **The 26 uncredited legacy covers**, and the 617 uncredited images site-wide.
  All are WordPress imports whose provenance nobody holds; the fix is a
  provenance decision, not a selection one. Two were closed as a side effect
  above. **This is bigger than the covers and has no owner** — see the
  retrospective.
- **`mas-kahwin-johor` and `mas-kahwin-kelantan-terengganu`.** Both carry real
  Malay wedding photographs taken in the state the article names, which satisfies
  Rule 3. Their state authorities (MAIJ, MAIK) sit unused in the pool. Swapping
  them would make the mas kahwin cluster consistently institutional; leaving them
  keeps people in the frame. **Recommendation to the CEO rather than a decision
  taken**, because it is the same people-versus-subject question as above.

---

## How to undo this

`docs/work-done/aug-23-2026-session-01/cont-09-undo/README.md`. Committed in
`de83834`, before the first production write. All six `cover_image_*` columns for
19 articles, `focal_point` and `smart_crops` for 19 media rows, and the 28
pre-change R2 crop objects in `hellokahwin-assets` under
`undo/cont-09-cover-standard/2026-08-26/crops`.

Caches: origin `HTTP 200`, Vercel edge purged over 31 paths, both before
verification.

---

## Retrospective

### 1. What did we learn that is not already written down?

**The correct image was in the building the whole time.** Every one of the 19
replacements came from our own register. The team's model of this problem was
"the pool is CC amateur snapshots, so covers will be weak" — and that model is
true about *premium* and was quietly being used to explain *relevance*, which it
did not cause. A pool constraint and a process gap look identical from the
outside, and the pool constraint is the more comfortable of the two to believe.
**Before accepting a resource explanation for a quality problem, query the
resource.** One `select distinct filename from media where filename like 'S-%'`
would have shown a sirih junjung sitting unused while the sirih junjung article
fronted two strangers.

**A photograph carries a factual claim, and nothing checked it.** `mas-kahwin-perak`
served a Kelantan photograph. Our own caption said Kelantan. The Editorial
Verification Lead verifies claims in the body; nobody verifies the claim the
picture makes. That is a real gap in the review board's coverage.

**The desktop hero silently deletes subjects.** Not a taste issue — 7 of 19
covers lost their subject entirely at 2464×700, because saliency puts the focal
point near the top of a portrait frame. It was invisible because nobody opened
the derivative URLs; the card looked fine, so the cover looked fine.

### 2. Which document must change, and who owns the edit?

| Document | Edit | Owner |
|---|---|---|
| `docs/plans/.../aug-23-2026-workflow-content-production.md` | Stage 6b — the seven rules and the people/subject reconciliation | `managing-editor` — **DONE**, commit `de83834` |
| `.../Editorial/writer-adat-agama-prosedur.md` | Cover briefs are written as a subject noun phrase | `managing-editor` — **DONE**, buddy `1a94ea7` |
| `.../Editorial/writer-inspirasi-vendor-venue.md` | Same | `managing-editor` — **DONE**, buddy `1a94ea7` |
| `.../Editorial/managing-editor.md` | Stage 6b section: add the subject rule and the audit-the-pool-first habit | `managing-editor` — **DONE below** |
| `.../Editorial/editorial-verification-lead.md` | **The verification seat also verifies the COVER'S factual claim** — a photograph asserting a state, a venue or a ceremony is a claim, and `mas-kahwin-perak` proves an unchecked one ships | `managing-editor` proposes, `editorial-verification-lead` owns — **DONE below** |
| `scripts/audit-live-images.mts` (site repo) | Extend the gate from text-cards to crop survival: fail when a cover's focal point puts the subject outside the hero window. Not attempted here — it needs a subject box, which we do not store | `head-of-seo-content` to schedule; needs an engineer |
| A new sprint item | The 617 uncredited legacy images and 26 uncredited covers. Out of CONT-09's scope, larger than it, unowned | CEO to scope |

### 3. What did we do twice that we should never do again?

**Seven covers were shared by two articles each** — the same photograph fronting
`bunga-telur` and `ucapan-pengantin-baru`, `mas-kahwin-johor` and
`checklist-kahwin`, and five more pairs. That is not reuse, which the workflow
explicitly permits; it is the same wrong answer given twice, because a cover
chosen for topic rather than subject fits any article on the topic equally
badly. **Duplication across articles is now a symptom to check for, not a
tolerance:** 7 pairs before, 1 after, and that one (`checklist-kahwin`) is on the
escalation list.

**And in this run itself:** the first two attempts at the production write failed
on plumbing, not on judgement — bare `node` cannot resolve the repo's `@/` path
alias, so anything importing `src/lib/**` must run under `tsx`. This is the
second run to lose time to it. It is now in the workflow's Stage 6b as a working
note.

### 4. What did we nearly ship, and what caught it?

**Two things, and both were caught by looking rather than by reasoning.**

*A Chinese shophouse on a mas kahwin article.* `S-kedai-emas-johor-bahru` was
chosen because the article says mas kahwin may be paid in gold, and at the card
crop the "KEDAI EMAS" sign is legible. At the hero crop the sign is above the
band and what remains is "1951" and Chinese characters — a culturally wrong
image on a Malay-Muslim article, which is the one failure the workflow says
outranks everything. **Rule 5 caught it** — the rule I had written an hour
earlier and then had to apply to my own choice. Fixed by moving the focal point
to 0.64, not by shrugging.

*A tepak sirih on `taaruf-maksud`.* It was on my replacement list until I read
the article body, which places taaruf *before* merisik — and the tepak sirih is
merisik's object. It would have been a confident, plausible, wrong cover on an
article about a distinction. **Reading the body caught it.** The article is now
an escalation instead, which is the honest answer.

The mechanism worth keeping from both: **render all four crop windows locally,
and read the article body, before committing a cover.** Both are now in Stage 6b.
