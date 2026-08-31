# SEO-13 — 39 articles emitted no FAQPage. Now 0 do, and the count is a script.

**Sprint 05 · track `seo` · 5 points · `head-of-seo-content` · 01 September 2026**
**Shipped:** PR [#41](https://github.com/ianngkb/hellokahwin/pull/41), merged `82ca795`,
production deploy `6187070257` **success** 2026-08-31T18:26:52Z.
Follow-up PR [#48](https://github.com/ianngkb/hellokahwin/pull/48), merged `255f820`.

---

## The number, before and after, from the same command

```
$ node scripts/seo/faq-schema-census.mjs
FAQPage census — https://hellokahwin.com — 2026-08-31T17:43:33Z     ← BEFORE
articles in sitemap: 86
  present:         47
  absent:          39
  not-applicable:  0
  invalid-json:    0
  fetch-failed:    0
  questions emitted: 192

FAQ CENSUS EXIT: 1 — 39 absent, 0 invalid
```

```
$ node scripts/seo/faq-schema-census.mjs
FAQPage census — https://hellokahwin.com — 2026-08-31T18:27:39Z     ← AFTER
articles in sitemap: 88
  present:         74
  absent:          0
  not-applicable:  14
  invalid-json:    0
  fetch-failed:    0
  questions emitted: 327

FAQ CENSUS EXIT: 0 — every article is present or a reasoned not-applicable
```

**192 emitted questions became 327.** The corpus moved twice while the item ran —
85 in the brief, 86 when I measured, 88 by the after-run — which is why the
number now comes out of a command rather than out of a document.

The arithmetic closes exactly, which is how I know nothing was quietly lost in a
moving corpus:

```
47  present before
+24  Soalan lazim blocks written
 +1  emitter fix (apa-itu-mas-kahwin)
 +2  articles that did not exist at the before-run
     (doa-penutup-majlis, doa-makan-majlis — both arrived already emitting)
= 74  present after ✓
```

### The brief's own figure was one article short, and the reason is instructive

The brief said `46 present / 39 absent / 1 failed to fetch`. My first run got
`47 / 39 / 0`. Same corpus, same day. The article whose fetch had failed *does*
emit; it was counted as neither. A transient network failure had silently
subtracted one from a coverage count, and the only reason anybody could tell is
that the census reports `fetch-failed` as its own state and exits **2** on it —
a different code from "something is absent". **"Not looked at" is not "absent",
and a checker that cannot say which one it means will eventually report the
wrong one.**

## ⚠ Read this before valuing the item: there is no Google rich result to win

The item's WHY calls structured Q&A on pages we already rank on *"the cheapest
square metre available"*, on a site *"losing SERP real estate to answers printed
above us."* **That square metre does not exist in Google Search.**

Google restricted FAQ rich results to well-known government and health sites on
8 August 2023 and **retired the feature outright on 7 May 2026**. This is not new
information and it is not mine — SEO-10's own closure entry in `ceo-memory.md`
records it, and says in terms that FAQ markup *"must not be counted as a
rich-result win here or in the tracker"* and that further schema work should
*"price FAQ at zero for Google Search."*

I am repeating it at the top of this log because the brief was written as though
the win were live, and an item that ends `0 absent` reads like a win unless
somebody says otherwise. What was actually bought:

- **Correct, valid structured data on every article that has Q&A** (75 as this is
  written, and the count is a command precisely so that this sentence does not go
  stale the way `31` did), free per article, still read by non-Google consumers.
- **120 new question-and-answer pairs of visible reader-facing content**, sourced
  from the articles' own bodies — which is the part with standing value, and it
  is content value, not schema value.
- **A count that can be re-derived by running something.**

**It should not be booked as SERP real estate.** If the tracker or a board pack
prices this as a rich-result win, that is wrong and this log is the correction.

## 39 = 24 + 14 + 1

| | count | what it was |
|---|---|---|
| **Content gap** | 24 | A guide or procedural article with no Q&A section. Got one, written from its own body. |
| **Not applicable** | 14 | Photo-led wedding and venue features. Named, with reasons, not padded. |
| **Emitter gap** | 1 | `apa-itu-mas-kahwin` — already an FAQ, emitting nothing. |

The brief warned this "may be a coverage job rather than a build job". It was
both, in a 1:24 ratio, and the build half was the one nobody could have guessed:
of the 39, exactly **one** article was already a Q&A that the emitter could not
see.

## 1 — the emitter gap

`/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin` is eight `<h3>` headings, seven
of them questions, each with its answer underneath. It is an FAQ page. It emitted
nothing, because `extractFaqEntries` keyed on a literal `Soalan lazim` heading —
and that article has no such heading for the honest reason that it has no
non-FAQ part to separate a block from.

`extractFaqEntries` now falls through to a second path when no block exists: at
the article's shallowest heading level, if at least **75%** of the headings are
question-shaped, the body itself is the Q&A. `apa-itu-mas-kahwin` is 7 of 8
(0.875). Non-question headings at that level still *close* the previous answer,
so `Beza mas kahwin, hantaran dan duit hantaran` cannot have its prose
attributed to the question above it — visible in the live output, which carries
7 questions, not 8.

**A loosened matcher is exactly the change whose blast radius you cannot judge
from the one article that motivated it**, so `scripts/seo/faq-emitter-corpus-check.mts`
runs the rule over every article in the database:

```
articles in DB: 86
  emit via Soalan lazim block: 47
  emit via whole-body Q&A:     1
      apa-itu-mas-kahwin (7 Q, published)
  emit nothing:                38
```

One article, the one it was written for. The next-densest article in the corpus
is at **0**, so nothing sits anywhere near the threshold — which is the state a
threshold should be in, and is the reason 75% is defensible rather than tuned.

Re-run after the corpus grew to 89, without any code change:

```
articles in DB: 89
  emit via Soalan lazim block: 74
  emit via whole-body Q&A:     1
      apa-itu-mas-kahwin (7 Q, published)
  emit nothing:                14
```

Still one, and `74 + 1 = 75 present` with `14 emit nothing` reconciles exactly
against the live census's `75 / 0 / 14`. Three articles arrived between the two
runs and none of them tripped the new path.

## 14 — not applicable, named

`scripts/seo/faq-not-applicable.json`, one line per slug:

| slug | why |
|---|---|
| `amankila-bali` | Real-wedding feature: Leeana and Tim's story, then a vendor credit list. |
| `grand-hyatt-kuala-lumpur` | Real Wedding Edit, visual-only. 93 words of series intro and credits. |
| `the-danna-langkawi` | Real Wedding Edit, visual-only. 107 words. |
| `marriott-putrajaya` | Real Wedding Edit, visual-only. 85 words. |
| `sime-darby-convention-centre` | Real Wedding Edit, visual-only. 99 words. |
| `villa-warisan` | Real Wedding Edit, visual-only. 96 words. |
| `jw-marriott-kuala-lumpur` | Real-wedding feature: Diana and Syafiq, narrative plus credits. |
| `cheong-fatt-tze-mansion` | Real-wedding feature: Irynna and Duncan, narrative plus credits. |
| `sentosa-janda-baik` | Real-wedding feature, narrative plus credits. |
| `yasaka-shrine` | Real-wedding feature: Nana and Afif in Kyoto. |
| `perkahwinan-di-ruma-hotel-…-peranakan` | Real-wedding feature: Yie Chern and Azalea. |
| `perkahwinan-taman-kebun-…-hulu-langat` | Real-wedding feature: Inas and Khairul. |
| `perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` | Real-wedding feature: Anis and Ming Jun. |
| `perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` | Real-wedding feature: Nailah and Hakim. |

All fourteen were verified by reading the body out of the database, **not by
their category** — the categories `real-wedding`, `glamor-eksklusif`,
`moden-kontemporari`, `minimalis-mewah` and `pantai-santai` would have given the
same fourteen, but by a route that would have been wrong the first time a guide
landed in one of them.

**The register is deliberately only half the test.** The census will not report a
slug as `not-applicable` unless it *also* measures fewer than two question-shaped
headings on the live page. A reason written by hand cannot excuse an article that
visibly does have Q&A, and an article with no reason and no questions is reported
`absent` and fails the run. That is what makes the file a decision rather than an
escape hatch.

## 24 — the content, and the gate that guards it

120 question-and-answer pairs across 24 articles, drafted by the two writer seats
against the authored body text and nothing else, humanizer-passed, and appended
to the live article bodies. They are placed before the article's closing section
(`Sumber`, `Kesimpulan`, `Langkah seterusnya`) — where the 47 articles that
already carry a block put theirs.

**The failure this item actually risks is not an invented QUESTION. It is a
plausible ringgit figure inside an answer**, because nobody catches those by
reading — they read exactly like the real ones. So the guard is a script, not
care:

`scripts/seo/faq-verify-support.mjs` extracts every fact-bearing token from each
answer — money, years, statute sections, proper nouns — and asserts it appears in
that article's own body.

```
120 answers checked, 0 file(s) failing
```

**Negative control**, because a gate that passes everything proves nothing. A
deliberately fabricated answer (`RM77.50` for Terengganu, sourced to a circular
dated 14 Mac 2024) added to a clean file:

```
  FAIL      rukun-nikah
              UNSUPPORTED TOKEN "RM77.50" in: Berapa bayaran pendaftaran nikah di Terengganu?
              UNSUPPORTED TOKEN "2024" in: …
              UNSUPPORTED TOKEN "Terengganu" in: …
              UNSUPPORTED TOKEN "Mac" in: …
              UNSUPPORTED TOKEN "Pejabat" in: …
              UNSUPPORTED TOKEN "Daerah" in: …
gate exit: 1
```

**Its stated limit, so nobody over-trusts it:** it cannot catch an answer that
reuses the body's own numbers to say something the body does not say. That is
what the `support` field and the editorial read are for, and both were done. A
gate that catches the mechanical half is worth having; pretending it catches the
other half is not.

### One question was rewritten by hand, and the gate could not have caught it

`hantaran-tunang` came back with *"Perlukah sirih junjung dalam hantaran
tunang?"* Every token in the answer is in the body — it passes cleanly. But the
body states that adat as pan-Malay with no state, no community and no JKKN
record behind it, and a `Perlukah…?` question would have turned an unsourced
framing into a **HelloKahwin ruling**. Reworded to *"Apa peranan sirih junjung
dalam hantaran tunang?"* — descriptive, same answer, no ruling issued.

The writer flagged it; the script could not have. That is the shape of what a
token check does not cover.

## Validity, checked rather than assumed

Every emitted block parses as JSON — the census `JSON.parse`s each one and calls
a block that does not parse `invalid-json`, which is the single state a text grep
would score as a pass. **0 across all 88 URLs.**

Then externally, through `validator.schema.org` (`scripts/seo/faq-validate-schemaorg.mjs`).
The three highest-impression URLs the brief names:

```
VALID    5 Question  0 error, 0 warning   https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding
VALID    5 Question  0 error, 0 warning   https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang
VALID    5 Question  0 error, 0 warning   https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin
```

…plus 27 more URLs in a sweep at 18:28, every one `0 error, 0 warning`. **30 URLs
externally validated clean, against a DoD floor of five.**

### The full 74-URL sweep did NOT complete, and the reason is my own mistake

I wanted all 74 rather than the five the DoD asks for, on the argument that no
block here is hand-written — validity is a property of the emitter, so five
samples of one emitter tell you about the emitter rather than about the corpus,
and running all of them is cheap.

It was not cheap, because **I started a second sweep while the first was still
pending**, and the two raced. The validator does not merely rate-limit per
request; at that combined rate it blocks **by IP**, through Google's
infrastructure:

```
18:43:34 429 -> https://www.google.com/sorry/index?continue=https://validator.schema.org/validate…
18:49:05 429
```

Both sweeps died on their first URL. The block outlasted the session.

This is the same shape as SEO-05's six-wide title sweep on 26 Aug: **a concurrent
sweep manufactured the very contention it was trying to measure.** I have that
written in my own persona and I did it again, in a different service, forty
minutes after quoting the rule in a code comment about running the census
sequentially. Knowing a rule and applying it to the next thing you touch are
different acts.

**What is claimed, precisely:** 30 URLs validated externally at 0 errors and 0
warnings, including all three the DoD names. All 89 URLs parse as JSON and pass
the required-property check. The remaining 44 have **not** been through
validator.schema.org and are not claimed to have been. They are emitted by the
same code path as the 30 that were, which is a reason to expect them to pass, not
evidence that they did.

The script reports the block as **exit 2, UNREACHABLE** rather than as a
validation failure, and that distinction is deliberate: "the validator would not
talk to me" and "the markup is wrong" are different outcomes, and a checker that
conflates them is a checker somebody switches off.

### So the conformance check moved in-house (PR #48)

Depending on a third party for a gate that has to run on every future article was
the actual defect the block exposed. The census now asserts schema.org's required
properties for `FAQPage` itself, on every run, over every URL: `mainEntity`
non-empty; every member a `Question` with a non-empty `name`; every one carrying
an `Answer` with non-empty `text`. A block that fails gets its own state,
`invalid-shape`, rather than passing as `present`.

`--selftest` is its negative control, because a validity gate nobody has watched
fail is not a gate:

```
$ node scripts/seo/faq-schema-census.mjs --selftest
  ok    0 error(s), expected 0  a well-formed block
  ok    1 error(s), expected 1  mainEntity missing
  ok    1 error(s), expected 1  mainEntity empty
  ok    1 error(s), expected 1  question not a Question
  ok    1 error(s), expected 1  question name empty
  ok    2 error(s), expected 2  acceptedAnswer missing
  ok    1 error(s), expected 1  acceptedAnswer text empty

SELFTEST EXIT: 0
```

Live, with it active — and the corpus had moved again, to **89**:

```
FAQPage census — https://hellokahwin.com — 2026-08-31T18:48:27Z
articles in sitemap: 89
  present:         75
  absent:          0
  not-applicable:  14
  invalid:         0  (unparseable JSON, or an FAQPage that fails schema.org's required properties)
  fetch-failed:    0
  questions emitted: 331

FAQ CENSUS EXIT: 0
```

External validation remains the authority and the script stays; it is now the
periodic audit rather than the gate.

### And it is visible on the page, which is the condition Google actually puts on FAQ markup

Live HTML of `/artikel/nikah-undang-undang/rukun-nikah`, `<script>` blocks
stripped:

```
h2 Soalan lazim
h3 Bolehkah nikah tanpa wali?
h3 Siapa menjadi wali jika bapa sudah meninggal dunia?
h3 Perlukah saksi nikah terdiri daripada dua orang lelaki?
h3 Sahkah nikah yang menggunakan wali hakim dilantik sindiket?
h3 Adakah akad yang cukup rukun bermakna perkahwinan itu sudah didaftarkan?
h2 Sumber
```

…with the answer prose rendered under each: *"Bolehkah nikah tanpa wali? Tidak.
Wali ialah rukun ketiga dalam senarai lima rukun yang diterbitkan Masjid Wilayah
Persekutuan, dan tanpa wali tiada akad…"* The article's table of contents picked
up the five new anchors on its own.

## Reversibility

`docs/work-done/sep-01-2026-session-01/sep-01-2026-seo-13-UNDO/` — 24 complete
prior `content` documents, **written and pushed before the write they reverse**.
`faq-apply-blocks.mts --apply` refuses to run unless the full undo set is already
on disk. Verified pre-write: none of the 24 snapshots contains a `Soalan lazim`
heading node.

```
pnpm exec tsx scripts/seo/faq-apply-blocks.mts --undo <undo-dir> --apply
pnpm exec tsx scripts/seo/faq-apply-blocks.mts --undo <undo-dir> --slug rukun-nikah --apply
```

`fts` was deliberately not touched. The column exists but nothing reads it —
HelloKahwin's search route is a title/excerpt `ILIKE`, inherited from twn-new
where a hybrid fts search did exist. Recorded so the next reader does not have to
re-derive that the tsvector is stale on purpose.

## Checks

| | |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | 461 passed, 33 files (`faq-schema.test.ts` 15 → 22) |
| `pnpm lint` | 0 errors (156 pre-existing warnings; 3 prettier files are pre-existing `brand/*`) |

---

## Things the writer seats flagged in the live bodies — NOT fixed here, and out of scope

Both writers read 24 article bodies closely, which nobody had done in one pass
before. They found defects that are real and are not mine to fix inside this
item. Recording them so they are not lost:

**Factually wrong or contradictory**
- `dewan-kahwin` §10: the heading says "Dewan MBSA Seksyen 7" and the first
  sentence of the same section says "Dewan Lavender Seksyen 7". Two hall names,
  one entry.
- `dewan-kahwin`: every price is "sekitar RM3,000 / RM3,800 / RM4,000", no source
  and no check date — on an article whose entire promise is a price, sitting
  beside `harga-sewa-dewan-kahwin` which sources every figure to a council rate
  sheet.
- `tempat-honeymoon-di-malaysia`: "Summer Bay Lang Tengah Island Resort" listed
  under Perhentian (Lang Tengah is a different island); "Borneo Sepilok
  Rainforest Resort" listed under Mulu (Sepilok is in Sandakan, Sabah);
  "Bungaraya Island Resort" appears under two different locations.
- `goodies-kahwin` contradicts itself: fourteen items recommend printing the
  couple's name, then a later section warns against exactly that.
- `kursus-kahwin`: the Pulau Pinang row reads "RM100 rising to RM120 mulai
  1 September 2026" — which is today. Two national claims ("dua hari, 13 jam";
  "semua negeri tidak menetapkan tempoh luput kecuali Johor dan Melaka") carry no
  source, in an article whose whole argument is that nothing here is national.
- `hantaran-tunang` carries no sources at all.

**Currency-register candidates**
- `cincin-tunang` anchors a price to the Bank Negara Kijang Emas rate for a
  single day (24 Ogos 2026). A daily metal price on an evergreen page.
- `dewan-kahwin`'s undated prices, above.

**Coverage question for my own seat**
- `majlis-kahwin` holds the head term as its slug but the article is
  "10 Lokasi Majlis Kahwin di Shah Alam". The page is not answering the head
  query it is named for.

Typos found and left: "Pembuburan perkahwinan", "Direktor Penganjur Kursus",
"antaran dua insan", "iasaskan", "bangunan koolonial", "faya moden", "45
kiometer", a stray backtick in "\`1500 meter".

---

## Retrospective

### What we learned that is not written down

**A coverage count and a build count are different jobs, and an item that looks
like one is often mostly the other.** 39 absent decomposed 24 : 14 : 1. Reading
the brief, the natural first move is to open the emitter — and the emitter was
1 of 39. The move that would have wasted the sprint is the one the item's title
invites.

**The dangerous direction for a new gate is NOISY, not quiet.** My support gate's
first run failed 20 of 24 files and **16 of those were the gate**, on Malay
sentence openers — `Ambil`, `Ketiga`, `Bergantung`, `Macam`, `Sahkah` — read as
proper nouns. This company's twelve tabulated instances are all about a check
returning a false ABSENCE. This one returned false ALARMS, and that fails
differently and worse: a gate that cries wolf on two thirds of a clean corpus is
a gate somebody switches off, and then the one real fabrication walks through
unopposed. The fix was not a longer stop-word list, it was asking the right
question — **capitalisation is only a signal where it is not already explained by
sentence position.**

**Malay needs its own tolerances and nobody had written them down.** Two more
real facts were scored as fabrications: `1,000` against a body that writes
`1000`, and `Instagramnya` against a body carrying `Instagram` fourteen times.
Thousands separators and the clitics `-nya`, `-lah`, `-kah`, `-pun`, `-mu`, `-ku`
are not edge cases in this corpus, they are the ordinary case. Any future
text-matching tool on this site needs both, and both are now in
`faq-verify-support.mjs` with the reasoning attached.

### What we did twice that we should never repeat

**Answered the same question with two different predicates, and one of them was
wrong.** The write script and the corpus check each asked "does this article
already carry a `Soalan lazim` block?", and each answered it independently with
`/soalan\s+lazim/i` over `JSON.stringify(content)`. That predicate reported
`bajet-kahwin` and `checklist-kahwin` as already having a block. **Neither does.**
Both *cite the Jabatan Agama Islam Selangor "soalan lazim" page as a source, in
prose:* `"mengikut soalan lazim rasmi Jabatan Agama Islam Selangor"`.

A string test over serialised JSON cannot tell a heading from a citation, and it
had silently dropped two articles from the dry run of a coverage job whose entire
deliverable is a coverage count.

**And this is the SECOND time, on the SAME TWO ARTICLES.** SEO-10's closure entry
in `ceo-memory.md`, four days earlier, records exactly this:

> *"The census counted 31 and the real number is 29 — `bajet-kahwin` and
> `checklist-kahwin` carry no block at all, and the detector behind the count was
> looser than the block it named."*

Same two slugs, same cause, four days apart. The first occurrence was diagnosed
correctly and written down **in prose, in the CEO's memory file**, where it did
not fire — and I then reproduced it twice in one afternoon, in two scripts,
without ever having connected the sentence I had read to the regex I was typing.

**A defect recorded as a sentence is a defect that recurs.** The executable form
it should have had the first time is what shipped this time: one exported
`hasFaqBlockHeading()`, and a unit test whose fixture is the literal JAIS
citation that fools the regex —

```ts
expect(/soalan\s+lazim/i.test(JSON.stringify(citesTheJaisFaqPage))).toBe(true);
expect(hasFaqBlockHeading(citesTheJaisFaqPage)).toBe(false);
```

The first line is in the test on purpose. It asserts that the WRONG check still
returns true, so the test documents the trap rather than merely avoiding it.

What caught it was not diligence. The dry run printed
`skip bajet-kahwin — already carries a Soalan lazim block` for two articles the
live census had just called `absent` with **zero** question headings, and those
two statements cannot both be true. **The contradiction did the work.** Had the
predicate been wrong in the other direction — reporting a block as absent — the
script would have written a second block into an article that had one, and
nothing on screen would have disagreed with anything.

Both scripts now call one exported `hasFaqBlockHeading()`, which asks the
document rather than the string, and the live failing case is a unit test.

**A rule you can quote is not a rule you are applying.** Forty minutes after
writing *"SEQUENTIAL, deliberately. A concurrent sweep of this site manufactures
the render contention it is trying to measure"* into the census as a code comment,
citing SEO-05 by date, I ran two concurrent sweeps against validator.schema.org
and got the machine IP-blocked. The rule was in my persona, in my hands, and in a
comment I had just typed. It applied to a different service, so it did not fire.

The durable form is not "remember harder". It is that **the sequential discipline
belongs in the tool, not in the operator** — the census enforces it structurally
because its loop is written that way, and that is why the census never had this
problem. The validator script took a `--delay` flag instead, which is a setting
rather than a structure, and a setting does not protect you from starting the
program twice.

**And one near-miss on the docs line itself, recorded because it would have hurt
somebody else rather than me.** I amended this log and `git push -f` to
`feat/command-centre-dashboard` — a branch roughly ten concurrent agents commit
to. It was safe only by luck of timing: the reflog shows the ref went
`f3aa0b2 -> 35f6373 -> 2ba1751`, both of the latter mine, and the diff between
them is exactly my own 14 added lines. Had anyone pushed in the ninety seconds
between, their commit would be gone and `git status` would have read clean for
them afterwards.

**On a shared branch, amend-and-force is never worth the tidier history.** Append
a commit. The correction to this very paragraph was pushed as a new commit for
that reason.

### What we nearly shipped, and what caught it

**Nearly wrote 24 blocks and left 2 articles behind**, per the above. The count
would have read 72 present / 2 absent and looked like a corpus that had moved.

**Nearly took `not-applicable` to mean "has no block yet".** The DoD's literal
wording — *"every article with genuine question-and-answer content emits valid
FAQPage"* — can be read so that an article that has no Q&A section today is not
"an article with genuine question-and-answer content", and therefore
not-applicable. Under that reading this item is one emitter fix and 38
not-applicables, closable in an hour, ending at 48 of 86 with the count landing
"where it lands". Every article the WHY section names as the reason the item
exists — `borang-nikah`, `rukun-nikah`, `syarat-sah-nikah`, `dewan-kahwin`,
`garden-wedding`, `hantaran-tunang` — files as not-applicable under it.

**A DoD reading that files the item's own stated targets as out of scope is a
narrowing wearing literalism's clothes.** What settled it was reading the WHY
against the reading, not reading the DoD harder.

### Which document must change, and the edit

`ceo-memory.md` carried **"31 articles emitting no FAQ schema"**. It was a hand
count taken once, then quoted for two sprints while the corpus grew 85 → 88. The
brief's own WHY section says so: *"THAT FIGURE WAS STALE"*.

Correcting the number would repeat the mistake, because the next hand count goes
stale the same way. **Prose rules do not fire, and neither do prose numbers.**
The edit is therefore executable and already shipped in PR #41:

> **`scripts/seo/faq-schema-census.mjs`** — walks the live sitemap, parses the
> JSON-LD, and **exits non-zero** while any article is absent or any block is
> invalid. The figure is now something you *run*, not something you *quote*.

**And the edit to `ceo-memory.md` is made, not just named.** Its "SEO defects open
on the live site" section now opens with a `SUPERSEDED — DO NOT QUOTE A NUMBER
FROM THIS SECTION. RUN THE CENSUS.` block carrying the command, its three exit
codes, the live figures with their timestamp, and the corpus's own history of
going stale: 69 → 85 → 86 → 88, with `31` wrong, `29` right on the day and `46`
one short. The original closure is kept underneath so the correction is visible
rather than a silent overwrite.

That block also carries two things the section had lost:

- the `bajet-kahwin` / `checklist-kahwin` detector bug **recurred**, and the
  diagnosis is now a function rather than a sentence;
- the "price FAQ at zero for Google Search" ruling still stands, and SEO-13 must
  not be booked as SERP real estate.

Three further edits landed in the site PR:

> **`src/lib/inspire/faq-schema.ts`** — `hasFaqBlockHeading()` exported, so the
> "does this article have a block?" question has exactly one definition. It had
> two, and one was wrong.

> **`scripts/seo/faq-verify-support.mjs`** — the anti-fabrication rule as a
> runnable gate with a negative control, replacing the brief's prose instruction
> not to invent questions.

> **`scripts/seo/faq-schema-census.mjs --selftest`** — schema.org's required
> properties for `FAQPage` asserted in-house on every run, with seven cases that
> each prove the rule fires and clears. Validity no longer depends on a third
> party being reachable.

> **`src/lib/inspire/__tests__/faq-schema.test.ts`** — the JAIS-citation fixture,
> which asserts that the *wrong* check still returns true. The trap is documented
> in the suite rather than merely avoided in the code.

---

## Files

| | |
|---|---|
| Census (+ shape check, `--selftest`) | `scripts/seo/faq-schema-census.mjs` |
| Support gate | `scripts/seo/faq-verify-support.mjs` |
| schema.org validation | `scripts/seo/faq-validate-schemaorg.mjs` |
| Emitter blast-radius check | `scripts/seo/faq-emitter-corpus-check.mts` |
| Write + undo | `scripts/seo/faq-apply-blocks.mts` |
| Body dumps (drafting input) | `scripts/seo/faq-dump-absent.mjs`, `faq-dump-slugs.mjs` |
| Not-applicable register | `scripts/seo/faq-not-applicable.json` |
| Emitter | `src/lib/inspire/faq-schema.ts` |
| Tests | `src/lib/inspire/__tests__/faq-schema.test.ts` (15 → 22) |
| Drafts, spec, before-census | `docs/work-done/sep-01-2026-session-01/sep-01-2026-seo-13-EVIDENCE/` |
| Undo | `docs/work-done/sep-01-2026-session-01/sep-01-2026-seo-13-UNDO/` |
