# Brief — Sprint 02 — RISK-06 + RISK-04: make publishing reach Google, and stop serving year-old pages

**Status:** APPROVED — executing. Sprint 02 is in progress.
**Repo:** the SITE worktree — `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Dispatch mode:** `bypassPermissions` (production data, GSC credentials, Vercel config).
**Production database CRUD is granted.** Destructive operations with no recovery
path still stop and come back to the CEO.

## Why these two are ONE brief

They are the sprint's gate and they compose. RISK-06's own definition of done
says so: *"this COMPOSES WITH RISK-04, do not build two purge paths."* Ingest is
the place both land. Two agents in this worktree would also collide — it is a
single git checkout, and a second agent's `git checkout` silently relocates the
first one's HEAD.

**Do RISK-06 first.** It is roughly a one-header change and it protects
everything else this sprint ships, including every title and cover.

---

## RISK-06 — stale-while-revalidate is set to 365 days — cap it (3pt)

### Why (verbatim from the tracker)

Found by the SEO review, CONFIRMED by the CEO against production. Every article page ships `Cache-Control: s-maxage=600, stale-while-revalidate=31535400` — 365 DAYS of stale-serving. Verified live: mas-kahwin-ikut-negeri returned X-Vercel-Cache STALE at Age 787, dewan-kahwin STALE at Age 575, both past the 600s freshness window. The reviewer caught six distinct pages served from that window carrying the SITE-DEFAULT HOMEPAGE TITLE, no canonical and no og tags, while their H1 and JSON-LD were correct; each self-healed once the request triggered revalidation. The CEO could NOT reproduce it afterwards — six consecutive fetches all HIT with the correct title — because those earlier requests had already warmed the cache. Reported as EXPOSURE, not confirmed loss: nobody has proven Google indexed a stale shell. The mechanism is real and its blast radius is every page, which is why it outranks every title we ship this sprint.

### Definition of done (verbatim — this is the bar, and it is not narrowed)

stale-while-revalidate capped at hours rather than a year, with the number justified against how often content actually changes. Ingest purges the edge for affected paths — this COMPOSES WITH RISK-04, do not build two purge paths. Show the header before and after on three pages. Then ATTEMPT TO REPRODUCE the stale-shell symptom deliberately before fixing: request a cold path repeatedly and capture title, canonical and og tags on a STALE response. If it cannot be reproduced, say so plainly and ship the header cap on the mechanism alone. DO NOT report the symptom as fixed if it was never reproduced.

---

## RISK-04 — Publishing tells Google — resubmit the sitemap on ingest (3pt)

### Why (verbatim from the tracker)

Every content point in this sprint is worthless until this closes. NOTE: the Indexing API is restricted to JobPosting and BroadcastEvent — using it for articles is a policy violation. The CEO proposed it in the meeting and withdrew it. The sanctioned mechanism is sitemap resubmission with accurate lastmod.

### Definition of done (verbatim — this is the bar, and it is not narrowed)

Ingest an article; the same run resubmits the sitemap through the GSC API and prints the literal API response. Verified by: GSC sitemap last_downloaded moves past the ingest timestamp, AND a URL inspection of the new article leaves 'URL is unknown to Google' within 48h — show the before and after inspection verbatim. lastmod on the new entry equals the ingest date, not the build date. Re-run ingest on an unchanged article and show the sitemap is NOT needlessly resubmitted.

---

## What the CEO already verified, so you do not repeat it

- `curl -sI` on two article pages returns `Cache-Control: s-maxage=600,
  stale-while-revalidate=31535400` and `X-Vercel-Cache: STALE` — at `Age: 787`
  on `mas-kahwin-ikut-negeri` and `Age: 575` on `dewan-kahwin`. The header is
  real and pages are being served stale right now.
- The CEO could **not** reproduce the wrong-title stale shell afterwards: six
  consecutive fetches all returned `HIT` with the correct title and canonical.
  Its own earlier requests had warmed the cache. **This is why the DoD asks you
  to reproduce deliberately rather than assume.**
- The sitemap holds 78 URLs. GSC last fetched it at **73 URLs on 25 Aug 15:58**.
  Four articles published after that — `sirih-junjung`, `dulang-hantaran`,
  `gubahan-hantaran`, `walimatul-urus` — report `URL is unknown to Google`,
  last crawled `Never`.

## Standing rules that bind this work

- **The Indexing API is NOT to be used.** Google restricts it to `JobPosting`
  and `BroadcastEvent`; using it for articles is a policy violation. The CEO
  proposed it in planning and withdrew it. Sitemap resubmission with an accurate
  `lastmod` is the sanctioned mechanism. If you believe there is a legitimate
  alternative, bring it back rather than using it.
- **`revalidateTag(tag, 'max')` marks STALE, not expired.** `max` is a cacheLife
  profile name — a one-year expiry — not an intensity. This cost a day in
  August. `PURGE_IMMEDIATELY = { expire: 0 }` is the shape that actually drops.
- **`pnpm --silent`, never `pnpm run`,** when a secret would land in argv.
- **Credentials come from the vault only.** Never hardcode, never print one.
  Check `/tokens` before reporting a credential as missing — on 24 Aug the CEO
  escalated a Vercel token that was already in the vault as `vercel.twn`.
- **Record a precise undo before any production write.** There is a recovery
  point now (RISK-01), but a targeted undo is cheaper than a restore. Write it to
  `docs/work-done/` in this worktree and COMMIT it — Sprint 01's undo scripts sat
  untracked on one laptop for two days.
- **Done means SHIPPED.** Merged to master, deployed, and visible on a live URL.
  Committed is not shipped. A green local test is not shipped.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so plainly and name
what would verify it — do not dress an inference up as a measurement.

## When done

Log to `docs/work-done/` in this worktree, then a **`## Retrospective`** section
— Stage 9, mandatory, not optional. Four questions: what did we learn that is not
written down; **which document must change and who owns the edit (name the
file)**; what did we do twice that we should never repeat; what did we nearly
ship and what caught it. **Then make the edit.** A retrospective that names a
file and does not change it has failed.
