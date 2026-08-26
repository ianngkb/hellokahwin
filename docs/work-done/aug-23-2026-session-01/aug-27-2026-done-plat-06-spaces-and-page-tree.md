# Done — PLAT-06 — Spaces and the page tree: browse the document store like Confluence

**Item:** PLAT-06, sprint 02, platform, 5pt.
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-plat-06.md`
**Executed:** 27 Aug 2026 (KL), in the orca worktree
`C:/Users/Ian Ng/orca/workspaces/buddy-plat05`, on
`feat/plat-05-document-store` — the worktree PLAT-05 was built in, reused on the
brief's instruction.
**State:** **built and committed at `de42dce` + the retrospective edits; the
migration is applied to the production database; NOT merged to `origin/main`
and NOT deployed.** The brief asked for build + log + retrospective, not a ship.

**Full run log, with the mandatory retrospective:**
`buddy/logs/2026-08-27-plat-06-spaces-and-page-tree.md`.

---

## Read this first: two things the CEO needs to decide

**1. The tracker's DoD and the brief's DoD are not the same sentence.**

The brief presents its DoD as *"verbatim — the bar, and it is NOT narrowed"*.
It is not verbatim. The tracker (`sprint get PLAT-06`) says:

> **buddy.ian.ng/docs** lists every space with counts and last sync. … **Proof
> from the response body with a negative control.**

The brief's copy drops the domain and drops the proof clause. Those two dropped
phrases are the entire difference between "built" and "shipped and proven", and
they are exactly what the brief's own *"What SHIPPED means"* section is about.
I am reporting against the **tracker's** version, because that is the one that
was written when the sprint started.

**2. Against the tracker's version, this item is NOT done, and I have left it
`in_progress`.** Rewriting the DoD to fit what was achieved is the one thing
that makes velocity a lie — the brief says so, and I am not going to do it.

What is missing is not functionality. It is proof. `/docs` is behind Google
sign-in; I cannot sign in without entering the owner's credentials, and I will
not. The repo's own e2e suite already concedes this ground —
`apps/web/e2e/v2-smoke.spec.ts` lists *"Auth'd UI flows"* under **Out of scope
(operator runs these by hand)**.

---

## CLAIM + EVIDENCE, per DoD clause

### 1. "Every space listed with counts and last sync"

**Claim:** built. `/docs` now leads with a card per space — name, document
count, last sync, description — each card a link into that space.

**Evidence (data, from the production database):**

```
space        root                                              document_count  last_synced_at
buddy        C:/Users/Ian Ng/orca/workspaces/buddy-plat05       198             2026-08-26T17:08:55Z
hellokahwin  C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin  254        2026-08-26T17:08:55Z
sprints      db:sprints.retro                                  1               2026-08-26T17:08:55Z
```

**Evidence (route exists and compiles):** `turbo build` → `ƒ /docs`.

**Not evidenced:** the rendered card grid. See "the gap" below.

### 2. "A space opens to a navigable tree derived from origin paths"

**Claim:** built. `/docs/<space>` renders the page tree; `/docs/<space>/<dir>`
is a folder view on the same catch-all route.

**Evidence:** the tree is `buildDocTree()` over `documents.path` — **there is no
ordering column, no parent pointer and no folder row anywhere in the schema**,
which is what the DoD's word *derived* is protecting. 21 unit tests cover the
shape: directories before documents, sort by path segment (so dated log
filenames stay chronological, not scrambled by title), counts rolled up every
ancestor, `subtreeAt` returning `null` — never `[]` — for a path that is a
document or does not exist, so a genuine 404 stays distinguishable from an
empty folder.

**Evidence (routes):** `ƒ /docs/[space]` and `ƒ /docs/[space]/[...path]`.

### 3. "A document shows breadcrumbs and a 'Referenced by' list"

**Claim:** built. Breadcrumbs are derived from the path. "Referenced by" reads
`document_links`, a new table the sync materialises — it is the one piece of
structure no single document can know, because no document knows who points at
it.

**Evidence (the graph that now exists in production):**

```
edges by space:   buddy       35 edges  17 sources  21 targets
                  hellokahwin 42 edges  13 sources  33 targets
most-referenced:  buddy/docs/design-system/components.md                6
                  buddy/_bmad-output/planning-artifacts/epics-v2.md     3
                  hellokahwin/docs/plans/aug-23-2026-session-01/
                    aug-23-2026-plan-malay-topical-authority.md         3
dangling edges (must be 0): 0
```

**Evidence (the sync does not churn).** Fingerprint = `md5` over every
document's `updated_at`, taken before and after a full extra sync run — DB
column against itself, never against this machine's clock:

```
before: documents {"docs":453,"fingerprint":"2aaf503b0090cf1193c25de7d1add80d"}
        links     {"edges":77,"sources":30,"fingerprint":"c1a6caadbf7219ee8f98ab1bcd0b0b66"}
after:  documents {"docs":453,"fingerprint":"2aaf503b0090cf1193c25de7d1add80d"}
        links     {"edges":77,"sources":30,"fingerprint":"c1a6caadbf7219ee8f98ab1bcd0b0b66"}
        run output: 0 document(s) relinked, 0 edge(s) written; 0 written this run
```

Byte-identical. PLAT-05's promise that a re-run moves no `updated_at` survives.

### 4. "A relative link to a synced document navigates in-app; a link to something not in the store renders as marked plain text and produces NO 404"

**Claim:** built, and this one was designed against the real corpus rather than
guessed.

**Evidence (measured before the design was fixed):**

```
buddy:       198 documents, 362 distinct links
             doc 35   dir 1   external 2    anchor 0    unresolved 324
hellokahwin: 252 documents, 287 distinct links
             doc 42   dir 0   external 26   anchor 13   unresolved 206
```

Most of buddy's unresolved links point at **source files**
(`../../apps/web/lib/google/calendar-service.ts#L179`). Most of hellokahwin's
point at the **live website** — `/artikel/hantaran-mas-kahwin` alone appears 32
times. Neither is a document in the store.

Those all render as **marked plain text with no `href` attribute at all**. That
is the mechanism, and it is deliberate: no href means the browser has no address
to try, so there is nothing that *can* 404. A greyed-out anchor would still be
an anchor.

**34 unit tests** cover the classifier, including the two cases most likely to
be got wrong: a Windows path (`C:/…`) is *unresolved*, not *external* — a drive
letter parses as a URL scheme — and a `/artikel/…` root path is *unresolved*,
because a space root is not a web root.

**Also caught here:** every `[foo](bar)` inside a code fence would have become a
real backlink. This corpus is briefs and run logs, which are mostly code
samples. The extractor blanks fenced blocks and inline code first.

**And the defect that blanking caused, found late and only from the data.**
Blanking inline code also blanks it *inside a link label*, and this corpus
writes its links as ``[`components.md:90`](../../docs/…#L90)``. Every one of the
six backlinks on `components.md` came back with an empty reason. Nothing failed
— 52 tests green, build green, lint clean, zero dangling edges — because every
test I had written used a plain `[the spec]` label and the corpus does not.

Found by querying the actual rows the page would render. Fixed by matching on
the masked body and reading the captures out of the original by the match's own
indices. The re-sync is its own proof that change detection works on something
real: **16 documents relinked, `total: 0 written this run`** — the labels
changed, the documents did not, and no `updated_at` moved. The corrected rows:

```
from_path                                              href                        link_text
.../spec-design-system-calendar-surfaces.md   ../../docs/…/components.md#L90    components.md:90
.../spec-design-system-planning-pages.md      ../../docs/…/components.md#L212   components.md:212
.../spec-design-system-public-surfaces.md     ../../docs/…/components.md#L449   components.md:449
.../spec-design-system-settings-crm.md        ../../docs/…/components.md#L323   components.md:323
.../spec-fix-server-component-link-crash.md   ../../docs/…/components.md#L97    components.md:97
docs/design-system/README.md                  components.md                     components.md
```

### 5. "Proof from the response body with a negative control" — **NOT MET**

I cannot produce it, and I am not going to imply otherwise.

- The Chrome extension was not connected this session.
- Orca's browser has one profile, with no buddy session — `/docs` redirected to
  `/login`.
- Signing in means entering the owner's Google credentials. Out of bounds.
- On this app a status code proves nothing anyway: `/docs`, `/sprints` and
  `/definitely-not-a-real-route` all redirect identically when signed out.

**What I did add**, so the next person is not stuck the same way: the three
`/docs` routes are now in the Playwright auth-gated smoke cohort (20/20 pass
against a local server) — which proves *no 5xx*, and nothing about content —
and the e2e spec now names the durable fix in its scope note: **a Playwright
`storageState` captured once from a signed-in session** would turn every row in
the table below into an assertion, for this item and every future one.

---

## What the owner needs to look at (5 minutes)

Sign in, then open these. Each row names something **only the real page
contains**, so a redirect or a blank cannot be mistaken for a pass.

| URL | What only the real page contains |
| --- | --- |
| `/docs` | a card grid: `buddy 198`, `hellokahwin 254`, `sprints 1`, each with a "synced …" line |
| `/docs/buddy` | the page tree — `docs`, `logs`, `packages` as expandable folders with counts |
| `/docs/buddy/docs/design-system` | a folder view, breadcrumbs `Documents › buddy › docs › design-system` |
| `/docs/buddy/docs/design-system/components.md` | breadcrumbs **and a "Referenced by" list with exactly 6 entries** |
| `/docs/hellokahwin/docs/plans/aug-23-2026-session-01/aug-26-2026-brief-plat-06.md` | this item's brief, with its `/artikel/…` links as dotted-underlined **plain text**, not clickable |
| `/docs/buddy/no-such-folder-zzz` | **a 404** — the negative control |

Currently reachable only at `http://localhost:10002` (port 10000 is held by the
main checkout's session) and only after this merges for `buddy.ian.ng`.

---

## What was NOT built, and why

- **Sprint cross-links.** The spec's matrix has a row: *"Document linked to
  `RISK-01` → its page shows the item, and the item shows it."* That is a
  document↔tracker graph, it is not in either DoD, and the spec is still
  `draft-awaiting-round-table`. Not started. Naming it so it is not mistaken for
  an oversight.
- **A per-space site base URL.** It would turn hellokahwin's 206 `/artikel/…`
  links from marked plain text into working links to the live site. Genuinely
  useful, explicitly *not* what the DoD asks for, and inventing it would have
  been widening the item. Worth its own tracker item.
- **The ship.** Not merged, not deployed. `/imdone` + `/buildit` own that.

## Numbers

| | |
| --- | --- |
| New pure-logic tests | 55 |
| Workspace tests, all green | 1332 across 87 files |
| Lint | clean |
| Production build | 3/3 tasks, all three `/docs` routes emitted |
| Migration | applied, and re-applied to prove it is re-run-safe |
| Documents in the store | 453 |
| Link edges materialised | 77, from 30 source documents, 0 dangling |
| Documents in this repo whose links changed | 13 relinked, 42 edges |

## Retrospective edits made this run

Four files, all committed:

- **`buddy/CLAUDE.md`** — a worktree handed to you can still be written to by
  the dispatcher (it happened mid-run: something merged `origin/main` into this
  branch and only the HEAD sha in a `docs:sync` line gave it away); and
  `npx playwright install chromium` is a separate step after `pnpm install`.
- **`buddy/CLAUDE.md`** — `docs:sync` syncs and stamps *the checkout it runs
  from*; run it from the wrong tree and 198 documents churn silently.
- **`buddy/scripts/docs-sync.ts`** — that warning again, at the one line that
  causes it.
- **`buddy/apps/web/e2e/v2-smoke.spec.ts`** — the auth'd-UI verification gap and
  its `storageState` fix, named where the next person will hit it.
