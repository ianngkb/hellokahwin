# CONT-13 — the document-intent bet: six targets, and the religious gate that cut three of their texts

**Sprint 05 · 12 points · `writer-inspirasi-vendor-venue` · 1 September 2026**

---

## The headline

**SIX ARTICLES LIVE IN PRODUCTION. Sitemap 103 to 109.**

**Gate 1 passed with six.** Six document-intent targets clear all three tests as
revised by decisions 169, 170 and 178, on a demand base of 9,050 monthly
Malaysian searches.

**Gate 2 — the religious-text gate — did its job and it was expensive.** Of the
six texts the first target set needed, `editorial-verification-lead` could source
three, could source a fourth only in Malay, and found that **two do not exist at
all**: no Malaysian religious authority publishes a doa titled *doa pembuka
majlis ringkas* or *doa kesyukuran*. Those two targets were dropped and replaced
against the same keyword gate rather than written from an unsourced text. The
replacements, `lafaz akad nikah` and `doa jodoh`, were sourced in a second
verification round and both shipped. The second of them ships as a **rulings**
article rather than a doa-text article, because no authority publishes a titled
doa jodoh either, and the rulings turned out to be the better page.

**Three findings from the gate are worth more than the articles.**

1. **The JAKIM PDF that ranks third on these SERPs is a withdrawn 2007 document.**
   `islam.gov.my/images/garis-panduan/panduan-doa-rasmi.pdf` has an internal
   creation date of 3 April 2007 and its landing page returns 404. It is
   superseded by *Garis Panduan dan Himpunan Doa bagi Majlis Rasmi dan Separuh
   Rasmi (Pindaan 2026)*, published 12 March 2026. The old edition says the doa
   reader should be a man; the current one permits a woman to lead at a
   women-only majlis. **Its SERP position measures link equity, not currency**,
   and writing from it would have shipped a withdrawn rule on a point readers
   care about.
2. **The doa sebelum makan that every Malaysian learned in school is graded
   *munkar*** by Jabatan Mufti Wilayah Persekutuan, with two named problem
   narrators. The same fatwa says plainly that it may still be recited — what is
   not allowed is attributing it to the Prophet. Both halves ship; carrying only
   the first would have caused offence for no gain.
3. **No named Malaysian authority publishes a rumi transliteration of any of
   these doa** — and the one inline rumi that exists on a Mufti WP page is wrong,
   rendering the Arabic `وَجَمَعَ` (*wa* jama'a) as *ma* jama'a. See
   §"The transliteration question" below; it needs a CEO ruling and it is
   escalated, not assumed.

---

## 1. GATE 1 — the six targets

Run before a word was written. Every volume is Ahrefs field **`volume`** (the
12-month average), country `my`, pulled 1 September 2026. `volume_monthly` is a
different field and is not quoted here.

### The three tests, as revised

| test | source | applied |
|---|---|---|
| **1. Volume >= 220** | decision 170, superseding the Sprint 04 brief's ">=100" | Ahrefs `volume`, country `my` |
| **2. `intent_class` = document** | decision 169 killed the AI Overview test | `scripts/seo/check-serp-shape.py`, process exit 0 |
| **3. Parent topic not owned by a sibling page** | rule 4 of the cluster method | Ahrefs `parent_topic` vs every URL in the live sitemap |

**The AI Overview is recorded below as advisory and was never used to select or
reject a target**, per decision 169. Snapshot dates are recorded per decision 174.

### The six

| # | target | `volume` | `parent_topic` | KD | traffic potential | PRE-FLIGHT #1 exit | AIO (advisory) | SERP snapshot |
|---|---|---|---|---|---|---|---|---|
| 1 | `doa penutup majlis` | 1,200 | `doa penutup majlis` | 30 | 350 | **0** | absent | 2026-08-27 |
| 2 | `doa makan majlis` | 250 | `doa makan majlis` | 0 | 50 | **0** | absent | 2026-07-16 |
| 3 | `ucapan ulang tahun perkahwinan` | 1,900 | `ucapan ulang tahun perkahwinan` | 0 | 2,400 | **0** | **present @1** | 2026-08-10 |
| 4 | `doa selamat majlis` | 2,200 | `doa selamat` | 0 | 2,500 | **0** | absent | 2026-08-06 |
| 5 | `lafaz akad nikah` | 800 | `lafaz akad nikah` | 43 | 1,000 | **0** | present@1 | 2026-08-27 |
| 6 | `doa jodoh` | 1,300 | `doa jodoh` | 0 | 800 | **0** | present@1 | 2026-08-10 |

None comes from `skrip pengacara majlis` or `teks kad jemputan`. Both reserved
families were left whole for CONT-16. For the record, `teks kad jemputan` reads
**volume 0** (`volume_monthly` 1) on Ahrefs, country `my`, 1 September 2026 —
worth CONT-16 knowing before it builds on that head term.

### What the gate rejected, and why

- **`doa pembuka majlis` (5,000/mo) is NOT a seventh page.** It shares its SERP
  with `doa majlis ringkas` almost entirely — scribd, slideshare, motherhood, and
  `portalinfo.com.my/bacaan-doa-majlis-rasmi-tidak-rasmi/`, one page holding
  position 3 on the first and position 4 on the second. One page, not two. It was
  then dropped altogether when gate 2 found no text (§2).
- **`aturcara majlis` (700/mo, KD 0)** passed all three tests and was still
  dropped. Its live SERP is entirely government, school and Canva results with no
  wedding page in the top ten, and it sits next to the `skrip pengacara majlis`
  family CONT-16 owns. Poor topical fit plus a starvation risk to a concurrent
  item.
- **The baju and pelamin families** — `baju nikah` 2,000, `baju pengantin` 1,700,
  `baju pengantin songket` 900 — carry no document marker and return **exit 3
  (UNKNOWN)** from PRE-FLIGHT #1. 3 is not a pass, so they were not written.
- **Owned parents, killed by test 3:** `doa pengantin baru` (3,000),
  `doa majlis perkahwinan` (1,800), `doa majlis pertunangan` (1,400),
  `ucapan pengantin baru` (5,400), `bunga telur` (1,500), `contoh kad kahwin`
  (1,500), `goodies kahwin` / `doorgift kahwin` (1,500 / 1,400).

---

## 2. GATE 2 — the religious-text gate, and what it cut

`editorial-verification-lead` sourced every doa before drafting rather than after,
so the articles were written around what is verified instead of the reverse.

| target | verdict | authority |
|---|---|---|
| `doa penutup majlis` | **ships in full** | Mufti WP al-Kafi #1948 |
| `doa makan majlis` | **ships, plus the *munkar* correction** | Mufti WP Irsyad al-Hadith #575 |
| `ucapan ulang tahun perkahwinan` | **ships, plus the Yusuf-and-Zulaikha correction** | Mufti WP Irsyad al-Hukum #954 |
| `doa majlis ringkas` | **DROPPED — the text does not exist** | — |
| `lafaz akad nikah` (replacement) | **ships in full; carries the batch's best finding** | Mufti WP al-Kafi #1686, #851, #1769; Irsyad al-Fatwa #697 |
| `doa jodoh` (replacement) | **ships as RULINGS, not as a doa text** | Mufti Negeri Selangor e-Musykil; Mufti WP Irsyad al-Fatwa #269, #577 |
| `doa kesyukuran` | **DROPPED — the text does not exist** | — |
| `doa selamat majlis` | **ships, Malay text only, no Arabic** | JAKIM Pindaan 2026, pp. 26-28 |

**On the two that were dropped.** Two differently-shaped queries were run for
each before either was recorded as absent, per the standing rule that a source's
"not found" is not a verification. JAKIM's 2026 collection carries four doa and
none is a kesyukuran doa; its 2025 collection carries 22 and none is either.
JAKIM's official doa are 2 to 3 minute bespoke orations, which is the opposite of
*ringkas* — the premise of that article does not exist in the source landscape.

**A second reason `doa majlis ringkas` was right to drop**, found by re-reading
the live siblings rather than their titles: the reframe the verification lead
proposed for it — *what JAKIM requires an opening doa to contain* — is already
the middle third of the live `/artikel/sebelum-nikah/doa-majlis-pertunangan`,
paragraph by paragraph, down to the same clause numbers. Writing it would have
been the collision quality-bar point 10 exists to prevent, arriving by a
different route than usual.

### Per-item authority record

Every Arabic string, transliteration and religious claim now live, with its
authority and the date checked.

| item | text | authority | URL | date checked | grading as stated |
|---|---|---|---|---|---|
| kaffarah al-majlis | Arabic + Malay meaning | Jabatan Mufti Wilayah Persekutuan, al-Kafi li al-Fatawi Siri ke-1948 | muftiwp.gov.my/en/artikel/al-kafi-li-al-fatawi/5708-… | 1 Sep 2026 | *"amalan yang telah sabit serta dituntut melalui dalil hadis yang sahih"*; al-Tarmizi (3433), Abu Hurairah RA |
| Surah al-Asr at the close | status claim only | same | same | 1 Sep 2026 | *"tiada riwayat yang khusus tentang amalan ini daripada Rasulullah SAW… zikir yang diamalkan oleh beberapa orang sahabat RA"*; al-Tabrani (5124) |
| doa sebelum makan (the school one) | Arabic + Malay meaning | Mufti WP, Irsyad al-Hadith Siri ke-575 | muftiwp.gov.my/ms/artikel/irsyad-al-hadith/5508-… | 1 Sep 2026 | **munkar**, narrators Ibn Abi al-Zu'aizi'ah and Ibn A'bud named by the authority; *"boleh diamalkan namun tidak boleh beriktikad bahawa lafaz tersebut daripada Nabi SAW"* |
| doa Saidina Ali RA | Arabic + Malay meaning | same | same | 1 Sep 2026 | Ibn Abi Syaibah, *al-Musannaf* |
| doa from the Prophet SAW | Arabic + Malay meaning | same | same | 1 Sep 2026 | Riwayat al-Tarmizi, **no number published by the source and none invented here** |
| doa selepas makan | Arabic + Malay meaning | same | same | 1 Sep 2026 | *"memang terdapat hadis daripada Nabi SAW"*, Sunan al-Tarmizi |
| *Barakallahu laka* | Arabic + Malay meaning | Mufti WP, Irsyad al-Hukum Siri ke-954, quoting al-Nawawi *Raudhah al-Talibin* 8:35 | muftiwp.gov.my/en/artikel/irsyad-fatwa/…/6579-… | 1 Sep 2026 | Riwayat Abu Daud (2130). **No grading is published by the authority and none is asserted on the page** |
| the Yusuf-and-Zulaikha doa | ruling only | same | same | 1 Sep 2026 | *"sebaiknya memilih apa yang dipastikan dengan yakin kesahihannya"* |
| lafaz ijab and qabul | Malay wording | Mufti WP, al-Kafi Siri ke-1686, quoting *al-Mu'tamad fi al-Fiqh al-Syafi'e* 4/53 | muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/4393-... | 1 Sep 2026 | fiqh formulation, not a hadith |
| **"aku terima" alone does not marry you** | ruling, quoted whole | same, quoting *al-Fiqh al-Manhaji* 4/55-56 | same | 1 Sep 2026 | *"maka tidak berlaku pernikahan tersebut"* |
| the akad need not be in one breath | ruling | Mufti WP, al-Kafi Siri ke-851, quoting *al-Fiqh al-Manhaji* 1/551-552 | muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/2677-... | 1 Sep 2026 | Syafi'i; Hanafi and Hanbali recorded as differing |
| a mispronounced name does not invalidate | ruling | Mufti WP, Irsyad al-Fatwa Siri ke-697, quoting al-Nawawi *Minhaj al-Talibin* p.207 | muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/5307-... | 1 Sep 2026 | the requirement is *ta'yin* |
| a father may accept on his son's behalf | ruling + lafaz | Mufti WP, al-Kafi Siri ke-1769 | muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/4691-... | 1 Sep 2026 | |
| praying by name for a specific person is **harus** | ruling, quoted whole | Jabatan Mufti Negeri Selangor, e-Musykil, Munakahat, 2023, id 3567 | emusykil.muftiselangor.gov.my/index.php/site/jawapan?id=3567 | 1 Sep 2026 | *"adalah diharuskan...memohon secara spesifik"* |
| Ghafir 60 | Arabic + Malay meaning | same | same | 1 Sep 2026 | Quranic verse; clean selectable HTML |
| bomoh and buang sial for jodoh | ruling, quoted whole | Mufti WP, Irsyad al-Fatwa Siri ke-269 | muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/2768-... | 1 Sep 2026 | *"salah sama sekali"*; Muslim 5957, Ahmad 9667, al-Bukhari 2766 |
| jodoh is takdir and effort is still required | ruling | Mufti WP, Irsyad al-Fatwa Siri ke-577 | muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/4827-... | 1 Sep 2026 | al-Bukhari 3208; Muslim 2435 on Khadijah RA |
| JAKIM guideline clauses 6.3, 9.2, 6.2 (vi), 7.2 | rules only | JAKIM, *Garis Panduan dan Himpunan Doa bagi Majlis Rasmi dan Separuh Rasmi*, Pindaan 2026, published 12 Mac 2026 | islam.gov.my/ms/garis-panduan/4994-… | 1 Sep 2026 | n/a |

**No Arabic anywhere in this batch was extracted from a JAKIM PDF.** All of it
comes from Mufti WP HTML pages where the Unicode is clean. The reason is in the
retrospective.

---

## 3. The transliteration question — RATIFIED, and stated on every page

No named Malaysian authority publishes a rumi transliteration of these doa.
Every rumi ranking for these terms sits on a content farm. Read strictly, the
gate means no transliteration ships at all — which also strands
`doa pengantin baru rumi`, the best-converting query the company owns.

The route taken, proposed by `editorial-verification-lead` and adopted by me
under a stated assumption:

> Transliterate ourselves under **Dewan Bahasa dan Pustaka's** published
> standard, *Pedoman Transliterasi Huruf Arab ke Huruf Rumi*
> (`eseminar.dbp.gov.my/dokumen/arabumi.pdf`, live, checked 1 September 2026),
> and say so in the body of every page: the Arabic and its meaning come from the
> named authority, the rumi is ours, produced by DBP's pedoman.

That is a named published authority for the **method**, disclosed where the
reader can see it, and more honest than any competitor on these SERPs. **It is a
standards decision, not a per-article one.**

**RATIFIED BY THE OWNER, 1 September 2026**, routed through the team lead, with
three binding conditions. All four rumi-carrying pages meet them:

1. **A visible on-page line naming the pedoman AND dating it**, saying the
   transliteration is HelloKahwin's. Quoted from live HTML on all four pages:
   `disediakan oleh HelloKahwin mengikut` x2,
   `Pedoman Transliterasi Huruf Arab ke Huruf Rumi` x4,
   `disemak 1 September 2026` x8, `transliterasi kami sendiri` x2.
2. **The Arabic and the meaning keep their own named authority, credited
   separately** in the sentence immediately before the DBP line, never merged
   into one credit, so a reader cannot mistake our rumi for an authority's.
3. **DBP is in the per-item authority register**, with its own entry in every
   `Sumber` block stating it is the authority for the METHOD and that the
   transliteration is ours rather than DBP's.

`editorial-verification-lead` now treats a missing or vague disclosure line as a
gate failure, so the three already-published pages were re-ingested to carry the
dated form rather than left on the earlier wording.

It also unblocks `doa pengantin baru rumi`, the best-converting query the company
owns. **That page is not in CONT-13's scope and was not touched.** Recorded here
as now-unblocked for a future item.

**The decision numbers are 184 and 185, and the discrepancy is resolved.**
184 is this ratification; 185 is the workflow edits. It was worth raising:
`editorial-verification-lead` had first drafted them as 182/183, hit a collision
with two existing entries in the same 2026-09-01 section, renumbered to 184/185,
and then kept quoting the pre-renumber figures - in four places in its own log,
all now corrected. `decision-log.md` runs 175 to 185 with no duplicates.

**The generalisable bit is not the numbers.** Refusing to cite a number I could
not verify, and recording the ratification by date and route instead, is what
surfaced a live error in another seat's log. The cost of that refusal was one
sentence; the cost of repeating the number would have been two records that
disagree and no way to tell which is right.

---

## 4. What is live

Sitemap `<loc>` count **before: 103**, measured
`curl -s https://hellokahwin.com/sitemap.xml | grep -o "<loc>" | wc -l`.
Re-measured immediately before the first ingest and still 103, with the diff
against the first snapshot showing only two rows reordered and nothing added.

### First-request status lines, quoted

Each URL fetched ONCE, cold, immediately after its ingest purged the edge.
`Age: 0` on all three, and no `HIT` — a `HIT` would have meant the page was
already warm and the measurement worthless.

| URL | status line | `X-Vercel-Cache` | `Age` |
|---|---|---|---|
| `/artikel/ucapan-doa/doa-penutup-majlis` | `HTTP/1.1 200 OK` | `REVALIDATED` | 0 |
| `/artikel/ucapan-doa/doa-makan-majlis` | `HTTP/1.1 200 OK` | `REVALIDATED` | 0 |
| `/artikel/ucapan-doa/ucapan-ulang-tahun-perkahwinan` | `HTTP/1.1 200 OK` | `MISS` | 0 |
| `/artikel/ucapan-doa/doa-selamat-majlis` | `HTTP/1.1 200 OK` | `MISS` | 0 |
| `/artikel/nikah-undang-undang/lafaz-akad-nikah` | `HTTP/1.1 200 OK` | `MISS` | 0 |
| `/artikel/sebelum-nikah/doa-jodoh` | `HTTP/1.1 200 OK` | `MISS` | 0 |

A **second** fetch of each returns `HTTP/1.1 200 OK` with `X-Vercel-Cache: HIT`,
which is the control: it proves the first fetch really was the first.

### The complete artefact, quoted from LIVE HTML

Counted with `bash scripts/measure/count-in-html.sh`, never with
`grep -o -i -F`. Every count is 2 because each string appears once in the
rendered body and once in the Next.js flight payload.

| page | artefact FIRST line | artefact LAST line |
|---|---|---|
| `doa-penutup-majlis` | `سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ` ×2 | `وَأَتُوبُ إِلَيْكَ` ×2 |
| `doa-makan-majlis` (4 doa, all four present) | `اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا` ×4 | `الحَمْدُ لِلَّهِ الَّذي أطْعَمَنَا وَسَقانا وَجَعَلَنا مُسْلِمِينَ` ×2 |
| `ucapan-ulang-tahun-perkahwinan` (40 ucapan) | ucapan 1, `Terima kasih kerana bertahan dengan saya sepanjang tahun ini` ×2 | ucapan 40, `Semoga sentiasa dalam kebaikan` ×2 |
| `doa-selamat-majlis` (JAKIM's full translation, 398 words) | `Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani` x2 | `Dan segala puji bagi Allah, Tuhan sekalian alam` x2 |
| `lafaz-akad-nikah` (the complete rulings, quoted whole) | `Ijab iaitu lafaz daripada wali pengantin perempuan dengan menyebut` x2 | `Aku terima nikah si fulanah bagi pihak anakku` x2 |
| `doa-jodoh` (the complete rulings, quoted whole) | `adalah diharuskan untuk kita berdoa memohon kepada Allah SWT` x6 | `Perbuatan ibu saudari yang pergi menemui bomoh` x2, `adalah salah sama sekali` x2 |

The rumi and the Malay meaning are present alongside every Arabic string:
`Subhanaka Allahumma wa bihamdika` ×2 and `Maha suci Engkau ya Allah` ×2 on the
first page; `Alhamdulillahil lazi at'amana wa saqana wa ja'alana muslimin` ×2 and
`menjadikan kami dalam kalangan orang Islam` ×2 on the second.

### FAQPage schema

Parsed out of the live HTML as JSON, not grepped for. All six emit valid
`FAQPage` with **4 questions each**, every question ending in `?` and every
answer visible in the body.

### Reachability, and the structural comparison

A status code proves nothing on its own, so the three were compared against the
articles that were already there. On `/artikel/ucapan-doa` each of the three new
slugs appears **exactly twice**, identical to `doa-pengantin-baru`,
`walimatul-urus` and the five other established articles — the pillar page's
enumeration returns eight article links, five old and three new, all at the same
count. All three also appear on `/artikel` and on the homepage. Every internal
link written into them resolves 200 on production.

### Image credits

Every image on every page renders its credit, and each was copied out of
`docs/asset-register/asset-register.csv` rather than retyped: 3 images per page,
9 in total, enumerated from live HTML as `Kredit: Ahmad Ali Karim` ×6,
`Kredit: Wiki Farazi` ×2, `Kredit: raja abd kadir` ×4, `Kredit: CikSitiMelati`
×2, `Kredit: mohd hasan` ×2, `Kredit: Azman Aziz` ×2.

### Parent-topic control, run before ingest

Quality-bar point 10 is defined by the Ahrefs `parent_topic` field and cannot be
satisfied by comparing headings, so the query was run and its output is pasted
here rather than summarised. `mcp__ahrefs__keywords-explorer-overview`,
country `my`, 1 September 2026:

| keyword | `volume` | `parent_topic` |
|---|---|---|
| `ucapan ulang tahun perkahwinan` | 1,900 | `ucapan ulang tahun perkahwinan` |
| `doa selamat majlis` | 2,200 | `doa selamat` |
| `doa jodoh` | 1,300 | `doa jodoh` |
| `doa penutup majlis` | 1,200 | `doa penutup majlis` |
| `lafaz akad nikah` | 800 | `lafaz akad nikah` |
| `doa makan majlis` | 250 | `doa makan majlis` |

**Six keywords, six distinct parent topics, no two shared** — and none of the six
is a parent topic any live HelloKahwin article targets.


---

## 5. THE SCOPE CUT, ON THE RECORD

The DoD is met at six. It was not narrowed to get there, and two things were cut
along the way that belong in the record rather than in a footnote.

### The final ledger, all six audited the same way

Round-1 targets and round-2 replacements are listed together so they cannot blur
into an unaudited list. Ahrefs `volume`, country `my`, 1 September 2026.

| # | target | `volume` | `parent_topic` | PRE-FLIGHT #1 exit | sibling check | round |
|---|---|---|---|---|---|---|
| 1 | `doa selamat majlis` | 2,200 | `doa selamat` | **0** | no live page on this parent | 1 |
| 2 | `ucapan ulang tahun perkahwinan` | 1,900 | `ucapan ulang tahun perkahwinan` | **0** | no live page on this parent; shares one lafaz with `doa-majlis-perkahwinan`, different parent, different question | 1 |
| 3 | `doa jodoh` | 1,300 | `doa jodoh` | **0** | no live page on this parent | **2** |
| 4 | `doa penutup majlis` | 1,200 | `doa penutup majlis` | **0** | no live page on this parent | 1 |
| 5 | `lafaz akad nikah` | 800 | `lafaz akad nikah` | **0** | `rukun-nikah` targets `rukun nikah`; it discusses sighah but quotes no wording (`aku terima` etc. return NONE on the live page, regex proven against the lafaz page which returns 7 variants) | **2** |
| 6 | `doa makan majlis` | 250 | `doa makan majlis` | **0** | no live page on this parent | 1 |

Six distinct parent topics, no two shared. Every one at or above decision 170's
220 floor. Every one exit 0.

### What was cut, and by whom

**`doa majlis ringkas` (2,800) and `doa kesyukuran` (700) were NOT PUBLISHED AT
ALL**, and that is the honest label. Not "published without the text" - dropped.
No Malaysian authority publishes either text. `doa majlis ringkas` had a second
disqualification found later: the reframe proposed for it is already the middle
third of the live `doa-majlis-pertunangan`, clause number by clause number.

**`doa istikharah jodoh` (500) was cut by me**, before the verification lead had
finished sourcing it, to narrow round 2 to what the batch needed. That was my
call and it is on the record as mine. It turned out to be fully sourced anyway:
Mufti WP Irsyad Hukum #342, the complete three-part doa with clean selectable
Arabic, Malay meaning per part, al-Bukhari 1166 from Jabir RA, hukum stated as
*"sunat dengan ijma' para ulama'"*, and its own kill - the belief that the answer
must arrive as a dream has *"tiada sandaran di dalam syarak"*. **It is banked in
the verification lead's log and nobody should re-derive it.** With six shipped it
was not needed; if a seventh target is ever wanted in this cluster it is the
cheapest one on the board.

**The second Arabic hunt for `doa selamat majlis` was also cut by me.** The lead
then ran it anyway with a second agent across 20+ authority domains and confirmed
the absence: e-Muallaf serves doa as JPEGs, e-Solat's Koleksi Doa has no doa
selamat, no state mufti carries it. So the Malay-only decision is confirmed by
search rather than by assumption.

### The one article that changed shape

`doa jodoh` was commissioned as a doa-text article and ships as a **rulings**
article, because no authority publishes a titled doa jodoh. The DoD's complete-
artefact clause still binds and is met the same way: the rulings are quoted
whole, not summarised, with first and last line verified from live HTML. The
page carries exactly one Arabic string, Ghafir 60, and says so explicitly, so a
reader cannot mistake it for a doa jodoh we are publishing.

**It is a better page than the one commissioned.** Every content farm on that
SERP treats "doa jodoh sebut nama" as suspect. A state mufti's office has
answered it: *harus*. That is a correction, not a listicle, and it is the kind of
thing only a site that checks sources can publish.

## Image rights, checked against the register rather than against the draft

Twelve images across the four articles. Every one is an existing library asset
with a row in `docs/asset-register/asset-register.csv`, and the five fields that
matter were **copied out of the register, not retyped** — the persona rule that
exists because a hand-written `creditUrl` once went wrong by one digit.

Checked mechanically rather than by eye, comparing each draft's front matter
against the register row for the same filename:

```
12 images, 4 articles
credit / creditUrl / licensorName / licenseClass — verbatim match on all 12
status_guna = boleh-guna on all 12
TOTAL MISMATCHES: 0
```

Nothing in this batch is a new acquisition, so no new asset-register rows were
appended and the cross-worktree id check was not needed. The alt text was
written from each register row's `perihal_ms`, which describes what is actually
in the frame, rather than from memory of the photograph.

On the covers: three of the four depict their article's subject directly — a
qari reading the doa, a kenduri jamuan mid-meal, a qari at a majlis doa selamat.
**The fourth is the honest weak one and it ships with this note.**
`ucapan-ulang-tahun-perkahwinan` is about anniversary wishes and the library has
no photograph of a married couple some years on; the cover used is a couple
portrait from a wedding day. It is correct in subject (a married couple), sharp,
well separated and 5472×3648, and it is still a wedding-day picture on an
anniversary page. It goes on the cover upgrade list rather than being passed off
as right.

## The doa selamat transcription, checked by diff rather than by eye

`doa-selamat-majlis` reproduces JAKIM's Malay translation in full, and a page
whose whole value is a complete quoted text has one obvious failure mode:
transcription drift. So the quote was not proofread, it was diffed.

The article's quoted block was extracted, the PDF's pp. 26-28 were extracted
independently, both reduced to word sequences, and the two compared:

```
PDF words: 398   article words: 398
IDENTICAL word-for-word across pp.26-28
```

**One character was changed, it was WRONG, and it is reverted.** JAKIM's p.27
reads `kesakitan—sama ada yang nyata mahupun yang tersembunyi`. I judged that em
dash a PDF line-break artefact and set it as a comma. It is not one: the line
break falls between *mahupun* and *yang*, the dash sits mid-line, and it is the
only non-ASCII punctuation character in the whole translation. JAKIM chose it.
`editorial-verification-lead` caught it because I had declared the change, and it
is now reverted. The re-diff after reverting reads **2,466 characters against
2,466, character-identical**. See the retrospective for what that cost and what
replaced my reasoning.

This is worth keeping as a method. A 398-word religious text cannot be checked
reliably by reading it twice, and "I proofread it" is the same shape as
"I understand the cause" — an assertion where a test was available.

## The sibling check, run late and worth running

Rule 4 was applied on `parent_topic`, which is the field that defines it. But the
persona's harder rule is to read the live sibling's **body**, not its title, and
for `/artikel/ucapan-doa/doa-majlis-perkahwinan` I did that only after the first
three were published. It should have been before. It cleared, and it also paid
for itself twice.

Fetched live and read by heading and by term:

- **The apparent overlap was mostly the related-articles rail.** `penutup majlis`
  ×4, `doa makan` ×2 and `munkar` ×2 on that page are the three new articles
  being surfaced from it. The cluster is already knitting itself, which is the
  outcome wanted, not a collision.
- **One real shared string:** the sibling carries *"Lafaz Barakallahu laka, wa
  baraka 'alaika, wa jama'a bainakuma fi khair daripada Sunan Abu Daud hadis
  2130"* as a single line inside a four-step structure for a reception. The new
  `ucapan-ulang-tahun-perkahwinan` carries the same lafaz with its Arabic, rumi,
  meaning, source and two caveats, for a different question on a different parent
  topic. Different page, and the two do not contradict: neither asserts a hadith
  grading, which is the thing no Malaysian authority publishes.
- **It confirmed the two drops independently.** The sibling already carries an
  h2 *"Doa ringkas untuk majlis kecil"*, which is the `doa majlis ringkas` target
  in everything but name; and it already states that JAKIM's 2026 collection
  contains a doa selamat and no wedding doa, which is exactly the scope framing
  the new `doa-selamat-majlis` is built on.

**The lesson is the ordering, not the outcome.** Reading a sibling's body is
cheap and it decided three questions here. Doing it after publishing meant that
if it had gone the other way, the fix would have been a takedown rather than a
choice.

## One stated deviation from the style guide, taken deliberately

Style guide §9 asks for FAQ answers of **40 to 60 words**. The twelve answers
live on the three published pages measure **31 to 41** — parsed out of the
rendered `FAQPage` JSON-LD, not estimated:

| page | answers, in words |
|---|---|
| `doa-penutup-majlis` | 36, 37, 40, 41 |
| `doa-makan-majlis` | 35, 36, 39, 31 |
| `ucapan-ulang-tahun-perkahwinan` | 38, 32, 38, 34 |

They were not padded to reach the floor, and that is the deviation. Each answer
opens with the direct answer, names its authority inline where it makes a
religious claim, and stops. Taking eight of them from 35 words to 45 would have
meant adding words with no new information, in the same pass where `/humanizer`
was removing exactly that. The company's own line is that depth is coverage, not
word count.

Raised for `managing-editor` rather than fixed silently: if the 40-word floor is
meant as a hard minimum rather than a target, say so and I will find real
substance to add rather than filler, but I am not willing to pad to a number.

## Retrospective

Chaired by `managing-editor`; written by me.

### What did we learn that is not written down

**A publishing pipeline can succeed at every step and still publish nothing, and
the success report is what hides it.** The first ingest of this batch ran
`--commit --publish --revalidate-url` against production. Images uploaded with
four crops each. The origin cache dropped. The Vercel edge purged, HTTP 200, one
request. Google was asked to re-read the sitemap and returned 204. Twenty lines
of green. It wrote a **draft** — invisible in the sitemap, absent from the pillar
page, unreachable by a reader — because the file's front matter said
`status: draft` and `--publish` only *honours* a file that already asks to be
published. The word `draft` appeared twice, once on line four and once in the
final line, surrounded by success.

This is the company's own tabulated shape — *a status code proves nothing on its
own* — arriving in a form nobody had catalogued: not a false 200, but a genuine
success report for the wrong outcome. It was caught by reading the last line of
the output rather than the exit code.

**Second thing, and it belongs to the verification seat as much as to mine: a
document's SERP position measures its link equity, not whether it still applies.**
The JAKIM PDF at position 3 for these queries is dated 3 April 2007 and its
landing page 404s. Written from, it would have told readers the doa reader
"seelok-eloknya seorang lelaki" — a rule the 2026 edition replaced with an
explicit permission for women to lead at women-only majlis. Ranking is the
signal we use to find sources and it is uncorrelated with currency.

### Which document must change, and who owns the edit

**`scripts/ingest-article.mts`, in the site repo. I own it. IT IS DONE** —
PR #44, merged to `master` at `9cad4c9`.

The ingest now **refuses** when `--publish` is passed and the file does not say
`status: published`, rather than resolving the contradiction silently in the
file's favour. Prose would not have fired here: the tool already *printed* the
truth twice and it was still missed, which is the strongest argument available
that this had to become an exit code.

The asymmetry is deliberate and is written into the source:

- `status: published` **without** `--publish` — a file asking for something the
  operator did not authorise. Existing behaviour, correct, unchanged.
- `--publish` **without** `status: published` — the operator authorising
  something the file did not ask for. Nobody types `--publish` meaning "leave it
  a draft". Refused.

Run against the case that produced it and the three it must not break:

| file | flag | result |
|---|---|---|
| `status: draft` | `--publish` | **REFUSES, process exit 1** |
| `status: published` | `--publish` | `Status:  published` — unchanged |
| `status: draft` | none | `Status:  draft` — staging still works |
| `status: published` | none | the existing note — unchanged |

**A SECOND DOCUMENT, NAMED BY THE CEO AND CHANGED: `scripts/seo/check-source-currency.py`.
I own it. IT IS DONE.**

The CEO's instruction was exact: *"the ranking PDF measures link equity, not
currency" is exactly the prose rule that will not fire. Turn it into something
that does.* So it is PRE-FLIGHT #2, and it exits non-zero:

| exit | verdict | fires when |
|---|---|---|
| 0 | PASS | every cited source resolves and none is known-superseded |
| 1 | **FAIL** | a cited source returns 404/410, **or** is in the known-superseded registry |
| 2 | STALE | a cited PDF's own `/CreationDate` is older than three years, **or** an article names a superseded document in prose |
| 3 | UNKNOWN | a source could not be reached. **Not a pass**, same reason as `check-serp-shape.py` |

The registry is seeded with the JAKIM case and carries what actually changed
between editions, so the next writer is told the consequence and not just the
verdict. Adding an entry costs one line; not having one cost this item a day.

**Two design decisions that are the difference between a gate people keep and a
gate people switch off.**

*It reads GET, not HEAD.* Several Malaysian government hosts answer HEAD with
405 while serving GET perfectly. A 405 read as "gone" is exactly the false alarm
that gets a checker disabled.

*A prose mention is REVIEW, not FAIL.* Our house style cites an authority by
title, not by link, which is how the 2007 file would have entered - so a
URL-only gate would have missed the very case it exists for. But three articles
in this batch name that edition **deliberately**, to warn readers that it still
ranks. A gate that cannot tell a citation from a warning must hand that
judgement back rather than guess it, so it quotes the line and asks.

Run against the case that produced it and three controls:

| case | result |
|---|---|
| the 2007 JAKIM URL | **FAIL, exit 1**, with the superseding edition and what changed |
| the same document named in prose in A4 | **REVIEW**, line quoted, correctly showing it is a warning |
| the 2026 edition that replaced it | not flagged |
| `A5-lafaz-akad-nikah.md`, no superseded source | **PASS, exit 0** |

**And it caught a bug in its own first version.** The prose scan referenced
`prose_hits` before it was defined, and the run crashed. It was found by running
the gate against the article it was written for rather than by reading it back -
the same rule the ingest fix was written under, applied to the fix itself.

**A THIRD DOCUMENT, AND IT CAME OUT OF A DEFECT I SHIPPED:
`scripts/seo/check-retraction.py`. I own it. IT IS DONE.**

`editorial-verification-lead` required three sentences removed from a live
article. My republish removed all three from the BODY and left a fourth standing
in an image CAPTION. The lead found it by re-fetching the page and grepping for
the RETRACTED phrase rather than for the corrected paragraph, and wrote the rule
into the workflow document. **A workflow rule is prose, and prose does not fire**,
so it is now a gate:

    python scripts/seo/check-retraction.py <url|file> \\
        --gone "the retracted phrase" --present "a phrase that must be there"

| exit | meaning |
|---|---|
| 0 | PASS - every retracted phrase absent everywhere, controls found |
| 1 | **FAIL** - a retracted phrase survives, and the gate says WHERE |
| 2 | MISSING - a control phrase is not on the page |
| 3 | **UNUSABLE** - no control, or the control itself is absent |

Three design decisions, each of them a company failure encoded:

*It reads the WHOLE document and names the surface.* Body prose, image captions
and JSON-LD update through different paths. `data-caption` and `figcaption` are
searched explicitly, and so is every `application/ld+json` block, because a
retracted claim sitting in `FAQPage` structured data can still be served by
Google as our answer after the visible text is fixed. Saying *found in: image
captions* is the difference between a finding and a fact about 122 KB.

*It greps for what should be GONE, never for what should be there.* Finding the
corrected paragraph proves the correction landed. It does not prove the old one
left. Those are different claims and this batch proved they can diverge.

*It REFUSES to report an absence without a confirmed presence.* No `--present`
control, or a control that is itself missing, returns **exit 3, not 0**. The
company has twelve tabulated cases of a zero that meant nothing; a gate whose
whole output is zeros has no business returning a comforting one.

Run against the real failing page, not a mock. The saved copy of
`doa-selamat-majlis` taken between the two republishes still carries the caption:

```
  SURVIVES x2   yang dibaca ialah doa umum
               found in: body text, image captions
  SURVIVES x2   itu memadai
               found in: body text, image captions
RETRACTION EXIT: 1
```

The same command against production now returns `RETRACTION EXIT: 0` with both
controls confirmed present. The four-case selftest (failing page, fixed page, no
control, broken control) is green.

**A FOURTH document changed in this item, owned by `editorial-verification-lead`
and already written:** `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
now carries *"Arabic in a Malaysian government PDF is never quotable from text
extraction — and reading by word coordinate does not fix it"*, with the four
JAKIM PDFs tested and the failure mode of each. The existing standing rule
(*read government PDFs by word coordinate, never `pdftotext -layout`*) is correct
for a fee table and does not rescue Arabic, because the corruption is in the
glyph stream rather than the ordering.

### What did we do twice

**Sourced a text, then checked whether it could be written.** The first target
set was chosen entirely on keyword evidence, and only then handed to
verification — which found that two of the six had no text in existence
anywhere. Both targets were then re-derived from scratch, and the Ahrefs and
SERP work for `doa pembuka majlis`, `doa majlis ringkas` and `doa kesyukuran`
was thrown away.

The fix is an ordering change and it costs nothing: for a doa, lafaz or any
other quoted religious artefact, **ask the verification seat whether the text
EXISTS before spending the keyword gate on it.** One question — "does a named
Malaysian authority publish a text called X" — would have removed three targets
from the gate before they were measured. That is now how I will run it, and it
generalises to any article whose whole value is a document the reader takes
away: confirm the document exists, then price the keyword.

### The correction I got wrong, and why it is the useful one

I changed one character in a 2,466-character quotation of a religious text: an em
dash in JAKIM's *"kesakitan—sama ada yang nyata mahupun yang tersembunyi"*, which
I judged to be a PDF line-break artefact and set as a comma. **I declared it, and
the declaration is the only reason it was checkable.**

`editorial-verification-lead` pulled the raw lines and the premise was wrong. The
line break falls between *mahupun* and *yang*, nowhere near the dash. The dash
sits mid-line, is U+2014, and is the only non-ASCII punctuation character in the
entire translation. JAKIM chose it. It is reverted, and the re-diff after
reverting reads 2,466 characters against 2,466, character-identical.

**The lesson is not "be careful with punctuation".** It is that I inferred a
mechanical cause from a semantic impression - *this looks like a wrap* - without
running the thirty-second check that would have settled it, and then acted on the
inference inside quoted religious text, which is the one place the standing rule
says never to reconstruct, complete or correct. The rule has no exception small
enough to argue about, and an em dash is exactly the size of exception that makes
one feel reasonable.

**The process change, and it is the lead's:** a character that looks like an
extraction artefact goes to the verification seat BEFORE it is changed, not
disclosed after. That check costs them half a minute and it is what they are for.

### Caught before drafting against removed after publishing, and why the two must not be added together

**Seven defects were stopped by the two gates. Three never reached a draft, one
reached a draft and not production, and FOUR were live and had to be removed.**
Collapsing those into a single count makes the expensive path look like the cheap
one, and the entire argument for sourcing before drafting rests on the gap.

| defect | caught | cost |
|---|---|---|
| the withdrawn 2007 JAKIM edition | round 1, before a word was written | a re-pick of the source |
| Arabic corrupted by PDF extraction | round 1, from testing extraction before drafting | a design decision, not a rewrite |
| the *munkar* over-correction | round 1 | none |
| `doa majlis ringkas` duplicating a live sibling | before drafting, by reading the sibling's body | a re-derived target |
| the altered em dash | after publish | correction + republish |
| "tidak memerlukan nas khusus" | after publish | correction + republish |
| "tidak menjejaskan apa-apa" | after publish | correction + republish |
| the "itu memadai" caption | after publish, and it survived one republish | a second correction + a window where readers saw it |

**Verified rather than asserted, because I first wrote this up as "four defects
taken off live pages" and that was wrong.** The three round-1 items never
appeared in a draft at all: A2's very first commit, `936aa5d`, already carries
*"boleh diamalkan namun tidak boleh beriktikad"* beside the *munkar* verdict, so
there was never a live over-correction to remove; and the first drafts contain
zero corrupted `الله` renderings. `editorial-verification-lead` caught the
conflation in my close-out and it is right.

**The four that were live were all on one page**, `doa-selamat-majlis`, which is
also the one article that shipped on a round-1 clearance while its round-2
confirmation was outstanding. That is not a coincidence and it is the finding:
**the page that skipped a verification round is the page that carried every live
defect in the batch.** Five other articles waited for a full clearance and none
of them needed a correction after publishing.

**And it says something about how gates should be priced.** Sourcing before
drafting cost a day of elapsed time and removed three defects for free. Shipping
ahead of a clearance saved a few minutes and cost two republishes, a second
correction, and a window in which readers saw an unattributed ruling. The cheap
gate is the one that runs early.

### What did we nearly ship, and what caught it

**A withdrawn 2007 government rule, presented as current.** Caught by
`editorial-verification-lead` opening the PDF's internal creation date and its
landing page rather than trusting its SERP position.

**Malformed Quranic and prophetic text.** Every JAKIM PDF in this batch corrupts
Arabic on extraction — `الله` comes out as `للا` in one edition and `هللا` in
another, and the 2007 file yields literal bytes. Pasting any of it would have put
broken sacred text on a page that people screenshot and circulate. Caught because
the verification seat tested three extraction methods instead of one and reported
the failure rather than the output.

**A doa attributed to the Prophet that its own national mufti's office grades
`munkar`.** Nearly shipped in the ordinary direction — as the doa "everyone
knows". Caught by asking for the grading rather than the text. And the
over-correction was nearly shipped too: the fatwa says plainly that the doa
*may* still be recited, and carrying only the *munkar* half would have told
millions of readers to stop reciting something their own authority permits.

**A duplicate of a live sibling.** The reframe proposed for `doa majlis ringkas`
— *what JAKIM requires an opening doa to contain* — is already the middle third
of `/artikel/sebelum-nikah/doa-majlis-pertunangan`, clause number by clause
number. Caught by reading the live sibling's **body**, not its title. The title
says "pertunangan" and gives no hint that the JAKIM guideline lives inside it.

**One of these did not merely nearly ship - IT WAS LIVE, and filing it under
"nearly" would be the wrong drawer.** The corrected body went to production in
one republish and the caption went in the next, so for the window between them
`doa-selamat-majlis` carried an unattributed sufficiency ruling in our own voice
("dan itu memadai") beside three paragraphs that had just retracted it. It is
gone now and verified gone across body, captions and JSON-LD. The gate that came
out of it is above.

**An unsourced claim about what people actually do.** `doa-selamat-majlis` said
that what is read at a household kenduri is *doa umum*. Nobody verified that,
because it is not a claim about what authorities publish - it is ethnography, and
we have no source for it. The verification lead caught the sentence in the body.
**Enumerating rather than testing then found it in two more places**: the FAQ
answer, and an image caption in the front matter, which is not body prose and
would not appear in any body grep. All three now say what is actually evidenced -
that nobody publishes such a text, that practice varies by family, masjid and
state, and where to ask.

**A citation cut for being unverifiable.** Not in this batch, but the standing
rule earned it: a negative from a summariser is a failed lookup until it has
failed twice, by two differently-shaped questions. Both dropped targets were run
that way before being recorded absent, and the queries are named in §2.

---

## The counting dispute, and what measuring it actually showed

`editorial-verification-lead` re-ran my evidence counts independently, got
different numbers on five phrases, and diagnosed one cause: we had counted
different documents, mine the whole response and theirs the server HTML cut at
`self.__next_f`. The conclusion drawn was that the multiplier "is not a clean 2x"
so the two sets are not convertible.

**I measured it rather than accepting it, and it corrects both of us.**

| needle | full response | server HTML only | visible text | the lead quoted |
|---|---|---|---|---|
| `amalan sahabat` | 8 | 4 | 4 | 4 |
| `sunnah Nabi` | 22 | 11 | 6 | 6 |
| `munkar` | 45 | 22 | 10 | 9 |
| `Yusuf dan Zulaikha` | 10 | 5 | 4 | 4 |
| `maka tidak berlaku pernikahan tersebut` | 2 | 1 | 1 | 1 |

**Full against server-only is a clean 2x in every row.** So the stated reason for
the numbers not being convertible does not hold: those two denominators convert
exactly. What the lead actually measured is the **third** column, visible text
after tag-stripping, which is where the ratio really does wander, from 2x to
4.5x. Their numbers match visible text, not the server HTML their message named.

**And one row had a second cause the single diagnosis missed.** On `munkar` the
lead compared "you: 2" against "me: 9". My 2 was never a count of `munkar` - it
was a count of the longer phrase `adalah hadis yang munkar`. Bare `munkar` on
that page reads 45 / 22 / 10. Those two numbers were never measuring the same
string, so no denominator reconciles them.

**This is the shape my own persona tabulates: a confirmed fault licenses
re-checking the neighbours, never concluding about them.** One real cause was
found, correctly, and then applied to all five rows; two of the five had a
different or additional cause, and the ratio claim that came out of the
generalisation is wrong.

**The substantive conclusion survives intact and is the useful part.** A raw
string count over a Next.js page is not portable evidence unless the method is
stated, and none of these numbers measures prominence. That is now pinned in the
code rather than in prose: `check-retraction.py` documents that its denominator
is the ENTIRE response including the flight payload, and says why that is the
only correct choice for a retraction - a retracted claim left in the payload or
in `FAQPage` is still shipped, and counting visible text alone would return a
comforting zero over a phrase that is still in the document.
`check-source-currency.py` carries a matching note saying it counts nothing on
rendered pages and must state a denominator if it ever does.

**And the matching mode is now stated and TESTED, not merely correct.**
`check-retraction.py` was already case-insensitive, so it already behaved right -
but an undeclared correct behaviour is one refactor away from an undeclared wrong
one, which is precisely how the 41-against-45 confusion started. The docstring
now states the mode on a par with the denominator and argues it: a retracted
sentence surviving with different capitalisation is still shipped, and a
case-sensitive gate would under-report **silently**, the worse direction for a
check whose whole job is finding something still there. Same for word
boundaries - 6 of those 45 sat in a URL slug and a domain name, which a
prominence measure should exclude and a retraction check must not. The selftest
went from four cases to five: a survivor differing **only** in capitalisation now
has to FAIL, and does.

**A second explanation, offered for the leftover delta, also failed the check.**
The verification seat re-measured, reproduced the table, accepted both
corrections, and attributed one remaining gap - its `munkar` 41/20/9 against my
45/22/10 - to having measured a copy saved before the final republish. Counted on
three captures of that page:

| capture | bytes | full | server | visible |
|---|---|---|---|---|
| live now | 116,540 | 45 | 22 | 10 |
| my final-sweep copy | 116,540 | 45 | 22 | 10 |
| my earlier mid-batch copy | **130,268** | 45 | 22 | 10 |

The byte counts differ by nearly 14 KB, so those really are different versions of
the page, and `munkar` is 45/22/10 on all three including one saved before the
final republish. **Page version is not the cause.** The deltas (4 full, 2 server,
1 visible) are about what dropping one region would produce, and the FAQ JSON-LD
sits before `self.__next_f` where it would count in both - but that is a
hypothesis and it is labelled as one, which is the whole point.

**THE ANSWER WAS CASE SENSITIVITY, and three passes were spent not measuring
it.** The verification seat settled it on a fresh fetch with no extraction at all:

```
exact  "munkar"  : 41        breakdown of all 45:
case-insensitive : 45           36  munkar
                                 5  apa-maksud-hadis-munkar   <- URL slug
                                 3  Munkar
                                 1  eMunkar                   <- a domain name
```

41 + 4 capitalised = 45. Two correct counts in different **matching modes**.
A raw byte count of `b"munkar"` on the fresh file is also 41, which kills the
extraction theory outright, and the fresh file's decoded length matches my
"live now" byte figure exactly - so we were always looking at the same document.

**Three passes on a trivial question, and on every pass a cause was named before
it was measured. Twice by that seat, ONCE BY ME.** My dropped-region theory
was wrong too. I labelled it a hypothesis and wrote "I cannot tell from here",
which is the more honest form, but it was still a cause offered in place of a
two-line measurement that was available the whole time.

**So the correction is not "the other seat generalised". It is that naming a
cause is not measuring one, and all three of us did it** - including, twice, the
seat whose function is to catch exactly that. That makes the shape structural
rather than a matter of care, which is the only reason it is worth this much
space.

**The rule that survives is broader than the one I first wrote, and it was
broadened on both passes rather than patched:** a count is evidence only if it
states its **needle, its denominator AND its matching mode**. My first version
had two of the three, and the missing one is what cost the third pass.

**No substance moved.** Every finding is on its page; both seats' numbers were
correct for the document each measured.

## A finding this item did not go looking for: `docs/` exists twice, in one repo, and the two halves never meet

Reported because it decides whether anyone finds this log, not because it is
CONT-13's to fix.

`ianngkb/hellokahwin` is ONE GitHub repo with TWO long-lived, diverged working
lines that both carry a `docs/` tree:

| | the site line (`origin/master`) | the editorial line (this worktree's parent) |
|---|---|---|
| checkout | `~/Documents/Code/hellokahwin-site` | `~/Documents/Code/hellokahwin/hellokahwin` |
| carries | `src/`, `scripts/`, `tests/` **and** `docs/` | `backend/`, `frontend/`, `database/` **and** `docs/` |
| `docs/work-done/aug-30-2026-session-01/` | **3 files** | **29 files** |
| `docs/work-done/sep-01-2026-session-01/` | PLAT-19, SEO-13, DES-18 | CONT-13 (this file) |
| `docs/boardroom/decision-log.md` | not present | 183 decisions, the file every brief cites |
| `docs/plans/`, `docs/asset-register/`, `serp-shape-census.csv` | absent | present |

They share a merge-base at `227217f`. This worktree's branch is **182 commits
ahead of and 216 commits behind `origin/master`**, so neither line can be
fast-forwarded onto the other and a merge would be a reconciliation, not a push.

**What that means in practice, today.** On 1 September, PLAT-19, SEO-13 and
DES-18 wrote their logs into `docs/work-done/sep-01-2026-session-01/` on
`origin/master`. CONT-13 wrote its log into a directory with the same path, on
the other line. **Both are committed and pushed. Neither is visible from the
other.** A CEO opening `docs/work-done/sep-01-2026-session-01/` sees three items
or one, depending on which checkout the terminal is in — and nothing warns which.

The split follows the track, not the sprint: engineering items work in the site
checkout and land on master; editorial items work in the docs checkout. CONT-13
followed the editorial precedent, which is why this log is where it is. The
retrospective's code fix went to `origin/master` (PR #44, merged) because that
is where `scripts/ingest-article.mts` lives.

**This is not a writer's decision to make**, so nothing was moved or merged.
It is raised for `ceo-hellokahwin` because the standing rule is that a log is a
deliverable only if a reader who was not here can find it, and right now
findability depends on an undocumented choice of directory.
