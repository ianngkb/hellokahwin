# Undo — SEO-02: the internal linking pass (26 Ogos 2026)

Restores the body of every article SEO-02 changed to its exact pre-write state.

## What was written

One transaction, 26 Ogos 2026, against production
(`nyidzlupgmyyazhyykuk`, session pooler). **45 rows**, `content` and
`updated_at` only:

- 127 internal link marks repaired — `rel="noopener noreferrer nofollow"
  target="_blank"` → `rel="noopener" target="_self"` (79 of them were nofollow)
- 15 in-prose link anchors added to text already on the page
- 53 entries appended to existing "Artikel Lain:" related-reading blocks
- 1 self-link removed from `majlis-kahwin`

**`published_at` was never written**, so nothing here restamped a publish date
and the restore does not need to put one back.

## Files

- `content-before.json` — the complete pre-write `content` for all 45 rows,
  keyed by article id. Written **before** the transaction opened.
- `restore.mjs` — the restorer. Dry run by default.

## How to restore

```
cd <hellokahwin-site worktree>
pwsh "$HOME/.claude/skills/tokens/vault.ps1" run supabase.hellokahwin-dbpass \
  -EnvVar PGPASSWORD pwsh -c "node <this-dir>/restore.mjs <this-dir>/content-before.json"
```

Dry run first — it prints the 45 slugs and writes nothing. Add `--commit` to
apply. Verified as a dry run on 26 Ogos: `45 rows to restore`.

**Then drop both caches**, or the site keeps serving the linked version:

1. `POST https://hellokahwin.com/api/cron/revalidate-content` with
   `authorization: Bearer $CRON_SECRET` (origin — the Next data cache).
2. Purge the Vercel edge for the affected paths (`purgeVercelEdge`). Batches of
   16, max 5 requests/minute — see `src/lib/cache/edge-purge.ts`.

## What this does NOT undo

The code changes in `ianng89/pillars-ingest-redirects` commit `7c63287`
(`internal-links.ts`, the edge-purge batching fix). Those are a separate branch
and are **not deployed**; revert them with git if that is also wanted.
