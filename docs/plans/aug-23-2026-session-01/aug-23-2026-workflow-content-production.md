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

**Gate:** no writer starts without a brief.

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

**Gate:** humanizer pass complete and re-checked.

### Stage 6 — SEO QC
`head-of-seo-content` walks the 21-point quality bar. Failing any point sends
it back; failing the humanizer point means it was never finished.

**Gate:** all 21 points true.

### Stage 7 — Ingest and publish
`full-stack-engineer` runs the approved article through the content-ingest
path into Supabase with correct slug, meta, category, internal links and
media. Production publication follows board approval rules.

**Gate:** the page is live, linked from its pillar, and in the sitemap.

### Stage 8 — Measure
`head-of-seo-content` checks the article at **14 and 45 days**: does it rank
for its target keyword, how many keywords has it picked up, is it top ten.
`editorial-verification-lead` adds every expiring claim to the currency
register with its next check date.

**Gate:** none — this loop never closes. It feeds the next brief.

---

## The two standing loops

**Currency loop** (`editorial-verification-lead`): monitors the sources behind
the register and flags a page for refresh **when the fact changes, not when
traffic drops**. This is the hole the traffic-triggered refresh rule leaves
open, and closing it is the whole reason that seat exists.

**Learning loop** (`managing-editor` + `head-of-seo-content`): review
outcomes are logged, so recurring failure modes get fixed **upstream in the
brief** rather than caught again downstream in every review. If three
articles in a row get blocked for the same reason, the brief template is
wrong, not the writer.

---

## Escalation

- Verification block the writer disputes → CEO decides, and the default is the block stands.
- Cadence slipping → `head-of-seo-content` reports the weekly article count at the next board meeting. It is the leading indicator; a slip shows 30 days before it reaches traffic.
- Quality versus volume in conflict → **quality wins**, and the CEO brings the trade-off to the board rather than letting filler ship quietly.
