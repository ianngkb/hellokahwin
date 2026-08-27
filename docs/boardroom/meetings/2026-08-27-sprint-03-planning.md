# Board meeting — 2026-08-27 — Sprint 03 planning

**Trigger:** scheduled (routine check-in, no topic handed down — the CEO set the agenda)
**Data reviewed:**
- Google Search Console, `https://hellokahwin.com/` — performance overview 28d to 2026-08-27; query and page breakdowns 28d and 7d; period comparison 13–19 Aug vs 20–26 Aug; sitemap state. All pulled live 2026-08-27 ~07:55.
- Ahrefs Site Explorer, `hellokahwin.com`, mode=subdomains, country=my, date 2026-08-27.
- Live production: `curl` against the sitemap and two article URLs for count and robots meta.
- `docs/boardroom/decision-log.md` to entry 88; `docs/sprints/sprint-02.json`; `docs/sprints/sprint-02-retro.json`; `docs/boardroom/ceo-memory.md`.

**Unreachable / not pulled:** nothing was refused. Ahrefs was pulled but is DEMOTED as a performance source for this site — see decision 91. GSC URL Inspection was not run in this meeting; RISK-07 and SEO-10 carry it as a DoD requirement instead.

**Process note, recorded because it shaped the meeting:** the `ceo-hellokahwin` seat could not be filled. Six delegated sessions were launched and all six failed — four died on `Login expired · Please run /login` (`ceo-hellokahwin`, `ceo-board-03`, `hk-audit`, `hk-backlog`) and two went silently idle with no output returned (`ceo-hk`, `hk-data`). The failure window shrank from ~25 minutes to ~5 over forty minutes. The meeting was run directly in the orchestrator session, whose credentials remained valid throughout. Every figure below is a first-hand pull, not a delegate's report.

## Discussion summary

Sprint 02 closed the publishing hole and Google responded immediately. Impressions tripled across three days — 148 on 24 Aug, 252 on 25 Aug, **412 on 26 Aug** — and average position on 26 Aug reached **10.0** against a 28-day mean of 17.7. The sitemap now carries **103 indexed URLs, Valid, zero errors**, last fetched 26 Aug 22:03. Set against decision 63, which opened Sprint 02 with a 78-URL sitemap that Google had last fetched at 73 URLs before five published articles existed, RISK-04 is confirmed to have worked. Sitewide CTR also moved 1.65% → 1.78% while position improved 20 → 17.7, so the gain is not a volume-dilution artifact.

Clicks have not followed. The `mas kahwin` family — the cluster decision 82 identified as the site's only statistically real zero — now draws roughly 300 impressions at positions 6.5–12.2 and earns **three clicks**, four of its five pages earning none at all. SEO-05 shipped repaired titles for exactly this family in Sprint 02. The board could not establish whether those titles are what Google is being served, because SEO-07 (a repaired title can render as the site-default 14 minutes later) remains unfixed. **That measurement blindness, not the titles themselves, is what set this sprint's leading item.**

The open-assignment audit closed decision 50 rather than re-assigning it. `dewan komuniti setiawangsa` has gone 25 → 34 → 100 impressions while holding position ~9 and earning zero clicks throughout. Decision 82 had already killed it on significance grounds and decision 83 killed the category structurally. The audit's contribution was to find that decision 83's *deliberate control* — retaining Setiawangsa so the council-hall category would be proved dead rather than quietly dropped — never ran, because SEO-04 parked before reaching it. It is folded into SEO-04's revival at no extra cost.

Decision 88's deferred `garden-wedding` question was answered with the data it asked for: 814 impressions, 4 clicks, 0.49% CTR, position 36.6 — 28% of all site impressions earning 8% of clicks, from an English-intent page on a Malay-first site. It is the largest single distortion in every report the company produces, and SEO-08 now owns the decision.

Two open items were found during planning that the CEO's initial proposal had missed, both from `ceo-memory.md`: the **FAQ schema gap** (31 articles emit none, on a site whose entire Malay long tail is question-shaped) and the **C2.1 merge decision**, deliberately undecided pending a SERP check that has never been run. Both were added as SEO-10 and CONT-10. Their absence from the first draft is itself the finding — the proposal was built from the sprint files and the decision log, and `ceo-memory.md` carries open items neither of those records.

Against the founding target (decision 7: 1,500 clicks/28d by 21 Nov 2026, with 150 at the 30-day checkpoint), the company stands at **51 clicks/28d** — roughly 3% of target with twelve weeks left, and needing 3× within four weeks to hit the first checkpoint. Every leading indicator is green; the lagging one is not. That gap is the whole reason this sprint converts rather than expands.

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| 89 | **Setiawangsa is CLOSED as a traffic target, not re-assigned.** It appears in Sprint 03 only as SEO-04's declared control. | GSC 28d to 27 Aug: 100 impressions, position 9.0, zero clicks, against 25 imp/8.9 when assigned on 24 Aug. Decisions 82 (P(zero)≈12%, not statistically real) and 83 (~30 searches/mo, DBKL DR 64 at positions 1–2). | CEO, standing autonomy |
| 90 | **SEO-07 leads Sprint 03, ahead of all new content.** | The mas-kahwin family draws ~300 impressions at positions 6.5–12.2 for 3 clicks after SEO-05 repaired its titles. Until generateMetadata's cached fallback is fixed, no title change is measurable. Writing more pages that rank at 8 and earn nothing compounds the wrong thing. | CEO, standing autonomy |
| 91 | **Ahrefs is DEMOTED to competitor comparison only for this site.** | Ahrefs MY, 27 Aug: 9 organic keywords, ~31 organic traffic. GSC same day: 2,869 impressions, 51 clicks. Ahrefs lags by roughly two orders of magnitude on a site this small; quoting it as a performance metric would understate the company badly. | CEO, standing autonomy |
| 92 | **SEO-04 is REVIVED via phone verification, with its gate retained verbatim.** Eight venues phone-verified, published with "disemak Ogos 2026". If eight cannot be verified it STOPS again. | SEO-04's own park recommendation. The method is the one that built `mas-kahwin-ikut-negeri`. Sprint 02's retro established that the gate killing the item was a deliverable, not a failure. | CEO, standing autonomy |
| 93 | **Sprint 03 scope set at 52 points across 13 items**, thesis *"Convert the impressions we now have"*. The CEO's cut list (PLAT-10, PLAT-12, 4pt) was declined by the owner and both stay in scope. | Owner set scope at the full proposal, as in Sprint 02 (decision 62). | Owner |
| 94 | **Two items were added during planning from `ceo-memory.md`** — SEO-10 (FAQ schema gap) and CONT-10 (C2.1 merge decision) — neither of which appeared in the CEO's first proposal. | Both are recorded open in `ceo-memory.md` and in neither the sprint files nor the decision log. | CEO, standing autonomy |
| 95 | **⚠ THE DELEGATION LAYER FAILED COMPLETELY AND THE MEETING RAN WITHOUT IT.** Six sessions launched, six failed — four on `Login expired`, two silently idle returning nothing. | Timestamps 07:02–07:54, 27 Aug. Failure window shrank ~25min → ~5min. `resume-fleet.sh`, built in Sprint 02 for exactly this, did not fire. | CEO, reported to owner |

## Predictions

- **SEO-07 is the highest-leverage item in the sprint.** Prediction: fixing it reveals that some fraction of the mas-kahwin family is being served the site-default title, and that the fraction is larger than the 3-of-69 SEO-05 measured. If the count comes back at or near zero, the zero-click cause is elsewhere and the sprint's thesis is wrong — which is a useful outcome, recorded now so it cannot be reinterpreted later.
- **Impressions continue to climb through Sprint 03** on the strength of Sprint 02's 25 articles, independent of anything in this sprint. Prediction: the 28-day impression figure passes 5,000 before Sprint 03 closes. This is NOT this sprint's achievement and must not be claimed as one.
- **The 30-day checkpoint (150 clicks/28d by ~22 Sept) will be MISSED** on current trajectory — 51 today, needing 3× in under four weeks. Stated now rather than explained afterwards.
- **RISK-08 returns "no longer bites"** rather than a root cause, because RISK-04 and RISK-06 changed what Googlebot meets first. Recorded so that a null finding reads as the prediction landing, not as the item failing.
- **SEO-04's gate fires a second time** is the CEO's expectation at roughly even odds. Phone verification is a different method from the desk research that failed, but eight venues is eight phone calls that have to be answered.

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| SEO-07 — title half-life; sequential re-measure; 30-min cold re-fetch | BMAD | Sprint 03, runs FIRST |
| RISK-07 — six noindex sitemap URLs | BMAD | Sprint 03 |
| RISK-08 — cold renders, with RISK-05 monitor data | BMAD | Sprint 03 |
| SEO-08 — decide garden-wedding on SERP evidence | head-of-seo-content | Sprint 03 |
| SEO-09 — re-parent the 13 legacy articles | BMAD | Sprint 03, sequence away from SEO-10 |
| SEO-10 — FAQ schema emitter + writer instruction | BMAD | Sprint 03 |
| SEO-04 — venue entity pages, gate first | head-of-seo-content | Sprint 03 |
| CONT-10 — C2.1 merge decision (blocks CONT-12) | head-of-seo-content | Sprint 03, before CONT-12 |
| CONT-11 — four zero-volume C2.1 head terms | head-of-seo-content | Sprint 03 |
| CONT-12 — complete C2.1 | writer-inspirasi-vendor-venue | Sprint 03, BLOCKED on CONT-10 |
| PLAT-10 / PLAT-11 / PLAT-12 — tracker honesty fixes | BMAD | Sprint 03 |

## Owner requests

**One.**

**The login token is expiring and it is taking down the agent fleet.** Six sessions failed inside forty minutes on 27 Aug; the window between launch and death shrank from ~25 minutes to ~5. Credentials are carve-out (1) — the CEO cannot fix this, and `/startsprint` cannot dispatch a sprint into a fleet that dies on launch. **Sprint 03 should not start until this is resolved.**

Nothing else is requested. No spend, no outward-facing commitment, no irreversible destruction arises from this plan.
