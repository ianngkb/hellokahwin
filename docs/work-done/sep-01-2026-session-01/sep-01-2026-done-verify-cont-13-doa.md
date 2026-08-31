# CONT-13 — religious-text verification (board decision 162, second gate)

**Seat:** `editorial-verification-lead` · **Date all sources checked: 1 September 2026**
**Item closed at six of six. All six are live and all six are cleared.** Every
URL below was fetched live on 1 Sep 2026, and all six returned 200 on the final
check. Nothing here is from memory or from an earlier pass.

**Three outcomes, kept distinct — they are not interchangeable:**

| State | Which | Meaning |
|---|---|---|
| **Shipped** | the six in section 1 | Written, verified, live. |
| **Dropped, never written** | `doa majlis ringkas`, `doa kesyukuran` | No authority publishes the text, so the article was never drafted. Under decision 162 the outcome is *not published* — **not** "published without the text". Replaced against the same keyword gate by `lafaz akad nikah` and `doa jodoh`. |
| **Banked, unwritten** | `doa istikharah jodoh` | Fully sourced (section 5), cut from scope before drafting. Ready to write; nobody should re-derive it. |

⚠ **An earlier revision of this header said "closed at four of six, two parked".
That was written before the batch finished and was wrong. Nothing is parked.**
Corrected on the writer's flag — he declined to edit the document himself
because it is this seat's, which is the right instinct and is why the error was
caught rather than silently patched.

---

## 1. Final shipped list — SIX live, all cleared

**Item closed at six of six.** Two of the original six (`doa majlis ringkas`,
`doa kesyukuran`) were **not published at all** — dropped on the round-1 finding
that no authority publishes their text, and replaced against the same keyword
gate by `lafaz akad nikah` and `doa jodoh`. That is the correct application of
decision 162: the outcome was *not published*, not *published without the text*.

| Slug | Rumi? | DBP line (decision 184) | Verdict |
|---|---|---|---|
| `/artikel/ucapan-doa/doa-penutup-majlis` | yes | ✅ | ✅ clear |
| `/artikel/ucapan-doa/doa-makan-majlis` | yes, 4 doa | ✅ | ✅ clear |
| `/artikel/ucapan-doa/ucapan-ulang-tahun-perkahwinan` | yes | ✅ | ✅ clear |
| `/artikel/ucapan-doa/doa-selamat-majlis` | no (Malay only) | n/a | ✅ clear after correction — see section 2 |
| `/artikel/nikah-undang-undang/lafaz-akad-nikah` | no (source publishes in Malay) | n/a | ✅ clear |
| `/artikel/sebelum-nikah/doa-jodoh` | yes, Ghafir 60 only | ✅ | ✅ clear |

### What was checked on the live pages, not on the drafts

**Religious text integrity.** The `doa-selamat-majlis` quote was re-diffed
against `Pindaan2026.pdf` after the final edit: **2,862 characters on both
sides, character-identical, zero differences.** (The writer reported 2,466 from
his own helper — a different span, not a discrepancy in the text; the
authoritative check is the full-translation diff and it passes.)

**Arabic scope on `doa-jodoh`.** Every Arabic run on the page was enumerated.
There is exactly **one**, Surah Ghafir 60. No doa jodoh text was fabricated or
imported, which was the central risk on that keyword.

**Ruling language, all six pages.** Every hukum-shaped sentence (`wajib`,
`sunat`, `harus`, `sah`, `batal`, `memadai`, `dibenarkan`) was read in context.
All are attributed in the same sentence or the adjacent one — e.g. *"Dibenarkan.
Al-Kafi Siri ke-1769 menyatakan…"*, *"Sebuah jabatan mufti negeri sudah
menjawabnya, dan jawapannya harus."* **No unattributed ruling remains on any of
the six.**

**`lafaz-akad-nikah` does not imply state-by-state wording exists.** It carries
a section titled *"Tiada lafaz rasmi yang ditetapkan mengikut negeri"* and names
both documents checked — JAKIM's 2013 masjid guideline, which lists lafaz as a
rukun without printing it, and JAIS Selangor's Dec 2024 *Tatacara*, identified
on the page as a scanned file. **The absence is published as a finding**, which
is the standing rule that *"the authority does not publish this"* is a finding
and often our advantage.

**The decision 184 disclosure line passes on all four rumi-carrying pages.**
Verbatim from `doa-penutup-majlis`:

> *"Transliterasi rumi pula disediakan oleh HelloKahwin mengikut Pedoman
> Transliterasi Huruf Arab ke Huruf Rumi terbitan Dewan Bahasa dan Pustaka,
> kerana tiada pihak berkuasa agama di Malaysia menerbitkan transliterasi rasmi
> bagi doa ini."*

It names us as producer, names DBP's pedoman as the method, states why, and sits
separately from the Arabic's own authority line. **Use it as the template for
every future doa page.**

**The corrections and kills survived into production.** Counted on the live
pages, in the server-rendered HTML only:

| Finding | Live evidence |
|---|---|
| Surah al-Asr is amalan sahabat, not a nas | `amalan sahabat` ×4, `sunnah Nabi` ×6 on `doa-penutup-majlis` |
| The school doa sebelum makan is graded *munkar* | `munkar` ×9 on `doa-makan-majlis`, with the *"boleh diamalkan"* half alongside it |
| The Yusuf-and-Zulaikha doa is ruled against | `Yusuf dan Zulaikha` ×4 on `ucapan-ulang-tahun-perkahwinan` |
| Al-Kafi #1686 — *"aku terima"* alone does not marry you | in the article title, its own H2, and the opening paragraph of `lafaz-akad-nikah` |

⚠ **Counting method matters and these numbers are not portable.** A raw string
count over the whole HTML of a Next.js page double-counts, because the RSC
flight payload repeats the body. The writer reported ×10 and ×2 where this seat
counts ×4 and ×1 — **neither is wrong; they count different things.** Any count
quoted as evidence must state whether it covers the server HTML only or the full
document, and none of these should be read as a measure of prominence.

**Placement condition on `lafaz akad nikah`: TRUE on the live page, measured.**
`rukun-nikah` links out to the new page and does **not** restate the ijab/qabul
wording. The writer proved the regex rather than trusting an empty result — the
same pattern returns 7 variants on the lafaz page and none on `rukun-nikah`.
This was the condition I set and it was verified live rather than agreed.

---

## 2. `doa-selamat-majlis` — four defects raised, all four now fixed

Recorded in sequence because the sequence is the lesson. The article shipped
before the round-2 sign-off reached the writer; four defects were found by
auditing the live page; all four are now corrected in production.

| # | Defect | Status |
|---|---|---|
| 1 | JAKIM's em dash altered to a comma | ✅ restored, `kesakitan—sama` live |
| 2 | *"Doa umum tidak memerlukan nas khusus."* (fiqh ruling) | ✅ removed |
| 3 | *"Majlis yang tidak dibacakan doa pun tidak menjejaskan apa-apa…"* | ✅ removed |
| 4 | *"…dan itu memadai."* (sufficiency ruling, image caption) | ✅ removed |

**The unsourced practice claim was in three places, not one.** My catch was the
body sentence. The writer found it also in the FAQ answer and in an image
caption in the front matter — **by enumerating rather than testing**, which a
body-text grep would have missed. He also softened a fourth sentence I had not
flagged (*"Di kebanyakan keluarga Melayu, majlis doa selamat diadakan di rumah
beberapa hari sebelum akad"*) on the grounds that it is the same category of
claim. That is the discipline working without supervision.

His replacement line is better than what I asked for and should be reused:

> *"Kami tidak memberitahu anda apa yang dibaca di kenduri orang lain, kerana
> itu soal amalan dan bukan soal teks yang diterbitkan."*

### On the em dash, for the record

Raw lines from `Pindaan2026.pdf`, pdf index 26:

```
line 6: 'bencana, wabak, penyakit, dan kesakitan—sama ada yang nyata mahupun '
line 7: 'yang tersembunyi. '
```

The break falls between *mahupun* and *yang*, nowhere near the dash. **U+2014 EM
DASH**, the only non-ASCII punctuation character in the entire translation —
deliberate typography, not a wrap. The writer's own account of the error is
worth preserving: *"I inferred a wrap artefact from the position in the sentence
without checking the line geometry, which is a hunch dressed as a finding."*

### ⚠ The systemic finding, which outlives the defect

**Body text and image captions updated through different paths.** An
intermediate republish removed three ruling sentences from the body and left the
fourth standing in a caption; it was found only because the live page was
re-fetched a second time and grepped for the *retracted* phrase rather than the
corrected one. A retracted claim can also survive in `FAQPage` structured data
and still be surfaced by Google as our answer.

**Rule, now in the workflow:** after any correction to a live article, re-verify
the captions and the structured data separately from the body.

### What to keep — this page's best work

The withdrawn-2007-PDF warning: the JAKIM file ranking top of Google is dated 3
April 2007, its download page is gone, it sets five minutes and *"seelok-eloknya
seorang lelaki"*, while the 2026 edition sets 2–3 minutes and permits a woman
reader at women-only majlis — closing with *"Kedudukan fail lama itu dalam
carian mengukur pautan masuk, bukan sama ada ia masih terpakai."* Nobody else in
this market has written that.

---

## 3. Per-item authority register — the four `ucapan-doa` pages

| Item | Authority | URL | Grading as stated |
|---|---|---|---|
| Kaffarah al-majlis (Arabic + Malay) | Jabatan Mufti Wilayah Persekutuan, **Al-Kafi #1948**, 2 Aug 2023 | `muftiwp.gov.my/en/artikel/al-kafi-li-al-fatawi/5708-al-kafi-1948-adakah-membaca-surah-al-asr-di-akhir-majlis-sebahagian-daripada-nas` | *"hadis yang sahih"*; al-Tarmizi (3433), also al-Baihaqi (259) |
| Surah al-Asr at majlis end | same | same | **Not a nas** — *"tiada riwayat yang khusus… daripada Rasulullah SAW"*; amalan sahabat, al-Tabrani (5124) |
| Doa sebelum makan (school version) | Mufti WP, **Irsyad al-Hadith #575** | `muftiwp.gov.my/ms/artikel/irsyad-al-hadith/5508-irsyad-al-hadith-siri-ke-575-adakah-doa-sebelum-dan-selepas-makan-bersumberkan-hadis-yang-sahih` | **munkar**, with *"boleh diamalkan namun tidak boleh beriktikad bahawa lafaz tersebut daripada Nabi SAW"* |
| Doa selepas makan | same | same | Hadith from the Prophet SAW, Riwayat al-Tarmizi — **no hadith number given by the source; do not invent one** |
| Barakallahu laka (newlyweds) | Mufti WP, **Irsyad al-Hukum #954** | `muftiwp.gov.my/en/artikel/irsyad-fatwa/irsyad-fatwa-umum-cat/6579-irsyad-al-hukum-siri-ke-954-persoalan-berkaitan-doa-yang-dibaca-ketika-majlis-perkahwinan` | Riwayat Abu Daud (2130); Nawawi, *Raudhah al-Talibin* 8:35. **No grading stated by any Malaysian authority — none may be asserted.** |
| Yusuf-and-Zulaikha wedding doa | same | same | Ruled against: choose *"apa yang dipastikan dengan yakin kesahihannya"* |
| Doa Selamat (Malay text) | JAKIM / JPM, **Pindaan 2026**, published 12 Mac 2026 | `islam.gov.my/ms/garis-panduan/4994-panduan-dan-himpunan-doa-2026` → the `Pindaan2026.pdf` it links, "Doa Selamat" pp.25–28 (translation pp.26–28) | n/a — official text, not hadith |
| Rumi transliteration, all pages | **Dewan Bahasa dan Pustaka**, *Pedoman Transliterasi Huruf Arab ke Huruf Rumi* | `eseminar.dbp.gov.my/dokumen/arabumi.pdf` | Method authority only, per board decision 184 |

**Transliteration trap, already caught and reported on the live page:** Mufti WP's
own Irsyad al-Hukum #954 prints *"ma jama'a bainakuma"* where its own Arabic
reads `وَجَمَعَ` (*wa* jama'a). A source's rumi can be wrong. Never copy one
without checking it against the Arabic.

---

## 4. Source record for `lafaz akad nikah` and `doa jodoh` (both now shipped)

Both were parked until sourced — correctly, since they are pure text artefacts
and decision 162 says an unsourced religious text does not ship. **Both then
shipped from this sourcing.** Kept in full as the per-item authority record, so
any future refresh starts from the sources rather than from our own article.

### 4a. `lafaz akad nikah` (800/mo) — SOURCED, ready to draft

**The authority publishes the lafaz itself, in Malay.**

**PRIMARY — Mufti WP, AL-KAFI #1686**
`muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/4393-al-kafi-1686-adakah-sah-nikahnya-sekiranya-tidak-bersalaman-ketika-akad-nikah`
Verbatim:

> *"Ijab iaitu lafaz daripada wali pengantin perempuan dengan menyebut 'aku
> kahwinkan kamu' atau 'aku nikahkan kamu' dan seumpamanya."*
> *"Qabul iaitu lafaz daripada pengantin lelaki dengan menyebut 'aku terima
> perkahwinannya' atau 'aku terima nikahnya' atau 'aku redha dengan
> menikahinya'."*
> (Lihat al-Mu'tamad fi al-Fiqh al-Syafi'e, 4/53)

**THE HEADLINE — the rule that invalidates.** Same article, verbatim:

> *"Mestilah lafaz kahwin atau nikah di dalam ijab dan qabul itu jelas. Ini
> seperti sekiranya wali menyatakan 'aku nikahkan kamu dengan anakku' lalu
> dijawab oleh bakal suami 'aku terima' maka tidak berlaku pernikahan
> tersebut."* (al-Fiqh al-Manhaji, 4/55-56)

**"Aku terima" alone does not marry you** — the word *nikah* or *kahwin* must
appear in the qabul. This was called the single most useful finding of the
sprint. It must lead the article, not sit in a footnote.

**SUPPORTING, all read live 1 Sep 2026:**

- **Al-Kafi #851, akad nikah satu nafas** — `muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/2677-al-kafi-851-akad-nikah-satu-nafas`
  *"tidak disyaratkan satu nafas dalam menjawab lafaz nikah. Syaratnya ialah
  mesti berturutan."* A breath or a sneeze does not spoil it; a long gap does.
  (al-Fiqh al-Manhaji 1/551-552). Mufti WP tells jurunikah to stop making it
  hard: *"kami mengesyorkan kepada para imam atau jurunikah agar memudahkan
  proses lafaz nikah ini dan tidak memberatkannya apabila telah cukup syarat."*
  **Mazhab variance, from the article's own footnote:** Hanafi and Hanbali
  permit a long gap if still in the same majlis.
- **Not shaking hands does not invalidate the akad** — Al-Kafi #1686, its actual
  question.
- **Irsyad Hukum #697, wrong name** — `muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/5307-irsyad-al-fatwa-siri-ke-697-hukum-akad-nikah-salah-sebut-nama-pengantin-atau-nama-ayah-pengantin`
  Mispronouncing the bride's or her father's name does not invalidate; the
  requirement is *ta'yin*. Nawawi, *Minhaj al-Talibin* p.207.
- **Al-Kafi #1769, father as wakil** — `muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/4691-al-kafi-1768-hukum-ayah-pengantin-lelaki-mewakili-anaknya-ketika-akad-nikah`
  Permissible; the wakil must say he accepts on the groom's behalf: *"Aku terima
  nikah si fulanah bagi pihak anakku"*.
- **Rukun count — report the variance, do not flatten it.** al-Fiqh al-Manhaji
  4/55 counts five; Dr Muhammad Zuhaili, al-Mu'tamad 4/53 counts six by
  splitting *al-'aqidan*. Al-Kafi #1686 prints both.

**⚠ WHAT CANNOT BE SOURCED — do not imply otherwise.** There is no
state-by-state lafaz wording available. JAKIM's *Garis Panduan Upacara Akad
Nikah di Masjid* (2013) names lafaz as a rukun and prints **no wording**. JAIS
Selangor's *Tatacara Pengurusan Nikah, Cerai dan Pembatalan serta Ruju' Orang
Islam Negeri Selangor* (Dec 2024) is a **scanned-image PDF, 11 pages, zero
extractable characters** — and OCR is not acceptable for a lafaz. Three query
shapes run. Say the lafaz is the Syafi'i formulation as published by Mufti WP
and that exact wording varies in practice; that is true and is all we can
evidence.

**⚠ PLACEMENT CONDITION — BINDING, and NOT YET CONFIRMED.** A new page is
correct (this answers *what do I say and what breaks it*, not *what are the five
rukun*), **on condition that `rukun-nikah` links out to it and stops short of
restating the ijab/qabul wording.** I asked the writer to confirm this on the
live pages and he closed out without answering. **Whoever builds this page must
verify it on live `rukun-nikah` before publishing**, not merely agree to it.

### 4b. `doa jodoh` (1,300/mo) — ships as a RULINGS article, not a doa-text article

**No Malaysian authority publishes a titled "doa jodoh".** Do not publish one.

**The one text that can ship** — Surah Ghafir 60, as quoted by Jabatan Mufti
Negeri Selangor. Arabic is clean selectable HTML, copy-safe, verified character
by character:

```
وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ
```

> *"Berdoalah kamu kepada-Ku nescaya Aku perkenankan doa permohonan kamu."*

**THE PIECE — and it is the opposite of what we expected.** Jabatan Mufti Negeri
Selangor, e-Musykil, kategori MUNAKAHAT, **Tahun Soalan 2023**:
`emusykil.muftiselangor.gov.my/index.php/site/jawapan?id=3567`
The question asked is exactly the *"doa jodoh sebut nama"* question. Verbatim:

> *"adalah diharuskan untuk kita berdoa memohon kepada Allah SWT agar diberi
> kemudahan dalam mendapatkan jodoh atau memohon secara spesifik agar orang
> tertentu dijadikan jodoh kita."*

**Harus — permissible.** Every content farm treats this as suspect; a named
state mufti says it is allowed. That is the headline. The authority adds an
istikharah framing in its own Malay paraphrase — present it as the authority's
paraphrase, **not** as a quoted doa text.

**THE KILL — it is bomoh and pemanis, not sebut-nama.** Mufti WP **Irsyad Hukum
#269**: `muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/2768-irsyad-al-fatwa-siri-ke-269-hukum-andartu-bertemu-bomoh-untuk-mendapatkan-jodoh`

> *"Perbuatan ibu saudari yang pergi menemui bomoh semata-mata untuk membuang
> sial bagi memudahkan mendapat jodoh adalah salah sama sekali."*

Three graded hadith with numbers: Muslim (5957) — solat not accepted 40 nights,
with Nawawi's gloss that it means no reward (*Syarh al-Nawawi 'ala Muslim*
14/227); Ahmad (9667); al-Bukhari (2766) on the seven destroying sins. Plus
*"tiada konsep sial di dalam Islam"* — al-Bukhari (5770), Muslim (2220), Abu
Daud (3913), Ahmad (3031). **Report attributed. Do not restate as our own
ruling.**

**CONTEXT** — Mufti WP **Irsyad Hukum #577**:
`muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/4827-irsyad-al-fatwa-siri-ke-577-jodoh-tak-lekat-silap-siapa`
Jodoh is takdir (al-Bukhari 3208) but striving and doa are still required;
explicitly rejects the "career women marry late" claim; confirms a woman may
make the first move, citing Khadijah RA (Muslim 2435).

---

## 5. Negatives — recorded so nobody repeats the search

**No titled "doa jodoh" text from any Malaysian authority.** Queries:
(a) `muftiwp.gov.my doa memohon dipermudahkan jodoh irsyad hukum berdoa memohon pasangan hidup` (domain-restricted);
(b) `muftins.gov.my himpunan doa zikir "doa jodoh" OR "doa memohon jodoh" OR "doa mohon pasangan"` (4 authority domains);
(c) the al-Furqan 74 Arabic string across 7 authority domains.
al-Furqan 74 appears on Mufti WP only as a verse inside family-themed articles,
never presented as a doa jodoh. Negeri Sembilan's 37-entry *Himpunan Doa dan
Zikir* has no jodoh entry.

**No state-by-state lafaz akad nikah wording.** Queries:
(a) `lafaz akad nikah ijab qabul teks rasmi Jabatan Agama Islam Selangor JAIS manual prosedur nikah`;
(b) `"aku nikahkan" "dikahwinkan engkau" lafaz ijab kabul teks jurunikah negeri enakmen undang-undang keluarga islam`;
(c) the Arabic sighah strings — all domain-restricted to JAIS/JAWI/JAKIM/mufti sites.

**No short "doa pembuka majlis" text, and no titled "doa kesyukuran"**, from
round 1. Both confirmed absent with two query shapes each.

**No HTML authority page carries doa selamat Arabic.** Swept 20+ authority
domains. e-Muallaf serves doa as JPGs; e-Solat's Koleksi Doa is solat-only; no
state mufti carries it. **Linking JAKIM's PDF is correct, not a compromise.**

### Named gap — E-SMAF unreachable

**`e-smaf.islam.gov.my` (JAKIM's national fatwa database) could not be reached
on 1 Sep 2026.** DNS resolves to `150.242.181.190`; TCP connection **refused on
both port 80 and 443**, four URL forms. **This is not a blanket block on our
side: `www.islam.gov.my` connected from the same session in 0.04s.** What cannot
be distinguished from here is a service that is down from one that geo-blocks
non-Malaysian traffic — both present identically as a refused connection.

**Consequence:** the national fatwa on *ilmu pengasih* as khurafat exists and is
**uncited**, because it was not read. Anyone drafting `doa jodoh` should retry
E-SMAF; if it answers, that fatwa strengthens the kill considerably.

### Banked — `doa istikharah jodoh`, sourced and not used

Cut from scope, but fully sourced so nobody re-derives it. Mufti WP **Irsyad
Hukum #342**:
`muftiwp.gov.my/ms/artikel/irsyad-hukum/umum/3874-irsyad-al-fatwa-siri-ke-342-adakah-disyaratkan-bermimpi-sebagai-jawapan-istikharah`
Complete three-part doa, Arabic clean selectable HTML, Malay meaning per part,
**al-Bukhari (1166)** from Jabir RA, hukum stated as *"sunat dengan ijma' para
ulama'"*. Carries its own kill: the belief that the answer must arrive as a
dream has *"tiada sandaran di dalam syarak"*.

---

## 6. Currency register — entries opened by CONT-13

| Claim | Source | Volatility | Next check |
|---|---|---|---|
| JAKIM doa guideline current edition = Pindaan 2026 (12 Mac 2026) | `islam.gov.my/ms/garis-panduan` | **High** — three editions in 19 months | 1 Dec 2026 |
| Doa duration 2–3 min; women may lead at women-only majlis | JAKIM 2026 cl. 9.2, 7.2 iv | Medium | with edition |
| Doa sebelum makan graded *munkar* | Mufti WP Irsyad al-Hadith #575 | Low | 12 months |
| Kaffaratul majlis *sahih*; al-Asr = amalan sahabat | Mufti WP Al-Kafi #1948 | Low | 12 months |
| Abu Daud 2130 — **no grading published by a Malaysian authority** | Mufti WP #954 | Medium — one may appear later | 6 months |
| *Sebut nama* in doa jodoh = **harus** | Mufti Selangor e-Musykil 3567 (2023) | Low | 12 months |
| DBP transliteration pedoman | `eseminar.dbp.gov.my/dokumen/arabumi.pdf` | Low | 12 months |

**Standing note:** the 2007 JAKIM PDF still ranks top of Google on these terms
and its landing page is 404. **SERP position measures link equity, not
currency.** That is the whole reason this seat exists, and it should be checked
again whenever a doa page is refreshed.

---

## 7. Retrospective

**What did we learn that is not written down?**
That the *"read government PDFs by word coordinate"* rule had a silent limit. It
fixes fee columns because the defect there is ordering; it does nothing for
Arabic because the defect is in the glyph stream. Four JAKIM PDFs, four
failures. Also: **sourcing before drafting is worth more than we assumed** —
three of six planned articles lost their text at the gate, and because the
sourcing ran first, none of that became wasted drafting.

**Which document must change, and who owns the edit?**
`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
Stage 2 — **owned by this seat, and the edit is made**: the two PDF rules, the
per-item religious-text gate from decision 162, and the decision 184
transliteration standard. Decision 162 had lived for two days in
`docs/boardroom/decision-log.md` and one persona while the document writers
actually follow said nothing about religious text; **a gate only the
verification seat knows about is a gate the writer discovers by failing it.**
Logged as decisions 184 and 185.
**Still outstanding, needs the owner's own hand:** the same two clauses belong
in `.claude/agents/editorial-verification-lead.md`. That file is agent
configuration, so this seat does not edit it on another agent's instruction.

**What did we do twice?**
Escalated the DBP transliteration route. Raised in round 1, carried three live
pages and two drafts while unapproved, and had to be raised again before it was
ruled on — then approved unchanged. **A standards question that already has live
pages depending on it should be answered before the next article ships, not
after.**

**What did we nearly ship, and what caught it?**
Four things; three caught before publication, one after.

1. The 2007 JAKIM PDF as our primary source — a withdrawn document whose landing
   page 404s. Caught by checking the landing page instead of trusting the file.
2. Malformed Arabic pasted out of a JAKIM PDF. Caught by testing extraction
   instead of assuming it worked.
3. *"Doa sunnah Nabi sebelum makan"* — a text our own national mufti's office
   grades **munkar**. Caught by reading the authority instead of the SERP.
4. **Not caught before publication:** three unattributed rulings and an altered
   em dash on `doa-selamat-majlis`, which shipped before the sign-off reached
   the writer. Caught by auditing the live page afterwards; the writer then
   corrected all four and republished, and **all four are now fixed in
   production**. The unsourced practice claim turned out to sit in three places,
   not one — body, FAQ answer and an image caption — and he found the extra two
   by enumerating rather than testing.

**The lesson from (4) is process, not care.** The writer had a clearance for the
*quote* and reasonably read it as a clearance for the *article*. He said so
plainly in his own log rather than letting it pass as confirmed, and he pushed
an UNDO naming the slug first — both correct. **A clearance must name what it
covers and what it does not**, and a verification seat that clears a text should
say in the same message whether the surrounding article is cleared. That is this
seat's failure to fix, not the writer's.

**A fifth thing, found only because the live page was re-checked twice:**
**captions and body text update through different paths.** The republish that
removed three ruling sentences from the body left the fourth standing in an
image caption. A body-text check does not see it. This compounds CONT-09's rule
that the cover makes a factual claim too, and extends it: **after any correction
to a live article, re-check the captions separately** — they may not have moved.

**Edits made in response, both in
`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
Stage 2:** the clearance-scope rule, and the caption-path rule above.
