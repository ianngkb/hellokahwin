# Board meeting — 02 September 2026 — Sprint 06 planning

**Trigger:** goal handed down. Owner: *"i would like you to continue working on
content on the site, more pillars. Can we see what else we should focus on. Also,
continue to make improvements on the UI of the site."*

**Data reviewed:**
- **GSC** `https://hellokahwin.com/` — 28d overview, and a **337-query pull**
  (2026-08-20..09-01, `dataState=final`) classified with the committed
  `intent_of` classifier from `scripts/seo/serp-shape-census.py`.
- **Live production** — sitemap (109 entries, 92 articles), pillar distribution,
  and re-measurement of three carried figures.
- **Repo** — `ceo-memory.md` open items, `docs/plans/README.md` blocked rows (none
  outstanding), the Sprint 05 retro and backlog.
- **Not used:** Ahrefs. Decision 91 stands — it is not a performance source for
  this site. Volume figures for target selection are CONT-17/CONT-18's job at
  their gates, not the meeting's.

---

## Discussion summary

The owner asked what content to focus on. Rather than answer from the cluster plan,
the CEO classified every ranking query by intent and let the distribution decide.

The result is stark and is the meeting's central finding: **HelloKahwin has built
39 of its 92 articles in `hantaran-mas-kahwin`, the family that draws 40% of all
impressions at 0.6% CTR, and 10 in `ucapan-doa`, which converts at 4.5%.** The
company has been building hardest where the click structurally is not.

Worse and more useful: the `doa` family's **mean position is 21.7**. We are not
saturated on our best territory — we are barely competing on it. Twenty-six
document-intent queries carry impressions and zero clicks, including
`doa selepas akad nikah rumi` at position 10.6 and `lafaz taklik perak` at 8.7.
`nikah-undang-undang` holds six articles against `rukun` at 22.3 and `lafaz
taklik` at 9.0 with no clicks at all.

So the two pillars are named by the data: deepen `ucapan-doa`, build out
`nikah-undang-undang`. Not more `mas kahwin` — decision 170 priced that out
already.

**One sequencing decision dominates the sprint.** The 12.2× intent split rests on
fourteen clicks and has never been re-measured. SEO-14 runs FIRST, and if the
split has collapsed below decision 171's conservative 2.3× bound, CONT-17's
premise is gone and it stops rather than writing six articles on a dead thesis.
That is written into both DoDs rather than left as an intention.

Three carried figures were re-measured before sizing and one was wrong: UI-15's
"all 37 category pages" is **15**. The corpus has also moved from 86 articles to
92, so CONT-15's "12 of 86" is stale. Both DoDs now require deriving the count at
run time, and both titles were corrected so a reader is not misled by the row.

The sprint is deliberately 10 items where Sprint 05 was 28. The lesson from
Sprint 05 was not that 28 was untidy — it was that only 14 were dispatched, so
half the sprint never ran. This one is sized to be dispatched whole.

---

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| **186** | **Sprint 06 is *Deepen where the click is* — 10 items, 52 points, nothing cut.** Content 22, design 24, SEO 3, platform 3. | Imported and read back; `reconcile 6 --check` exits 0. | **Owner**, 02 Sept |
| **187** | **⚠ THE CONTENT DIRECTION IS SET BY A MEASURED INTENT DISTRIBUTION, NOT THE CLUSTER PLAN.** Deepen `ucapan-doa`; build `nikah-undang-undang`. | 337 queries classified 02 Sept: `doa` 221 impressions / 4.5% CTR / 100% document intent / **mean position 21.7**; `mas kahwin` 1,046 impressions / 0.6% / 0% document intent. **39 of 92 articles sit in the second.** | CEO |
| **188** | **SEO-14 RUNS FIRST AND CAN KILL CONT-17.** If the document/number split has fallen below 2.3×, CONT-17 stops. | Decision 171: the 12.2× figure rests on 14 clicks and the CI bounds it only at ≥2.3×. Sprint 05 added the intervention that should move it. | CEO |
| **189** | **CEO RULING ON UI-17's SUMBER CLAUSE, carried into UI-19: SUMBER renders only where sources exist; the rail must not collapse without it.** | UI-17 reported the clause unachievable on 52 of 86 articles and asked rather than narrowing. DES-03's R8c already establishes this fallback shape for the hero. | CEO |
| **190** | **⚠ 52 OF 86 ARTICLES HAVE NO SOURCES TO LIST — sized as its own content-integrity question, NOT absorbed into a layout item.** | UI-17's finding, Sprint 05. On a site whose competitive claim is that its numbers carry sources, this is not a rail problem. Deferred to Sprint 07 planning deliberately, with the reason recorded. | CEO |
| **191** | **⚠ A CARRIED FIGURE WAS WRONG FOR THE THIRD PLANNING MEETING RUNNING: UI-15's "all 37 category pages" is 15.** | Live sitemap 02 Sept: 109 entries, 92 articles, 17 non-article URLs. The corpus also moved 86 → 92, making CONT-15's "12 of 86" stale. Both DoDs now derive the count at run time; both titles corrected. | CEO |
| **192** | **FIFTH consecutive sprint in which the CEO flagged and the owner kept everything.** Decisions 62, 93, 160, 175, and now 186. | The two-way correction stands: the CEO over-trims, *and* the flagging must not stop. This meeting the owner simply took the whole scope, which is the fifth data point that the CEO's cut instinct is miscalibrated rather than the scope being wrong. | Owner + CEO |
| **193** | **SPRINT SIZE IS NOW SET BY DISPATCH CAPACITY, NOT BY AMBITION.** 10 items, because Sprint 05 scoped 28 and dispatched 14. | Sprint 05 velocity: 45 of 108 points, with 30 points moved out at close having never been dispatched. The failure was not delivery — it was scoping past what one session runs. | CEO |
| **194** | **⚠ THE FAVICON IS A PINK 'H' FROM THE RETIRED PALETTE, and not any mark in the brand registry. Added as UI-20 (3pt) at the owner's request — sprint is now 11 items, 55 points.** | Live 02 Sept: one icon link, a 48x48 pink/magenta PNG with a serif H. `brand-assets.ts` names the monogram as *"the only mark that survives a favicon"*; `brand.css` is warm neutrals and gold with no magenta. `/favicon.ico`, `/icon.svg`, `/apple-icon.png` all 404. `favicon-32.png` exists unreferenced. | **Owner**, 02 Sept |

---

## Predictions

1. **SEO-14 confirms the split at or above 2.3×.** **Falsifier: if it has collapsed, CONT-17 stops** — and that is the most valuable outcome this sprint could produce, because it would invalidate the content strategy rather than one item.
2. **CONT-17 + CONT-18's ten articles reach positions 4–12.** If they land there and the `doa` family's mean position of 21.7 does not improve, the pillar is **saturated rather than underbuilt** — a different diagnosis requiring a different sprint.
3. **200–260 clicks/28d by end of September**, from 125 on 02 Sept and 51 on 27 Aug.
4. **UI-19, UI-15, UI-16, CONT-15, DES-15 move no metric this sprint.** Brand and credibility, recorded now so a later meeting does not score them on traffic.
5. **This sprint is dispatched IN FULL.** Falsifier: if it again ends with items never dispatched, the constraint is not scope and decision 193 is the wrong fix.

---

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| SEO-14 — census re-run, **first**, answer reported to the CEO before CONT-17 selects | `head-of-seo-content` | Sprint 06, first |
| CONT-17 — six doa articles, both gates + decision 162's authority gate | `writer-inspirasi-vendor-venue` | Sprint 06, after SEO-14 |
| CONT-18 — four `nikah-undang-undang` articles | `writer-adat-agama-prosedur` | Sprint 06 |
| UI-19 rail + SUMBER · UI-15 grid · UI-16 cover · DES-15 font-weight | `design-systems-engineer` | Sprint 06 |
| CONT-15 portrait covers | `creative-director` | Sprint 06 |
| COPY-01 | `managing-editor` | Sprint 06 |
| PLAT-16 pillar render cache | `design-systems-engineer` | Sprint 06 |

**Dispatch note:** everything except CONT-17 runs concurrently from the start;
CONT-17 waits on SEO-14's answer and that is the only sequence in the sprint.
One worktree per item, `git fetch` first, HEAD verified in each tree, project
personas copied in before dispatch, and **every brief names its target
integration branch** (`master` for site code, `feat/command-centre-dashboard`
for anything under `docs/`) — five Sprint 05 items landed correct work on the
wrong branch.

---

## Owner requests

**One, carried from Sprint 05 and unchanged:** **close PR #37 without merging.**
It targets `master`, which is the site space, and carries 51 docs-space files
including the boardroom. Its work already shipped by another route. The CEO's
account lacks `ClosePullRequest` on `ianngkb/hellokahwin`.

The Cloudflare purge is **done** — RIGHTS-03 closed, `TAKEDOWN-GATE EXIT: 0`,
decision 167 finally settled. Nothing else in Sprint 06 needs credentials, money,
an outward-facing commitment, or an irreversible destruction.
