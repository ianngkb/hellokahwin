# Done: CONT-08 — C2.5 Nisbah, duit hantaran & etika, opened and completed at 8/8, LIVE

**Task:** Brief `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-08.md`
**Owner:** `writer-adat-agama-prosedur` · **Date:** 26 Ogos 2026 · Sprint 02, CONT-08, 8 points
**Status:** SHIPPED. Eight articles ingested to PRODUCTION, eight 200s on first
request, all eight on the pillar page, sitemap 78 → 86, cluster verified 8/8.
**Undo:** written, dry-run-proved and committed BEFORE the first write —
site repo `docs/work-done/2026-08-26-publish-cont-08-c25-UNDO.{md,sql}`, commit `0098727`.
**Evidence:** site repo `docs/work-done/2026-08-26-publish-cont-08-c25-EVIDENCE/`
(pre-state, ingest transcript, undo dry run, every proof body, both sitemaps).
**Build log:** site repo `docs/work-done/2026-08-26-publish-cont-08-c25.md`.

The eight topics are the eight in the cluster plan, section C2.5 — the five the
DoD names plus the three remaining mapped topics read from the plan, not
invented (topics 6, 7 and 8: arriving at a figure without losing face,
mixed-state customs, and obligation vs adat vs recent invention).

---

## 1. Claim, evidence, live link — per article

Ingest transcript: `…-EVIDENCE/ingest-run.log` (eight blocks, each ending
`exit=0`). Proof sweep: `…-EVIDENCE/proof/proof.txt` — serial, 4 s apart,
bodies kept; all eight cold renders `200 / x-vercel-cache: MISS / age=0` at
103–130 KB with no robots meta.

| # | Claim (what the article settles) | Live link (200 on first request, 26 Ogos 2026 15:38Z) |
|---|---|---|
| 1 | What the dulang ratio means, why the bride's side answers with more, and what is actually recorded about where the custom came from | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/nisbah-hantaran> |
| 2 | What 5 balas 7 means and the lazim contents of all twelve trays, both directions | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin-5-balas-7> |
| 3 | What 3 balas 5 means at an engagement, how it differs from the nikah hantaran, and who owns the hantaran if the engagement breaks | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-tunang-3-balas-5> |
| 4 | Whether the ratio must be odd (no authority requires it; 18/45/37 in the one measured survey) and the three lazim outs when a family insists on even | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/bilangan-dulang-hantaran-ganjil> |
| 5 | What duit hantaran is, how it differs from mas kahwin, who is entitled to it, and the gazetted Selangor exception | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/duit-hantaran-kahwin> |
| 6 | How a family arrives at a figure without either side losing face — four ordered steps, the sentences to say, no figure of our own | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/cara-tetapkan-duit-hantaran> |
| 7 | What is actually recorded as differing by state (a six-row table, each row named and sourced) and the tie-breaks when two families' customs collide | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/adat-hantaran-berbeza-negeri> |
| 8 | Which expectations are religious obligation (one), which are adat (everything on a tray), and which are recent invention (most of today's tray contents) — the highest-risk article, verification-passed before the board pass | <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat> |

**Cluster verified 8/8, from the database, not the brief:**
`select count(*) from article_categories … where pillar_code='C2.5'` → **8**
(`…-EVIDENCE/proof/proof.txt`). P2 pillar 13 → 21 published. The pillar page
body links to all eight (`links-to-eight=8` on the pillar probe).

**Sitemap** 78 → 86, all eight present (`sitemap-before.xml`,
`proof/sitemap-after.xml`). Resubmitted to GSC 15:40Z via the `gsc` service
account — the ingest runner itself had no GSC credential and printed the
"GOOGLE WAS NOT TOLD" banner; the resubmission closed it.

**What cannot be verified from outside:** whether Google has processed the
resubmitted sitemap ("Status: Pending processing") — only Search Console will
show that, days from now on this property's record.

## 2. Every entitlement/ruling claim carries its authority and date

The distinction block (voice notes §4.2) opens all eight articles, and every
hukum-word sentence names its authority in the same or adjoining sentence — a
mechanical sweep for unattributed `wajib/haram/sunat/harus/sah/hibah` sentences
ran clean after two fixes. The authorities actually used, all read at source on
26 Ogos 2026:

- **Seksyen 2, Enakmen UUKI (Pulau Pinang) 2004** (and the identical Melaka
  2002 / Kedah 2008 / Terengganu 2017 definitions, per the verified C2.4 base) —
  mas kahwin wajib, the only wajib.
- **Fatwa Selangor diwartakan 4 Feb 2010 (Sel. P.U. 3)** — wang hantaran
  "dikira sebagai Maskahwin"; stated as Selangor's alone, never generalised.
- **Jabatan Mufti Negeri Selangor, e-musykil** (2019: hantaran = hadiah/hibah
  bersifat sunat, tak boleh dituntut semula; 2020: bride's right in Selangor,
  parents cannot take without permission; 2022: guest sumbangan follows the
  recipient).
- **Pejabat Mufti Wilayah Persekutuan** — Irsyad 350 (26 Dis 2019, qabdh,
  mahar not reclaimable, adat cannot mewajibkan), Irsyad 794 (29 Ogos 2023,
  engagement hantaran reclaimable if the marriage does not happen), AL-KAFI
  #1137 (4 Mac 2019, walimah sunat muakkad on the groom, two majlis harus
  absent israf).
- **Kamus Dewan Edisi Keempat via PRPM** — hantaran/wang hantaran = belanja
  hangus "untuk perbelanjaan perkahwinan"; the dictionary's own example is
  "tujuh dulang".
- **Perpustakaan Awam Perlis, Jurnal Warisan Indera Kayangan Bil. 15 (2003)** —
  the old hantaran inventory, engagement smaller than nikah, staged payment.
- **UiTM ICOMHAC2015** (Che Zaharah Abdullah et al., n=100 Shah Alam) — the
  5-balas-7 pattern; ganjil 18/45/37; hantaran tinggi 70/14/16; always framed
  as a survey of 100 people, never as a rule.
- **JKKN Pemetaan Budaya** — Sarawak Malay record (bride's side returns more;
  the unmarried elder sister's gift) and the **Orang Sungai Buludupi (Sabah)**
  record for the odd-number sentence, cited as that community's record, not as
  Malay adat.
- **Kanun 34(1) 2022** (Kamal & Sitiris, UIAM; DOI 10.37052/kanun.34(1)no7) —
  mas kahwin pronounced in the ijab, wang hantaran not, both in the sijil;
  cited from the abstract only (the PDF endpoint 404s; noted honestly).

**Recorded negatives, published as findings:** no authority fixes the ratio,
the tray count, or the odd rule; no source records WHY the bride's side gives
two more (the articles say so instead of inventing a reason); Kelantan's
"hantaran counts as mas kahwin" practice has no findable JAHEAIK document and
is printed as unconfirmed; **JAKIM e-SMAF was unreachable (ECONNREFUSED) all
day and is cited nowhere.** No count of no-minimum states is printed outside
A1, which owns it (voice-notes amendment). No ringgit figure appears in the
cluster except one clearly hypothetical "RM15,000" inside suggested dialogue.

## 3. Review board, humanizer, and the gates — one dispatched agent, stated plainly

Like CONT-01, this run could not convene `/bmad-party-mode`; the seats were run
as sequential passes by one agent, and that departure is named here, not
buried. What the passes changed, in order:

1. **Verification pass (before the board pass, as the voice notes require for
   topic 8):** hukum-word sweep → two sentences re-attributed inline; the
   A5 cover credit corrected from my "CC BY-SA 3.0" to the register's
   **CC BY 3.0**; the misattributed "ganjil" quote caught (see retrospective);
   Kanun cited abstract-only after the PDF 404.
2. **Chair pass (countable style checks):** metas recounted to ≤155 (three
   rounds — see retrospective), every paragraph ≤55 words (45 splits), FAQ
   answers 40–60 words (the split pass broke five; re-merged), zero banned-list
   hits outside quotations, zero `anda` overruns, sentence averages 13.3–16.1.
3. **S15 cuts, one per article** — e.g. A1 lost "dan itu jawapan yang jujur",
   A4 lost "dan itu dilaporkan di sini sebagai dapatan, bukan kekurangan",
   A7 lost the "Perhatikan apa yang tidak ada" reveal.
4. **`/humanizer` AFTER revision** — 21 substitutions (bold mini-labels out of
   all three numbered lists, three dramatic fragment pairs merged, two staged
   reveals flattened); zero em/en dashes, zero curly quotes, zero bold spans in
   all eight bodies afterwards.
5. **Dry run re-taken after every later edit** — final state: A1 exits 0
   outright; A2–A8 refused ONLY on in-batch sibling links, which is the
   parser working as designed and was resolved by ingesting in dependency
   order (each file links only to earlier siblings — the CONT-03 rule,
   delivered as link + order rather than dropped links).

## 4. Images: 8 covers, 21 placements, 8 new photographs, register at 802 rows

Register: rows **HK-P-0077..0084** appended, ten reuse rows patched at
`digunakan_dalam`, before-copy kept
(`docs/asset-register/asset-register.csv.before-cont08`; diff = 8 added rows +
10 edited cells). `validate.py`: PASS across 35 articles, 152 references.

Covers, by the CONT-09 subject rule — subject named first, library queried
first, every source ≥2464×2400 so nothing is upscaled:

| Article | Cover subject (one noun phrase) | File | Note |
|---|---|---|---|
| nisbah-hantaran | dulang hantaran | S-gubahan-kain-hantaran (4000×6000) | **Mediocre-note on file:** only two trays in frame, no licensable Malaysian tray ROW ≥Q1 exists; upgrade list |
| hantaran-kahwin-5-balas-7 | dulang berbalas disusun | S-dulang-hantaran-tunang-lantai (3888×2592) | **Mediocre-note:** monochrome, low-right subject; focal point flagged |
| hantaran-tunang-3-balas-5 | dulang cincin tunang | S-cincin-tunang-dulang (3168×4752) | sharp, centred |
| bilangan-dulang-ganjil | bilangan dulang yang dipersetujui dua keluarga | S-bincang-hantaran-dua-keluarga (4752×3168) | **Mediocre-note:** flash light, busy room; subject exact |
| duit-hantaran-kahwin | saat lafaz akad (Rule 3 — the rule photographed where it is used) | S-akad-tok-kadi (3264×2448) | **Mediocre-note:** 2000s panoramio contrast |
| cara-tetapkan-duit-hantaran | perbincangan dua keluarga, hantaran di tengah | S-rombongan-lelaki-bincang-hantaran (3888×2592) | photographer's frame, window light |
| adat-hantaran-berbeza-negeri | adat arak-arakan payung kuning | S-arak-pengantin-lelaki-payung-kuning (5184×3456) | CC BY-SA share-alike noted in register |
| hantaran-wajib-atau-adat | tepak sirih, the oldest hantaran item | S-tepak-sirih-muzium-negara (4317×3053) | museum sharp, high contrast |

Zero text cards, zero `IMEJ` markers, zero `cover: ESCALATE` needed. Every
mediocre cover ships with its weakness written in the article file AND the
register `nota` — silent mediocrity is the thing CONT-09 existed to stop.

**The sourcing find:** `diloz` on Flickr is **Azlan DuPree** — already our
licensor via Wikimedia — and his "nizam + izmira // the engagement" set
(Gombak, 28 April 2012) is ~36 professional frames at 3888×2592, CC BY 2.0,
no watermarks. Five entered the library. Also rejected after download-and-look:
Mueaz Photography (burnt-in URL, again), OB Photography and mohamad fazil
(watermarks), zulhisam's 2006 Muar tray rows (500–800 px), the mylifestory
tray rows (1536×2048 — under the hero bar, kept in-article only).

## 5. Ship check (Stage 9b), all four commands accounted for

- Docs repo `git status --short` → clean after `ae1f4ba`; work-done + edits in
  this commit. `git rev-list origin/feat/cont-08-nisbah..HEAD` → 0 after push.
- Site repo: three commits (`0098727` undo before write, `815170c` evidence,
  build log), pushed, `rev-list` 0.
- **`pnpm --silent audit:drafts`: all eight at LIVE=DRAFT, 0 missing, 0
  extra.** The user-visible surface is §1's eight probes.
- The same audit lists **17 pre-existing articles whose drafts disagree with
  production — CONT-09's cover re-selection wrote new covers to the DB and the
  drafts still declare the old ones.** Direction reversed from CONT-02:
  production is AHEAD. **An `--update` from any of those 17 drafts would
  silently revert CONT-09's covers.** Not this brief's scope, not touched;
  named here for `managing-editor`/`head-of-seo-content` — the drafts need
  re-stamping with the selected covers before anyone updates them.

## 6. SEO coverage

Head terms each own one article: `hantaran kahwin 5 balas 7` (350) → A2,
`hantaran lelaki 5 perempuan 7` covered by A2's H1 phrasing and body,
`hantaran tunang 3 balas 5` (350) → A3, `duit hantaran kahwin` (350) → A5,
`duit mas kahwin` (200) → A5's distinction table, `hantaran kahwin 3 balas 5`
(150) → A3 FAQ. `maksud mas kahwin` (100) stays with `apa-itu-mas-kahwin`,
which owns it — no cannibalisation. The legacy `hantaran-kahwin` upgrade
(its `Ratio Hantaran` H2 → `nisbah`, per the voice notes) is the C2.1 upgrade
pass's item, not this cluster's; its ratio section now has eight deeper pages
to hand traffic to.

Internal links: 38 declared across the eight, all resolving at ingest; hub
links written in body prose only (the P7-A3 lesson); each article links its
pillar with the entity phrase.

---

## Retrospective

*(Stage 9 — written by the owner seat; the chair could not be convened in this
dispatch, same departure as §3.)*

### What did we learn that is not written down?

**`cover:` is required by `articleFileSchema`, so `cover: ESCALATE` cannot pass
ingest — a Rule 6 escalation does not stage an article, it stops it.** Stage 6b
reads as though ESCALATE is a shippable state. It is not: the only shippable
degraded state is Rule 7 Q5, correct-but-mediocre with a written note. A writer
planning a cluster must know that an unfillable cover slot means the article
misses the batch. (Also learned: Azlan DuPree = `diloz` on Flickr, a
36-frame CC BY professional engagement set; Flickr original sizes live on the
`/sizes/o/` page as `(W &times; H)`; and search-engine result summaries
misattribute quotes across result pages — see the near-miss.)

### Which document must change, and who owns the edit?

1. `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
   **Stage 6b**, owned by `managing-editor` — record that ESCALATE blocks
   ingest (ship-with-note or hold, never a placeholder), and add the Azlan
   DuPree/diloz seam to the "Where Malay wedding photography actually is" list.
2. `skillcentral/agents/projects/hellokahwin/Editorial/writer-adat-agama-prosedur.md`
   (buddy repo), owned by the editorial track — add the verify-the-quote-
   on-its-own-page rule from the near-miss below.

**Both edits are made** (this commit; the persona edit in the buddy repo).

### What did we do twice that we should never repeat?

Wrote metaDescriptions long three times: drafted over 155, trimmed by script
with a dumb truncation that mangled two mid-sentence, then rewrote by hand.
The check existed; the order was wrong. Write the meta LAST, to the counter,
once — the counter is not a repair tool. (Also ran the same licence-filtered
Flickr queries CONT-01 ran before reading its Stage 6b note fully; ten minutes
lost to a lesson that was already written down.)

### What did we nearly ship, and what caught it?

**A quotation attributed to the wrong culture's record — the exact class the
review board blocked in August.** The sentence "Bilangan dulang hantaran
diharuskan dalam bilangan ganjil…" surfaced in a search summary as Malay
wedding adat. Fetched at source, it belongs to JKKN's **Orang Sungai Buludupi
(Sabah)** record; the JKKN pages the summary pointed at for Malay adat contain
no such sentence (one is an Indian-customs page that also contains "ganjil").
What caught it was the standing rule: never cite a page you have not opened.
The article now cites the sentence AS the Buludupi record, explicitly not as
Malay adat — which made the honest article better, because the odd-number
custom crossing communities is itself the finding. Two smaller catches: my
cover credit said CC BY-SA 3.0 where the register's read said CC BY 3.0
(caught by diffing every credit string against the register before ingest),
and the paragraph-splitting pass silently pushed five FAQ answers under the
40-word floor (caught because every check re-runs after every edit — the
"a block expires when the file changes" rule, applied to style).
