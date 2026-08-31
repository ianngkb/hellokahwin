# Board meeting — 01 September 2026 — Sprint 05 planning

**Trigger:** scheduled / routine check-in (`/hellokahwin`, no argument). Sprint 04
closed 31 Aug at 21:34, 69/69, so the CEO set this as sprint planning.

**Data reviewed:**
- **GSC** `https://hellokahwin.com/` — 28d totals, 10d daily series, 7d by query
  (365 rows) and by page (40 rows), pulled 31 Aug late / 01 Sept.
- **Live production** — homepage, one article page, the full sitemap (103 URLs),
  and an 85-article census for `FAQPage` and the in-article TOC, run 01 Sept.
- **Repo** — `sprint-04-retro.json`, `decision-log.md`, `ceo-memory.md`,
  `docs/plans/README.md` (all rows, blocked and otherwise), the 31 Aug
  spec-vs-build audit, `head-of-seo-content.md`, `hellokahwin-site` git state.
- **Unreachable / not used:** Ahrefs was not pulled this meeting — decision 91
  stands (it lags GSC by two orders of magnitude on this site and is not a
  performance source). The split-CTR figure is therefore quoted from SEO-11's
  1–28 Aug census with its date, not re-derived; **SEO-14 re-runs it at close.**

---

## Discussion summary

Sprint 04 delivered 69/69 with 7% idle across eleven concurrent worktrees, and every
item was verified against production rather than accepted on an agent's report. It
was called *Earn the click*, and **the click did not move**: 28d CTR went 1.48% →
1.40% while position improved 12.4 → 11.8 and impressions rose 16%. The CEO's read
is that this is not a failure of Sprint 04's execution but a confirmation of what
SEO-11 measured inside it — presentation was never what suppressed CTR.

The page-level data makes it sharper than the census did. In the last seven days the
`mas kahwin` state series, `walimatul urus` and the hantaran ratio pages returned
**21 clicks from 3,062 impressions (0.69%) at position ~7**, while `checklist-kahwin`,
`/dewan-kahwin/`, `goodies-kahwin`, `nisbah-hantaran` and `bajet-kahwin` returned
**17 from 285 (5.96%) at position ~7.4**. Same site, same design, matched positions.
About 40% of the impression base is structurally unclickable however well it ranks.

The open-assignment audit closed three assignments and found one failure: **decision
167's ruling that the two institutional images come down was decided on 30 Aug and
never executed**, because RIGHTS-02 was deferred by the owner's 31 Aug redirect and
the sub-commitment went with it. That is decision 50's pattern — a commitment living
inside a re-scoped item disappearing without ever being decided against — and it is
the only genuine legal exposure the company carries.

Three carried-forward figures were re-measured rather than read, and two had moved:
the FAQ-schema gap is **39 of 85**, not the 31 recorded in `ceo-memory.md`, and the
in-article TOC is absent from **all 85** articles rather than the one page the 31 Aug
audit checked. The homepage is unchanged at **26 of 26 links in one category**, four
days after the spec named it and two sprints after it was first measured.

The CEO's own first check of two of those three was wrong — and so was the CEO's
first diagnosis of *why*. `grep -oiF` returned zero for `artikel` on a page whose URL
contains `/artikel/`, and zero for `REKOD` and `SUMBER`, which the page carries ×24
and ×20; read as an absence it would have sent UI-17 to rebuild shipped markup. The
CEO blamed binary classification of the 145 KB single-line file and wrote `-a` into a
new helper as the fix. **`-a` does not fix it** — the real cause is `-o` + `-i` + `-F`
together in GNU grep 3.0, and it reproduces on a 23-byte file. That was caught only
because the helper was run against the case it was written for before being trusted,
which is the second-order lesson the meeting recorded: a fix is not verified until it
is run against the failing case.

The retro had proposed the composition work as Sprint 05's theme. The CEO agreed it
is a track and argued it is not the sprint, because composition answers the owner's
premium complaint and does not answer the click problem. The owner approved the full
scope and confirmed the photographer permissions are obtained.

---

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| **175** | **Sprint 05 is *Build where the click is* — 19 items, 81 points, nothing cut.** Content 20, design 31, SEO 8, risk 9, platform 13. | Sprint 04 shipped 69 points and the click did not move; the 12.2× intent split (SEO-11, p = 0.00002) says why. Imported to the tracker and read back: `0/81 points, 19 items`. | **Owner**, 01 Sept |
| **176** | **⚠ OWNER CONFIRMED: the photographer permissions are OBTAINED.** RIGHTS-02 changes purpose — from enumeration supporting a negotiation to a **record of rights the company holds**. | Owner, 01 Sept: *"yes I got the permissions."* This was decision 161's mandated follow-up, brought back by the CEO as required. | **Owner** |
| **177** | **🔴 RIGHTS-03 filed: decision 167 was decided and never executed.** The Getty/iStock file and the press photograph come down, UNDO pushed first. | No work-done entry exists; RIGHTS-02 was deferred 31 Aug and the sub-commitment went with it. Decision 50's pattern. The owner's permissions do not reach institutions. | CEO |
| **178** | **CONT-13's Sprint 04 gate is CORRECTED IN THE BRIEF before re-import.** Two of its three tests are superseded: the volume floor becomes **≥220 monthly** (D170), and **"no AI Overview" is removed as a selector** (D169) in favour of `intent_class`. | Re-importing the brief unchanged would re-import a criterion its own sprint disproved. 94% of number-intent queries carry an AIO but so do 79% of document-intent ones — the feature sorts nothing; intent survives every re-cut at p = 0.000003–0.000025. | CEO |
| **179** | **DES-17 is a separate item from UI-13: WRITE the H6 rule before anyone builds it.** | `H6` is a dangling cross-reference — its four matches in DES-03 are three base64 fragments in embedded font data plus the reference itself; §7 is the state set. No builder could have implemented it. Sprint 04's central finding: rules expressible as code shipped; prose and drawings did not. | CEO |
| **180** | **The FAQ-schema figure in `ceo-memory.md` was STALE and is corrected: 39 of 85, not 31.** Filed as SEO-13. | Live census across every sitemap article URL, 01 Sept: 46 present, 39 absent, 1 fetch failure. The corpus grew since the figure was written. | CEO |
| **181** | **Decision 168 is re-dated: the enforce-credit-everywhere programme is a SPRINT 06 question, not Sprint 05.** | D168 made it a Sprint 05 question *once RIGHTS-02 had sized it*. RIGHTS-02 runs in Sprint 05, so it cannot also be sized by it. Written into `out_of_scope` so the plans index stops reading as though someone else owes an answer. | CEO |
| **182** | **⚠ ELEVENTH INSTANCE OF THE VERIFICATION SHAPE — AND THE FIRST DIAGNOSIS OF IT WAS ALSO WRONG.** `grep -oiF "artikel"` returned **0** on a page whose URL contains `/artikel/`, and 0 for `REKOD`/`SUMBER` (present ×24 and ×20). The CEO blamed binary classification of the 145 KB single-line file and wrote `-a` into a helper as the fix. **`-a` does not fix it**: `-oaiF` still returns 0, `-oaF` returns 89, `-oai` returns 97. **The real cause is `-o`+`-i`+`-F` together in GNU grep 3.0**, reproducing on a **23-byte file**. | Read as an absence it would have said the rail scaffolding does not exist, sending UI-17 to rebuild shipped markup. Caught ONLY because the fix was run against the failing case before being trusted. **Second-order lesson: a fix is not verified until it is run against the failing case; "I understand the cause" is not that test.** Executable form: `scripts/measure/count-in-html.sh`. | CEO |
| **183** | **FOURTH consecutive sprint in which the CEO flagged and the owner kept everything.** Decisions 62, 93, 160, and now 175. | Twelve points offered across four sprints; twelve kept. The correction stays two-way: the CEO is systematically over-trimming, *and* the flagging must not stop, because the owner's reasoning has added something new every time — this meeting it was the permissions answer that re-purposed RIGHTS-02. | Owner + CEO |

---

## Predictions

1. **150–200 clicks/28d by ~22 Sept, without CONT-13 needing to land.** At 109 on 30 Aug with daily clicks running 12–19. Decision 96's MISS prediction is now scored wrong twice.
2. **Sitewide CTR keeps falling while impressions climb.** Expected, not a failure signal — this is why decision 159 split the metric. Judge the sprint on clicks and the document arm.
3. **CONT-13 + CONT-16's eight articles reach positions 4–10 and earn ≥2.3× the number/definition arm** (decision 171's conservative bound). **Falsifier: if they reach 4–10 and still earn under 1%, the intent mechanism is wrong** and SEO-11's selection rule needs re-deriving from scratch.
4. **SEO-13 moves no clicks inside this sprint.** Long-lag bet; recorded now so a later meeting does not score it as failed at four weeks.
5. **UI-13 / UI-17 / UI-18 move no metric.** Brand and credibility, same class as Sprint 03's redesign and Sprint 04's UI track.
6. **Whole-thesis falsifier: if sitewide CTR RISES without CONT-13/16 having shipped, the SERP-shape mechanism is wrong.**

---

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| CONT-13 — six document-intent articles, both gates live | `writer-inspirasi-vendor-venue` + `editorial-verification-lead` | Sprint 05 |
| CONT-16 — `skrip pengacara majlis`, `teks kad jemputan` | `writer-adat-agama-prosedur` | Sprint 05 |
| CONT-14 — re-angle the `hantaran-kahwin` seed | `writer-inspirasi-vendor-venue` | Sprint 05 |
| DES-17 — write the H6 diversity rule (blocks UI-13) | `product-designer` | Sprint 05, **first** |
| UI-13 — build homepage diversity · CONT-15 — portrait covers | `creative-director` | Sprint 05 |
| UI-17 rail · UI-18 TOC · DES-18 mid-size variant | `design-systems-engineer` | Sprint 05 |
| SEO-13 FAQPage coverage · SEO-14 census re-run **at close** | `head-of-seo-content` | Sprint 05 |
| RIGHTS-03 institutional images · RIGHTS-02 rights record | `managing-editor` | Sprint 05 |
| RISK-10 · PLAT-13 · PLAT-14 · PLAT-17 · PLAT-18 · PLAT-19 | BMAD | Sprint 05 |

**Dispatch note:** concurrency is the default (owner directive, 31 Aug). One worktree
per concurrent item, `git fetch` before creating, HEAD verified in each new tree, and
the project personas copied in before dispatch — a fresh worktree has no
`.claude/agents/` and a bare name resolves to the global org chart. **DES-17 → UI-13
and DES-18 → CONT-15 are the only two genuine sequences**; everything else goes out
together.

---

## Owner requests

**None.** The one owner-only item this meeting carried — decision 161's mandated
follow-up on photographer permissions — was answered in the room. Nothing in Sprint
05 needs credentials, money, an outward-facing commitment, or an irreversible
destruction: RIGHTS-03's two deletions are reversible and carry a pushed UNDO, which
keeps them inside the CEO's standing production-write authority.
