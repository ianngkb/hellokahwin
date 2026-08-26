# The ingest gate never failed. The renderer did.

25 Ogos 2026 · **Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-credit-audit-all-live.md` (docs repo)
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Undo record:** `docs/work-done/2026-08-25-credit-audit-all-live-UNDO.md` + `.sql` — written before anything was touched.

The brief asked how one row got published without a credit. **No row did.**

Every image on every live non-legacy article carries a correct `credit`,
`license_class` and `licensor_name` in production, and every one of them matches
the asset register exactly. **109 media rows, 52 distinct files, zero
exceptions** — including three articles published mid-audit by a session that had
never heard of this audit. **Nothing needed `--update`. No production write was
made, because there was nothing to write.** The ingest gate has held on every
article it has ever passed.

The credit was being lost between the database and the reader, on a race that
the page loses whenever several articles render cold at once — and once lost it
was frozen into the cache for as long as a year. **That is worse than the brief
feared, not better: a bypassable gate publishes one bad article, and a lossy
renderer publishes an uncredited photograph on any page, at any time, with no
write, no log and no way to notice.**

**Outcome.** The renderer was fixed, the fix reached production (by a route
nobody planned — §4a), and it was then verified against live: two bare-URL
concurrency-8 sweeps of all 28 credit-bearing articles, the first of them **28 of
28 cold origin renders**, **zero failures on both** — against the same sweep shape
that stripped eight covers, then a different eight, on the old build. `-59`
reproduced it independently with a different method: 112 of 112 correct.

---

## 1. The mechanism, with the evidence

### 1.1 What was ruled out

`ucapan-pengantin-baru` and its cover, `S-tetamu-tiba-majlis-ahmad-ali-karim.jpg`:

```
media.id            d36e0e8e-637e-40b4-8900-bb011291eb63
media.url           …/inspire/ucapan-pengantin-baru/1787654608921-images-s-tetamu-tiba-majlis-ahmad-ali-karim.jpg
media.credit        'Kredit: Ahmad Ali Karim (CC0)'
media.license_class 'S'
media.licensor_name 'Ahmad Ali Karim'
created_at = updated_at = 2026-08-25T10:43:41.091Z   -- written once, never edited
articles.cover_image_url  byte-identical to media.url
```

That kills all three of the brief's candidate causes at once:

- **not "the field was written empty or whitespace"** — it is a full, correct credit;
- **not "the parser was bypassed"** — the row carries all three gated fields, and
  `created_at = updated_at` proves it was written in one insert and never patched
  afterwards;
- **not "the template only renders credits for in-article images"** — there is
  exactly one cover-credit render path (`page.tsx`, mobile `lg:hidden` and
  desktop `hidden lg:block`), it is unconditional on `article.coverImageUrl`, and
  the sibling `doa-pengantin-baru` renders through it correctly.

A fourth candidate — the exact-string join at `pillar-queries.ts:171` failing to
byte-match — is ruled out by query: **zero duplicate `media.url` values on
production, and exactly one media row per published cover, all 55 of them.**

### 1.2 What it actually is

`src/app/(public)/artikel/[category]/[slug]/page.tsx`, before this run:

```ts
let coverCredit = null;
if (article.coverImageUrl) {
  try {
    coverCredit = await withDeadline(
      getCoverCredit(article.coverImageUrl),
      budgetLeft(),                       // <- shared 4s budget, THIRD read
      `inspire-cover-credit:${slug}`,
    );
  } catch {
    // Non-critical — render the cover without the credit line.
  }
}
```

Three properties combine into the defect:

1. **It is a separate read, and it runs third** — after the article payload and
   after the pillar up-link — against **one shared 4-second budget** for the whole
   render (`startDeadlineBudget(4_000)`, floored at 250 ms per read). When the
   first two reads are slow, the credit read gets the 250 ms floor.
2. **Its failure is swallowed by a bare `catch {}`.** No Sentry capture, no log
   line. `ImageCredit` renders `null` for a falsy credit — by design, and right
   for the public page — so an uncredited cover is pixel-identical to a credited
   one. Nothing anywhere reports it.
3. **The result is then frozen.** The route is `export const revalidate = false`,
   and the edge serves `s-maxage=600, stale-while-revalidate=31535400`. **One
   unlucky render publishes an uncredited photograph for up to a year of
   stale-while-revalidate**, and the first request past the TTL is served the old
   copy while triggering the refresh (measured and documented in
   `src/lib/cache/purge.ts`).

The pool is the thing that makes it fire: `src/lib/db/drizzle.ts` is **5 wide**,
and this is the same shape as Sentry TWN-NEW-47 — *2,716 `deadline_exceeded:inspire-article:*`
errors in 48 h across 89 distinct slugs while the production DB sat at 1 active
connection*, quoted in `page.tsx` and pinned by `article-cache.test.ts`.

### 1.3 The reproduction — three sweeps on v7, one variable

Every sweep read the **live HTML** and asked only whether a reader can see a
credit. Same parser, same URLs, same day. The only thing changed was request
concurrency.

| Sweep | Method | Live non-legacy articles | Cover credit missing |
|---|---|---|---|
| **A** | 8 concurrent fetches | 24 | **8** (one of them a hard `504`) |
| **B** | 8 concurrent fetches | 25 | **8** — *a different eight* |
| **C** | 1 at a time, 6 s apart | 26 | **0** |

**Sweep B is the proof.** It ran after sweep A had already healed every page in
sweep A's miss list. Six articles that rendered a credit in A had lost it in B
(`apa-itu-mas-kahwin`, `syarat-sah-nikah`, `pakej-dewan-kahwin`,
`ucapan-pengantin-baru`, `inai-tangan-pengantin`, `cincin-tunang`) and four that
had lost it in A had it back. **Nothing was written to the database between A and
B.** The credit is not a stored property of the page; it is the outcome of a race.

Sweep C then re-rendered all 26 cold — every response
`x-vercel-cache: REVALIDATED, age: 0`, i.e. a genuinely fresh render, not a
cached one — and **26 of 26 carried the credit on the first try.**

Same data, same code, same minute: **8/25 uncredited at concurrency 8, 0/26 at
concurrency 1.** A crawler does what sweep A and B did.

**Read §4a before treating this as settled, and note precisely what is and is not
missing.** **The fix is verified under cold concurrency** — sweep F, 28 of 28
cold origin renders taken concurrently, clean. **The defect never was, and now
never can be.** None of these three v7 sweeps is both cold and concurrent: A and B
were concurrent but their edge state was not recorded, so neither can be claimed
as cold, and C was serial. **v7 is no longer deployed**, so the build that had the
defect cannot be measured again by anyone.

The v7 mechanism in §1.2 therefore rests on the code path, on
eight-and-a-different-eight across two identically-shaped sweeps, and on pages
that healed with no database write. That is a sound case and it is not a
cold-concurrent measurement, because none exists.

### 1.4 So what did the CEO see

A cached credit-less render of `ucapan-pengantin-baru`, produced during the
publish window at 10:43Z when eight articles were ingested back-to-back and each
`--revalidate-url` expired the whole `articles` tag, forcing the corpus to
re-render cold against a five-lane pool. The page was correct in the database the
whole time. **It is now serving the credit, and it lost it again during sweep B,
and it will lose it again on the next cold-render storm until the code change
below is deployed.**

---

## 2. Before and after — every live article, every image

"Own images served" counts the distinct image objects a page serves **from its
own `/inspire/<slug>/` path**, derivatives collapsed, read from the rendered
HTML. It excludes the related-article card thumbnails (which are other articles'
covers — see §5) and UI chrome.

### 2.1 The live non-legacy articles

| Article | Own images served | Cover credit - sweep A (concurrent) | Cover credit - sweep B (concurrent) | Cover credit - sweep C (serial) | In-body figures credited |
|---|---|---|---|---|---|
| `apa-itu-mas-kahwin` | 4 | yes | **NO** | yes | 3/3 |
| `mas-kahwin-melebihi-kadar-minimum` | 4 | yes | yes | yes | 3/3 |
| `mas-kahwin-pahang-negeri-sembilan` | 2 | yes | yes | yes | 1/1 |
| `mas-kahwin-kelantan-terengganu` | 2 | yes | yes | yes | 1/1 |
| `mas-kahwin-johor` | 2 | yes | yes | yes | 1/1 |
| `mas-kahwin-perak` | 2 | yes | yes | yes | 1/1 |
| `mas-kahwin-sabah-sarawak` | 2 | yes | yes | yes | 1/1 |
| `borang-nikah` | 2 | yes | yes | yes | 1/1 |
| `rukun-nikah` | 3 | **NO** | **NO** | yes | 2/2 |
| `syarat-sah-nikah` | 2 | yes | **NO** | yes | 1/1 |
| `lafaz-taklik` | 2 | **NO** | **NO** | yes | 1/1 |
| `harga-sewa-dewan-kahwin` | 3 | **NO** | yes | yes | 2/2 |
| `checklist-kahwin` | 2 | **NO** | yes | yes | 1/1 |
| `pakej-dewan-kahwin` | 2 | yes | **NO** | yes | 1/1 |
| `bajet-kahwin` | 2 | **NO** | yes | yes | 1/1 |
| `ucapan-pengantin-baru` | 1 | yes | **NO** | yes | 0/0 |
| `doa-pengantin-baru` | 1 | yes | yes | yes | 0/0 |
| `doa-majlis-perkahwinan` | 2 | yes | yes | yes | 1/1 |
| `baju-pengantin-sewa-atau-beli` | 2 | **NO** | yes | yes | 1/1 |
| `songket-tenunan-tangan-atau-cetak` | 2 | **504** | yes | yes | 1/1 |
| `inai-tangan-pengantin` | 1 | yes | **NO** | yes | 0/0 |
| `cincin-tunang` | 1 | yes | **NO** | yes | 0/0 |
| `taaruf-maksud` | 1 | **NO** | yes | yes | 0/0 |
| `doa-majlis-pertunangan` | 1 | yes | yes | yes | 0/0 |
| `contoh-kad-jemputan-kahwin` | 2 | n/a | yes | yes | 1/1 |
| `bunga-telur` | 3 | n/a | n/a | yes | 2/2 |
**Twenty-six rows, and there are now twenty-seven live non-legacy articles.**
`pelamin` was published at 11:31:49Z, seconds after the last sweep enumerated its
targets, and is under a standing block (§5) — so it appears in no sweep and is
deliberately absent from this table rather than missing from it. Its database
state was verified (§3a); its render was not.

`contoh-kad-jemputan-kahwin` and `bunga-telur` were published by a concurrent
session at 11:24Z and 11:30Z, mid-run. Both arrived with complete, register-matched
credits — the gate held on them too.

**In-body figures never missed, in any sweep.** They carry their credit baked
into `data-caption` at ingest time and rendered into a `<figcaption>`, so no
second read exists to lose. Every figure on every non-legacy article renders its
credit: 26/26 articles, every figure. That asymmetry is itself the diagnosis —
the credit that travels *with* the image survives; the credit fetched *separately*
does not.

### 2.2 The 29 legacy articles — reported, not fixed (brief §4)

| Article | Own images served | Cover credit rendered | Figures with a credit | `media` rows w/o `credit` |
|---|---|---|---|---|
| `amankila-bali` | 44 | **no** | 0/0 | 43/43 |
| `cara-buat-kad-kahwin-digital` | 6 | **no** | 0/0 | 5/5 |
| `cheong-fatt-tze-mansion` | 23 | **no** | 0/0 | 22/22 |
| `dewan-kahwin` | 12 | **no** | 0/7 | 11/11 |
| `garden-wedding` | 49 | **no** | 0/21 | 48/48 |
| `goodies-kahwin` | 12 | **no** | 0/0 | 11/11 |
| `grand-hyatt-kuala-lumpur` | 19 | **no** | 0/0 | 18/18 |
| `hadiah-untuk-pengantin` | 11 | **no** | 0/7 | 10/10 |
| `hantaran-kahwin` | 26 | **no** | 0/1 | 25/25 |
| `hantaran-tunang` | 14 | **no** | 0/2 | 13/13 |
| `jw-marriott-kuala-lumpur` | 23 | **no** | 0/0 | 22/22 |
| `kursus-kahwin` | 19 | **no** | 0/18 | 18/18 |
| `lokasi-pre-wedding-photoshoot-terbaik` | 20 | **no** | 0/16 | 19/19 |
| `majlis-kahwin` | 21 | **no** | 0/9 | 20/20 |
| `marriott-putrajaya` | 19 | **no** | 0/0 | 18/18 |
| `mas-kahwin-ikut-negeri` | 4 | yes | 3/3 | 3/18 |
| `pelamin-kahwin-dewan` | 5 | **no** | 0/4 | 4/4 |
| `perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan` | 34 | **no** | 0/0 | 33/33 |
| `perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson` | 37 | **no** | 0/0 | 36/36 |
| `perkahwinan-romantis-di-jen-shangri-la-puteri-harbour` | 46 | **no** | 0/0 | 45/45 |
| `perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat` | 21 | **no** | 0/0 | 20/20 |
| `sentosa-janda-baik` | 25 | **no** | 0/0 | 24/24 |
| `sewa-dewan-kahwin` | 9 | **no** | 0/0 | 8/8 |
| `sime-darby-convention-centre` | 21 | **no** | 0/0 | 20/20 |
| `tempat-honeymoon-di-malaysia` | 17 | **no** | 0/15 | 16/16 |
| `the-danna-langkawi` | 26 | **no** | 0/0 | 25/25 |
| `villa-warisan` | 23 | **no** | 0/0 | 22/22 |
| `wedding-planner-terbaik-di-malaysia` | 15 | **no** | 0/14 | 14/14 |
| `yasaka-shrine` | 22 | **no** | 0/0 | 21/21 |
**623 images served across the 29 legacy pages. Four carry a rendered credit,
and all four are on `mas-kahwin-ikut-negeri`** — the one legacy article the C2.4
cover swap has already upgraded. **619 uncredited images are on live pages
today.**

Three things the owner should know before working the list:

- **The "Source:" captions are not credits.** 117 legacy figures render a
  `<figcaption>` and 98 of them are distinct — `SOURCE: SPPIM` (×17),
  `Source: Tanarimba at Janda Baik`, `image: zach chin`, and so on. They name a
  venue or a blog post, not a photographer, and not one is backed by a licence.
  The asset register is explicit on this: *"a caption is a claim the old site
  made about a file"*, and all 682 inherited rows carry `license_class: TIADA`.
  **A page with a `Source:` caption is not in a better position than a page
  without one.**
- **`mas-kahwin-ikut-negeri` still has three uncredited `media_article_usage`
  rows** (`IN-MasKahwinIkutNegeri-Set`, `-AkadNikah`, `-SentosaJandaBaik`).
  Checked: they are **not in the article content and not served on the page** —
  the usage table was not reconciled when the cover swap replaced them. Data
  hygiene, not exposure. Worth a cleanup pass so the census stops over-counting.
- **The counts do not agree with the register's, and should not.** The register
  says 618 of 682 embedded, from the WordPress export. This run counts 623 served
  and 609 usage rows, from the live database and the live HTML. Different
  denominators measured on different days by different means; the live figures are
  the ones that describe what a reader is served today.

---

## 3. The pages fixed, with the live credit line quoted

Nothing was written to the database — there was nothing to write. What was fixed
is the **served HTML**: each page was re-requested serially until it re-rendered,
and every line below is quoted from the response, fetched **after** the fix.

Eight pages were serving a licensed photograph with no visible credit when this
run started (sweep A). All eight now render one — and to be exact about what
"fixed" means here: **the rows were never wrong, so nothing was written.** What
changed is the cached HTML, replaced by a fresh render. It is a repair, not a
cure; §3a and §5 say what the cure is.

| Page | Rendered credit line | Links to |
|---|---|---|
| `rukun-nikah` | `Kredit: Azlan DuPree (CC BY 2.0)` | commons.wikimedia.org/…/Nizam_%2B_Izmira_-_Ijab_Qabul_(8433807626).jpg |
| `lafaz-taklik` | `Kredit: Ahmad Ali Karim (CC0)` | commons.wikimedia.org/…/Majlis_Doa_Selamat_Pernikahan_Diraja_Raja_Muda_Selangor_06.jpg |
| `harga-sewa-dewan-kahwin` | `Kredit: raja abd kadir (CC BY 3.0)` | commons.wikimedia.org/…/Kahwin_-_panoramio_-_raja_abd_kadir.jpg |
| `checklist-kahwin` | `Kredit: Stress 043 (CC BY-SA 4.0)` | commons.wikimedia.org/…/Gendang_Perkahwinan_di_Johor.jpg |
| `bajet-kahwin` | `Kredit: mohd hasan / Pexels` | pexels.com/photo/smiling-family-at-a-wedding-15430837/ |
| `baju-pengantin-sewa-atau-beli` | `Kredit: Azman Aziz / Pexels` | pexels.com/photo/muslimah-wedding-01-22-11969448/ |
| `songket-tenunan-tangan-atau-cetak` | `Kredit: mohd hasan / Pexels` | pexels.com/photo/vibrant-traditional-malay-wedding-portrait-37097208/ |
| `taaruf-maksud` | `Kredit: Azman Aziz / Pexels` | pexels.com/photo/married-muslim-couple-muslim-culture-muslim-fashion-10258600/ |

The literal markup, verbatim from the live response for `rukun-nikah`:

```html
<p class="text-muted-foreground px-4 pt-2 text-xs lg:hidden"><a
 href="https://commons.wikimedia.org/wiki/File:Nizam_%2B_Izmira_-_Ijab_Qabul_(8433807626).jpg"
 class="underline underline-offset-2 transition-opacity hover:opacity-80"
 target="_blank" rel="noopener noreferrer">Kredit: Azlan DuPree (CC BY 2.0)</a></p>
```

and the desktop half of the same page:

```html
<p class="text-muted-foreground mt-2 text-right text-xs"><a
 href="https://commons.wikimedia.org/wiki/File:Nizam_%2B_Izmira_-_Ijab_Qabul_(8433807626).jpg"
 class="underline underline-offset-2 transition-opacity hover:opacity-80"
 target="_blank" rel="noopener noreferrer">Kredit: Azlan DuPree (CC BY 2.0)</a></p>
```

**All 26 live non-legacy articles were verified in the final pass**, every one
`200 / REVALIDATED / age 0` — a fresh render, not a cached one — and every one
carrying its credit. The other eighteen lines:

| Page | Rendered credit line |
|---|---|
| `apa-itu-mas-kahwin` | `Kredit: Azman Aziz / Pexels` |
| `mas-kahwin-melebihi-kadar-minimum` | `Kredit: Fyruz Alqadiri (CC BY-SA 4.0)` |
| `mas-kahwin-pahang-negeri-sembilan` | `Kredit: mohd hasan / Pexels` |
| `mas-kahwin-kelantan-terengganu` | `Kredit: Malexi (CC BY-SA 3.0)` |
| `mas-kahwin-johor` | `Kredit: Stress 043 (CC BY-SA 4.0)` |
| `mas-kahwin-perak` | `Kredit: Malexi (CC BY-SA 3.0)` |
| `mas-kahwin-sabah-sarawak` | `Kredit: Azman Aziz / Pexels` |
| `borang-nikah` | `Kredit: raja abd kadir (CC BY 3.0)` |
| `syarat-sah-nikah` | `Kredit: raja abd kadir (CC BY 3.0)` |
| `pakej-dewan-kahwin` | `Kredit: mohd hasan / Pexels` |
| `ucapan-pengantin-baru` | `Kredit: Ahmad Ali Karim (CC0)` |
| `doa-pengantin-baru` | `Kredit: Ahmad Ali Karim (CC0)` |
| `doa-majlis-perkahwinan` | `Kredit: Ahmad Ali Karim (CC0)` |
| `inai-tangan-pengantin` | `Kredit: Azman Aziz / Pexels` |
| `cincin-tunang` | `Kredit: Azman Aziz / Pexels` |
| `doa-majlis-pertunangan` | `Kredit: Ahmad Ali Karim (CC0)` |
| `contoh-kad-jemputan-kahwin` | `Kredit: mohd hasan / Pexels` |
| `bunga-telur` | `Kredit: Ahmad Ali Karim (CC0)` |

**Every one of those strings came from the asset register and none was written
by me.** All 52 distinct files behind the live non-legacy articles were joined to
`docs/asset-register/asset-register.csv` on `fail`: **52 found, 52 credits
matching character-for-character, 0 missing, 0 differing.** Nothing was invented,
and nothing needed to be.

---

## 3a. Re-census at 11:40Z — the row set moved under the audit

A concurrent CEO-approved run published the P5 `pelamin-kad-cenderahati` pillar
while this audit was running. The database at the time of the first UNDO capture
is not the database now:

| | 11:21:43Z (first capture) | 11:40:17Z (current) |
|---|---|---|
| `articles` (all published) | 53 | **56** |
| `media` | 739 | **747** |
| `media` with a `credit` | 116 | **124** |
| `media_article_usage` | 710 | **718** |
| `inspire_tags` | 56 | **65** |

The three articles are `contoh-kad-jemputan-kahwin` (11:24:56Z), `bunga-telur`
(11:30:25Z) and `pelamin` (11:31:49Z), with eight new `media` rows.

**The UNDO was re-taken against the current row set** — 747 media statements and
56 article statements — because an undo that does not match the live row set is
not an undo, and production has `pitr_enabled=false`. Verified at re-capture
time: **zero pre-existing `articles` or `media` rows had been modified** in the
window, so the new file is a strict superset of the first rather than a
correction of it. Both are recorded in
`2026-08-25-credit-audit-all-live-UNDO.md`, along with a standing warning that
the file must never be run wholesale while another run is writing.

**The re-census does not change any finding — it strengthens the main one.**
Re-run against all 27 live non-legacy articles: **109 media rows, every one
carrying `credit`, `license_class` and `licensor_name`; 52 distinct files, all 52
in the asset register with credits matching character-for-character; 0 missing, 0
differing.** That now includes three articles written by a different session,
hours after the audit began, with no knowledge of it. **The ingest gate is not
merely holding — it is holding under concurrent, unsupervised use.**

### The corroboration I did not take at the time, and why

Those three articles are expected to render **uncredited** on the current live v7
build despite correct credits in the database. If that holds it is an independent
reproduction of this defect on rows written *after* my snapshot.

**CORRECTION, recorded rather than edited away.** The paragraph below was
written in good faith and was wrong about the past tense: I had *already* fetched
two of the three before writing it, in sweeps that enumerated their targets from
the live database rather than from a fixed list. The forward-looking commitment
held — nothing has been fetched since — but the claim "I have not fetched those
three URLs" was false when I made it. §3b.4 has the full account and the data.

**I did not fetch those three URLs after this point, deliberately.** The other
run is inside a settle window capturing cold-render proof on exactly those URLs,
and a request from me would consume the cold `MISS` and re-arm the edge for
another TTL — which is the precise trap `src/lib/cache/purge.ts` documents:

> *"Do not request the URL whose after-state is the deliverable BEFORE
> publishing. A baseline request re-arms the edge for another TTL and makes the
> proof request measure the baseline."*

Verifying my own hypothesis by destroying somebody else's measurement of it is a
bad trade, and the corroboration is worth more taken by the run that has not seen
my conclusion. **The database half I did verify myself** (above). The render half
was not pending — for two of the three it was already spent, by me, before I
understood that it mattered. See §3b.4.

**Resolved.** The block was later released, and the peer run captured its clean
cold `pelamin` render at 11:36:57Z — before the deploy, so on **v7** — which is
the observation this audit would have destroyed had it fetched. `pelamin` appears
in this run's sweeps F and G (§4a) as a credited cold render, but by then the
build was **v8**, so it carries nothing about v7. Holding off was the right call
and it is why a v7 reading of that URL exists at all.

---

## 3b. Three challenges to this run, and what the evidence said

Both were raised by the team lead after the audit was written, and both were
right to raise. One found a real defect in my method.

### 3b.1 "Nine articles were updated today. Was it you?"

`articles.updated_at` = today on nine live rows — `kursus-kahwin` at 09:25Z and
eight in a 90-second burst at 11:04–11:06Z, all created 24 Ogos or earlier. That
burst **predates this run's undo capture at 11:21:43Z**, so if any of it were
mine, my log's claim that the undo was "written before anything was touched"
would be false and those original values would be gone.

**It was not this run, and there is no unidentified third writer.** Eight of the
nine resolve cleanly to a run that captured its undo first, which is the less
interesting half. **The finding that survives is the ninth:** a production
content deletion ran at 09:25Z against a `pitr_enabled=false` database with zero
backups and left **no undo artifact and no work-done log**, while every other
write that day was preceded by a capture. That is owned, real and fixable, and it
is the part of this section worth acting on.

**What clears this run is not its own testimony.** Three things do, in order:
(a) no write exists anywhere in the public route tree; (b) nine-of-fifty-six is
arithmetically impossible for a GET-triggered write path; (c) all nine are
positively attributed to other runs. A later reader should check those and ignore
anything this document asserts about its own conduct.

**The check that does not rely on my word.** This run GET'd all 56 published
articles, repeatedly, across three sweeps. If a GET could write, 56 rows would
carry today's `updated_at`. **Nine do.** A write path triggered by my requests
cannot fire on nine of fifty-six.

**And a render cannot write to `articles` at all.** Verified in the code rather
than assumed:

- every `.update(articles)` in the codebase is under `src/app/(admin)/`
  (14 call sites) or `src/app/api/cron/publish-scheduled/route.ts` (1);
- `db.update` / `db.insert` / `db.delete` / `.execute(` across
  `src/app/(public)` returns **nothing**;
- no view counter, no hit counter, no `updated_at` touch on render;
  `src/middleware.ts` issues no DB call and `src/lib/redirects/lookup.ts` has no
  write;
- the only write in the render dependency graph is `src/lib/seo/indexnow.ts:79`,
  which inserts into `seo_indexnow_submissions` — a different table — and is
  called only from admin actions and the publish cron;
- the cron is the one non-human `articles` writer, and its `where` matches only
  scheduled drafts due for publish. It sets `status`/`publishedAt`/
  `scheduledPublishAt`, not cover images.

**Timing does not exonerate this run and should not be used to.** Its live HTTP
traffic overlapped the burst window — the undo script stamped 11:21:43.329Z and
the sweep before it ran minutes earlier. Anyone reconstructing this later will
see that overlap. What rules the run out is the code above and the attribution
below, not the clock.

**Where the nine actually came from.**

The eight are the **C2.4 cover swap**. Production's C2.4 cluster contains exactly
those eight slugs, and their `updated_at` values run 11:04:45 → 11:06:40 in
monotonic ~12-second steps — an ingest cadence, not a render. That run's own
completion log, `2026-08-25-swap-c24-covers-to-photos.md`, states *"Final write
11:06:38Z"* and *"the last ingest was 11:06:40Z"*; the row says
`11:06:40.291Z`. The writes replaced `*-kad-tajuk.png` cover graphics with
photographs, which no HTTP GET produces.

The ninth is `kursus-kahwin`, and it is the `fix-kursus-kahwin-live` brief's
Phase 1 — pull a wrong fee immediately, replace it properly afterwards. Cover
unchanged (still the 2025 legacy `1787396411246-cover.jpg`), zero media rows
created, and the content no longer contains `RM120`/`RM150` while not yet
containing `RM100` or `JAIS`.

**Recoverability.** The eight are covered three times over:

| Captured | Artifact | Holds |
|---|---|---|
| 08:51:11.464Z | `aug-25-2026-undo-images-onto-live-articles/before-state.json` | all 8 |
| 09:10:39.621Z | `.../before-state-run2.json` | all 8 |
| **10:52:57.170Z** | **`2026-08-25-swap-c24-covers-UNDO.sql`** | **all 8 — the immediate pre-burst state** |

The 10:52:57Z capture *is* the 11:03Z state: its recorded `updated_at` values
(09:11–09:26Z) are still the pre-burst ones, and the only writes in between were
the burst itself.

**`kursus-kahwin` is the one real loss. The original values are gone.** No undo
artifact exists for it under any name in either repo, no work-done log records
it, and it is not held as a row in any of the three snapshots above. The captures
in this run's undo (11:21:43Z, 11:40:17Z) hold its **post-edit** content only.

The *removed text* survives in `data/hellokahwin-export/content/posts.json` (WP
`modified_gmt` 2025-12-14), verbatim: *"Yuran kursus ditetapkan mengikut kadar
yang telah ditentukan oleh Jabatan Agama Islam setiap negeri, iaitu antara
RM120.00 hingga RM150.00 seorang."* But that is rendered WordPress HTML from the
import, not the Tiptap JSON the column stores, and it cannot reproduce any edit
made between import and this morning. **Recovering the meaning is possible;
recovering the row is not.** What was lost was also a *wrong* number — a fee
understating JAIS Selangor's RM100 — which is the least costly thing it could
have been.

**A process finding that belongs to nobody in particular, so it should be
written down:** a production content deletion ran at 09:25Z against a database
with `pitr_enabled=false` and zero backups, and left **no undo artifact and no
work-done log.** Every other write today was preceded by a capture. That one was
not, and it is the only irreversible thing that happened today.

### 3b.2 The two attribution trails nobody had queried

`audit_logs` and `seo_indexnow_submissions` are independent timestamped records
of who wrote what. Both were assumed empty and neither had been checked.

**Both are empty, across all time.**

    select count(*) from audit_logs;                  -- 0
    select count(*) from seo_indexnow_submissions;    -- 0

**The `publish-scheduled` cron is ruled out on its own `WHERE`.** It requires
`status = 'draft'` and a non-null `scheduled_publish_at`. All nine rows:

| slug | status | `published_at` | `scheduled_publish_at` |
|---|---|---|---|
| `kursus-kahwin` | published | 2025-11-26 | `null` |
| `mas-kahwin-ikut-negeri` | published | 2025-11-23 | `null` |
| the seven 24-Ogos articles | published | 2026-08-24 | `null` |

Every one was already live long before today, none carries a schedule, and no
`published_at` moved. The cron could not have matched a single row.

**Do not read an empty `audit_logs` as "audit clean" — it has no evidentiary
value in either direction here.** `scripts/ingest-article.mts` contains **zero**
references to `auditLogs` or `logAuditEvent`. The tool that wrote essentially
every article on this site writes no audit rows at all. Silence rules out an
admin action and the cron. It does not exonerate the ingest script, which
remains the best-supported writer of all nine.

### 3b.3 Why `audit_logs` is empty — coverage, not swallowing

Two hypotheses were on the table: **swallowing** (audit writes fire and are lost,
which would mean audit failure is unobservable by construction) versus
**coverage** (the audited path was simply never used for a write). They imply
different remedies, so guessing was not an option.

**The remedy each implies.** Swallowing → make the audit write fail loudly, or
fail the action with it. Coverage → the primary write path has no audit at all,
and hardening the admin path fixes nothing that matters.

**The evidence says coverage, and it is not a close call.**

**1 · The table is empty now, and that part is immune to everything below.**

    select count(*) from audit_logs;   -- 0

A current-state query. No counter, no estimate, nothing that a statistics reset
can touch. Start here rather than at `n_live_tup`, which is a maintained estimate
and no more reset-proof than the rest of `pg_stat_user_tables`.

**2 · Postgres's counters rule out any database-level failure — within their
window, which is not "ever".**

    select relname, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
    from pg_stat_user_tables where relname = 'audit_logs';
    -- audit_logs | 0 | 0 | 0 | 0 | 0

**Zero dead tuples is the load-bearing number.** An `INSERT` that reaches the
table and then aborts — an FK violation, a constraint failure, a rolled-back
transaction — still writes a tuple and still shows up in `n_dead_tup`. There are
none. That kills the database-level form of the swallowing hypothesis, and it
independently confirms the already-dead FK theory by a route that does not depend
on reading the code.

**The bound, stated plainly because a careful reader will find it otherwise:**

    pg_stat_database.stats_reset   2026-07-24T08:28:18.170Z
    oldest articles.created_at     2025-11-09T10:49:51Z

These counters reset on `pg_stat_reset()` and on crash recovery. **They establish
"no insert since 2026-07-24", not "no insert ever"** — the site's own history
predates them by about nine months. Do not write "lifetime" here; the claim does
not need it and overstating it would give a reader grounds to doubt the rest of
the document.

**The conclusion survives the bound, in four steps.** (1) The table is empty now
— a current-state fact. (2) Nothing was inserted, committed or aborted since
2026-07-24. (3) **There is no delete path for `audit_logs` anywhere in the
codebase**, so a pre-reset row would have had to be removed by something that does
not exist. (4) **And it is moot for anything this investigation reasoned about:
the entire pillar programme postdates the reset** — the oldest `media.created_at`
is 2026-08-22. Every article, every ingest run and every write examined here falls
inside the counted window, where the counters are complete.

**The one hole, named rather than left to be found:** a manual `TRUNCATE` plus a
manual `pg_stat_reset()` would produce exactly this state and leave no dead tuples
either. That is a human at a `psql` prompt, not a code path — but on a database
with no PITR, no backups and no audit trail, *"no code path does this"* is a
weaker guarantee than it would be anywhere else. It is the gap in the argument and
it is not closable from here.

**Corroborated on a second instrument:** an independent read by another session
found `media · n_tup_upd = 0`, confirming this run's separate finding that no
media row has ever been updated.

**3 · Admin server actions demonstrably execute and their writes commit.** This
is what stops the argument being "the admin console has never been used":

    article_edit_locks | n_tup_ins 2 | n_tup_upd 3902 | n_live_tup 1
    -- re-read later by another session: n_tup_upd 3908. Still heartbeating.

`acquireLockAction` and `renewLockAction` are admin server actions in the same
file as the audited article save. **3,902 committed updates** prove the admin
write path runs on this deployment and reaches the database.

**4 · The one editor session that exists never saved.**

| | |
|---|---|
| article | `hadiah-untuk-pengantin` |
| locked by | Ian Ng (`user_3IHGHN…`) |
| locked at | **2026-08-22T18:51:14Z** |
| expires at | 2026-08-25T11:57:17Z — still being renewed |
| the article's `updated_at` | **2026-01-14T21:44:52Z** |

A browser tab has been open on that article for **three days**, heartbeating its
lock 3,902 times, and the article has not been saved in seven months. That is
the whole of the admin console's write history.

**5 · Every table an audited admin action would populate is empty.** This is the
step that turns "consistent with coverage" into "positively supported", because
it closes the one gap the counters cannot: a runtime-level loss (`after()` never
draining on serverless) leaves *no* trace, and would look identical to coverage.
But it would only lose the audit row — **the action's own effect would still be
there.**

| Effect of an audited admin action | Rows |
|---|---|
| `articles.share_token` non-null (`generateArticleShareLinkAction`) | **0** |
| `redirects` | **0** |
| `article_category_redirects` | **0** |
| `dynamic_blocks` | **0** |
| `inspire_nav_items` | **0** |
| `admin_settings` | **0** (`n_tup_ins` 0) |

**No audited admin action has ever left a footprint of any kind.** The audit rows
are not missing; the actions never ran.

**6 · And the ten articles that look like admin authorship are not.** Ten rows
carry `author_id = user_3IHGHN…` rather than the house account — but all ten were
created today between 10:12:41Z and 11:31:49Z, in the same seconds as their
ingest siblings. That is the ingest script setting authorship explicitly, not an
editor saving a page.

**The discriminating test, named, in case someone wants to re-run it.** Find any
effect of an audited admin action in the database — a share token, a redirect, a
nav item, an article whose `updated_at` moved while an edit lock was held by a
human — and check whether `audit_logs` holds the matching row. **An effect
present with its audit row absent proves swallowing. An effect absent everywhere
proves coverage.** Today, everywhere is absent.

**What follows from it.** `articles` carries `n_tup_ins 167`, `n_tup_upd 97`,
`n_tup_del 111` — this site has been written to, extensively, and **none of it
went through an audited path.** The remedy is not to make the admin audit fail
loudly. It is that **`scripts/ingest-article.mts`, which wrote every article on
this site, writes no audit rows at all** — and that is the same shape as the
defect this whole run is about: the gate is on the door the robot does not use.

### 3b.3a Two remedies, and one of them was nearly written wrong

**"Make the audit write fail loudly" is the wrong fix, and it would reintroduce a
bug somebody already fixed on purpose.** `(admin)/admin/inspire/actions.ts:283-287`
orders revalidation *before* the audit write, with a comment saying why: if an
awaited audit insert throws, an exception there would skip revalidation and leave
a **deleted article cached and served forever**. Cache correctness for readers
outranks the audit row. A loud-failure remedy walks straight back into that.

The real defect is narrower: **best-effort with no failure surface.** The audit
may fail and its only signal is `console.error`.

**Remedy 1 — coverage, and this is the primary defect.** `scripts/ingest-article.mts`
writes no audit rows at all, and it wrote every article on this site. **That is
why the table is empty** — not loss. Hardening the admin audit path hardens a door
nobody writes through. This is first because it is the one that explains the
finding; the console-shim problem below is a genuine second defect, not the
explanation for this one.

**Remedy 2 — give the failure somewhere to go.** Keep it non-blocking, keep the
ordering, and write audit failures to a durable row in the database.
**Not Sentry: there is no Sentry in this repo.** `grep -i sentry package.json`
returns nothing, `node_modules/@sentry` does not exist, and the only `Sentry`
objects in `src/` are console shims — `safe-panel.ts:3-7` and
`article-editor.tsx:117-119`, each carrying the comment *"No Sentry in
HelloKahwin — degrade error capture to console."*
**Caveat, so nobody files this as solved:** a database-backed failure row cannot
record the failure mode where the database itself is unreachable — which is
exactly when an `after()` write is most likely to be lost. It is a large
improvement and not a complete one.

**And the broader finding, which supersedes both.** This codebase has **the shape
of error reporting without the substance.** `safe-panel.ts` is a carefully built
admin tripwire whose alarm goes to a dead console. `article-editor.tsx:1273`
reports save failures with structured tags into the same place. Comments across
the repo cite Sentry issue ids — `TWN-NEW-47`, `TWN-NEW-1X` — for a Sentry that
is not installed here. **The audit trail is one consumer of that gap, not the
whole of it**, and fixing the audit trail alone would leave every other tripwire
still ringing into a console nobody reads.

### 3b.4 The audit contaminated another run's proof, and that is my defect

The P5 run needed the HTTP status on the **first request** to each of its three
new article URLs — a genuine cold render. **This audit had already GET'd two of
the three** before any block was in place: `contoh-kad-jemputan-kahwin` twice and
`bunga-telur` twice. `pelamin` was never touched, and escaped only because it was
created at 11:31:49Z, seconds after this run's last enumerating query.

**The cause is a defect in the method, not an accident of timing.** Every sweep
enumerated its targets with `select ... from articles where status='published'`
**at sweep time**. Against a database two other sessions were writing to, that
means the audit silently adopted brand-new articles the moment they were
published. It had no slug allowlist. It should have had one.

A page cannot be un-warmed. Unlike a bad measurement, that proof cannot be
retaken — and it is the same trap `src/lib/cache/purge.ts` already documents,
pointed the other way:

> *"Do not request the URL whose after-state is the deliverable BEFORE
> publishing. A baseline request re-arms the edge for another TTL and makes the
> proof request measure the baseline."*

**The data, handed over, since it is now the only record of those renders.**
Exact wall-clock stamps are not available — the sweep JSONs were deleted at
cleanup and the shell keeps no persistent history — but each sweep's enumerating
query bounds its fetches, because it proves which rows existed when it started.

| Fetch | Bounded to | Result |
|---|---|---|
| `contoh-kad-jemputan-kahwin`, concurrency-8 sweep | 11:24:56Z–11:30:25Z | `200`, **credit rendered** (2 blocks) |
| `contoh-kad-jemputan-kahwin`, serial pass | ~11:34–11:36Z | `200`, `REVALIDATED`, `age 0`, **credit rendered** |
| `bunga-telur`, serial pass | ~11:34–11:36Z | `200`, `REVALIDATED`, `age 0`, **credit rendered** |
| `bunga-telur`, direct fetch | ~1–2 min later | 3 own images, 2 figures, both credited |

Credit lines served: `contoh-kad-jemputan-kahwin` → `Kredit: mohd hasan / Pexels`;
`bunga-telur` → `Kredit: Ahmad Ali Karim (CC0)`.

**A measurement from the peer run that tightens this timeline and may cut against
the reading above. Recorded because it does, not despite it.** They measured
first-render times for the two URLs this audit spent:
`contoh-kad-jemputan-kahwin` ~**11:33:02Z**, `bunga-telur` ~**11:33:08Z**. That is
roughly 75 seconds *after* the upper bound given for the serial fetches
(11:30:25Z–11:31:49Z).

A background revalidation triggered by one of those GETs but completing after it
would fit — and it fits **this run's own mechanism**, which is the point. If that
is what happened, the `REVALIDATED / age 0` readings were of a copy stored later
than assumed, and the fetch that "saw a fresh render" was in fact the request that
*caused* one and then read something else. That does not change what the bytes
said, and it does not change that the first request to those two URLs was spent.
It does mean the bounds above are bounds on **when the requests were made**, not
on **what render they read**. Logged as a measurement, not a theory.

**Read against the expectation, this cuts the other way.** `REVALIDATED / age 0`
means both were genuine fresh renders on the current v7 build, and **both
rendered WITH the credit** — as did the concurrency-8 fetch. The prediction that
the P5 articles would render uncredited on v7 did not hold for the two that were
touched, across three fresh renders.

That neither refutes the defect nor shows it absent. It is the non-determinism of
§1.3 landing on the other side, and a serial fresh render is the case most likely
to succeed. What it does mean is that **if anyone now measures those two and
finds them credited, the result is contaminated and proves nothing either way.**
`pelamin` is the only clean URL left, and it is under a standing block.

---

## 4. The code change, and why it and not a database write

`src/app/(public)/artikel/[category]/[slug]/page.tsx` — the cover credit now
rides the article page's **primary join** instead of being a second read:

```ts
        coverCredit: media.credit,
        coverCreditUrl: media.creditUrl,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(media, eq(media.url, articles.coverImageUrl))
      .innerJoin(profiles, eq(articles.authorId, profiles.id))
```

and the render site collapses to:

```ts
  const coverCredit = article.coverCredit
    ? { credit: article.coverCredit, creditUrl: article.coverCreditUrl }
    : null;
```

**No second round trip. No second deadline. No `catch {}`.** If the row answers,
the credit is in it. If it does not answer, the page 404s or errors — it does not
quietly publish an uncredited photograph. The join is an exact match on the
indexed `media.url` (`idx_media_url`) and is 1:1 on production today, verified.

Three supporting edits, all load-bearing:

- **`src/lib/inspire/article-cache.ts`** — `ARTICLE_PAGE_CACHE_KEY` bumped
  `inspire-article-page-v7` to `v8`. **Not cosmetic.** With `revalidate: false`
  every already-cached v7 entry lacks the two new fields, so without the bump
  those articles would keep rendering an uncredited cover — the defect itself,
  surviving its own fix.
- **`src/lib/inspire/pillar-queries.ts`** — `getCoverCredit` deleted, and
  replaced by a comment saying what it did and why it must not come back.
- **`src/lib/inspire/__tests__/article-cache.test.ts`** — the key assertion now
  pins v8, with the reason.

Gates: `tsc --noEmit` clean · `eslint` clean on all four files (one pre-existing
unused-var warning elsewhere in `page.tsx`, untouched) · **`vitest run` — 20
files, 229 tests, all passing.**

---

## 4a. The fix shipped without me, and then was verified cold

**`f75c42f` is the head of `origin/master`.** A third session,
`pillars-ingest-redirects-59`, committed the four files this run had deliberately
left uncommitted and pushed them; Vercel deployed it. Its own account is in
`docs/work-done/2026-08-25-deploy-credit-race-and-jsonb.md`, which records that
the change was another session's and that what it authored was the commit, the
gates, the deploy and the proof — not the change. That is accurate and it is the
right way for the history to read.

**The v7/v8 boundary is 11:44:02Z** — deployment `xKgkGtVrDj4ArV3CjKvH1ejTUvMz`,
production, success. Not `f75c42f`'s commit stamp of 11:41:36Z, which is when the
code existed rather than when live traffic switched. **Every observation in this
document falls on one side or the other of 11:44:02Z and is labelled.** Everything
in §1 to §3 is v7; everything in this section is v8.

So the change reached production **without review, without the ship gate, and
without its author having verified it.** Closing that gap became the first job of
the next session rather than the last.

Verified first that what shipped is what was written:

    git show --name-only f75c42f
      src/app/(public)/artikel/[category]/[slug]/page.tsx
      src/lib/inspire/__tests__/article-cache.test.ts
      src/lib/inspire/article-cache.ts
      src/lib/inspire/pillar-queries.ts
    git diff f75c42f -- <those four>     # empty: working tree identical

Exactly the four files, nothing altered, none of the other sessions' five
modified files swept in.

### The measurement

A rebuild (`fe42c46`, docs-only) deployed at **11:59:08Z** and flushed the edge.
That is what makes the following clean: the sweeps below ran entirely afterwards,
on one build, against a cold edge.

**That window was luck, not design, and the record should say so.** Another
session's docs push is the only reason sweep F met 28 cold `MISS`es; nobody
arranged it. `-59` declined to take it as vindication and wrote in its own log that
had this run's sweep been mid-flight rather than finished, the same push would have
destroyed the measurement it had been asked to protect — *a decision is not made
correct by the coin landing well.* **That is materially relevant to how reproducible
this run's best evidence is: the strongest measurement in the document depended on
a fortunate accident, not on a condition anyone knew how to create.** Creating it
deliberately is what the standing regression test in the Retrospective is for.

**Two earlier v8 sweeps were discarded rather than filtered.** They ran at ~11:58Z
and their JSON had already been deleted at cleanup, so it could not be proven
which side of 11:59:08Z their read-back renders fell on. A measurement that cannot
be placed on a build boundary is not a measurement. They are not reported here.

Bare URLs, deliberately: the v7 baseline in §1.3 was bare-URL, and a `?_cs=`
cache-buster is a different experiment. The target list was **frozen to a file
before the first request** — the fix for this run's own named defect
(§Retrospective).

**Pass criterion, strict:** both cover sites — mobile `lg:hidden` and desktop —
present **and both exactly equal to the `media.credit` string in the database**.
Not "a credit appeared".

| Sweep | Build | Conc. | Targets | Edge state | Median | Slowest | **Failing** |
|---|---|---|---|---|---|---|---|
| A | v7 | 8 | 24 | not recorded | — | — | **8** |
| B | v7 | 8 | 25 | not recorded | — | — | **8 — a different eight** |
| C | v7 | 1 | 26 | serial | — | — | 0 |
| **F** | **v8** | **8** | **28** | **28 × `MISS`, age 0 — COLD** | 1161 ms | 2963 ms | **0** |
| **G** | **v8** | **8** | **28** | 25 × `HIT` age 1–4, 2 × `MISS`, 1 × `HIT` age 0 | 125 ms | 784 ms | **0** |

`sweepF 12:03:06.506Z → 12:03:12.217Z` · `sweepG 12:03:12.218Z → 12:03:13.373Z`.
Raw per-article JSON retained at `.tmp-v8-sweepF.json` and `.tmp-v8-sweepG.json`.

**Sweep F is the test that was unavailable all day.** All 28 responses came back
`x-vercel-cache: MISS`, `age=0` — genuinely cold origin renders, issued
concurrently. **28 articles × 2 cover sites = 56 of 56 credit sites correct on
cold concurrent renders**, and 56 of 56 again on the warm read-back.

**`ucapan-pengantin-baru` — the page this brief was opened about — returned
`200 / MISS / age 0`, both cover sites present, both matching the database string,
on a cold concurrent render.** The brief's own defect, demonstrated closed on the
shipped build.

### Independently reproduced by a session that did not write the fix

`-59` ran four sweeps against the same build and handed over the raw per-article
data. Its evidence directory was untracked scratch and has been deleted, so the
numbers and the method are reproduced here rather than cited by path.

**Its ground truth** was a snapshot of `articles` × `media` taken **before** the
sweeps — 56 published articles, **28 carrying a cover credit** in `media` and 28
legacy carrying none. The second set is a **negative control**: they must render
nothing.

**Its `missing` predicate**, which is the same strict one used for sweeps F and G:

```js
missing = rows.filter(r => r.expected)
              .filter(r => !r.desktop || !r.mobile
                        || r.desktop !== r.expected || r.mobile !== r.expected)
```

Both sites are required because `page.tsx` renders the cover credit twice. **A fix
that reached one viewport and not the other would leave a whole class of readers
uncredited, and a single-site check would pass it.** Detection was by the literal
`className` strings from `page.tsx`, so a figure caption cannot be miscounted as a
cover credit.

| Sweep | Method | Fresh renders | Non-200 | **Missing / 28** | Stray credit on legacy | Median | Slowest |
|---|---|---|---|---|---|---|---|
| sweep-1 | 8 concurrent, bare URL, 11:46:38Z | 27 / 56 | 0 | **0** | 0 / 28 | 592 ms | 6412 ms |
| sweep-2 | 8 concurrent, bare URL, 11:47:25Z | 0 / 56 | 0 | **0** | 0 / 28 | 96 ms | 532 ms |
| cold-1 | tags expired, 8 concurrent, `?_cs=`, 11:48:40Z | 55 / 56 | 0 | **0** | 0 / 28 | 3220 ms | 5619 ms |
| cold-2 | tags expired, 8 concurrent, `?_cs=`, 11:49:16Z | 56 / 56 | 0 | **0** | 0 / 28 | 3719 ms | 4485 ms |

**112 of 112 credit-bearing renders correct.** **All fourteen distinct slugs that
failed in sweep A or B render their exact credit in both of its storms.**

**Its own caveats, carried over because they are the honest part.** Sweeps 1 and 2
prove nothing about the fix — every credit-bearing page returned `HIT`, and
sweep-1's 27 fresh renders were all *legacy* pages, which have no credit to lose.
`cold-1` and `cold-2` are the evidence, and they are `?_cs=`, not bare-URL: the
parameter exists only to defeat the edge, so they are genuine origin renders at the
canonical path with a query string appended.

**Its runs were the harder test; F and G were the like-for-like one.** Medians of
3.2 s and 3.7 s with a slowest of 5.6 s, against a route with `maxDuration = 5` and
a former shared budget of 4 s — that is the regime the race lived in, and a fast
sweep would not have tested it. F ran bare-URL off a rebuild-flushed edge at a
1161 ms median. Neither subsumes the other.

### The weak spot in both runs' negative control — and it is worse in this one

Concurrency 8 is load, and **a route that degrades under load can return `200`
with a thin or empty body, which either parser scores as "a page with no credit".**
For a credit-bearing article that is harmless — it would count as a miss, and there
were none. **For a legacy article, a degraded page and a correctly uncredited page
are indistinguishable to the instrument.**

`-59` recorded `bytes` on sweeps 1 and 2: minimum **80,168** across both, identical
distributions, legacy included — nothing thin or empty. It did **not** record body
size on `cold-1`/`cold-2`, which are exactly the runs where the pool was under
pressure. Its negative control there is *unfalsified, not verified*.

**Sweeps F and G are weaker still on this point and it should be said plainly:
they recorded no `bytes` at all, and they had no negative control, because the
frozen target list contained only the 28 credit-bearing articles.** Confirmed
against the retained JSON — the per-row fields are `slug, at, status, cache, age,
ms, blocks, texts, dbCredit, bothSitesExact`, and body size is not among them.

**What that costs, stated so a reader does not have to find it.** The
cold-concurrent result rests on a parser that **could not have distinguished a
degraded response from a correctly rendered one.** It does not change the 56 of 56
— a degraded page scores as a *failure* under the strict predicate, and there were
none — but it does mean **this run cannot rule out that some of those 28 cold
renders were degraded in ways its instrument was blind to.** And no claim about
legacy covers rendering nothing may be drawn from F or G at all, because they
never looked at a legacy page.

**Record `bytes` on every proof request.** It belongs beside the existing rule in
`src/lib/cache/purge.ts` about recording `x-vercel-cache` and `age`, and it is the
same failure shape: without the field, a bad response is indistinguishable from a
good one.

### What this does and does not establish

**It does** establish that the v7 sweep shape which stripped eight covers, then a
different eight, strips none on v8 — cold, concurrent, bare-URL, strict criterion,
28 of 28, corroborated by 112 of 112 from an independent session using a different
method.

**It does not** retire the v7 mechanism by measurement. The precise statement,
which is sharper than the one both runs were using for most of the day:

> **The fix is demonstrated under cold concurrency. The defect it fixes never was,
> and that measurement is permanently unavailable.**

- **The v7 cold-concurrent test is gone with the build.** Not merely unavailable on
  P5 because two of three URLs were warmed (§3b.4) — unavailable anywhere, because
  v7 is not deployed. Sweeps A and B were concurrent but did not record edge state,
  so neither can be claimed as cold after the fact.
- **What actually retires the mechanism is structural, not statistical.** There is
  one query and the credit is in it, or the page does not render at all. Four clean
  sweeps across two sessions establish that nothing else was going on; they are not
  what makes the fix true. `-59` arrived at the same sentence independently, which
  is worth more than either of us asserting it.
- **Which experiment is load-bearing — both logs agree, and it is not the one with
  the most impressive latency.** `-59` records that the bare-URL pair is the one a
  later reader should cite, because **F→G recreates the mechanism** (a second read
  of pages a first read has just re-rendered) while its storms recreate the
  **conditions** (tags expired, pool pressured, eight in flight). Two runs agreeing
  on which experiment carries the weight is worth more than either claiming it.

---

## 5. What was deliberately not done

- **No production database write.** The brief said to fix missing credits with
  `pnpm ingest --update`. There were none to fix: every credit was already
  correct and register-matched. Running `--update` would have rewritten 26
  article rows and their `updated_at` to change nothing, against a database with
  `pitr_enabled=false` and zero backups. The undo was written first anyway and is
  kept as a dated snapshot of every credit column on production at 11:21:43Z.
- **No deploy by this run — and it shipped anyway.** A hold on builds and deploys
  was placed at 11:39Z while a peer run captured proof against the live v7 build.
  This run observed it and ran no build. At **11:41:36Z a third session committed
  the four files and pushed them to `master`**, and v8 went live. §4a is the full
  account, and §Retrospective treats the hold's failure as a finding rather than
  an accident. **What this run then did instead of shipping was verify** — two
  concurrency-8 sweeps, 0 uncredited on both.
- **Committed and deployed by another session as `f75c42f`, not by this one.**
  Its account is `docs/work-done/2026-08-25-deploy-credit-race-and-jsonb.md`; the
  two logs reference each other.
- **Committed by another session as `f75c42f`, not by this one.** This run
  deliberately left the four files uncommitted because the worktree also holds
  other sessions' work in progress (`package.json`, `scripts/ingest-article.mts`,
  `purge.ts`, `article-file.ts`) and a commit risked sweeping it up. Verified: the
  commit contains **exactly** the four renderer files and none of the others, and
  the working tree is byte-identical to it. Nothing was swept up. The strategy of
  withholding the commit did not hold, and §Retrospective says why.
- **The three P5 URLs were blocked, then cleared.** A hard block was placed on
  `/artikel/pelamin-kad-cenderahati/{pelamin,bunga-telur,contoh-kad-jemputan-kahwin}`
  while a peer run captured proof; two of the three had already been fetched by
  this audit before the block existed (§3b.4). **`pelamin` was never touched while
  the block stood**, and was first requested by this run only after the block was
  released — where it appears in sweeps D and E, credited, on both.
- **No restore of any `mas-kahwin` row, deliberately.** The eight are recoverable
  (§3b.1) and they must not be recovered. They are the C2.4 run's *intended*
  result — a completed, logged, approved cover swap. Reverting them would undo
  another run's finished work, and nothing in this brief asks for it. **The
  attribution is the deliverable; the repair would be the damage.**
- **No text card, anywhere.** Owner directive, honoured.
- **No URL changed, no article text edited.**
- **Legacy credits not backfilled** — brief §4, and the reasoning is settled in
  `aug-25-2026-enforcing-credit-everywhere.md` Tier 4: there is no honest way to
  do it, because every method either promotes a file's claim about itself into a
  published credit or destroys the register's distinction between "we looked and
  cannot establish it" and "nobody looked yet".
- **No database CHECK constraint.** `aug-25-2026-enforcing-credit-everywhere.md`
  Tier 3 is right that it must come *after* the admin console is closed; adding
  it now would hard-fail every admin upload and convert a silent gap into an
  outage.
- **Related-article card thumbnails carry no credit.** Every article page renders
  up to six `crop-4x3-article-card` thumbnails of *other* articles' covers, and
  those are licensed photographs rendered with no attribution on that page. Each
  is credited on its own canonical page. Flagged rather than changed: it is a
  design decision about card layout, not a defect, and it was not in the brief.

---

## Retrospective

### The question the brief asked, and the answer it did not expect

> The credit gate is enforced at ingest, so what allowed a row through without one?

**Nothing did.** 101 media rows behind the live non-legacy articles, all three
gated fields populated on every one, all 52 distinct files matching the asset
register exactly. The gate in `src/lib/inspire/article-file.ts` has never once
let an uncredited image past — including on the two articles a different session
published while this audit was running.

**The premise was wrong in a way that matters.** We had been guarding the door
where credits enter and had never checked the door where they leave. A gate
proves an image *was* credited when it was stored. It says nothing about whether
the reader is shown that credit — and those are exactly the two different things
the brief itself warned about in its first instruction, applied to the wrong end
of the pipe.

### What actually made it possible

The credit was **a separate optional read of the same row the page was already
reading.** Everything else follows from that one design choice:

- separate, so it needed its own round trip;
- a round trip, so it needed a deadline;
- a deadline, so it needed a failure branch;
- and because a missing credit renders as nothing, the honest failure branch
  looked harmless enough to write as `catch {}` with the word *"Non-critical"*
  next to it.

Every step is locally reasonable. The result is that the rule this company holds
above everything else was being enforced on a best-effort basis, and the
strongest evidence of that is in the code's own comment. Three lines earlier, the
pillar up-link was upgraded from "non-critical" to a real degradation with an
explicit note: *"a swallowed timeout silently removed that backlink while the
page rendered looking perfectly fine, so nobody would ever have noticed."*
**The same review, in the same file, walked past the credit read and left it
swallowing.** An internal link got that scrutiny; a photographer's name did not.

### What makes a missing credit impossible rather than merely forbidden

**The question cannot be answered at the ingest gate, and that is the finding.**
The brief asked it as a write-path question — what lets a bad row through. But
the database was correct throughout; the gate held on 101 rows, then on 109,
including three articles written by a session that had never heard of this audit;
and the images still reached readers uncredited. **A correct row that renders
uncredited defeats any gate you could write.** Enforcement at the point of
storage is necessary and it is not sufficient, because the thing the rule
protects — a photographer's name in front of a reader — is produced by the render,
not by the row.

So the answer has to be about the read path, and it is:

**Stop fetching the credit separately from the image it belongs to.** A credit
that can be dropped independently of its photograph will eventually be dropped
independently of its photograph — and the drop is invisible, because a missing
credit renders as nothing by design.

The file changed:
**`src/app/(public)/artikel/[category]/[slug]/page.tsx`** (with
`src/lib/inspire/article-cache.ts`, `src/lib/inspire/pillar-queries.ts` and
`src/lib/inspire/__tests__/article-cache.test.ts`).

The credit is now a column on the row the page cannot render without. There is no
timeout to lose, no branch to swallow it, and no cached shape that can omit it —
the v8 key bump is what makes that last one true. The failure mode is no longer
"an uncredited photograph, silently, for a year". It is "no page", which is loud,
and which somebody fixes within the hour.

**The shape of the fix generalises.** The in-body figures never lost a credit in
any of the three sweeps, and the reason is that theirs travels *inside* the
figure. This does the same thing to the cover. **Attach the attribution to the
thing it describes; never fetch it alongside.**

### What this does not fix, ranked

1. **The admin console still writes uncredited media rows** — six compounding
   layers of it, catalogued in `aug-25-2026-enforcing-credit-everywhere.md` §2.
   Ingest is gated; a human with a drag-and-drop is not. That is Tier 1 there,
   two to three days, and it is still the largest open exposure.
2. **A corrected credit never reaches an in-body figure.** They render from the
   `data-caption` snapshot baked at ingest, so fixing `media.credit` fixes the
   cover and changes no body figure. Today's audit found nothing wrong to
   propagate — but the day one is found, the correction will silently not land.
3. **619 uncredited images on 29 live legacy pages**, grandfathered by decision,
   recorded in the register, listed in §2.2 for the owner.
4. **Nothing yet detects this class of defect.** The audit that found it was a
   script written for one brief. The cheapest durable version is a scheduled job
   that fetches every published article's live HTML and asserts a rendered credit
   for every image whose `media.credit` is non-null — which is precisely sweep C,
   and it takes about four minutes for 55 articles.
5. **Nothing audits the tool that writes this site.** `audit_logs` is empty
   across all time, and §3b.3 establishes why: not because audit writes are being lost, but because **`scripts/ingest-article.mts` writes no audit rows at all**,
   and it wrote essentially every article here. This is the same shape as the
   credit defect — the gate is on the door the robot does not use — and it is why
   "harden the admin audit path" would be the wrong fix. The discriminating test
   is named in §3b.3 for anyone who wants to re-run it rather than trust it.

### One open experiment, and it can no longer be run on this pillar

**The decisive test of the mechanism is: do all three P5 articles render credited
under a *concurrent* cold sweep?** Credited under a *serial* cold render would
not refute anything — that is the case most likely to succeed, and §1.3 measured
0/26 missing serially against 8/25 concurrently.

**That test is gone for good, and not only on P5.** Two of the three P5 URLs were
warmed by this audit (§3b.4) and cold is not a restorable state — but the deeper
reason is that **v7 is no longer deployed.** The build that had the defect cannot
be measured again anywhere.

**§4a does not substitute for it.** Sweep F is cold and concurrent and clean, and
it is a measurement of **v8**. It shows the fix holds; it cannot retroactively
confirm the v7 diagnosis, which rests on the code path, on
eight-and-a-different-eight, and on pages that healed with no database write.

**So what the reserved batch is now for has changed.** It is no longer a way to
settle v7. It is the standing regression test: **the next batch of freshly
published articles, reserved in advance, swept cold and concurrent before anything
warms them** — slugs agreed before ingest, a concurrent and a serial sweep planned
as a pair, `x-vercel-cache` and `age` on every request, and a frozen target list.
That is cheap, and it is the only way this class of defect gets caught by
measurement rather than by somebody noticing a missing line on a page.

**Precondition for running it:** a future batch of freshly published articles
**reserved in advance** for this purpose — not requested after publication, when
the first request has already been spent. Whoever books it needs the slugs agreed
before ingest, a concurrent sweep and a serial sweep planned as a pair, and
`x-vercel-cache`/`age` recorded on every request. Until then the finding stands
on the evidence in §1.3, which is three sweeps and a self-healing page; **a
reader should not infer that the decisive test is still sitting there waiting to
be run.**

### On the method

**The finding depended entirely on reading the rendered HTML rather than the
database, and any check that trusted a field would have missed it.** The brief
was right to insist on that distinction. It is worth making it the default for
anything the reader is promised: *check what is served, not what is stored.*

And two cautions for whoever repeats this, because the tool was wrong in two
different ways and only one of them was productive.

**The audit tool caused the defect it was measuring.** Eight concurrent fetches
against a five-lane pool is a crawler, and it broke pages that had been fine a
minute earlier. That is not a flaw in the measurement — it is the finding — but a
sweep at concurrency 8 cannot tell you what a page looked like *before* you
asked. Only the serial pass can. Both belong in the job: the concurrent one to
reproduce, the serial one to verify.

### The named defect: an audit that enumerated its own scope

**Every sweep resolved its targets with `select ... from articles where
status='published'` at sweep time.** On a single-writer database that is the
correct query. On this one it meant the audit silently adopted other sessions'
brand-new rows the moment they were inserted, and spent another run's one-shot
cold-render proof on two of them (§3b.4). A page cannot be un-warmed.

**An audit that enumerates its own scope from live data has no scope.** Resolve
the target list once, write it down, and sweep *that*. Then a concurrent
publisher changes the census you report — a footnote — instead of changing what
you touch, which is somebody else's evidence.

**And there was a cheaper check than any of this, which two sessions both
skipped.** The C2.4 work-done log, its UNDO files and `scripts/covers/` were all
sitting in `git status` at the start of this session. Both runs then spent an hour
querying production to attribute writes **the repository already accounted for.**
That is a shared miss, not the peer run's — the answer to "who wrote these rows"
was in the working tree before anyone opened a database connection. **Read the
working tree before you interrogate production.**

**Two causes, and both belong on the record.**

1. **The method.** The sweep had no allowlist and should have had one. That is
   mine, it is elementary, and no property of the environment excuses it.
2. **The environment.** Two write-authorised sessions were operating in one
   worktree against one production database with **no serialisation of any
   kind** — no lease, no scope registry, no way for one run to know another was
   mid-proof on a URL. The sweep had no reason to expect a third party inserting
   rows underneath it, and nothing would have told it.

Neither cause is the whole story and neither should be inflated to cover the
other. The allowlist is the cheap fix and it is available today. The absence of
serialisation is the one that will produce a different collision next week, in
some other shape, and it will not be prevented by everyone resolving to be
careful.

**It produced the next collision the same afternoon, in a shape nobody
modelled.** A build-and-deploy hold was negotiated between two sessions. **It
could not bind a third that was never party to it.** `pillars-ingest-redirects-59`
committed this run's four uncommitted files and pushed them to `master`, and the
fix reached production without review, without the ship gate and without its
author having verified it (§4a). It did nothing careless: it committed four
files, and it parked and restored the other five modified files cleanly.

**`-59`'s own framing is better than mine and should be the one that survives:
"commit only my files" is a guarantee about *paths*, not about *changes* — and in
a tree several sessions are editing, those are different claims.** It committed
four paths, exactly and cleanly. It could not commit "only its own changes",
because nothing in a shared worktree distinguishes them: an uncommitted edit has
no owner, `git status` does not say which session made it, and "leave it
uncommitted" therefore is not a way to hold work back. It reads to every other
session as work waiting to be tidied up.

**And its follow-up is the one that would actually have prevented today:
ownership of a dirty shared worktree has to be visible in the tree, not negotiated
in a conversation between two sessions.** The only way for `-59` to discover the
hold existed was to violate it and be told afterwards. **That is a defect in how
the hold was held, not in what `-59` did** — it asked before its next push, held
when asked, and documented the attribution accurately in
`docs/work-done/2026-08-25-deploy-credit-race-and-jsonb.md` once it knew. A
branch-level or tree-level guard is worth more than three sessions' good
intentions.

**Three instances, one root condition.** The allowlist defect (this run's sweep
adopted another session's rows), the shared-worktree ownership defect (an
uncommitted edit has no owner), and the measurement that degraded what it measured
(above) are not three separate lessons. They are:
**several write-authorised sessions operating on one production system, with no
mechanism by which any of them can know what the others are depending on** — not
which rows, not which URLs, not which uncommitted files, not which readers. An
agreement between two of three participants is not a control.

### The third instance: a measurement method that degraded the thing it measured

**This one is a cost this run may have imposed on live readers and never
accounted for.** The observation belongs to the **P5 run,
`pillars-ingest-redirects-b7`** — recorded here with its author named, because it
was briefly attributed to a different session in passing and a real observation
credited to a session that did not make it is worse than an uncredited one: the
person who could confirm or qualify it is not the person a reader would go and
ask. From its close:

> proof requests go one at a time, never a concurrent burst of cold URLs — my
> agent's seven-hub burst degraded four hubs for six minutes, and they returned
> `200` with empty pages, which is worse than failing.

This audit ran concurrency-8 sweeps against production repeatedly — A, B, F, G,
plus the discarded pair — against a route with `maxDuration = 5` and a former 4 s
shared budget, at medians of 3.2–3.7 s and a slowest of 5.6 s across both sessions.
**We read that latency as evidence the pool was under pressure, which is what made
it a good reproduction. No run asked what the pressure was doing to real readers at
the same time.** On `b7`'s evidence a concurrent burst of cold URLs can make pages
return `200` with empty bodies — the worst available failure mode, because
monitoring sees success.

**And the instrument cannot see it.** These sweeps were built to detect a missing
credit. A page returning `200` with an empty body would have been recorded as…
a page with no credit. **The fault and the instrument are indistinguishable** —
which is the same pattern named below for the media-scope elimination, showing up
in this run's own method rather than in somebody else's reasoning.

**`-59` took the finding seriously enough to test its own data against it rather
than wave it through**, and split it correctly: harmless for credit-bearing
articles, where a thin body scores as a *miss* and there were none; not harmless
for a negative control, where a degraded page and a correctly uncredited page are
indistinguishable. Its `sweep-1`/`sweep-2` `bytes` minimum of 80,168 verifies its
control **under light load only**; `cold-1`/`cold-2` recorded no body size, so
under pressure its control is *unfalsified, not verified*. §4a carries the split.

It is also why the missing `bytes` field matters more than it looks — see §4a for
what it costs this run specifically, which is more than it costs `-59`.

**The remedy:** proof and verification requests go **serially** against
production. Concurrency is reserved for reproducing a specific
concurrency-dependent defect, done deliberately, with the blast radius stated in
advance — and with `bytes` recorded, so a degraded response is distinguishable
from a correct one.

### A small lesson that cost two data points

**Do not delete sweep evidence at cleanup.** Two v8 sweeps taken at ~11:58Z had to
be discarded rather than reported, not because they were wrong but because their
JSON had already been deleted and they could no longer be placed on either side of
the 11:59:08Z rebuild boundary. **A measurement that cannot be located in time is
not a measurement.** Raw per-request data is small, it is the only thing that
survives a disagreement, and tidying it away costs more than it saves — as it did
here, and as it nearly did for `-59`'s four sweeps.

### A named pattern: an elimination that could not have detected the thing

The peer run ruled out ingest as the writer of the nine because **zero of 747
`media` rows had ever been stamped**, and `ingest-article.mts` upserts media with
`updated_at = now()`. The premise is true and the reasoning is valid.

**The scope was wrong.** A cover swap re-points `articles.cover_image_url` at
media that **already exists** — no insert, no conflict, no stamp. The test was
structurally blind to the mechanism it was being used to rule out, so it returned
a clean answer to a question it could not see.

**A confident elimination built on a test that could not have detected the thing
it was ruling out.** That is the pattern, and it is worth a name because it does
not look like an error from inside: the query runs, the number is real, and the
conclusion is stated with justified confidence. The guard is to ask, before
trusting any elimination, *what would this test look like if the thing were
true?* — and to distrust it when the answer is "exactly the same".

### Closing: the coordination defects and the bug are the same shape

The three coordination failures above read like process grumbles appended to a bug
report. They are not. **They are the same defect as the one this run was opened to
fix, one level up.** The parallel is `-59`'s; the fourth term is the one worth
making explicit.

| | The thing | Why it was lost |
|---|---|---|
| 1 | An uncommitted edit in a shared worktree | **No owner.** Nothing in the tree says which session made it |
| 2 | A hold negotiated in conversation | **No artifact.** Nothing in the tree says it exists |
| 3 | A hold contradicted by a standing instruction to a third party | **Two authorisations racing** |
| 4 | **The cover credit** | **Fetched apart from the image it belonged to** |

**Three and four are structurally identical: two things fetched separately, and
the one that can be lost is lost silently.** The credit was fetched apart from the
image it described; the constraint was held apart from the tree it applied to.
Both failures are invisible at the instant they happen — **a missing credit
renders as nothing by design, and a contradicted hold looks exactly like a hold
until somebody acts on the wrong half.** Neither leaves a mark. In both cases the
first evidence that anything went wrong arrives long after the moment it could
have been caught: a reader seeing an uncredited photograph, or a session being
told it had violated an agreement it could not have read.

**And the remedy is one sentence, which this document already states for the
code:** *attach the attribution to the thing it describes; never fetch it
alongside.* The in-body figures never lost a credit all day, because theirs
travels inside the figure. The cover lost eight, because its credit travelled
beside it. The fix made the credit ride the article's own row.

**The process needs the same move. The hold should ride the tree.** A constraint
that lives only in a conversation between two of three participants is a
constraint fetched separately from the thing it governs, and it will be lost the
same way — silently, at the moment it mattered, discovered afterwards. Today the
only way for a third session to learn the hold existed was to violate it and be
told.

**That is the finding this run ends on, and it is larger than the brief.** Not
"the renderer had a race" and separately "the sessions collided", but: *a rule
enforced somewhere other than the thing it applies to is not enforced.* The
ingest gate was real and it held perfectly, and it could not save an image whose
credit was fetched elsewhere. The deploy hold was real and honoured by everyone
who knew of it, and it could not bind a tree that did not carry it. **Both were
gates on the wrong door, and the door is the same door.**
