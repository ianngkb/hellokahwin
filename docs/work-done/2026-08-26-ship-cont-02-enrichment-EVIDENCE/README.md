# Evidence — CONT-02 ship, 26 Ogos 2026

Every number in `../2026-08-26-ship-cont-02-enrichment.md` was produced by
something in here. Secrets are injected by `vault.ps1 run`, so no script carries
a connection string and none is recorded in any transcript.

## The numbers

| File | What it is |
|---|---|
| `audit-BEFORE.json` | live-vs-draft image state of all 61 published articles, before the write |
| `audit-AFTER.json`, `audit-AFTER.txt` | the same, after |
| `plan.json` | the planned document vs live, block by block, for all 23 targets — the proof no prose or link was lost |
| `ingest-dryrun.txt` | 23 dry runs against production, 0 failures |
| `ingest-commit.txt` | the 23 committed runs, exit 0, each with its edge purge |
| `verify.txt` | `published_at`, `status` and URL unchanged on all 23 |
| `livesweep.txt`, `livesweep.json` | all 33 pages + 10 navigation URLs fetched; own-image counts against the database |
| `imgaudit-after2.txt` | `pnpm audit:images --live` — 61 articles, 61 pages, zero text cards, PASS |
| `links-after.txt`, `linkgraph-AFTER-CONT02.json` | the link graph after the write; diffed to 0 edges lost vs SEO-02 |
| `draftaudit.txt` | the new gate, PASS, exit 0 |
| `failcase.txt` + `failcase-borang-nikah.md` | the same gate FAILING, exit 1, on a scratch draft declaring one image more than production serves |

## The scripts

| File | What it does |
|---|---|
| `audit.mts` | the before/after audit (`audit-BEFORE/AFTER.json`) |
| `plan.mts` | reproduces ingest's pipeline locally and diffs it against live |
| `stamp.mts` | writes each article's real `published_at` into its draft |
| `undo-capture.mts` / `undo-restore.mts` | the undo, captured before the write |
| `ingest.ps1` | the 23-file run; `HK_MODE=dry` or `commit` |
| `verify.mts` | dates, status and URLs after the write |
| `stale.mts` | the 72 superseded `media_article_usage` rows |
| `register.mjs` | the asset-register reconciliation |
| `livesweep.mjs` | the reader's view |
| `audit-draft-vs-live.mts` | a copy of what shipped as `scripts/audit-draft-vs-live.mts` (`pnpm audit:drafts`) |

## Reproducing the gate's failure

```
pnpm --silent audit:drafts --db "$DB" --drafts <this-folder-with-only-failcase-borang-nikah.md>
FAIL — 1 published article(s) are behind their draft, 1 image(s) in total.
exit 1
```

The scratch draft declares `S-akad-ijab-qabul-mylifestory.jpg` on `borang-nikah`,
which production does not serve. It was never ingested and exists only to make
the gate fail once where someone can see it.
