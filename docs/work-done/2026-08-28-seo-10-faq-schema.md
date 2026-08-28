# SEO-10 — the Soalan lazim block now emits FAQPage JSON-LD

**28 Ogos 2026 · sprint 03 · seo track · owner BMAD**
Branch `feat/seo10-faq-schema` → `master` `ae4a654`, deployed to production
2026-08-28 06:30:10 UTC (14:30 MYT). Deployment `6136747993`,
`https://hellokahwin-nq7uradhj-thewednotebook.vercel.app`.

Evidence: `docs/work-done/2026-08-28-seo-10-faq-schema-EVIDENCE/`

---

## Claim

One emitter, `src/lib/inspire/faq-schema.ts`, called once from the article
route. **29 live articles now carry a valid `FAQPage` block in their HTML,
asserting 122 questions. Before the deploy the number was 0.** Every question
and every answer string in those 122 assertions appears verbatim in the visible
text of the page it describes.

Two articles the Sprint-02 census counted carry no Q&A block at all and
correctly emit nothing.

Google retired the FAQ rich result on 7 May 2026, so this markup will not put
an accordion under a hellokahwin.com result and nothing shipped here changes
that. It is still correct, still free per article, and still read by consumers
other than Google Search. The section headed "What this is worth" sets out what
that leaves and what it costs the tracker to keep counting it as a rich-result
win.

## What the census actually counted

The brief pointed at `docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json`
and said to read it rather than re-derive the gap. That file is not on `master`;
it lives on `feat/seo-05-titles`, commit `15666ce`, and is copied into this
item's evidence as `00-sprint02-census-faq-schema-gap.json`. It reports 69
articles swept, 31 `carryingSoalanLazimBlock`, 0 `emittingFaqPageSchema`.

Reading it was the right instruction, and building on the 31 without curling
them would have been the false pass. Curling all 31 first found two things the
count hid.

**The block is not always an `<h2>`.** Seven of the 31 — the mas kahwin cluster
— write their entire body in `<h3>`, so their block opens with
`<h3>Soalan lazim</h3>` and asks its questions in `<h4>`. An emitter keyed to
`<h2>` would have shipped, passed a five-article check on any of the other
articles, and silently missed those seven.

**Two of the 31 carry no block.** `bajet-kahwin` and `checklist-kahwin` have no
`Soalan lazim` heading anywhere in the body. The census's detector was looser
than the thing it was counting. The real number is 29, and both files record 29
rather than 31.

Before sweep, 2026-08-28 06:13:30 UTC, sequential, one request at a time, 900ms
apart, no purge — `01-before-live-sweep.json`:

```
withSoalanLazimBlock: 29    emittingFaqPage: 0
```

## The emitter

`src/lib/inspire/faq-schema.ts` — one module, one call site, no per-article
markup anywhere.

- The block is found by heading **text**, not heading level: the first heading
  whose text is `Soalan lazim` (case, inner whitespace and a trailing colon
  tolerated, nothing else). Questions are the headings exactly one level deeper,
  up to the next heading at or above the block's own level.
- The match is exact rather than a prefix, and that matters: three live articles
  carry a prose section called `Soalan sebelum bayar`, `Soalan sebelum bayar
  deposit` or `Soalan sebelum menempah juru inai` **and** a real `Soalan lazim`
  block further down. A prefix match lands on the wrong section and emits an
  `FAQPage` with nothing in it.
- A sub-heading only becomes a `Question` if it ends in `?`, and only if prose
  follows it. Fewer than two surviving questions and nothing is emitted.
- The source is `article.content`, the authored body, not the merged
  `renderContent`. Dynamic blocks only ever add nodes around the body, so every
  string the emitter asserts is guaranteed to be text the reader can see. Read
  the merged doc instead and a heading-less block appended at the end bleeds
  into the last answer.
- Answers are plain text. An answer containing an internal link keeps the link's
  words and drops its markup — `Panduan sirih junjung menerangkan…` in the
  `nisbah-hantaran` block below is the anchor text of a live `<a>`. That is the
  reading a text validator and a reader both get, and it keeps the assertion
  equal to what is on the page.
- No `Answer.url`. The obvious extra was an in-page anchor per question, and it
  is deliberately absent: heading ids come from a document-order assigner over
  the merged doc, so a dynamic block injected above the body shifts every one of
  them. An anchor that no longer resolves is a worse claim than no anchor.

The cache key was **not** bumped. The payload shape did not change —
`article.content` was already in it — and orphaning every cached entry would
cold-render the corpus against a five-wide pool, which is the failure
`ARTICLE_PAGE_CACHE_KEY` and `ARTICLE_PAGE_CACHE_TAGS` exist to document.

14 unit tests in `src/lib/inspire/__tests__/faq-schema.test.ts`, fixtures shaped
from the two real block layouts. Full suite 389 passed, typecheck clean, eslint
0 errors, `pnpm build` clean.

## The JSON-LD, quoted from live HTML

Five named articles. Each block below was cut byte for byte out of the response
body of a fresh `curl`, not re-serialised from a parsed object, and not read off
the route source. The extractor is `extract-jsonld.py`; the same files are in
`EVIDENCE/jsonld/` with their response headers.

### 1. `/artikel/hantaran-mas-kahwin/nisbah-hantaran`

```html
# https://hellokahwin.com/artikel/hantaran-mas-kahwin/nisbah-hantaran
# extracted 2026-08-28T06:37:30Z
# HTTP 200  x-vercel-cache: HIT  age: 146  date: Fri, 28 Aug 2026 06:32:13 GMT
# the <script> element below is copied byte for byte out of the response body

<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Adakah nisbah hantaran wajib dalam Islam?","acceptedAnswer":{"@type":"Answer","text":"Tidak. Kajian UiTM 2015 menyatakan \"dalam syariat Islam pemberian hantaran hukumnya harus kerana ia dianggap sebagai hadiah semata-mata\", dan Jabatan Mufti Negeri Selangor menyifatkan wang hantaran sebagai hadiah atau hibah, iaitu pemberian sukarela, yang bersifat sunat. Yang wajib ialah mas kahwin. Tiada sumber agama menyebut bilangan dulang."}},{"@type":"Question","name":"Bolehkah nisbah hantaran sama, contohnya 5 balas 5?","acceptedAnswer":{"@type":"Answer","text":"Boleh, kerana tiada pihak berkuasa melarangnya. Corak \"lebih dua\" ialah amalan yang direkodkan kajian UiTM 2015 dan rekod JKKN Sarawak, bukan peraturan. Sesetengah keluarga bersetuju membalas sama banyak untuk menjimatkan kos. Yang penting kedua-dua keluarga bersetuju sebelum membeli, kerana balasan yang tidak dijangka menimbulkan rasa tidak puas hati pada hari majlis."}},{"@type":"Question","name":"Nisbah untuk majlis pertunangan dan majlis nikah, sama atau berbeza?","acceptedAnswer":{"@type":"Answer","text":"Biasanya berbeza. Rekod Perpustakaan Awam Perlis 2003 menyatakan \"jumlah hantaran bertunang kurang daripada akad nikah\", dan hantaran nikah \"biasanya lengkap serba satu\". Maka 3 balas 5 kerap dipilih untuk bertunang dan 5 balas 7 atau lebih untuk nikah. Keluarga yang membuat satu majlis sahaja biasanya memilih nisbah nikah."}},{"@type":"Question","name":"Adakah dulang sirih junjung dikira dalam nisbah?","acceptedAnswer":{"@type":"Answer","text":"Ya, dalam amalan lazim ia dikira sebagai satu dulang, dan biasanya dulang pertama, kerana ia dibawa masuk di kepala rombongan. Rekod Perlis 2003 menyebut tepak sirih sebagai bingkisan paling utama dalam hantaran orang dahulu. Panduan sirih junjung menerangkan bentuknya dan kedudukannya di kepala rombongan."}}]}</script>
```

### 2. `/artikel/hantaran-mas-kahwin/mas-kahwin-johor`

The `<h3>` / `<h4>` shape — the seven articles a heading-level rule would have
missed.

```html
# https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-johor
# extracted 2026-08-28T06:37:31Z
# HTTP 200  x-vercel-cache: HIT  age: 115  date: Fri, 28 Aug 2026 06:35:37 GMT
# the <script> element below is copied byte for byte out of the response body

<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Adakah Johor menetapkan kadar berbeza bagi janda?","acceptedAnswer":{"@type":"Answer","text":"Tiada sumber yang ditemui menyatakan pembezaan itu, dan tiada sumber menyatakan kadarnya sama. Modul MBKPI 2019/2020 dan modul kursus Johor 2022 kedua-duanya membawa satu angka sahaja, iaitu RM22.50, tanpa baris berasingan bagi janda. Setakat ini hanya Negeri Sembilan mempunyai pembezaan anak dara dan janda yang bersumber rasmi."}},{"@type":"Question","name":"Adakah RM22.50 kadar minimum atau kadar tetap?","acceptedAnswer":{"@type":"Answer","text":"Tidak dapat disahkan pada hari ini. Kajian UiTM membaca peruntukan 1935 sebagai had maksimum, dan ungkapan \"tidak lebih dan boleh kurang\" itu rumusan pengkaji, bukan petikan teks 1935. Modul kursus 2019/2020 dan 2022 pula menyebut RM22.50 tanpa menyatakan sama ada ia minimum atau maksimum."}},{"@type":"Question","name":"Berapa bayaran Kad Perakuan Nikah di Johor?","acceptedAnswer":{"@type":"Answer","text":"Bayaran pemprosesan RM40.00, mengikut JAINJ, disemak pada Ogos 2026. Permohonan dibuat di Pejabat Kadi Daerah selepas akad nikah didaftarkan, berserta salinan kad pengenalan, salinan Sijil Nikah negeri Johor dan gambar pasangan. JAINJ menyatakan tempoh siap kad ialah tiga bulan dari waktu serahan dokumen."}}]}</script>
```

### 3. `/artikel/ucapan-doa/walimatul-urus`

```html
# https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus
# extracted 2026-08-28T06:37:33Z
# HTTP 200  x-vercel-cache: HIT  age: 111  date: Fri, 28 Aug 2026 06:32:36 GMT
# the <script> element below is copied byte for byte out of the response body

<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Apa maksud walimatul urus dalam bahasa Melayu?","acceptedAnswer":{"@type":"Answer","text":"Kenduri perkahwinan. Itu takrifan Kamus Dewan Edisi Keempat, seperti yang tersiar dalam Pusat Rujukan Persuratan Melayu terbitan Dewan Bahasa dan Pustaka, dan ia satu-satunya entri kamus bagi istilah itu. Perkataannya berasal daripada bahasa Arab, dengan walimah bermaksud jamuan dan al-urus merujuk kepada perkahwinan."}},{"@type":"Question","name":"Wajibkah menghadiri majlis walimatul urus?","acceptedAnswer":{"@type":"Answer","text":"Ya, bagi orang yang dijemput secara khusus. Jabatan Mufti Negeri Selangor menyatakan hukumnya fardu ain mengikut pandangan utama mazhab Syafie, dalam Taudhih Al-Hukmi #91 bertarikh 28 Julai 2025. Kewajipan itu tertakluk kepada enam syarat, dan gugur jika salah satunya tidak dipenuhi."}},{"@type":"Question","name":"Perlukah hadir jika dijemput dalam kumpulan WhatsApp?","acceptedAnswer":{"@type":"Answer","text":"Tidak. Jabatan Mufti Negeri Selangor menyatakan jemputan umum dalam kumpulan WhatsApp atau siaran Facebook yang tidak menyebut nama seseorang secara khusus tidak mewajibkan kehadiran, kerana ia tidak memenuhi syarat jemputan yang ditujukan terus kepada orang itu. Jemputan dalam talian yang menyebut nama anda pula kekal mewajibkan kehadiran."}},{"@type":"Question","name":"Adakah bersanding satu tuntutan agama?","acceptedAnswer":{"@type":"Answer","text":"Tidak. Bersanding tidak muncul dalam takrifan walimah mahupun dalam rukun nikah. Jabatan Mufti Kerajaan Negeri Sembilan, dalam jawapannya bertarikh 19 Jun 2019, meletakkan persandingan sebagai adat yang harus dengan syarat aurat terjaga dan tiada hiasan berlebihan. Jawapan itu turut menyenaraikan enam syarat am bagi adat perkahwinan."}},{"@type":"Question","name":"Siapa yang bertanggungjawab mengadakan walimah?","acceptedAnswer":{"@type":"Answer","text":"Pengantin lelaki. Jabatan Mufti Wilayah Persekutuan menyatakannya dalam Al-Kafi Li Al-Fatawi #1137 bertarikh 4 Mac 2019. Jika keluarga pengantin perempuan yang mengadakan majlis, tuntutan ke atas suami sudah terlaksana, dan dua majlis di dua rumah adalah harus selagi tidak membazir."}}]}</script>
```

### 4. `/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak`

The article that carries `Soalan sebelum bayar` above its real block. The
emitter skipped the decoy.

```html
# https://hellokahwin.com/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
# extracted 2026-08-28T06:37:35Z
# HTTP 200  x-vercel-cache: HIT  age: 105  date: Fri, 28 Aug 2026 06:32:28 GMT
# the <script> element below is copied byte for byte out of the response body

<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Berapa harga kain songket asli?","acceptedAnswer":{"@type":"Answer","text":"Sampin sutera Terengganu tenunan tangan disiarkan antara RM2,800 hingga RM11,500 sehelai di sampinexclusive.com pada 25 Ogos 2026. Julat untuk songket kapas kelas pertengahan tidak disiarkan secara terbuka oleh peniaga yang boleh disemak, jadi tiada angka diberikan di sini."}},{"@type":"Question","name":"Bagaimana membezakan songket tenunan tangan daripada cetak?","acceptedAnswer":{"@type":"Answer","text":"Belek belakang kain. Ikut takrif UNESCO, benang emas songket dimasukkan di antara benang asas sehingga ia terapung di atas tenunan, jadi benang itu mesti kelihatan di belakang kain. Corak cetakan rata, ringan, dan tidak meninggalkan apa-apa di belakang."}},{"@type":"Question","name":"Adakah songket Terengganu berbeza daripada songket lain?","acceptedAnswer":{"@type":"Answer","text":"Songket Terengganu kini berdaftar sebagai petunjuk geografi di bawah MyIPO, dipegang Yayasan Tuanku Nur Zahirah, dengan sijil disampaikan pada 19 November 2025. Pendaftaran itu melindungi nama tempat asal. Ia tidak menjamin kaedah tenunan setiap helai yang dijual."}},{"@type":"Question","name":"Perlukah baju sanding menggunakan songket?","acceptedAnswer":{"@type":"Answer","text":"Tidak. Harga tersiar PP Signature pada 25 Ogos 2026 meletakkan sewaan sanding songket pada RM699 hingga RM1,099 dan sewaan bukan songket pada RM600 hingga RM999. Songket ialah pilihan kain, bukan syarat majlis."}}]}</script>
```

### 5. `/artikel/ucapan-doa/doa-majlis-perkahwinan`

```html
# https://hellokahwin.com/artikel/ucapan-doa/doa-majlis-perkahwinan
# extracted 2026-08-28T06:37:36Z
# HTTP 200  x-vercel-cache: HIT  age: 98  date: Fri, 28 Aug 2026 06:31:17 GMT
# the <script> element below is copied byte for byte out of the response body

<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Berapa minit doa majlis perkahwinan patut dibaca?","acceptedAnswer":{"@type":"Answer","text":"Dua hingga tiga minit, mengikut perenggan 9.2 Garis Panduan dan Himpunan Doa bagi Majlis Rasmi dan Separuh Rasmi Kerajaan, terbitan JAKIM 2026. Angka yang sama muncul dalam terbitan 2025. Dokumen JAKIM yang lebih lama menyebut tidak melebihi lima minit, dan itu punca angka lima minit masih beredar."}},{"@type":"Question","name":"Bolehkah doa majlis dibaca sepenuhnya dalam bahasa Melayu?","acceptedAnswer":{"@type":"Answer","text":"Tidak sepenuhnya, bagi majlis rasmi kerajaan. Perenggan 6.2 (vi) terbitan 2026 menetapkan isi kandungan doa hendaklah dibaca dalam bahasa Arab dengan terjemahan dipaparkan di skrin, walaupun perenggan 6.1 membenarkan mukadimah diikuti doa dalam bahasa lain. Garis panduan itu tidak mengikat kenduri di rumah, jadi doa dalam bahasa Melayu di majlis keluarga tidak melanggar apa-apa."}},{"@type":"Question","name":"Perlukah al-Fatihah dibaca sebelum doa?","acceptedAnswer":{"@type":"Answer","text":"Mengikut kesesuaian majlis. Perenggan 8.3 garis panduan JAKIM terbitan 2026 menyebut bacaan Surah al-Fatihah sebelum doa dibuat mengikut kesesuaian majlis, jadi ia bukan langkah yang diwajibkan dalam dokumen itu. Perenggan yang sama meletakkan tanda hormat kepada tetamu dan ucapan salam sebelum bacaan bermula."}},{"@type":"Question","name":"Bolehkah wanita membaca doa di majlis perkahwinan?","acceptedAnswer":{"@type":"Answer","text":"Kriteria JAKIM bagi pembaca doa majlis rasmi ialah seorang lelaki beragama Islam, dan perenggan 7.2 dokumen yang sama membenarkan wanita dilantik bagi majlis yang hanya dihadiri golongan wanita. Kriteria itu syarat perlantikan pentadbiran untuk majlis kerajaan, bukan fatwa mengenai siapa boleh berdoa, dan kenduri kahwin di rumah tidak terikat dengannya."}},{"@type":"Question","name":"Di mana teks penuh doa kenduri kahwin JAKIM boleh didapati?","acceptedAnswer":{"@type":"Answer","text":"Dalam terbitan 2025, bertajuk Doa Majlis Khenduri Perkahwinan, dan dalam dokumen lama yang tidak bertarikh, bertajuk Doa Majlis Perkahwinan. Terbitan 2026 tidak lagi membawanya, dan koleksinya tinggal empat doa majlis kerajaan sahaja. Kesemua dokumen itu berhak cipta JAKIM, dan menerbitkannya semula memerlukan kebenaran bertulis daripada Ketua Pengarah JAKIM."}}]}</script>
```

## Validation

**Against the spec.** `validator.schema.org` fetched and rendered six live
pages — the five above plus `mas-kahwin-ikut-negeri`, which has the longest
multi-paragraph answer in the corpus — and reported, for every one of them:

```
FAQPage   numErrors=0  numWarnings=0
Question  numErrors=0  numWarnings=0   (every question node on every page)
Article   numErrors=0  numWarnings=0
BreadcrumbList numErrors=0 numWarnings=0
```

Per-URL detail in `04-schemaorg-validator-summary.json`. The raw responses run
130–215 KB each and are not committed.

**Against the page.** `validate.py` re-read the live HTML of all 31 and checked
two things per question, because a spec-shaped block quoting text the reader
cannot see is exactly the false pass this item was warned about:

1. the shape — `FAQPage.mainEntity[] → Question(name, acceptedAnswer → Answer(text))`;
2. parity — every `name` and every `acceptedAnswer.text` present verbatim in the
   article body's visible text, and the list of names equal, in order, to the
   rendered question headings.

```
valid FAQPage, every question and answer visible on the page: 29 / 31
FAQPage with errors: 0
no FAQPage (article carries no Soalan lazim block): ['bajet-kahwin', 'checklist-kahwin']
questions asserted in total: 122
```

The first run of that check reported three failures — one answer each on
`mas-kahwin-ikut-negeri`, `mas-kahwin-perak` and `mas-kahwin-sabah-sarawak`.
They were the three multi-paragraph answers in the corpus, and the fault was in
the checker: it stripped tags without treating `</p><p>` as whitespace, so the
single space the emitter joins paragraphs with had nothing to match. Fixed in
the checker, re-run, all three pass. Nothing was changed in the emitter to make
them pass.

**What Google's own index says, today.** GSC URL inspection on
`nisbah-hantaran`, run after the deploy:

```
verdict: PASS   coverage_state: Submitted and indexed
last_crawled: 2026-08-26 20:33
rich_results: {verdict: PASS, detected_types: ["Breadcrumbs"], issues: []}
```

That snapshot predates the deploy by two days, so it cannot confirm detection of
anything shipped today, and it is recorded here as **not yet met** rather than
quietly omitted. It will move on the next crawl.

## What this is worth, and the part of the brief that is now wrong

The brief calls the Q&A blocks "the cheapest rich-result opportunity we have".
That was true when the item was written. It is not true now.

Google's FAQPage documentation carries a deprecation notice: the FAQ rich result
**"will no longer appear in Google Search starting May 7, 2026"** (Search
Central changelog, 8 May 2026). It had already been restricted on 8 August 2023
to "well-known, authoritative government and health websites", which never
included us, and the rich-result documentation has since been removed
altogether.

So: hellokahwin.com will not get an FAQ accordion under its results, and would
not have got one even if this had shipped in Sprint 02. The DoD asked for the
emitter fixed, the JSON-LD present in live HTML, and validation quoted, and all
three are done and evidenced above — the DoD is met. What is not true is the
payoff sentence in the brief's rationale.

What the markup is still worth, stated plainly and without inflating it:

- it is a correct machine description of a page whose long tail is
  question-shaped, read by consumers other than Google Search rich results —
  Bing, and the answer engines that parse JSON-LD;
- it costs nothing per article and nothing at ingest, because it is derived;
- `Article` and `BreadcrumbList` on these pages are unaffected, and both still
  validate clean.

It should not be counted as a rich-result win in the tracker or the boardroom
doc. Anyone planning further schema work should price FAQ at zero for Google
Search and decide on the other consumers alone.

Sources: [Google FAQPage documentation](https://developers.google.com/search/docs/appearance/structured-data/faqpage),
[Changes to HowTo and FAQ rich results, 8 Aug 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

## The writer instruction, corrected

Style guide §9, `docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md`,
told writers:

> - **Marked up as FAQ schema** by the engineer at ingest. The writer's job is
>   the shape; the markup is not.

No engineer marked anything up at ingest, and no code did either — that line
described behaviour the codebase did not have, for the whole life of the
corpus. It now describes what actually happens, and turns the block's format
rules into the contract that decides whether the schema appears at all.

That file lives on `feat/command-centre-dashboard`, not on `master` — the two
lines of this repo hold the docs and the site separately. The edit is commit
`0ed754b` on that branch, pushed, together with the two other documents named in
the retrospective.

## Method

Everything under `EVIDENCE/`. Every live measurement is sequential, one request
at a time, 900ms apart, no purge — the same method the Sprint-02 census used, so
the before and after are comparable, and no measurement stampedes the origin.

| file | what it is |
| --- | --- |
| `00-sprint02-census-faq-schema-gap.json` | the Sprint-02 census, recovered from `15666ce` |
| `01-before-live-sweep.json` | all 31 live, before the deploy |
| `02-after-live-sweep.json` | all 31 live, after the deploy, with the full FAQPage object per article |
| `03-validation-spec-and-page-parity.json` | per-article spec + visible-text result |
| `04-schemaorg-validator-summary.json` | validator.schema.org verdicts, six URLs |
| `jsonld/*.faqpage.txt` | the five `<script>` elements, byte for byte, with response headers |
| `probe.py`, `validate.py`, `extract-jsonld.py` | the three measurements, re-runnable |

Before shipping, the real exported functions were also dry-run over docs
reconstructed from the live HTML of all 31 articles, and predicted 29 emitters
with the exact question counts the deploy then produced. That was a pre-flight
check, not evidence; the evidence is the live HTML above.

## Retrospective

### 1. What did we learn that is not written down anywhere?

**The corpus writes the same section at two different heading levels, and no
document says so.** 22 articles open the Q&A block with `<h2>Soalan lazim</h2>`
and ask in `<h3>`. The seven mas kahwin articles run their whole body in `<h3>`,
so their block is an `<h3>` and their questions are `<h4>`. The style guide
states the H2 form as if it were the only one. Anything that reads article
structure — this emitter, the table of contents, a future summariser — has to
know that, and until now it could only find out by curling the articles.

**A census's headline number is a predicate, not a fact about its members.**
`carryingSoalanLazimBlock: 31` was produced by a looser rule than the block
itself: two of the 31 have no block at all. The count was not wrong about the
gap — 0 of them emitted FAQPage, which was the point — but it was wrong about
membership, and membership is what an emitter is built against. Reading a prior
item's evidence file is necessary and is not sufficient; the members still have
to be checked for shape.

**FAQ rich results no longer exist in Google Search, for anybody.** Restricted
to authoritative government and health sites on 8 August 2023, then retired
outright: "will no longer appear in Google Search starting May 7, 2026". Every
document we hold that treats FAQ markup as a rich-result opportunity was written
before that and is now wrong, including the sentence in this item's own brief.

### 2. Which document must change, and who owns that edit?

**`docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md`, §9 — owner
`head-of-seo-content`.** This is the required one. Its FAQ bullet said the block
is "marked up as FAQ schema by the engineer at ingest", which described a step
nobody performed. It now states the emitter's contract, because after this item
the block's format is not a house style — it is the input to code, and a heading
that reads anything other than `Soalan lazim` produces no schema at all.

Two more, both edited in the same pass:

- **`docs/boardroom/ceo-memory.md`, "SEO defects open on the live site" — owner
  `ceo-hellokahwin`.** The red entry is now closed, its 31 corrected to 29, and
  it carries the FAQ retirement so the gap is not reopened later as a
  rich-result opportunity.
- **`docs/plans/aug-23-2026-session-01/aug-27-2026-brief-seo-04.md` — owner
  `head-of-seo-content`.** SEO-04 is live this sprint and its spec asks venue
  pages for `EventVenue + LocalBusiness + FAQPage`. A correction note is added
  rather than the requirement removed: the markup is still valid and cheap, but
  it must not be costed as a rich result.

Named and deliberately **not** edited: `_bmad/wds/data/agent-guides/saga/seo-strategy-guide.md`
lists `FAQPage` in a generic schema table. It is vendored BMAD data and is
overwritten on update, so an edit there would not survive. It is recorded here
instead.

### 3. What did we do twice that we should never repeat?

**The 31-article sweep, because the first detector was written from the style
guide instead of from the HTML.** The guide says the block is an H2 reading
`Soalan lazim`, so the first probe looked for the first `<h2>` starting with
`Soalan`. That found the decoy `Soalan sebelum bayar` on three articles and
found nothing at all on seven, and the whole sweep had to be thrown away and
re-run. The rule: when writing a detector for a corpus, derive it from one
member's actual markup first, then check the derivation against the guide — not
the other way round.

**The validation pass, because the checker flattened HTML without treating
`</p><p>` as whitespace.** Three multi-paragraph answers were reported as not
visible on the page when they were fully visible, and the first suspect was the
emitter rather than the checker. A parity checker has to model the same joining
rule as the thing it checks.

### 4. What did we nearly ship, and what caught it?

**An emitter keyed to `<h2>`.** It is what the style guide describes, it would
have passed every check in this item's DoD — five named articles, JSON-LD
extracted from live HTML, validator clean — and it would have silently produced
nothing for the seven mas kahwin articles. What caught it was curling all 31
before writing a line of the emitter, rather than curling five after.

**The number 31.** Reporting "31 articles fixed" was one sentence away, and two
of them have no block to fix. The same sweep caught it.

**An `Answer.url` per question.** Pointing each answer at its in-page anchor
looked like free precision. Heading ids are assigned in document order over the
*merged* doc, so a dynamic block injected above the body renumbers them, and the
anchors would have been quietly wrong on exactly the pages that carry blocks.
Reading `createHeadingIdAssigner` before using it caught that.

