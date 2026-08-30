# Board meeting — 30 August 2026 — Sprint 04 planning: *Earn the click*

**Trigger:** owner-called (`/hellokahwin`, no argument — routine check-in; the CEO
set the agenda from the state of the business)

**Data reviewed:**
- **GSC** (`https://hellokahwin.com/`), pulled 30 Aug 2026 — 28d and 7d
  performance overview, query dimension, page dimension, sitemap status. **Reached.**
- **Ahrefs `serp-overview`**, country `my`, 30 Aug — three live SERP pulls
  (`mas kahwin johor`, `doa pengantin baru rumi`, `walimatul urus`). **Reached.**
- **Live production HTML** — 6 article fetches for `<title>` verification with
  cache headers; garden-wedding and 30 sampled article URLs for credit labels;
  `sitemap.xml`. **Reached.**
- **Sprint tracker** (buddy DB, `sprint.ts list --sprint 3`). **Reached.**
- `ceo-memory.md`, `decision-log.md`, `sprint-03.json`, `sprint-03-retro.json`.
  **Reached.**
- **Unreachable:** nothing this meeting. Ahrefs was used only for SERP shape, not
  for our own traffic, per decision 91.
- **Not used:** the `ceo-hellokahwin` delegate agent — this session cannot see
  project agents, so the meeting ran directly in the orchestrator session under the
  persona file, as the skill provides for. Every figure below is a first-hand pull.

---

## Discussion summary

The meeting opened on a performance snapshot that looks like a success and is more
interesting than that. Against decision 96's snapshot three days earlier, clicks
went **51 → 99**, impressions **2,869 → 6,693**, and average position **17.7 →
12.4**. But **CTR fell, 1.78% → 1.48%** — and decision 96 had specifically noted
three days ago that CTR was *rising* while position improved, "so this is not
volume dilution". It is volume dilution now, and the meeting's work was to
establish what kind.

The obvious candidate was the 🔴 open cached-metadata defect, which puts the root
layout's generic `<title>` on an article page. **It was disproved**: six live
fetches, five of them cold (`X-Vercel-Cache: MISS`, `Age: 0`) — the exact condition
that used to break it — returned correct titles every time. That both scores
SEO-07 as genuinely holding and removes the comfortable explanation.

The per-query data ruled out an averaging artefact, which was the next thing that
had to be excluded: these are **single queries**, so Sprint 02's "the average
described no real query" objection does not apply. `mas kahwin johor` earns
**0.64% at position 6.3** where its position predicts 5–7%. `doa pengantin baru
rumi` earns **9.52% at position 3.7**, which is entirely normal. The site can
convert; it converts on some queries and not others, and position does not explain
the split.

Three `serp-overview` pulls found the mechanism. All three SERPs carry an image
pack, **so the image pack is not the discriminator** — the **AI Overview** is, and
it tracks intent. Queries wanting a number (`mas kahwin johor` → RM22.50) or a
definition (`walimatul urus`) are answered above us — AI Overview at positions 3
and **1** respectively, each with a PAA block. Queries wanting a *document* the
reader takes away — the full text of a prayer, to recite at a ceremony — cannot be
served that way, carry no AI Overview, and earn a normal CTR. The third pull was
run specifically to try to break the pattern the first two suggested; it
strengthened it.

**This is the mechanism behind decision 67**, recorded on 24 Aug as an unexplained
observation: *"we have proven we can get indexed and have not proven we can earn a
click."* Six days later it can be said per query class, and it means impression
growth in the mas-kahwin cluster **will not reach the 1,500-click target**, however
well those pages rank.

The open-assignment audit re-measured every Sprint 03 carry-forward rather than
trusting the retro's list, and **two of its figures were wrong**. The hazard branch
`feat/des-05-design-system-reference` is already gone. The garden-wedding credit
figure ("27 of 48 uncredited") is stale — there are ~9. That check also caught the
CEO's own bad grep: searching for `Kredit` returned zero, which would have read as
*worse than reported*, when in fact the credits exist under an **English** label in
four casings including a live typo, `sOURCE:`, rendering six times. A third finding
came out of the sprint files themselves: `sprint-03.json` reads `in_progress` with
24 of 26 items `todo` while the tracker reads `done, 107/115`. The file the skill
calls "the contract" has been abandoned mid-sprint for three sprints running.

On scope, the CEO proposed two cuts and the owner declined both — **the third
consecutive sprint this has happened**. The owner also re-scoped RIGHTS-02 from a
deletion into a licensing exercise: *"I will obtain permissions to use it, just
take it, photographers have good relationships with us."* That is strictly better
than stripping the images, it keeps content on pages that are ranking, and it draws
on an asset the CEO could not have found in the repo. The item flips to producing
the per-photographer worklist that makes the owner's commitment executable.

---

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| **156** | **The CTR collapse on number/definition queries is caused by SERP shape, specifically the AI Overview — not by our titles, not by position, not by an averaging artefact.** | 3× Ahrefs `serp-overview`, country `my`, 30 Aug. `doa pengantin baru rumi` 9.52% @ 3.7, **no AI Overview**; `mas kahwin johor` 0.64% @ 6.3, **AI Overview pos 3 + PAA**; `walimatul urus` 0.83% @ 10.0, **AI Overview pos 1 + PAA**. All three carry an image pack, so the image pack is controlled for. | CEO (standing autonomy) |
| **157** | **The 🔴 cached-metadata / wrong-`<title>` defect is CLOSED.** | 6 live fetches 30 Aug, **5 cold `MISS`/`Age: 0`** — the condition that used to break it — all correct titles. SEO-07's fix holds. | CEO |
| **158** | **Decision 96's prediction that the 22 Sept checkpoint of 150 clicks would be MISSED is recorded as LIKELY WRONG, in our favour.** | GSC 28d: 51 clicks on 27 Aug → **99 on 30 Aug**; daily clicks 5→12→14→15→**18** across 25–29 Aug. | CEO |
| **159** | **⚠ THE CTR METRIC IS SPLIT.** Board reports carry CTR separately for document-intent and number/definition queries. Sitewide CTR stops being a headline. | A single number averaging a 9.52% query and a 0.64% query recommends nothing, and has been hiding this problem for a week. Clicks/28d remains the north star. | **OWNER** |
| **160** | **Sprint 04 scope: 43 points, 11 items, `Earn the click`. NOTHING CUT.** | Owner declined both proposed cuts. **Third consecutive sprint** (decisions 62, 93). | **OWNER** |
| **161** | **⚠ RIGHTS-02 RE-SCOPED from clearance to licensing.** The owner will obtain permission for the `jangan-guna` assets; the item produces the per-photographer worklist that makes that actionable. Nothing is deleted, nobody is contacted by us. | Owner: *"I will obtain permissions to use it, just take it, photographers have good relationships with us."* Approaching photographers is carve-out 3 and the owner has taken it. | **OWNER** |
| **162** | **CONT-13 carries a SECOND, non-negotiable gate: religious text accuracy.** Every doa, Arabic string, transliteration and religious claim is verified by `editorial-verification-lead` against a named published authority, with authority and date recorded per item. Unsourceable text does not ship. | Doa is the highest-converting family (9.52%) and the highest-risk content the company has published. A misquoted prayer is not a wrong venue price; it is a brand-ending error with a Malay Muslim audience. Same shape as SEO-04's sourcing gate, which correctly killed that item twice. | CEO |
| **163** | **The carried-forward garden-wedding credit figure was WRONG, and the CEO's first check was wrong too.** ~9 uncredited, not 27. Credits exist under an **English** label: `Source:` ×22, `source:` ×6, `sOURCE:` ×6, `SOURCE:` ×6. | Live fetch 30 Aug. Grepping `Kredit` returned zero — a false absence that would have read as *worse* than reported. | CEO |
| **164** | **`sprint-NN.json` — the file the skill calls "the contract" — is abandoned mid-sprint and has been for three sprints.** PLAT-15 fixes it and back-fills 01–03. | `sprint-03.json`: `state: in_progress`, 24 of 26 items `todo`. Tracker: `done`, 107/115. Header totals agreeing while items disagree is what hid it. | CEO |
| **165** | **SEO-04 stays PARKED and is NOT revived.** | It parked twice at the same gate; the real cause is that `nikahsatu.com` is the venue **operator**, not a competitor. Sprint 03's retro rule: an item handed back after a park must show what changed in the **diagnosis**, not the method. Nothing has. | CEO |
| **166** | **The CEO withdrew its own proposed cut of PLAT-16 before the owner ruled.** | The workaround is "remember to type the full path". Sprint 03's central finding is that prose rules do not fire. 2 points to make the trap impossible beats a rule the CEO must remember. | CEO |

---

## Predictions

Recorded so Sprint 05 can score them against reality rather than explain them
afterwards.

1. **Impressions keep climbing and sitewide CTR keeps falling**, because the
   mas-kahwin cluster is still indexing out and is structurally capped.
2. **Clicks reach 150–200/28d by 22 Sept** on the existing document-intent pages
   alone — i.e. the checkpoint is hit without CONT-13 needing to land first.
3. **The 21 Nov target of 1,500 clicks/28d is NOT reached by impression growth in
   the number/definition class**, however well those pages rank. That is the entire
   argument for CONT-13.
4. **Falsifier for decision 156:** if sitewide CTR *rises* without CONT-13 having
   shipped, the SERP-shape mechanism is wrong.
5. **Falsifier for CONT-13:** if the six articles reach positions 4–10 and still
   earn under 2% CTR, the document-intent theory is wrong and the problem is this
   site rather than query shape.

---

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| SEO-11 — SERP-shape census, 200+ queries, committed CSV | `head-of-seo-content` | Sprint 04 |
| SEO-12 — `check-serp-shape.py` gate + persona pre-flight wiring | `head-of-seo-content` | Sprint 04 |
| CONT-13 — six document-intent articles (gated on SEO-11 **and** on religious-text verification) | `writer-inspirasi-vendor-venue` | Sprint 04 |
| CONT-14 — re-angle the `hantaran-kahwin` seed to definition and money | `writer-inspirasi-vendor-venue` | Sprint 04 |
| CONT-13 doa verification against named authorities | `editorial-verification-lead` | Sprint 04 |
| RISK-09 — shared-repo checkout guard (git hook, both trees) | BMAD | Sprint 04 |
| PLAT-13/14/15/16 — watcher false wakes, state-transition log, sprint-JSON reconciliation, name collision | BMAD | Sprint 04 |
| RIGHTS-01 — one Malay credit label, one casing, sitewide | BMAD | Sprint 04 |
| RIGHTS-02 — `jangan-guna` census → per-photographer permissions worklist | BMAD | Sprint 04 |
| **Ask whether photographer permissions were obtained** | **CEO** | **Sprint 05 planning** |

---

## Owner requests

**None.** No item in Sprint 04 falls into the four owner-only categories — no
credentials, no money, no outward-facing commitment by the company, no irreversible
destruction. The whole sprint executes under standing autonomy.

**One thing the owner has taken on themselves**, recorded so it is tracked rather
than assumed: obtaining permission from photographers for the `jangan-guna` assets.
RIGHTS-02 produces the worklist that makes it actionable; the approaches are
theirs. **The CEO will ask about it at Sprint 05 planning** — not to chase, but
because §3 of the plan exists precisely because decision 50 was assigned once and
never audited.

---

## Retrospective — the meeting's own process

Chaired by the CEO, per Stage 9. Four questions.

**What did we learn that is not written down?**
That the company had no way to distinguish a query it can win from a query it
cannot, and had been selecting content without one. Every prior selection rule —
volume, parent topic, SERP ownership, Jaccard overlap — measures *competitors*.
None of them measures **whether Google answers the question itself**, which on this
evidence is worth more than all of them: a 15× CTR difference at comparable
positions.

**Which document must change, and who owns the edit?**
- `skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md` —
  the SERP-shape test joins the **pre-flight checklist**, beside "resolve the
  operator". Owner: CEO, this session. **Backed by SEO-12's script**, because
  Sprint 03 proved the checklist entry alone is not enough.
- `skillcentral/agents/projects/hellokahwin/Executive/ceo-hellokahwin.md` — the
  metric split, and the over-trimming pattern. Owner: CEO, this session.
- `skillcentral/skills/hellokahwin/SKILL.md` — the audit step must say
  *re-measure*, not *read the carried-forward list*; two of Sprint 03's carried
  figures were stale. Owner: CEO, this session.
- `docs/boardroom/ceo-memory.md` — close the 🔴 title defect, correct the credit
  figure, record the SERP-shape finding. Owner: CEO, this session.

**What did we do twice that we should never repeat?**
Grepped for a string nobody had verified, and nearly believed the absence. `Kredit`
returned zero on a page that has forty credits. That is the **tenth** instance of
the shape tabulated in the persona, and the first one caught *by the rule itself*
rather than by luck or by an agent — the persona says to verify the check when an
absence surprises you, and this time the CEO did, in the same tool call. **The rule
fired.** Worth recording, because Sprint 03's finding was that rules like it
generally do not.

**What did we nearly ship, and what caught it?**
A sprint built around fixing titles. The cached-metadata defect was the obvious
cause of a CTR collapse, it was already open and unowned in `ceo-memory.md`, and it
would have been an entirely defensible sprint theme. **Six live fetches disproved
it in about forty seconds**, five of them under the exact cold-cache condition that
used to reproduce it. Without that check, Sprint 04 would have been spent repairing
something that already works — and the real cause would have gone another sprint
undiagnosed while we published more pages into it.
