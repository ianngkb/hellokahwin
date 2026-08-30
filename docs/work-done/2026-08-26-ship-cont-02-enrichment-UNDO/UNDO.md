# Undo — CONT-02 ship, 26 Ogos 2026

Captured **before** the first write and dry-run-proved against all 23 rows.
`before.json` holds the complete pre-write state:

| Table | Rows |
|---|---|
| `articles` | 23, all 22 columns the ingest upsert rewrites |
| `article_categories` | 46 |
| `article_tags` | 79 |
| `media_article_usage` | 72 |
| `media` | 80 |

## Restore

```
pwsh "C:\Users\Ian Ng\Documents\Code\buddy\skillcentral\skills\tokens\vault.ps1" `
  run supabase.hellokahwin-dbpass -EnvVar PGPASSWORD -Cmd pwsh,"-NoProfile","-Command", `
  'npx tsx docs/work-done/2026-08-26-ship-cont-02-enrichment-EVIDENCE/undo-restore.mts --db "$DB" --file docs/work-done/2026-08-26-ship-cont-02-enrichment-UNDO/before.json --commit'
```

Dry run is the default; `--commit` writes, in one transaction. Afterwards re-run
the revalidate and the edge purge, or the origin will be correct and the CDN
copy stale for up to five minutes on a pillar and an hour on the sitemap.

**It restores** `content`, the cover columns, `published_at`, `status`,
`review_status`, `authorship`, both join tables, and the 72
`media_article_usage` rows exactly as captured — so the 72 rows this run deleted
as superseded come back, and the ones it added go.

**It deliberately does NOT delete the `media` rows this run created**, or their
R2 objects. An orphan media row is invisible to a reader; a deleted one takes an
R2 object with it and cannot be undone. Unreferencing is enough. Same call the
26 Aug card purge made.

## The file-side changes undo separately

- **25 drafts** — delete the four-line `publishedAt:` comment block and the
  `publishedAt:` line under `status:` in each. Nothing else in those files
  changed; the body is byte-identical, verified through `parseArticleFile`.
- **`docs/asset-register/asset-register.csv`** — restore
  `asset-register.csv.before-cont02-ship`, kept beside it.
- **`aug-23-2026-workflow-content-production.md`** — Stage 7 and Stage 9b edits,
  additive; remove the added blocks.
