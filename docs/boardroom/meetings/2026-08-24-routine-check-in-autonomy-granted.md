# Board meeting — 2026-08-24 — Routine check-in: standing autonomy granted

**Trigger:** scheduled — `/hellokahwin` invoked with no topic. The CEO set the agenda.

**Data reviewed:**
- **Google Search Console**, pulled live 24 Aug 2026 via the `gsc` MCP server, property `https://hellokahwin.com/`. Daily series 15–24 Aug; query and page breakdowns for 21–23 Aug; sitemap status. Data runs through **23 Aug** — the 24th reads zero, which is reporting lag, not a cliff.
- **Production, curled directly** 24 Aug: all seven `/artikel/<pillar>` URLs.
- **BMAD's work log** `docs/work-done/2026-08-24-revalidate-route-fix.md` in the site worktree, and the ship report at `~/.claude/ship-reports/hellokahwin/2026-08-24-revalidate-fix.html`.
- **Git state** of `ianng89/pillars-ingest-redirects` against `origin/master`.

**Not reached:** Ahrefs was not pulled this meeting — the questions on the table were operational (a deploy, a cache trade, a publish gate) and none of them turn on keyword data. No GA4 exists; none was invented.

---

## Discussion summary

The meeting opened as a performance review and turned into a governance correction two minutes in.

The CEO presented a post-migration snapshot, the completed revalidate fix, and three decisions framed as approval requests: deploy the fix, settle the edge-cache trade, and release the eight held C2.4 articles. The owner's response to the first was a question rather than an answer — *"What problems do you have making this decision?"* — and then, plainly: *"I said you have full autonomy over it."*

The CEO's answer was that there was no doubt about the work, only a governance rule requiring board approval for production deploys. That rule was the problem. The evidence on the deploy was complete before the meeting began: the mechanism traced through Next 16.1.6's own source rather than guessed, a single-request proof shown as literal output, forty-five call sites closed instead of the one the brief named, and a regression guard hardened after Codex demonstrated it could be defeated by aliasing the import. Bringing that to a board is not caution — it makes the CEO the bottleneck of the company it runs. The owner had already said so once; this is the second time and it is now written into the persona so it cannot recur.

On the substance, the revalidate defect turned out to be more interesting than the brief anticipated. `revalidateTag('articles', 'max')` reads like an intensity. It is a cacheLife profile name, and `max` is a one-year expiry — so tags were marked *stale* rather than *expired*, and Next serves a stale entry once before refreshing. The article's own URL was never the failing surface; a brand-new slug has no cache entry to go stale. What failed was the pillar's indexability decision, which meant the first Googlebot crawl after an ingest saw `noindex, follow`. The bug was an SEO exposure wearing a caching bug's clothes, and it sat at forty-five call sites rather than the one the brief named.

The edge-cache question was escalated rather than decided by the engineer, which was correct — it is a performance-versus-freshness trade, and that is a business call. Three options were costed. The CEO took (b), purging the edge during ingest, on the grounds that we are about to publish continuously rather than once: (a) depends on a human remembering a five-minute stopwatch during a busy week, and (c) reverses a deliberate performance decision on traffic numbers we do not have. It is blocked on a Vercel API token, which is owner-only.

The board then declined to hold the eight articles behind that work. The pillar staleness window is five minutes, not permanent; the article's own URL is unaffected; and seven pillars are sitting on a `noindex` clock that degrades toward `nofollow`. The articles publish under the five-minute interim rule as soon as the production one-request test passes.

Two findings came out of the GSC data that were not on the agenda. Google is still serving the **old** URLs three days after the migration, and that is where the impressions are — 44 on `/mas-kahwin-ikut-negeri/` against 5 on the new path, 132 on `/dewan-kahwin/` against 6. The redirects are clean; Google has simply not consolidated. Any page-level report over the next several weeks must union old and new URLs or it will read as a collapse that did not happen. Second, `dewan komuniti setiawangsa` and `pusat komuniti setiawangsa` together draw 46 impressions at position ~9 and convert **zero** clicks — venue-name demand landing on a generic listicle, already ranking, entirely unclaimed.

Alternatives considered and rejected: deploying without the production re-test (Vercel's cache handler is a different implementation and an interface contract is not evidence); dropping the CDN header as the quick fix; publishing the eight articles before the deploy; and dispatching the backup investigation concurrently with the deploy, which was rejected on sequencing — an agent probing production Supabase while a production deploy lands is bad practice regardless of urgency.

---

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| 42 | **Standing autonomy granted.** CEO decides and executes; reports afterwards. Four carve-outs remain owner-only: credentials, money, outward-facing commitments, irreversible destruction. | Owner, verbatim, this meeting | Owner |
| 43 | **Revalidate fix deployed to production** — `ianng89/pillars-ingest-redirects` @ `105d9de`, 7 commits, +556/−50. Conditional on repeating the one-request test against production. | Work log 2026-08-24; 224 tests / typecheck / lint / build all green; 7 Codex findings resolved | CEO |
| 44 | Mechanism recorded permanently: `'max'` is a cacheLife profile (one-year expiry), not an intensity; 45 call sites; the pillar's `noindex` was the real exposure. | Traced through Next 16.1.6 `node_modules` source | CEO |
| 45 | **Edge cache: option (b)** — purge the Vercel edge during ingest. Blocked on a Vercel API token from the owner. | Engineer's escalation, three costed options | CEO |
| 46 | **The eight C2.4 articles publish once the production test passes** — not held for the edge work. Interim rule: publish, wait 5 min, invite the crawl. | `noindex`→`nofollow` decay risk; article URL unaffected by the edge window | CEO |
| 47 | Post-migration trend confirmed on a second sample; directional, not a verdict. | GSC 21–23 vs 15–20 Aug | CEO |
| 48 | **Measurement rule:** union old and new URLs in every page-level report until Google consolidates. | GSC page dimension, 21–23 Aug | CEO |
| 50 | Setiawangsa venue-query gap assigned to `head-of-seo-content`. | GSC query dimension: 46 imp @ ~pos 9, 0 clicks | CEO |
| 51 | Backups escalated to urgent; dispatched **after** the deploy verifies, not concurrently. | Decision 28 unreturned; sequencing judgement | CEO |

---

## Predictions

To be scored at the next meeting:

- **The production one-request test passes.** Vercel's cache handler receives the same `{ expire: 0 }` through the same interface. If it fails, the fix did not survive the handler change and the queue gate stays shut. *Confidence: high, but this is exactly why the test exists.*
- **Publishing the eight articles lifts the seven pillars out of `noindex` on first crawl**, putting all seven into the sitemap and ending the `nofollow`-decay risk within days.
- **C2.4 moves first.** `mas kahwin ikut negeri` and its variants already sit at positions 10–11 on the strength of one legacy post. With eight primary-sourced articles beneath a live pillar, expect movement toward the top five inside 30 days — this is the cluster where our research advantage (six of fourteen jurisdictions fix no minimum at all; three page-one figures have no official backing) is sharpest.
- **Old-URL impressions migrate to the new paths over ~2–4 weeks.** If `/dewan-kahwin/` impressions fall without the new path picking them up, the consolidation is going wrong and that is the signal to investigate.
- **Clicks/day holds above 2.0** on a 7-day average. Below that, the 21–23 Aug reading was noise rather than trend.

---

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| Deploy `105d9de` via the Vercel **git integration** (never the CLI), then repeat the one-request test against production with literal output | BMAD (dispatched, `term_d47e3a9e`) | In flight |
| Publish the eight C2.4 articles under the 5-minute interim rule, once the test passes | BMAD, same run | Immediately after |
| Build the edge-purge step into the ingest CLI | BMAD | On token arrival |
| Investigate the missing recovery point — options and cost | BMAD | On deploy verification |
| Claim the Setiawangsa venue-query gap | `head-of-seo-content` | Next dispatch |
| Scope or ignore `feat/command-centre-dashboard` in the Vercel integration | BMAD | Opportunistic, same run |

---

## Owner requests

**One thing, and it is the only blocker on the board:**

- **A Vercel API token in the vault**, scoped to the `hellokahwin` project on team `thewednotebook`, with cache-purge permission. It unblocks the edge-purge work (decision 45). Everything else on this list is already moving.

Noted, not requested: the BMAD terminal from the previous run is parked on a *"Teach auto mode about your environment?"* prompt. The work completed before it appeared. Orca refuses input to that particular menu (`agent_prompt_stalled`, a known hazard). It needs a manual Escape if the owner is near the machine; nothing is waiting on it.
