# The Content Production Workflow

**Status:** CEO decision — operative from first article
**Date:** 23 Aug 2026 · **Session:** aug-23-2026-session-01
**Applies to:** every article and every content pillar HelloKahwin produces

This is the assembly line. It defines who does what, in what order, and what
must be true before work moves to the next station. Two levels: **a pillar**
(the cluster-scale unit) and **an article** (the atomic unit).

---

## The team and what each seat owns

| Agent | Owns | Cannot do |
|---|---|---|
| `ceo-hellokahwin` | Strategy, priorities, approvals, hiring, board reporting | Specialist work a hire owns |
| `head-of-seo-content` | Keyword strategy, cluster map, article briefs, SEO QC | Overrule a verification block |
| `managing-editor` | Voice, style guide, simplification, **chairs the review board** | Overrule a verification block |
| `editorial-verification-lead` | Accuracy, currency register, religious/legal standards. **Can block publication** | Publish, or trade a block for a deadline |
| `writer-adat-agama-prosedur` | Drafts P1, P2, P3, P7 (authority track) | Publish, write outside assigned clusters |
| `writer-inspirasi-vendor-venue` | Drafts P4, P5, P6 + directory (inspiration track) | Publish, write outside assigned clusters |
| `full-stack-engineer` | Codebase, ingest path, pillar pages, dashboard, site health | Deploy to production without board approval |

Every dispatch runs in a **visible Orca terminal** via
`skillcentral/skills/hellokahwin/scripts/dispatch-agent.ps1`.

---

## Level 1 — Opening a content pillar

Run once per pillar, before any article in it is written. Pillars open **one
at a time, depth-first** — six pillars opened at once is exactly the mistake
that cost thekenduri.com ~95% of the traffic nikahsatu earns at the same
domain strength.

| # | Step | Owner | Gate before moving on |
|---|---|---|---|
| P1 | Confirm the pillar's clusters, head keywords and topics against the approved cluster plan; refresh the Ahrefs data if it is stale | `head-of-seo-content` | Cluster set signed off by CEO |
| P2 | Build the **pillar page** at `/artikel/<pillar>` and register it in the sitemap | `full-stack-engineer` | Pillar page live — **no article publishes without an inbound editorial link from its pillar** |
| P3 | Open the **currency register** for the pillar: which claims in it can expire, which source owns each | `editorial-verification-lead` | Register exists before drafting starts |
| P4 | Set the pillar's **voice notes** — anything the style guide needs to say specifically about this subject matter | `managing-editor` | Notes issued to the writer |
| P5 | Write the **article briefs** for the pillar's topics: target keyword + volume + difficulty, the questions each article must answer, internal links specified up front, supply lever | `head-of-seo-content` | Briefs delivered to the assigned writer |
| P6 | Assign the pillar to **one** writer by track | `head-of-seo-content` | Writers never share a cluster — that is how cannibalisation starts |

---

## Level 2 — Producing one article

### Stage 1 — Brief
`head-of-seo-content` issues the article brief. It names the target keyword
with its volume and difficulty, the questions the article must answer, the
internal links it will carry (**specified before drafting** — retrofitting
links across 80 articles is a project; specifying them up front is one line),
the cluster it belongs to, and the supply lever.

Every brief closes by quoting the **Stage 9 gate verbatim** in its "When done"
section, naming the exact company-entry path the retrospective must land in.
Added 25 Aug 2026: the first run under Stage 9 wrote a complete retrospective
into the wrong file. The brief had asked for one; it had not said which file, and
"the work-done log" is ambiguous in a two-repo workflow. **State the path.**

#### A publish brief's scope table is the count of record

Added 25 Aug 2026. The P3/P4/P7 brief said "**Ten** verified articles" in its
prose and listed **nine** in its scope table; its predicted sitemap number,
57 → 70, was arithmetic on the wrong figure. The tenth was
`C5-2-A1-contoh-kad-jemputan-kahwin`, which that same brief then blocked two
paragraphs later along with the rest of P5. The count had been carried forward
from the verification batch and never re-derived after P5 was cut.

Nobody was going to publish the blocked article — the exclusion was stated
loudly. The cost is that the executor cannot tell a stale count from a missing
table row, so the brief's own proof target became unverifiable and had to be
recomputed and defended mid-run.

**Rule: the scope table is normative and every number in the prose is derived
from it.** When something is cut from a brief, re-derive the count, the
predicted sitemap delta and the pillar arithmetic in the same edit. A brief that
asks for proof against a number must state a number that is true.

**Gate:** no writer starts without a brief; no brief ships without the Stage 9
gate quoted in it with a concrete target path; and no publish brief ships with a
prose count that disagrees with its scope table.

### Stage 2 — Source
The writer retrieves primary sources **before drafting**. For the authority
track that means JAKIM, the relevant state jabatan agama, JPN, official
portals. For the directory track it means verifying capacity, price band,
address and facilities — never repeating vendor marketing copy as fact.

**Gate:** anything unsourceable is flagged back to the brief owner, not
filled in with something plausible.

### Stage 3 — Draft
The writer drafts to the framework: head question answered in the first 60
words, every sub-type of the entity gets its own heading, depth means
coverage not word count, specificity is the competitive weapon — real ringgit
figures, real state-by-state rules, named sources, current year.

**Gate:** the draft is complete against the brief's question list.

### Stage 4 — The Editorial Review Board (`/bmad-party-mode`)
Convened and chaired by `managing-editor`. Four seats, deliberately in
tension:

| Seat | The question they ask |
|---|---|
| `editorial-verification-lead` | "Is this true, attributed to the right state's enactment, and **still** true as of today?" — **researches online live in the session** |
| `managing-editor` | "Would a reader with no background understand this on one pass? What can be cut?" |
| `head-of-seo-content` | "Does this answer what the searcher wanted, beat what ranks now, and avoid cannibalising a sibling?" |
| The writer | Defends, then revises **in session** |

**Rules of the room**
1. Every article goes through it. Deadline pressure is not an exemption.
2. **The verification seat can block.** Accuracy is never weighed against the calendar, and the chair backs the block.
3. **Live research is mandatory** on any claim that can expire. "It was true when written" is not a defence.
4. **Simplification is a required output** — every review names at least one thing to cut or make plainer. A review that finds nothing has not been done.
5. The room produces a **revised article**, not a list of notes.
6. Outcome is logged to `docs/work-done/`.

**Gate:** no unresolved block.

#### Rule 7 — one board at a time. Drafting parallelises; the room does not.

*Added 23 Aug 2026 after cluster C2.4, where it cost real money.*

The room only works if the seats can address each other. **Run several boards at
once and every seat name becomes ambiguous** — seven `managing-editor` instances
were live during C2.4, so "managing-editor" resolved to nobody, and the
verification seat could not reach its own chair to deliver a block.

That is not an inconvenience. **The verification seat's blocking authority is the
core safety mechanism of this entire workflow**, and concurrency severed it. A
block had to travel through a human-shaped relay hop, one chair sat waiting on
answers that had already been produced, and the same rulings were re-transmitted
three times. Three full verification passes spent on re-transmission.

**Therefore:**

- **Stages 1 to 3 (brief, source, draft) run in parallel** across as many
  articles as capacity allows. Writers working from separate briefs have no
  seat-to-seat traffic, and this is where the throughput actually comes from. In
  C2.4 it produced eight drafts in two waves.
- **Stage 4 runs sequentially. One `managing-editor` and one
  `editorial-verification-lead` live at a time.** Names resolve, seats talk
  directly, blocks get resolved by the people who raised them.
- If a board ever must run concurrently, **the chair opens it by giving every
  seat the exact agent refs of the other seats, and seats address by ref.** This
  is the fallback, not the default: it breaks the moment one seat uses a bare
  name, and in C2.4 it broke immediately.

**A second structural gap surfaced the same way and has no owner yet:** each
board sees only its own article, so nothing catches a cross-article
inconsistency. In C2.4 the pillar-wide definition forked between two verbs and it
was a *writer*, not a board, who noticed. **Add a pillar-level consistency pass
before anything in a pillar publishes** — one reader, all articles, checking the
house definitions and shared citations agree.

### Stage 5 — Humanize
`/humanizer` runs on the revised article — **after** the review, never before,
or the review undoes it. Owner-level rule: nothing is done until it has
passed.

**A humanizer pass edits the file, so it re-arms the Stage 6b dry run.** The
front matter lives in the same file as the prose, and `metaDescription` has a
hard 160-character ceiling a rewrite crosses without complaint. `C5-1-A1-pelamin`
reached its production publish window at 169 characters and ingest refused it —
board-cleared, BLOCK-closed, humanized, and unpublishable. See *"A block expires
when the file changes"* in Stage 6b.

**Gate:** humanizer pass complete and re-checked, **and `pnpm --silent ingest
<file> --db "$DB"` re-run as a dry run afterwards, exiting 0.**

### Stage 6 — SEO QC
`head-of-seo-content` walks the 21-point quality bar. Failing any point sends
it back; failing the humanizer point means it was never finished.

**Gate:** all 21 points true.

### Stage 6b — Visual build (`managing-editor`)
Added 25 Aug 2026 after eight finished articles sat unpublishable for a day
because nobody owned their images. **This stage is not optional and it is not
the writer's job to improvise.**

**The cover is a licensed photograph, and it has to be a GOOD one.** Owner
directive, 26 Aug 2026, superseding the 25 Aug wording:

> *"Lets not lock it to humans only. Instead I want to focus on high quality
> images — high definition, ideally taken by a wedding photographer, high
> contrast and stands out, looks premium."*

**What changed and why it matters.** The 25 Aug rule read *"the cover is a
licensed photograph of people"*, written against text cards — its stated
contrast was *human, not text*. Read literally it required a human in every
frame, **which is what put anonymous guests on articles about trays.** A writer
told the cover must show people cannot use the photograph of the dulang sitting
in our own library. The rule caused the defect it is now being replaced over.

**People are no longer required. Quality is.** No text cards remains absolute
and is unchanged.

### THE COVER DEPICTS THE ARTICLE'S SUBJECT (CONT-09, 26 Aug 2026)

Added because nothing anywhere said it, so nobody was wrong to pick a pretty
wedding photograph and move on. `dulang-hantaran` — an article about gift TRAYS
— shipped with a tight crop of two guests' torsos and no tray in frame. The UX
review found it independently and called it systemic. It was: the audit of
26 Aug found **25 of 61 live covers failing this test**, and the correct
photograph was already in our own library, ingested as a supporting image and
never promoted. This is a SELECTION defect, not a sourcing one, and these six
rules are what was missing.

**Rule 1 — Name the subject in one noun phrase, before you open the pool.**
Write down the thing the title promises, as a phrase a reader could point at.
"Dulang hantaran" → the trays. "Harga sewa dewan kahwin" → the hall. "Bunga
telur" → the bunga telur. If you cannot name it in one noun phrase, the
article's scope is unclear; that is a brief problem, return it.

**Rule 2 — The subject is IN the frame.** The cover contains that noun phrase's
referent, identifiable by a reader who has NOT read the article, at the size the
card renders. A wedding photograph that merely shares the article's topic area
is not a cover for it. Two guests' torsos is not a cover for an article about
trays; a kompang troupe is not a cover for a 12-month checklist.

**Rule 3 — When the subject cannot be photographed, photograph where it
happens.** Some subjects are numbers, rules, documents or words: mas kahwin
rates, syarat sah nikah, borang nikah, lafaz taklik, a ucapan. For these — and
only these — the cover depicts **the named, specific place or moment where that
subject is used, issued or spoken.** The ijab qabul, for an article on what mas
kahwin means. The state religious authority, for a state's minimum rate. The
pejabat agama counter, for where a form is filed. Write which moment you chose,
and why, in the article file. **"A Malay couple" is never the answer to Rule 3.**

**Rule 4 — Malaysian Malay-Muslim context, or it fails whatever else is right.**
A Western church ceremony, a white-studio stock couple, an obviously
non-Malaysian scene: fails even when it technically contains the subject.
Culturally wrong is worse than absent. And the photograph's own location must
not contradict the article: on 26 Aug the cover of `mas-kahwin-perak` was a
photograph taken in **Melor, Kelantan** — our own register said so in its
caption. Read the caption of the file you are about to use.

**Rule 5 — Crop survival: check all four crops, in this order.** The subject has
to read in `crop-4x3-article-card` (1600×1200, the listing card),
`crop-4x5-mobile-cover` (1920×2400, and mobile is 79% of our impressions),
`crop-16x9-og` (1200×630, every social share) and `crop-4.3x1-desktop-hero`
(2464×700 — a letterbox that keeps under a third of a portrait frame's height).
**Open all four derivative URLs before committing.** A subject sitting low in
the frame survives the card and is guillotined by the hero — that happened on
seven of the nineteen covers re-selected on 26 Aug, because the automatic focal
point is `method: saliency` and it lands high. If it does not survive all four,
set the focal point and regenerate the crops
(`generateSmartCrops(buffer, key, focalPoint, safeZone)`); do not ship the
default and hope.

**Rule 6 — No licensable image depicts the subject? Say so and escalate. Never
substitute.** Write `cover: ESCALATE` in the article file with one line naming
the subject and where you looked — Flickr with `&license=4,5,7,9,10`, the
Wikimedia Commons categories tried, the Pexels/Unsplash terms in Malay and
English. It comes to the Managing Editor and goes onto the photographer-outreach
request list. **A generic wedding photograph in the cover slot is not a
placeholder; it is a wrong answer that nobody ever comes back to.** Six live
articles are on that list as of 26 Aug and that number is the case for outreach.

**Rule 7 — Look in our own library FIRST.** Of the 19 covers re-selected on
26 Aug, **19 came from images already in the register** — a sirih junjung, a row
of dulang hantaran, a bunga telur close-up, an invitation card in a hand, all
sitting as supporting images under `licenseClass: S` while the article they
belonged on fronted a stranger's wedding. Query the register by subject before
searching the web:

```sql
select distinct filename, licensor_name, alt from media
where filename like 'S-%' order by filename;
```

**Rule 8 — The uploaded filename names the subject and the source. Never
`cover`.** Added 01 September 2026 after the RIGHTS-02 census. Twelve live
articles carry a cover whose R2 object is named nothing but `cover`, and for
those twelve **the origin cannot be recovered from anything we hold** — not the
file, not the page, not the register. One of them fronts `garden-wedding`, which
draws 28% of site impressions. Uploaded under `S-dulang-hantaran-azlan-dupree`
they would each have been traceable in one grep. Filenames follow the register's
own convention (`S-<subject>-<licensor>`), and a generic name is a rights record
thrown away at the moment it was cheapest to keep.

#### Who or what is in frame: the subject decides, not a people quota

The 25 Aug people rule is retired (see the top of this stage). **The subject
rules the frame:**

- Subject is a THING → photograph the thing. Hands or people handling it are
  **better where such a photograph exists** — a pair of hands presenting a dulang
  beats the same dulang alone — but they are a preference, not a requirement.
- Subject is a person, a moment or a ceremony → a photograph of people, as before.
- Subject is unphotographable → Rule 3. A building, a counter or a signboard is a
  **last resort**, never a shortcut, and never for a subject that could have been
  photographed directly.

Unchanged and absolute: no text cards, ever; nothing culturally wrong; every
image fully credited.

### RULE 7 — THE QUALITY BAR (owner directive, 26 Aug 2026)

Relevance was the whole of CONT-09. It is now **half** the test. A cover that
depicts its subject in a soft, cluttered, low-resolution snapshot still fails.

**"Premium" is a feeling and cannot be enforced, so here is what it means in
things you can check.** A cover must pass every line.

**Q1 — Resolution: it must never be upscaled.** The source's natural dimensions
must equal or exceed every crop it feeds, on the axis that crop uses. The
binding one is the desktop hero at **2464×700**; the mobile cover at
**1920×2400** binds on height. A source below either is upscaled, and upscaling
is exactly what makes an image look cheap.
- Measured failures on 26 Aug: `kursus-kahwin`'s hero asset is **1160×330
  natural rendered into 1488×420 — a 28% upscale.** The homepage hero requested a
  1600×1200 source into a 1905×560 box: **19% upscale and 61% of the frame
  discarded.**
- **Check it, do not eyeball it:** `naturalWidth`/`naturalHeight` on the rendered
  element against the rendered box. If natural < rendered, reject the image.

**Q2 — Provenance: prefer the best pool available, in this order.**
1. `licenseClass: V` — **a wedding photographer's own work, under written grant.**
   This is the target. The owner is opening this pool by direct outreach; see
   `aug-26-2026-plan-photographer-outreach-list.md`.
2. `licenseClass: S` — paid or professional-grade stock.
3. `licenseClass: S` — CC-licensed work by a *photographer* (a portfolio, a
   credited body of work), not a guest with a phone.
4. Everything else. **If a cover can only be filled from tier 4, that is a Rule 6
   escalation, not a pass.**

**Q3 — Craft: the marks of a professional frame.** All four:
- **Subject in sharp focus**, and separated from its background — the eye lands
  on the subject without hunting.
- **Deliberate light.** Directional or soft-even. Not on-camera flash, not
  blown-out highlights, not muddy shadows with no detail.
- **Contrast and colour that hold up small.** The subject must still read at
  card size on a phone. A low-contrast image dissolves into grey at 320px.
- **A composed frame, not a snapshot.** No cropped-off heads at the edges, no
  cluttered banquet background competing with the subject, no visible JPEG
  blocking, no date stamp, no watermark.

**Q4 — It has to stand out in a row.** Open the pillar page and look at the new
cover **beside its neighbours**. Covers are consumed in a grid, never alone. If
it disappears into the row, it fails even when Q1–Q3 pass.

**Q5 — When quality and relevance conflict, relevance still wins — but say so.**
A sharp, beautiful photograph of the wrong subject is not a cover (Rule 2 is not
negotiable). A correct-but-mediocre photograph ships **only with a written note
in the article file naming what is weak about it**, so it appears on the upgrade
list when the photographer pool opens. Silent mediocrity is how 25 of 61 covers
drifted.

**Expected consequence, stated honestly:** raising the bar **increases** the
number of articles that cannot be filled from the current pool. CONT-09 escalated
6 of 61 on relevance alone. Under Rule 7 that number will grow, and that is the
rule working, not failing — it is the measured size of the case for licensed
photographer work.

#### The check, before the file leaves your hands

1. Subject noun phrase written down.
2. It is in the frame, identifiable by someone who has not read the article.
3. All four crop URLs opened; the subject survives all four.
4. Malaysian Malay-Muslim context, and the photograph's own caption does not
   contradict the article's state or setting.
5. `credit` + `creditUrl` + `licensorName` + `licenseClass` complete, and the
   cover URL matches a `media.url` **exactly** — the article page joins the
   credit line on `media.url = articles.cover_image_url`, so a near-miss renders
   an uncredited photograph.
6. Any answer above is "no" → `cover: ESCALATE`. Not a substitute.


### NO TEXT CARDS. ANYWHERE. (owner directive, 25 Aug 2026)

*"No i do not want a text card, it looks ugly. Find alternatives, no text card
at all."*

**A typographic card is never a cover and never an in-article image.** Not as a
fallback, not when a photograph is hard to find, not "just this once". This
supersedes the earlier position that data cards earn their place in-article on
image-pack evidence — the owner has ruled on the visual and that ruling stands.

**When a photograph is hard to find, widen the search — do not settle.**
Wikimedia Commons categories for Malay weddings, Malaysian cultural events,
songket, hantaran, kenduri, masjid interiors, henna, traditional dress;
Openverse; Pexels and Unsplash searched in Malay and for adjacent subjects.
**Reuse across closely-related articles is expected**, not a compromise.

**If no correct photograph exists after a real search, escalate to the CEO with
what you tried.** The only thing that still outranks this rule: never a
culturally wrong image. A Western church wedding or a white-studio stock couple
is not an alternative to a text card — widening the search is.

**Supporting images: aim for one per major H2 section**, from three kinds —

1. **Licensed photographs**, `licenseClass: S`. **Flickr first for Malay
   wedding subject matter**, then Wikimedia Commons, Pexels and Unsplash.
   **CC BY-NC and CC BY-ND both fail us** — non-commercial is disqualifying and
   no-derivatives breaks the crop pipeline. Verify at origin, never from an
   aggregator's label. Never Google Images, Pinterest, another wedding blog, or
   a vendor's site without written permission.
2. **Our own NON-TEXT graphics**, `licenseClass: G`, `credit: HelloKahwin` —
   diagrams, maps, illustrations. **Not typographic cards**; see the rule above.
   Data belongs in a markdown table in the body, where it is readable and
   indexable as text, not re-rendered as a picture of words.
3. **Authority screenshots**, only where the source's own terms permit reuse.

#### Where Malay wedding photography actually is (added 26 Aug 2026)

Settled by the C2.3 run, and it reverses the source order this stage carried
until now. Search in this order and stop re-deriving it per brief.

**1. Flickr, licence-filtered at the query.** Append
`&license=4,5,7,9,10` to `https://www.flickr.com/search/?text=<query>` — that is
CC BY, CC BY-SA, no-known-restrictions, CC0 and PDM, and it excludes every NC and
ND file before a human looks at one. Query in Malay: `hantaran`, `sirih junjung`,
`majlis pertunangan`, `akad nikah`, `kenduri kahwin`, `berinai`, `bersanding`.
This is a deep seam of Malaysian wedding photography from roughly 2007 to 2012
that no earlier run had swept, and on 26 Aug 2026 it produced the only
full-resolution Malaysian sirih junjung photograph found under any open licence.
**Read the size from the photo page, not the result list** — the search JSON caps
at 1024px while originals are often 4000px and up.

**2. Wikimedia Commons.** Good for museum objects and cultural artefacts —
`tepak sirih`, songket, dress on display. **It returns nothing for Malaysian
hantaran**, and this is now a settled negative rather than a search to repeat.
Confirmed empty on 25 Aug 2026 and again on 26 Aug 2026 for `hantaran`,
`dulang hantaran`, `sirih junjung`, `gubahan hantaran` and `pahar sirih`. What it
does return in volume is Indonesian: Melayu Deli, Riau, Palembang. Do not spend a
second run proving this.

**3. Pexels and Unsplash.** Verify the photographer's stated location on their
profile before accepting; subject matter alone cannot separate Malaysia from
Indonesia.

**Openverse is out.** Its API returned HTTP 401 on every request on 26 Aug 2026.
It needs credentials nobody on the team holds.

**A watermark only shows up once the file is on disk.** A CC BY set can be
perfectly licensed and still unusable because the photographer burnt a studio URL
into every frame. Cropping it out strips an attribution notice the photographer
placed inside the work, so the whole set is rejected, not cropped. This is the
second independent reason the download-and-look rule is not optional.

**Two rules that override the count.** An image that illustrates nothing is
padding and makes the article worse. And a culturally wrong image — a Western
church wedding, a white-studio stock couple — is worse than no image at all,
whatever the coverage target. An article that can honestly carry two carries
two, and the editor says which and why.

**Every image, without exception:** real Malay alt text written for someone who
cannot see it; a caption that *teaches* rather than describes; `credit`,
`creditUrl`, `licensorName`, `licenseClass`; and an entry in the asset register.
The parser refuses a cover missing any of the three credit fields — that gate is
the owner's rule in code, not a formality.

**The credit LABEL is `Kredit:`, and it is applied at render — do not type it.**
Style guide §13.1. Put the owner's name in the `credit` field and in the caption;
`src/lib/inspire/image-credit-label.ts` supplies the label and the casing, so an
editor who types `source:` still gets `Kredit:` on the page. Three words are
RESERVED and are never image credits: `Sumber:` cites a fact, `Jurugambar:` is a
line in the imported vendor block, `Grafik:` is our own original graphic. See
style guide §13.1 and §13.1a.

**Gate — run it before you call the visual build done, and after any deploy that
touches the renderer:**

```
pnpm --silent audit:credits                    # sweeps every article in the sitemap
pnpm --silent audit:credits --base-url <url>   # a preview or a local `next start`
```

Exit 0 means every credit on every article page reads `Kredit: `. It also prints
the pages carrying **no per-image credit**, with their slugs, split into "credited
once in a body `Kredit Vendor` block" and "NO CREDIT ANYWHERE" — the second list
is the one that needs a decision.

**It ENUMERATES; it never tests for a string it expects.** RIGHTS-01 began with
`grep -c 'Kredit'` returning **zero** on a page carrying forty credits, because
the credits were labelled in English — and zero read as *worse than reported*
rather than *wrong regex*. The same run also turned up a variant nobody had
recorded: `U+00A0` instead of a space after the colon, on 10 credits.

**Read the `build fingerprint` line in its header before you believe a number.**
It hashes the content-hashed chunk filenames the host serves. RIGHTS-01 measured
the wrong server twice — once following the local sitemap's `localhost:3200` URLs
to another session's dev server, once because `next start` died with `EADDRINUSE`
and the previous build kept answering the port. Both runs produced a confident,
precise, false number. If the fingerprint did not change after a rebuild, you are
looking at the old build.

#### Working notes for this stage (26 Aug 2026)

- **Anything importing `src/lib/**` runs under `tsx`, never bare `node`** — the
  repo's `@/` path alias does not resolve otherwise, and `generateSmartCrops`
  lives behind it. Two runs have now lost time to this.
- **Render the four crop windows LOCALLY before writing anything.**
  `computeCropWindow(width, height, ratio, focalPoint, safeZone)` is exported and
  pure; extracting with sharp costs nothing and needs no R2 write. Decide by
  looking at all four, then regenerate once.
- **A cover shared by two articles is a symptom.** A photograph chosen for topic
  rather than subject fits every article on that topic equally badly, so the
  duplicate is usually the same wrong answer given twice. Seven pairs existed on
  26 Aug; one remains, and it is on the escalation list. Reuse of a
  subject-correct image across closely-related articles is still expected — the
  test is whether it depicts each article's subject, not whether it repeats.

#### A declared image is not a delivered image

Added 25 Aug 2026, after the P3/P4/P7 publish. **Every file named under `cover:`
or `images:` must exist on disk when the article leaves this stage.** Not
designed, not specified, not entered in the article-to-graphic map — present, as
bytes, at the path the front matter states.

This is a separate requirement from the credit chain and it has to be stated
separately, because the credit chain was intact and the files were not. Nine
`licenseClass: G` graphics across six P4/P7 articles carried a full credit,
`creditUrl`, licensor and licence class, and a real spec in
`aug-25-2026-map-article-to-graphic.md` — and had never been rendered, because
the templates they call for (`jadual-perbandingan`, `grid-kategori`,
`garis-masa`, `kad-senarai-semak`) are still only a spec. `ingest-article.mts`
refuses a file with an unresolved image, so **six finished, board-cleared
articles were unpublishable and nothing in this workflow said so.**

It cost two runs. The covers work of 25 Aug found it, recorded it as "not mine
to unblock", and moved on; the publish run found it again from scratch three
hours later. A gate that checks the credit on an image that does not exist is
checking the wrong thing first.

Prove it with the one command, from the site worktree, before handing over:

```
pnpm --silent ingest <file.md> --db "$DB"        # dry run, no --commit
```

A dry run resolves every image path, every internal link and both categories
against the real database and writes nothing. **It is the handover gate, not a
Stage 7 convenience.** If it refuses, the article is not finished.

**If a declared graphic genuinely cannot be rendered in time**, say so by name
in the handover — `<file> — template <name> does not exist` — and say whether
the article still stands without it. Do not hand over silently and do not delete
the entry from the draft: the entry *is* the spec.

**If the dry run itself is unreachable, say that too, and run the parts you can.**
Added 26 Aug 2026, after the C2.3 run. A writer dispatched into the
`hellokahwin` docs repo has no `hellokahwin-site` worktree and therefore no
`pnpm ingest`, no `articleFileSchema` and no database. The gate cannot close, and
pretending otherwise is worse than saying so. What a writer in that position owes
the handover, all four:

1. **Every declared path resolves on disk.** Walk `cover.file` and every
   `images[].file` in the front matter and stat each one. This is the check that
   cost two runs on 25 Aug, and it needs no site repo.
2. **The front matter parses as YAML**, and `cover` carries all of `file`, `alt`,
   `caption`, `credit`, `creditUrl`, `licenseClass`, `licensorName`.
3. **`metaDescription` counted, not estimated** — 155 editorial, 160 schema. Count
   it again after `/humanizer`, which is an edit like any other.
4. **Every `internalLinks` slug is live**, checked with `curl -o /dev/null -w
   '%{http_code}'` against the real URL, and the declared list matches the links
   in the body exactly. A slug declared but never linked, or linked but never
   declared, is a defect the dry run would have caught.

Then hand over with the line **"dry run NOT taken, no site worktree on this
machine"** in the log, so whoever ingests runs it first instead of assuming the
gate closed upstream.

#### A block expires when the file changes. Re-run the check, never cite it.

Added 25 Aug 2026, after the P5 publish — the last pillar, and it was nearly held
dark by a blocker that had already been resolved.

The P5 handover carried a block: **"27 named-but-missing `.png` files."** True
when it was written. By publish day it was false, and nothing noticed. The
no-text-card directive had removed the `kad-tajuk` entries from those articles,
and the image references went with them. The block was resolved as a **side
effect of an unrelated edit**, in a different file, by a different run — which is
the ordinary way blocks die, and the reason none of them can be trusted on sight.

It survived because it was written as **prose in a log** and then carried forward
by **citation**. Three runs repeated the number without re-measuring it. It took
the CEO thirty seconds to disprove by listing the directory.

**A block is a claim about the current state of a file, and it has a shelf life
of exactly one edit to that file.** So:

1. **Record a block as the command that reproduces it, never as a sentence.**
   If you cannot state a block as something the next person re-runs in under a
   minute, it is not a block, it is an opinion. `"27 missing .png"` is an
   opinion. `pnpm --silent ingest <file> --db "$DB"` is a block.
2. **Re-run it before you act on it.** Inheriting a block from a log, a brief or
   a handover note obliges you to re-derive it first. Citing a previous run's
   finding is not evidence about today.
3. **The dry run is not a one-time handover gate — it re-runs after every
   subsequent edit.** This is the half that was missing. Stage 6b already
   required a passing dry run at handover; nothing required it again after the
   article was reopened. Both P5 articles were reopened after that gate — pricing
   re-sourced, `/humanizer` re-run — and neither was re-validated.

**What that cost, concretely, on the run that wrote this rule.** `C5-1-A1-pelamin`
reached publish day with a **169-character `metaDescription`** against the
schema's `.max(160)`. Ingest refused the file outright. It is a board-cleared,
BLOCK-closed article that had been through `/humanizer` after its review, and no
dry run was taken after that edit — so the defect travelled all the way to a
production publish window before anything looked at it. One command at the end of
Stage 5 would have caught it, in the worktree, for free.

**This applies to `/humanizer` in particular.** Stage 5 rewrites prose, and the
front matter sits in the same file. `metaDescription` has a hard 160-character
ceiling that a rewrite crosses silently — the schema comment says why: *"160 is
where Google reliably truncates. A description written to fit is an editorial
decision; one silently cut in half is not."* A humanizer pass is an edit like any
other, and it re-arms the gate.

### "COULD NOT REPRODUCE" IS A STATEMENT ABOUT CONDITIONS, NOT ABOUT A PAGE

Sprint 02, RISK-06. The CEO tried to reproduce a stale-shell symptom and could
not — six consecutive fetches all returned the correct page. It concluded the
symptom might not be real. **Its own earlier requests had warmed the cache.** The
agent, reading the source for a mechanism first, reproduced it on **50 of 61
pages on the first try**.

> *"A reproduction is a statement about conditions, not a page. 'Could not
> reproduce' was true and told us nothing."*

**So: before reporting that something cannot be reproduced, state the conditions
you reproduced under, and ask what your own attempts changed.** An observer that
warms a cache, populates a session, or creates the row it is looking for has
measured its own footprint.

The same class of error nearly shipped in RISK-05, whose monitor first treated a
**failed** inspection as *absent* — it would have reported "clean" over a
silently shrinking denominator, which is SEO-01's failure re-implemented one
layer up. **Ask what the measurement cannot see, not only what it reports.**

### Stage 6b DOES NOT END AT A DRAFT

Added 26 Aug 2026, from the Sprint 01 retrospective. CONT-02 sourced, credited
and wrote Malay alt text for **69 images, marked the item done, and not one
reached a reader** — complete and correct in draft front matter, one step short
of production.

The Managing Editor named the cause exactly: *"in my head 'the draft is finished'
and 'the work is finished' are the same sentence."* The Head of SEO named why it
bites this stage and not the others: **ingesting is a writer's last step, so a
writer cannot forget it. This stage ends in a file, so its author can.**

**So the gate is production, not the file.** Either ingest as part of this stage,
or hand off to Stage 7 with the explicit article list — but never mark this stage
done from a draft. A dry run that exits 0 proves the file is *ingestable*, which
is not the same as ingested.

**Gate:** cover is a credited human photograph; every image has its full credit
chain; **the images are IN PRODUCTION, or handed to Stage 7 by name**; **every
declared image file resolves on disk and `pnpm --silent ingest
<file> --db "$DB"` exits 0 as a dry run — re-run after EVERY later edit to the
file, `/humanizer` included, not once at handover**; every inherited block has
been re-derived rather than cited; the register is updated. **Do not
hand an article to Stage 7 without this** — an article with no images is not
finished, it is stalled, and an article whose images are named but absent is
worse, because it looks finished.

### Stage 7 — Ingest and publish
BMAD (the outsourced development team) runs the approved article through the
content-ingest path into Supabase with correct slug, meta, category, internal
links and media.

**Updating a live article is `--update` on the same slug — never a second
article.** Article URLs are `/artikel/{categorySlug}/{slug}`, so changing an
article's parent changes its URL; re-parenting is a migration with redirects,
not a database update.

#### Never reconstruct a live article's body from its rendered page

Added 26 Aug 2026, on SEO-03, before it cost anything.

A brief that says "deliver the updated article body" for a page that is already
live reads naturally as *fetch the page, edit the part you own, write the whole
thing back*. **On the WordPress-migration rows that is silent corruption.**

`articles.content` on a legacy row holds TipTap HTML. What the site serves is
that HTML **after Next.js has rendered it**, and the render is not the source.
Every `<img>` comes back carrying `data-nimg`, `loading`, `decoding`, a generated
`class` and an inline `style` that appear nowhere in the stored value. On
`/artikel/idea-dan-nasihat/kursus-kahwin` that is **18 image nodes** which a
round-trip through the rendered page would have rewritten, on an article whose
other content the same brief had declared out of scope. Nothing downstream would
have flagged it: the page would still render, the images would still resolve, and
the diff nobody took would have been the only evidence.

So:

1. **Editing one section of a live article is a substring swap, not a body
   write.** The deliverable is the replacement block plus the exact find-string
   it replaces, and the find-string must be verified to match **exactly once**
   against the current content before anyone runs anything.
2. **The before-state comes from the database, never from the page.** This is the
   same reason Stage 7 already forbids baselining a URL whose after-state is the
   proof: the rendered copy is a derivative, and it is not the thing you are
   about to overwrite.
3. **A rendered capture may be kept as reference, and must be labelled as
   rendered.** It is evidence about what readers see. It is not a candidate for
   write-back, and a file that could be mistaken for one should say so in its
   name.

This applies to the 29 WordPress-migration rows in particular, because those are
the ones nobody holds a source file for.

#### A DIRECT DATABASE WRITE runs none of the ingest CLI's four side effects

Added 28 Aug 2026, on CONT-12, after CONT-05 had already taken the same path
without the checklist existing.

A WordPress-migration row has no source file, so the rule above — *editing one
section of a live article is a substring swap, not a body write* — means the
correct tool is a script against `articles.content`, not `pnpm ingest`. Two items
have now done exactly that. **The ingest CLI is not just a writer; it is four
side effects, and a raw `update` fires none of them.** Each one has to be run by
hand, and each one fails silently if it is not.

| What ingest does after the write | What a raw SQL write does | Run it by hand with |
|---|---|---|
| `POST /api/cron/revalidate-content` — drops the Next data cache | nothing; the origin serves the old page indefinitely | `fetch(endpoint, { headers: { authorization: 'Bearer ' + CRON_SECRET } })`, three attempts, non-zero exit if it fails |
| `purgeVercelEdge(pathsInvalidatedByIngest(pillar, slug))` — the article, its pillar and `/sitemap.xml` | nothing; the edge holds its copy for its full TTL | the same two functions from `@/lib/cache/edge-purge`. **Needs `VERCEL_TOKEN`.** If it is absent the purge is skipped and the call *reports* that it was skipped — read the return value, do not assume it ran |
| `syncMediaUsage(articleId, content)` — reconciles `media_article_usage` | nothing; the derived index keeps naming images the body no longer has | delete the article's rows, re-insert one per media row matching a URL in the new body. Mirror the reconcile, do not invent one |
| `submitSitemapToGsc(...)` — tells Google | nothing | only matters when a URL is new; a body change does not need it |

**`published_at` is the fifth trap and it goes the other way.** The ingest CLI's
`on conflict` clause restamps it; a hand-written `update` that lists its columns
does not, which is the safe behaviour — but it is safe by accident, so the write
script should assert `published_at` unchanged after the write rather than
assume it.

**Without `VERCEL_TOKEN` the edge is the long pole.** CONT-12 could not reach a
token from any worktree, so the page took its full 300 s TTL to turn over. The
Stage 7 rule about the second request being the honest one is not optional in
that case, it is the only measurement available: the first request past the TTL
is served `STALE` while it triggers the refresh, and on CONT-12 that STALE copy
carried the NEW body with a `<title>` matching neither the old row nor the new
one. Do not poll it. Wait, then request twice, and record which request you are
quoting.

#### The run, exactly

Written out 25 Aug 2026 after the P1+P6 batch, because every item below had to
be rediscovered by reading the script. The command is

```
pnpm --silent ingest <file.md> --db "$DB" --commit --publish --revalidate-url https://hellokahwin.com
```

- **`pnpm --silent`, never `pnpm run`.** The runner's banner echoes argv, and
  argv here contains the production database password. It has leaked into a
  transcript once already.
- **Publishing takes TWO keys, and one alone does nothing.** The file must say
  `status: published` AND the run must pass `--publish`. A file saying
  `published` without the flag inserts a **draft**, silently, and a draft never
  reaches the pillar page. Drafts arrive from Stage 6b saying `status: draft`,
  so **flipping that field is part of Stage 7**, not an edit to the article.
- **Re-ingesting a LIVE article without `publishedAt:` moves its publish date to
  now.** Added 26 Aug 2026, found while purging the P1/P6 text cards. The
  `on conflict` clause sets `published_at = excluded.published_at`, and that
  value is `frontMatter.publishedAt ?? new Date().toISOString()`
  (`scripts/ingest-article.mts:713`). **No draft in `drafts/` carries
  `publishedAt:`.** So any `--update --publish` re-ingest of the eight P1/P6
  articles — a correction, a backfill, CONT-02's image pass — silently restamps
  eight indexed pages with today's date, and the JSON-LD `datePublished` and the
  sitemap `lastmod` follow it. **Before re-ingesting anything already live, read
  its `published_at` out of the database and put it in the file.** This run did
  exactly that and verified all eight dates unchanged afterwards; nothing in the
  script or the file format will do it for you.
  **Closed at the files, 26 Aug 2026, during the CONT-02 ship.** All thirty-three
  canonical drafts now carry `publishedAt:` — the value read out of production,
  written in with the comment `A3-mas-kahwin-johor.md` already used — so the trap
  is disarmed for the articles that exist today. It is **still armed for every
  new draft**: the file format defaults it to absent and the script will happily
  stamp today. The rule stands, and the check after any re-ingest is one query —
  `select slug, published_at from articles where slug in (…)` against the values
  captured before the write. Twenty-three verified unchanged on 26 Aug.
- **`--revalidate-url` is mandatory against any non-local database** — the
  script refuses without it. It drops the Next data cache. It does **not** purge
  the Vercel edge, which holds pillar pages up to 300s.
- **Wait a full five minutes after the last write before inviting any crawl**,
  and before taking the proof requests. A probe fired earlier both measures the
  stale copy and re-arms the edge for another 300s. Ingest-time edge purge is
  not built.
- **Never take a "before" request on a URL whose after-state is the proof.**
  This has now cost two runs. `--revalidate-url` clears the Next data cache
  inside the origin; the Vercel edge in front of it keeps its own copy and is
  not purged by anything we run. A baseline request stores that copy and re-arms
  it for another 300s, so the proof request measures the baseline — on 25 Aug
  the pillar page returned `age: 717` with `noindex` still on it, 457 seconds
  after the last write, because of a baseline taken 3.5 minutes before it. Take
  the before-state from the database and the sitemap, which are not edge-cached
  per-URL. If a URL was unavoidably baselined, the first request past the TTL
  triggers the refresh and is served the old copy while doing so; the SECOND
  request is the honest one, and the log must say that is what happened.
- **Record `x-vercel-cache` and `age` on every proof request.** Without them a
  stale 200 is indistinguishable from a fresh one. This is the only thing that
  separated "publish failed" from "the edge is serving my own baseline" on
  25 Aug.
- **On a one-shot capture, KEEP THE BODY.** Added 25 Aug 2026 after the P5
  publish lost the only measurement that mattered. A cold render happens once per
  URL, ever. The P5 proof script recorded status, cache, age, bytes, robots meta
  and the `noindex` string for its one clean cold render — and discarded the body
  (`keepBody: false`). When the cover-credit question arrived four minutes later
  the answer was unrecoverable: every remaining fetch was warm, and the build had
  changed underneath. The script was not wrong about what it was asked; it was
  wrong about what it would be asked **next**. **When a measurement is
  unrepeatable, store the artefact, not the verdict** — write the full response
  body to a file alongside the summary line. Booleans can be recomputed from a
  body forever; a body cannot be reconstructed from booleans.
- **RECORD BODY SIZE ON EVERY PROOF REQUEST**, alongside `x-vercel-cache` and
  `age`. Added 25 Aug 2026. Two bytes of instrumentation, and on the P5 publish it
  was the difference between catching a production incident and certifying it.

  **A degraded `200` and a healthy `200` are identical to a checker that only
  looks for the thing it is counting.** The P5 proof **happened** to record body
  size and link count — for reasons unrelated to catching a cache defect, because
  nobody was looking for one — and that accident is the only reason four poisoned
  hub pages were visible:

  ```
  healthy article render     118,696 bytes
  degraded hub (P1)           29,066 bytes   links=0/4
  degraded hub (P2)           28,968 bytes   links=0/8
  degraded hub (P3)           28,870 bytes   links=0/3
  degraded hub (P4)           28,707 bytes   links=0/3
  ```

  Status was `200` on every one. `x-vercel-cache` was `HIT` on every one. No
  robots meta on any of them, so all four were "indexable" by every other check
  being made. **Byte count and link count were the only two fields separating a
  poisoned page from a healthy one** — had the script recorded status and cache
  alone, four hubs would have passed their own verification while serving empty
  article lists to readers, and nobody would have purged anything.

  **Write this down as a near-miss, not a success.** The instrument was not
  designed to catch this and the run took no credit for foresight. Had the script
  been built to the obvious minimal spec — status and cache, the two fields anyone
  would think to record — the incident would have been invisible and the run would
  have certified four empty pillar hubs as correct. The rule exists because the
  luck should not be needed twice.

  **The sharper form, found by `pillars-ingest-redirects-59` and credited to it:**
  the exposure depends on what the sweep is counting for.

  - In a sweep counting for a feature that should be **present**, a thin degraded
    body scores as a miss. It looks like a failure, so it cannot hide one.
  - In a **negative control**, where absence is the expected result, a thin
    degraded page and a correctly-negative page are **indistinguishable**. The
    degradation scores as a pass.

  That session found its own `cold-1` / `cold-2` runs had recorded no body size —
  the very runs where the connection pool was pressured at 3.2–5.6s — so its
  result is *verified under light load and merely unfalsified under heavy load.*
  Those are not the same claim, and only the body size tells them apart.

  The general rule, and it is the same family as the two below: **an instrument
  that cannot distinguish a degraded response from a correct one will certify the
  degraded one.** Paired with the keep-the-body rule above, the two say one thing:
  **record more than the question you currently have.**

- **RESERVE ONE FRESHLY PUBLISHED SET FOR A COLD-CONCURRENT FIRST-RENDER
  MEASUREMENT.** Added 25 Aug 2026. Standing practice, and it is the pair to the
  rule below rather than a contradiction of it.

  A newly published URL has never been requested, so it is the only place a
  **cold** render can be observed at all — and a cold render can be observed
  exactly once per URL, ever. Load-dependent defects live precisely there: they
  appear under concurrency on a cold cache and hide under everything else. On
  25 Aug the cover-credit race was diagnosed only because someone happened to
  sweep concurrently; every other observation that day was serial or warm, and
  by the time the question was asked properly the build carrying the defect had
  been fixed and deployed. **The defect can now never be measured under cold
  concurrency — that evidence is permanently unavailable.**

  So on each publish batch, nominate a small set — two or three URLs is enough —
  and take ONE deliberate concurrent cold sweep of just those, recording
  `x-vercel-cache`, `age`, and the full body for each. Then pace everything else
  per the rule below. **The point is not to prove the site works; it is to make
  the next defect of this shape measurable when it appears, rather than after
  somebody has fixed it.**

  Two things that make the measurement worth anything: record the **sweep shape**
  (serial, or concurrency N) beside every result, and record the **edge state**.
  A concurrent observation whose cache headers were not captured cannot be called
  cold or warm, and therefore proves nothing in either direction — 25 Aug produced
  three such rows across two sessions, and every one of them had to be discarded.

  Keep the nominated set small and keep it away from hub URLs, which is where the
  degradation below occurs.

- **A PROOF SWEEP IS PRODUCTION TRAFFIC. Take proof requests ONE AT A TIME, with
  a few seconds between them, and never fire a set of cold URLs concurrently.**
  Added 25 Aug 2026 after the P5 publish, where doing so degraded six live pillar
  hubs that the run never touched.

  **Verifying is not a read-only act.** A proof sweep hits cold origin renders on
  a production database, which is load; and where the page has a timeout fallback
  sitting under a long-lived cache, that load does not merely *observe* a bad
  state, it *writes* one. **A `GET` published a broken page.** Any future run
  reproducing the P5 proof will walk into this identically unless it paces the
  requests, so treat this as part of the proof procedure and not as a caution.

  The hub page wraps its article query in `withDeadline(..., 3_000)` and, on
  timeout, renders the hub **with an empty article list** rather than failing —
  see `src/app/(public)/artikel/[category]/page.tsx`. That fallback is sound on
  its own. What makes it dangerous is the layer above: the read layer caches with
  `revalidate: false`, i.e. **forever, until something purges it**. So a
  render that degraded for three seconds gets stored permanently.

  Requesting all seven pillar hubs in one burst forced seven simultaneous cold
  origin renders against one pooled connection. **Six of the seven blew the
  deadline** and were served to real visitors showing their intro copy, their
  navigation, and **zero articles** — a page that looks finished, not broken. Two
  recovered as their entries happened to be replaced; **four (P1, P2, P3, P4) did
  not, and stayed empty for 7 minutes 14 seconds until a deliberate purge.**
  Retrying does not fix it: a `HIT` never re-renders, so the bad entry only ages —
  128s, 181s, 234s, 288s. **Left alone it would not have expired at all.** The
  measurement created the defect and the cache then preserved it.

  Two rules follow. **Pace the requests** — sequential, a few seconds apart, so
  no two cold renders compete. And **if a proof request ever returns fewer
  articles than the database holds, treat it as a poisoned cache entry, not a
  publishing failure**: purge and re-warm, do not roll anything back.

  ```
  POST https://hellokahwin.com/api/cron/revalidate-content
  Authorization: Bearer $CRON_SECRET
  ```

  Then re-request each hub sequentially and assert the link count against the
  database. A proof that only checks `noindex` and the status code passes
  happily while the page is empty — all four degraded hubs returned `200` with
  no robots meta, which is "indexable" by every check the proof was making.
  **Assert the article count on every hub, not just the one being published.**
- **Record the undo BEFORE the first write.** Production runs
  `pitr_enabled=false` with zero platform backups. The undo is the only way
  back, and it must name the slugs verbatim. One trap to get right:
  `media.original_article_id` is `ON DELETE SET NULL`, not cascade, so media
  rows must be deleted *before* the articles or they become unfindable orphans.
  Worked example: `docs/work-done/2026-08-25-publish-p1-p6-UNDO.md` in the site
  repo.
- **Ingest order follows the internal links.** The parser refuses a link — in
  the body as well as the front matter — that does not resolve to a *published*
  article. Resolve every link target against the database before starting; if a
  batch cross-links internally, order it so each target is published first.
  **Two batches running, two briefs predicting internal cross-links, zero found
  so far.** Resolve the list; do not design the ordering exercise first.
- **A writer who finds a sibling link delivers it with the publish order, and
  never silently drops it.** Added 26 Ogos 2026, from CONT-03. That brief said
  "internal links must point at published articles", which is true at ingest and
  wrong at drafting: it made the writer delete a genuine
  `skrip-pengacara-majlis-perkahwinan` to `walimatul-urus` link between two
  articles shipping in the same batch. Both drafts lost a link that the ordering
  rule above already solves. **The writer's deliverable is the link plus one
  line naming which sibling publishes first.** `head-of-seo-content` adds it to
  the second file's front matter after the first is live. Three batches have now
  predicted cross-links and found none; at least one of those three was a
  reporting artefact, not an absence.
- **`internalLinks[].slug` must be an ARTICLE slug, never a pillar or cluster
  slug.** Pillar hubs live in `inspire_categories`, not `articles`, so
  `slug: hantaran-mas-kahwin` cannot resolve and refuses the file — even though
  `/artikel/hantaran-mas-kahwin` is a real, live URL. `P7-A3` shipped with
  exactly this and the verification board flagged it as "worth a dry run"; the
  dry run was not taken until publish day. To link a hub, write it in the body
  prose: `bodyInternalLinks()` ignores `/artikel/<hub>` deliberately, because a
  hub is not an article and needs no resolving.
- **`internalLinks` is validated, never rendered.** It is read twice in
  `ingest-article.mts` — once to check each slug resolves, once to print a count
  — and is never written to the database. Nothing a reader sees depends on it,
  which is worth knowing when one entry is blocking nine articles.

#### Resuming after a session death mid-ingest: production is the record, not git

Added 27 Aug 2026, from the CONT-06 resume. The session that ingested C2.3
A4–A8 died on an auth failure after the production write and before committing
anything about it. The resume brief said, from git evidence alone, that the
ingest was "NOT yet done". It was done — all five articles had been live for
nine hours.

**Git can only show what a session committed, and a write to production is not
a commit.** Before re-running any ingest a resumed session must check, in
order:

1. **The working tree.** The ingest script stamps `publishedAt:` back into the
   source draft at write time. An *uncommitted* `publishedAt:` line in a draft
   is the on-disk signature of an ingest that ran and a session that died
   before committing — it is the strongest single indicator, and it is also the
   write-back that must be committed, not discarded, because it protects the
   article's publish date on the next re-ingest.
2. **The production sitemap.** `curl -s https://hellokahwin.com/sitemap.xml`
   and grep for the slug. Present means live; no database access needed.
3. **The database, if the sitemap says live.**
   `select slug, published_at from articles where slug in (…)` — the values
   must match the write-backs in step 1 to the millisecond. On CONT-06 all five
   did, which converted "probably ingested" into "verified ingested".

Re-ingesting on the assumption of "not done" is not idempotent: `--update
--publish` restamps dates (see the `publishedAt` bullet above) and a non-update
re-run can refuse or duplicate. **Check all three before touching the ingest
command.**

Two smaller findings from the same resume:

- **The undo-before-write ordering is precisely a session-death guarantee.**
  CONT-06's undo record had to be reconstructed from production afterwards
  because the write happened first. The reconstruction was exact, but only
  because every row was a pure insert with its slug known; an in-place update
  reconstructed after the fact would have lost the before-state forever. Commit
  the undo, then write — the rule already says so; this is what it costs when
  the ordering flips.
- **A stale edge render is not a missing feature.** Two of the three Sprint 01
  C2.3 articles appeared to lack links to the five new ones on first fetch;
  minutes later the links were there. The related-articles module renders
  cluster siblings from the category at request time, so old articles pick up
  new siblings without a re-ingest — but the edge can serve a render from
  before the ingest for up to its TTL. Re-fetch before diagnosing.

#### A LINK YOU WROTE IS NOT A LINK GOOGLE FOLLOWS. Check the emitted `<a>`.

Added 26 Ogos 2026 by SEO-02, and it is the most expensive thing this document
has had to record.

Every internal editorial link on the live site was `rel="nofollow"`. Seventy-nine
of one hundred and nine, including all five out of `mas-kahwin-ikut-negeri` — the
highest-impression page on the domain — and **every link on all twenty-eight
pillar articles published that week.** `nofollow` instructs Googlebot not to
follow the link. The site had an internal link graph no crawler would walk.

**Nobody typed the word.** TipTap's Link extension ships
`HTMLAttributes = { target: '_blank', rel: 'noopener noreferrer nofollow' }`,
and those are the *defaults of the attributes themselves*. `marked` turns
`[anchor](/artikel/c/s)` into a bare `<a href>`; `generateJSON` fills the missing
attributes from those defaults and writes them into the row; `generateHTML`
emits them. A writer wrote a link, the pipeline switched it off, and nothing in
the pipeline said so.

It survived because **every check we had looked at the page, and the block was
on the link.** SEO-01 verified status 200, no `robots` meta and no
`X-Robots-Tag` on all 28 articles, concluded "nothing is blocked; the constraint
is crawl scheduling alone", and that sentence went into `ceo-memory.md` as fact.
It was true about the pages and false about the site. The instruction not to
crawl was one layer down, in markup nobody had looked at, on the pages doing the
*linking* rather than the pages being diagnosed.

So:

1. **When a page is "not blocked" and still not crawled, go and read what the
   pages linking to it EMIT** — the rendered `<a>`, not the markdown, not the
   front matter, not `internalLinks`. `curl` the linking page and grep for
   `rel=`. It takes a minute.
2. **Never conclude "the only remaining explanation is X" from the absence of
   the blockers you thought to check.** The list of things you checked is not
   the list of things that exist. Say "no page-level block found" and name what
   was checked, which leaves the next person somewhere to look.
3. **Link the canonical `/artikel/{category}/{slug}`, never the legacy root
   slug.** `lokasi-pre-wedding-photoshoot-terbaik` had three inbound links from
   indexed pages and had still never been crawled: all three pointed at the root
   slug, which 308s, and URL Inspection reports that root as **"unknown to
   Google"**. A link through a redirect splits the signal and spends a hop.
4. **A rendered-HTML assertion is the only real regression guard.** The fix
   (`src/lib/inspire/internal-links.ts`) is covered by a test that runs markdown
   through the *actual* ingest extensions and the *actual* renderer and asserts
   the delivered anchor. A unit test on the extension in isolation would have
   passed on the day production shipped 79 nofollowed links.

The measurement command is `pnpm --silent links:audit --db "$DB"`, which counts
orphans, dead links, redirect hops and inbound links per article over the live
rows. **Run it before and after any linking work and paste both.**

#### When a declared asset is genuinely absent: stage a copy, never edit the draft

Added 25 Aug 2026. Stage 6b now gates on assets existing, so this should be
rare — but when Stage 7 inherits an article naming a file that was never
rendered, the draft in `drafts/` is the **spec of record** and does not get
edited. The unrendered entry is the only surviving description of the graphic
somebody still has to make.

Instead, write a staging copy to `drafts/ingest/` and ingest that. Mechanical
changes only, every one reported in the log:

1. `status: draft` → `status: published` (the two-key rule above);
2. drop `images:` entries whose file is not on disk;
3. drop `internalLinks:` entries that cannot resolve;
4. re-root sibling-folder paths — `images/x.jpg` → `../images/x.jpg` — because
   `resolve()` is relative to the **article file** and the staging copy sits one
   directory down. This changes nothing that reaches the site: the R2 key is the
   declared path slugified with every run of non-alphanumerics collapsed to one
   hyphen and a leading hyphen stripped, so both spellings derive the same key.

**Assert the body is byte-identical** between draft and staging copy, and print
the assertion. That is what makes "no sentence was rewritten" a measurement
rather than a claim. Worked example: `.tmp-ops/stage-p3-p4-p7.mjs` in the site
repo, and the diff quoted in
`docs/work-done/2026-08-25-publish-p3-p4-p7.md`.

Then record in the work-done log, per article, exactly which declared assets did
**not** ship, so adding them later is a `--update` against a known list and not
a re-discovery.

#### Image paths in the article file

**One convention: relative to the article file, no `./` prefix.** A cover
photograph in a sibling folder is `images/S-name.jpg`; a graphic beside the
article file is `name.png`. `./name.png` resolves identically and is not a bug,
but two spellings of one path invite a review round every batch, so the file
format has one spelling. Enforced by convention and by the comment on
`imageSchema.file` in `src/lib/inspire/article-file.ts`, not by the parser.

**Gate:** the page is live, linked from its pillar, and in the sitemap; the
undo record exists; the proof requests were taken after the five-minute wait.

### A shared worktree has no owner — and a hold between two sessions does not bind a third

Added 25 Aug 2026, after the P5 publish. A build/deploy hold was in force, agreed
between two sessions, and production shipped anyway.

A third session committed the worktree's dirty tree in good faith, believing the
edits were its own, and pushed to `origin/master` mid-publish. **It behaved
carefully** — it took only the four files belonging to its own work and left the
other five modified files untouched. It was still a deploy nobody had cleared.

The failure is structural and it will recur unless the process changes:

- **A hold negotiated between two sessions cannot bind a third that was never
  party to it.** The agreement lives in two conversations. The worktree knows
  nothing about it, and a session that arrives later has no way to discover it.
- **"Commit only my files" is not "commit only my changes."** Nothing in
  `git status` records *whose* edits a modified file holds. A shared dirty tree
  offers no attribution, so even the most careful reading of it can ship someone
  else's boundary.

**Three rules.**

1. **Announce a hold in the tree, not only in conversation.** A hold that exists
   only in a chat binds only its participants. Write it where `git status` and a
   `cd` will show it — a `HOLD.md` at the repo root naming who set it, why, and
   what it blocks — and delete it when it lifts.
2. **Never commit a file you did not personally edit in a shared worktree.** A
   modified file you do not recognise is not yours to reason about, and a
   clean-looking diff is not evidence of authorship. `git add -p` on your own
   hunks, or nothing.
3. **Serialise concurrent write-authorised runs against production first.** Two
   runs with database CRUD in the same window, on a database with
   `pitr_enabled=false` and zero backups, is the highest-consequence overlap
   available. On 25 Aug it cost nothing only because the second run turned out to
   be read-only — scheduling, not a control. Establish read-only vs
   write-authorised before the second run starts, not after.

**The general defect, worth naming because it produced four separate near-misses
in one morning:** state that lives only in one session's head is invisible to
every other session touching the same tree. A stale block alive only in a log; an
attribution sitting legible in `git status` and read by nobody; a hold held in two
heads but not the third; two write-authorised runs unaware of each other. Same
bug, four costumes. **If a fact must constrain another session, it has to live
somewhere that session will trip over — the tree, the database, or a file — never
only in a conversation or a log.**

### Stage 8 — Measure
`head-of-seo-content` checks the article at **14 and 45 days**: does it rank
for its target keyword, how many keywords has it picked up, is it top ten.
`editorial-verification-lead` adds every expiring claim to the currency
register with its next check date.

**Gate:** none — this loop never closes. It feeds the next brief.

### Stage 9 — Retrospective (MANDATORY — no workflow is finished without it)

Added 25 Aug 2026 on owner directive: *"there must be a retrospective at the end
of all workflows to ensure we update our learning."*

**Why this exists.** For two days the CEO updated its own persona after every
meeting while the team's process documents sat static. Real lessons — that
`pdftotext -layout` misaligns government fee columns, that an agent reporting
"blocked on a credential" usually means its session lacks permission rather than
the company lacking the credential, that converting editorial deliverables into
articles can carry internal sections into production — lived in one persona and
a changelog instead of in the workflow anyone actually follows. **Learning that
only updates the CEO is not organisational learning.**

**Runs at the end of every completed workflow** — a cluster shipped, a batch
published, a phase closed. Not only at board meetings.

**Who:** the seat that owned the work, with `managing-editor` chairing. Five
minutes of writing, not a ceremony.

**Four questions, answered in the work-done log under `## Retrospective`:**

1. **What did we learn that is not already written down?** A fact, a tool
   behaviour, a failure mode. Be specific enough that someone could act on it
   without having been there.
2. **Which document must change, and who owns the edit?** This workflow, the
   style guide, the production doctrine, a persona, a brief template, the
   `/tokens` registry. **Name the file.** A lesson with no target file is a
   lesson that evaporates.
3. **What did we do twice that we should never do again?** Repetition is the
   cheapest defect signal we have. Three articles blocked for the same reason
   means the brief template is wrong, not the writer.
4. **What did we nearly ship that we caught?** Near-misses are worth more than
   successes. Record the mechanism that caught it, so we keep the mechanism —
   the review board's fabricated-quotation catch and the wali rule found
   backwards both exist because someone read the primary source rather than the
   draft.

**Then make the edits.** A retrospective that identifies a document and does not
change it has failed. Log the file paths touched.

**Where it goes — this is the part that failed on the first run.** This
workflow produces two logs: a build log in the site repo and a company entry in
`docs/work-done/<session>/` in the docs repo. **`## Retrospective` belongs in the
docs-repo company entry.** That is the file the CEO and the next seat read. A
copy in the site-repo log is welcome and optional; **a pointer from the company
entry to a retrospective living elsewhere does not satisfy this gate.** On
25 Aug 2026 the section was written in full, both files existed, every named
document was edited — and the gate still failed, because the section was not
where the reader looks.

**Gate:** the docs-repo work-done company entry carries a literal
`## Retrospective` heading, answering all four questions, and every document it
names has actually been edited. Check it with
`grep -c '^## Retrospective' docs/work-done/<session>/<entry>.md` — expect `1`,
not a cross-reference. **A workflow without this is not closed.**

---

## The three standing loops

**Currency loop** (`editorial-verification-lead`): monitors the sources behind
the register and flags a page for refresh **when the fact changes, not when
traffic drops**. This is the hole the traffic-triggered refresh rule leaves
open, and closing it is the whole reason that seat exists.

**Learning loop** (`managing-editor` + `head-of-seo-content`): review
outcomes are logged, so recurring failure modes get fixed **upstream in the
brief** rather than caught again downstream in every review. If three
articles in a row get blocked for the same reason, the brief template is
wrong, not the writer.

### Standards loop — a changed standard is not applied until the backfill is named

**Added 25 Aug 2026, after the C2.4 cover swap.** The currency loop watches
**facts** and the learning loop feeds **forward** into the next brief. Between
them sat an uncovered case, and it is the one that keeps happening: **a standard
changes, and the pages already published under the old standard are nobody's
job.**

The evidence is one cluster in one day. Covers were typographic `kad-tajuk`
cards; on 25 Aug the owner ruled covers must be human photographs. P1 and P6 had
not shipped yet, so they got photographs and looked correct. The eight C2.4
articles had shipped the day before, so they silently kept text cards — live,
indexed, and wrong — until somebody happened to check every live `og:image` by
hand and wrote a brief. **Nothing in this workflow caused that check.** Had
nobody looked, the eight would still be wrong, and the more we publish the wider
that gap gets on the next ruling.

**The rule.** Any directive that changes a production standard — visual, credit,
schema, structural — is not applied, and must not be logged as applied, until it
carries all three:

1. **A backfill list.** Every already-published URL that fails the new standard,
   enumerated by query or by fetch, not estimated. `head-of-seo-content` owns
   producing it; the seat that proposed the standard owns checking it.
2. **A named owner and a date** for that backfill, in the same document that
   announces the standard. "We will fix the old ones" is not an owner.
3. **A re-check after the backfill ships**, against the same query that produced
   the list. Expect zero. A backfill nobody verified is a backfill that half ran.

**Write the standard so it can be queried.** A rule that cannot be turned into a
check is a rule the next batch will drift from without anyone noticing. "Covers
are photographs" became checkable the moment it was expressed as
`cover_image_url not like '%kad-tajuk%'` across every published row. Prefer
standards with that shape, and record the query beside the rule.

#### The recorded check must cover the WHOLE standard, and must be proven to fire

**Added 26 Aug 2026, after the P1/P6 body cards.** Everything above this line was
already written down on 25 Aug, and the eight P1 and P6 articles still went to
26 Aug serving a text card in the body. The loop did not fail because nobody ran
it. It failed because **the check that got recorded was narrower than the rule it
was recorded against, so running it produced a clean result and closed the
question.**

The owner's directive has two halves — *no text card as a cover, and none in the
body*. The query recorded beside it was `cover_image_url not like '%kad-tajuk%'`.
That is half a check. It ran, it came back clean, and the run reported **"25 of
25 photograph covers, zero text cards"** — a sentence that is true about covers
and false about pages. The covers had been swapped correctly; the displaced cards
were sitting in the body of all eight, live and indexed, for a day.

**And the recorded pattern could not have found them even aimed at the body.**
Ingest stores a figure's `src` as the WebP derivative
(`…/1787652677828-cover-borang-nikah/high.webp`), so `like '%.png'` and `like
'%kad-tajuk%'` both return nothing against a body card, forever. The card is only
visible by resolving each `src` back to its `media` row and reading the FILENAME
the article file declared. A check that cannot in principle see the thing it
forbids is worse than no check: it manufactures evidence of compliance.

**Three rules, and the first two are the cheap ones.**

1. **Enumerate the check against the standard, clause by clause.** Write the
   clauses out — "not as a cover" / "not in the body" — and show which part of
   the query covers each. A clause with no column under it is the gap.
2. **Prove the check fires before trusting that it passed.** Point it at a known
   bad instance — an old row, a fixture, a page you have not fixed yet — and
   confirm it goes red. A check first exercised on already-clean data has never
   demonstrated it can do anything at all. Both of this run's PASS results are
   only worth reading because the same code returned **8 across 8 articles** on
   the before-state, from the same production database, an hour earlier.
3. **Derive the population from the data, never from the brief's table.** The
   brief for this run listed 17 cards across the eight articles. The data held
   **8** — one per article — and the other nine had been generated at 18:45 on
   25 Aug, staged into the drafts, and never ingested. A run that had trusted the
   table would have hunted nine cards that were not there and reported failure,
   or "fixed" them and never noticed the drafts were the actual exposure.

**The runnable form of this rule now exists and has no excuse for not being
used:** `scripts/audit-live-images.mts` in the site repo, `pnpm --silent
audit:images --db <url> --live`. It walks every published article's `content`
document, resolves every `src` to its `media` row, classifies text cards by
declared filename rather than by served URL, checks cover AND body, optionally
re-checks the rendered HTML of every live page, and exits non-zero on a card.
**Run it after any image-standard change, and quote its numbers rather than a
sentence about covers.**

#### A directive that changes mid-flight must reach the work in flight

**Same day, same cluster, twice.** The C2.4 cover brief was rewritten on disk
**while the run that was executing it was mid-commit** — item 4 reversed from
"keep the card, move it in-article" to "remove the card entirely" — and the
workflow was updated 21 seconds later with the matching standing rule. The
running agent had already published eight articles under the superseded
instruction. It found out only because it opened this file for an unrelated
reason.

**Two rules, and they are cheap.**

- **Editing a brief that is being executed does not deliver the edit.** Whoever
  changes a live brief tells the running seat directly. A file edit is a record,
  not a message.
- **Re-read the brief before the final write, and again before writing the
  log.** Diff it against the version the run started from. If it moved, stop and
  reconcile before reporting — a run that reports success against a superseded
  brief is worse than one that reports nothing, because it closes the ticket.

Both are the same failure as the backfill gap, one timescale down: **a standard
changed, and the work already done under the old one was nobody's job.**

#### A withdrawn directive must not survive as a citation inside a build artefact

**This is the one that actually caused the damage**, and it is worth separating
from the two above because no amount of telling the running seat would have
caught it.

When the "move the card in-article" instruction was withdrawn, the ruling was
updated in the brief and in this file. **It was not removed from the eight
`drafts/ingest/A1..A8-*.md` files that had been built under it** — and those
files carried the withdrawn instruction *as an approving comment citing the
owner*:

```yaml
  # Kad tajuk yang dahulunya menjadi cover, dipindahkan ke dalam artikel
  # mengikut arahan pemilik 25 Ogos 2026. Datanya masih yang terbaik ada
  # pada kami, jadi kad ini kekal — ia cuma tidak lagi menjadi muka depan.
  - file: mas-kahwin-johor-kad-tajuk.png
```

A later run opened that file, read a specific instruction attributed to the
owner and dated, had no way to know it had been superseded, and **executed it in
good faith onto eight indexed production pages.** The comment did not merely
fail to stop the run — it actively vouched for the wrong behaviour. The build
artefact outranked the ruling because it was the thing actually being read.

**Three rules.**

1. **A generated or hand-built artefact does not get to cite authority.** No
   "mengikut arahan pemilik", no "as approved by", no directive quoted as
   justification inside a draft, an ingest file or a template. Artefacts carry
   *what to do*; the *why it is allowed* lives in the ruling document, which is
   the only copy anyone can withdraw. Two copies of a directive means one of
   them is eventually stale, and it will be the one being executed.
2. **Withdrawing a directive includes sweeping the artefacts built under it.**
   `grep` for the instruction across `drafts/`, not only for the rule in the
   docs. The withdrawal is not complete while a file still tells the next run to
   do the old thing. This is the backfill rule applied to source files rather
   than to published pages, and it is the same failure.
3. **A run that finds a directive quoted in a build artefact verifies it against
   the ruling document before acting on it.** If the artefact and the ruling
   disagree, the ruling wins and the run stops and says so. Treat an authority
   citation in a file as a claim to be checked, exactly as a brief's description
   of the filesystem is a claim to be checked.
4. **The asset register is authoritative, and must be READ before an artefact is
   regenerated — not merely written to afterwards.** This is the concrete,
   machine-readable form of rules 1–3, and it already worked on 25 Aug: the
   eight retired cards were set to `status_guna: jangan-guna` with
   `digunakan_dalam` emptied and the owner's directive recorded in `nota`, the
   moment they came off the pages. A regenerating run that consults the register
   cannot miss that; the run that put the cards back **did not consult it**.
   Treat `status_guna` as a gate: **an asset marked `jangan-guna` may not be
   written into any draft, ingest file or template**, whatever a comment beside
   it claims and whoever it cites. The register is the one copy that is updated
   when a directive changes, which is exactly what makes it the one to trust.

**A note on why an authority citation is the dangerous form.** When the card
came back at 11:08:24Z its comment cited the owner *and* the editorial board,
and added `jangan tulis semula tanpa melalui lembaga`. Every clause was true in
isolation — the board really had approved that alt text on 24 Aug. What had been
withdrawn was the **entry**, which makes the approval of its alt text irrelevant,
and nothing in the comment let a reader see that. **A citation that is locally
true and globally stale is harder to catch than a plain mistake**, because it
survives review by looking well-sourced. That is the case rule 1 is for.

### Stage 9b — The ship check. Fixed is not shipped.

Added 25 Aug 2026 (sprint item RISK-03) after a verified fix for a live,
rule-breaking defect sat **uncommitted in the working tree** while four agents
worked on other things. The CEO found it by running `git status`, not from any
report — every report on that work read as complete, because the code *was*
correct. It just was not anywhere a reader could reach.

**Owner: the CEO.** Not the agent that did the work — an agent reporting on its
own shipping is precisely the failure mode this exists to catch.

**Run before any item is marked done, and again before a sprint moves to
review.** Two commands, in the repository the work touched:

```
git status --short                              # uncommitted changes
git rev-list --count origin/master..HEAD        # unpushed commits
```

**Both must be accounted for, not merely run.** Uncommitted files unrelated to
the item are fine — say which and why. Unpushed commits belonging to the item are
**not** fine: the item is not done, whatever its report says.

**Then check the user-visible surface**, because a push is not a deploy either:
the URL returns what it should, the row holds what it should, the page renders
what it should. Deployment is asynchronous and a green push proves nothing about
production.

**Three states, all of which have been mistaken for "done" in this project:**

| Looks done | Actually is | How to tell |
|---|---|---|
| Code is correct | Not committed | `git status --short` is non-empty |
| Committed | Not deployed | `git rev-list --count origin/master..HEAD` is non-zero |
| Deployed | Not visibly working | The URL, row or render still says otherwise |
| **The draft is correct** | **Not ingested** | `pnpm --silent audit:drafts` says the article is behind its draft |

#### The two git commands cannot see content. Added 26 Aug 2026, after CONT-02.

For code the chain above ends at a reader: correct → committed → deployed →
working. **For content it forks, and git can only see the branch that does not
matter.** Committing a draft ships the *source*. Only an ingest writes the *row*,
and the row is what a reader gets. No git command in any repository can see it.

Worse, **both git states report "done"**, so there is no state of the repo that
would have caught this:

| Draft is… | `git status --short` says | An operator reads it as |
|---|---|---|
| untracked — CONT-02's state at 00:31, 26 Aug | `?? …/drafts/borang-nikah.md` | noise; this stage itself says *"uncommitted files unrelated to the item are fine"* |
| committed — the same files at 09:03, after `d4c4237` swept them into git | *(clean)* | shipped |

Neither is true. In both states `borang-nikah` served one photograph and its
draft declared four.

That is what happened. CONT-02 sourced fifteen photographs, wrote Malay alt text
and captions for forty-four, verified every licence at origin, wrote both
directions of the register, built four checked-in tools and a validator that
passed 121 references across 28 files — and **none of it was ingested**. The
report was accurate. The work was correct. `borang-nikah` served one photograph
while its draft declared four. The gap ran to **69 images across 23 published
articles**, and it survived the brief that reopened it: that brief's own sample
table read *"borang-nikah 4 live / 4 draft ✓"*, because it counted the images on
the **page**, and every article page carries sibling thumbnails from the
related-articles block. Three of borang-nikah's four belonged to other articles.

**So the content ship check is a fourth command, and it is not optional:**

```
pnpm --silent audit:drafts --db "$DB" \
  --drafts <docs>/drafts/ingest --drafts <docs>/drafts
```

It compares, per published article, the images the **draft declares** against
the images **production serves**, matched on the declared filename — the only
spelling the two sides share, because ingest stamps every upload with
`Date.now()` and stores the WebP derivative. It **exits 1** when any published
article is behind its draft, so it is a gate and not a report. It also names the
opposite case: images production serves that the draft does not declare, which
an `--update` would silently delete.

**Do not count images on the rendered page.** Sibling thumbnails inflate every
count, and a hand-count of image tags is how a 69-image gap read as "✓".

**Gate:** all three commands run and accounted for — `git status --short`,
`git rev-list --count origin/master..HEAD`, and `pnpm audit:drafts` — and the
user-visible surface checked, before any item is marked done. For a content
item the third is the one that matters and the first two will lie to you.

---

## Escalation

- Verification block the writer disputes → CEO decides, and the default is the block stands.
- Cadence slipping → `head-of-seo-content` reports the weekly article count at the next board meeting. It is the leading indicator; a slip shows 30 days before it reaches traffic.
- Quality versus volume in conflict → **quality wins**, and the CEO brings the trade-off to the board rather than letting filler ship quietly.
