# Evidence - SEO-06 re-file, 26 Ogos 2026

Read in order. Times are UTC.

| File | What it is |
|---|---|
| `read-state.mjs` | Read-only census of the categories, the two articles, their links, the P2 precedent shape and both redirect tables. Run before the write. |
| `00-gsc-before.json` | GSC before-readings for both old URLs (pages report, per-query breakdown, URL inspection), the after-move inspection, and the sitemap resubmission. |
| `refile.mjs` | The transaction. Guarded on id + slug + previous primary; asserts 2 updates / 2 deletes / 4 inserts or rolls back. |
| `01-refile-commit.txt` | Its output: `COMMITTED {"updated":2,"deleted":2,"inserted":4} 2026-08-26T14:47:51.475Z` and the after-state. |
| `02-origin-revalidate.txt` | `POST /api/cron/revalidate-content` response, HTTP 200. |
| `purge.mts` + `03-edge-purge.txt` | The eleven-path edge purge and its HTTP 200. |
| `04-live-after.txt` | First live verification at 14:48:33Z: hop trace, pillar links, canonicals, up-links, old hub, sitemap. Contains the one bounced sample. |
| `05-hop-samples.txt` | Six rounds, 3 s apart, per-hop, no `-L`: 24 of 24 clean. |
