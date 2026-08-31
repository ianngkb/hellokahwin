# CONT-13 — the document-intent bet: six targets, and the religious gate that cut three of their texts

**Sprint 05 · 12 points · `writer-inspirasi-vendor-venue` · 1 September 2026**

---

## The headline

**Gate 1 passed with six.** Six document-intent targets clear all three tests as
revised by decisions 169, 170 and 178, on a demand base of 9,050 monthly
Malaysian searches.

**Gate 2 — the religious-text gate — did its job and it was expensive.** Of the
six texts the first target set needed, `editorial-verification-lead` could source
three, could source a fourth only in Malay, and found that **two do not exist at
all**: no Malaysian religious authority publishes a doa titled *doa pembuka
majlis ringkas* or *doa kesyukuran*. Those two targets were dropped and replaced
against the same keyword gate rather than written from an unsourced text.

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
| 4 | *(pending — see §4)* | | | | | | | |
| 5 | *(pending — see §4)* | | | | | | | |
| 6 | *(pending — see §4)* | | | | | | | |

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
| `doa kesyukuran` | **DROPPED — the text does not exist** | — |
| `doa selamat majlis` | see §4 | JAKIM Pindaan 2026 |

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
| JAKIM guideline clauses 6.3, 9.2, 6.2 (vi), 7.2 | rules only | JAKIM, *Garis Panduan dan Himpunan Doa bagi Majlis Rasmi dan Separuh Rasmi*, Pindaan 2026, published 12 Mac 2026 | islam.gov.my/ms/garis-panduan/4994-… | 1 Sep 2026 | n/a |

**No Arabic anywhere in this batch was extracted from a JAKIM PDF.** All of it
comes from Mufti WP HTML pages where the Unicode is clean. The reason is in the
retrospective.

---

## 3. The transliteration question — ESCALATED, and stated on every page

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
standards decision, not a per-article one, and it is escalated to the CEO.** If
he reverses it the fix is one line per doa and the Arabic plus Malay meaning
stand alone.

---

## 4. What is live

*(completed below once the batch closes)*

---

## Retrospective

*(completed below once the batch closes)*

---

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
