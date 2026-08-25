# UNDO — 2026-08-26 edge-purge proof probe

**Written BEFORE the write, as production has no recovery point**
(`pitr_enabled=false`, zero platform backups). Everything this run puts into
production is listed here by exact identifier, and removing every item on the
list returns production to its prior state.

**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-edge-purge-on-ingest.md`
**Scope of the write:** ONE throwaway article, ingested to prove that the pillar
page is correct on the FIRST request after a publish. It is deleted in the same
session. Nothing else is written.

## The one thing written

| Field | Value |
|---|---|
| slug | `probe-edge-purge-20260826` |
| URL | `https://hellokahwin.com/artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826` |
| pillar | `P5` → `pelamin-kad-cenderahati` |
| cluster | `C5.4` → `doorgift-bunga-telur-hadiah` |
| status | `published` |
| author | `ianng@theweddingnotebook.com` |
| tags | none — deliberately empty, so no `inspire_tags` row is created |
| body images | none — the cover is the only image |

## Rows it creates

1. `articles` — 1 row, `slug = 'probe-edge-purge-20260826'`
2. `article_categories` — 2 rows, to the pillar and the cluster above
3. `media` — 1 row, the cover, `original_article_id` = the article's id
4. `media_article_usage` — 1 row joining the two

No `article_tags` and no `inspire_tags`, because the file declares no tags.
No row anywhere else is read-modify-written, so nothing pre-existing changes.

## Objects it creates in R2

Everything under the prefix `inspire/probe-edge-purge-20260826/` in the
`R2_BUCKET_NAME` bucket — the cover plus its generated variants and named
crops. The prefix is unique to this slug and contains nothing else.

## The undo

Run `2026-08-26-edge-purge-on-ingest-UNDO.sql` against production, then delete
the R2 prefix. The SQL is ordered child-first so no foreign key blocks it, and
every statement is scoped by the slug — there is no statement in it that could
touch another article.

Verification that the undo worked, in this order:

1. `select count(*) from articles where slug = 'probe-edge-purge-20260826'` → `0`
2. `GET https://hellokahwin.com/artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826` → `404`
3. the pillar page and `/sitemap.xml` no longer mention the slug
