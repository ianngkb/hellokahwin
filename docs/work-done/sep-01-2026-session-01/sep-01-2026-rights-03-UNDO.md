# RIGHTS-03 UNDO — putting the two INSTITUTIONAL images back

**Written and pushed BEFORE the first delete**, 01 September 2026.
Pre-write state captured `2026-08-31T17:53:20.113Z` from the production pooler
`aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`.

| | |
|---|---|
| Item | `RIGHTS-03`, Sprint 05, owner `managing-editor` |
| Decision | 167, 30 August 2026 |
| SQL half | [`sep-01-2026-rights-03-UNDO.sql`](sep-01-2026-rights-03-UNDO.sql) |
| Executable | `scripts/rights/rights03-restore.mjs` |
| Gate | `scripts/rights/rights03-verify.mjs` |

## The exact command that restores them

```
node scripts/rights/rights03-restore.mjs --all
```

That is one command because the order inside it is not optional: **objects
first, rows second, cache purge third.** A database row pointing at an R2 object
that no longer exists is a broken image, not a restored one. Run the halves
separately with `--r2` and `--db` if you need to.

Dry-run it first — `--dry-run` prints every PUT and the SQL file it would run,
and touches nothing.

## What comes back, precisely

### Two `media` rows

| id | filename | r2_key |
|---|---|---|
| `b7965eb8-be83-4f93-beb0-bf01272e3514` | `1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland.jpg` | `inspire/tempat-honeymoon-di-malaysia/1787395669518-IN-TempatHoneymoondiMalaysia-CameronHighland.jpg` |
| `584e944f-b781-459b-a6a6-a556d4aeb7f7` | `1787396416141-IN-KursusKahwin-Kelas-1024x576.jpg` | `inspire/kursus-kahwin/1787396416141-IN-KursusKahwin-Kelas-1024x576.jpg` |

Every column is in the `.sql` as the literal value read off the live row —
`variants`, `file_size`, `created_at`, the lot.

### Two `media_article_usage` rows

`293d669f-18cf-4e09-a1ac-cf4d25db785b` and `da113a07-eacb-4a7d-b496-49ee1bbd2169`.
They cascade away with the media rows and are re-inserted with their original ids.

### One `legacy_image_redirects` row, repointed not deleted

`5cc8482a-5e06-4d47-ae65-d82f3234c55d`, for
`/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg`.

This is the one that is easy to miss. That path is a **second public route to the
same file** — the route handler 301s an image request straight to the R2 copy and
an HTML request to the article. The takedown points `image_destination_url` at
the article instead and moves `mapping_tier` to `article_fallback`. The UNDO puts
`filename-exact` and the R2 URL back.

### Two article bodies

| slug | article id | node |
|---|---|---|
| `tempat-honeymoon-di-malaysia` | `3dcdff4c-d262-4333-8a75-4f826a207918` | one `image` node, 270 top-level nodes → 269 |
| `kursus-kahwin` | `1c2e96ae-340f-4226-bb32-363da8cbe3d0` | one `image` node, 74 top-level nodes → 73 |

The `.sql` restores the **whole `content` column** verbatim rather than
re-inserting the node at its old index. An index-addressed insert lands in the
wrong place if anything edited the article in between, and it would do it
silently.

### Six R2 objects, in bucket `hellokahwin-images`

| bytes | md5 / etag | key |
|---:|---|---|
| 8,071,675 | `a31f3f5a292323c23b843b93ced89f4b` | `inspire/tempat-honeymoon-di-malaysia/…-CameronHighland.jpg` |
| 1,147,840 | `00c1607c7886e9dbd3d7c4c482d626d5` | `…-CameronHighland/high.webp` |
| 172,080 | `53f860704f8d6b65becc0964fb94d5fe` | `…-CameronHighland/low.webp` |
| 587,534 | `23ae4c51e934c3807d95912446f65d6c` | `inspire/kursus-kahwin/…-Kelas-1024x576.jpg` |
| 221,546 | `977e6c910ad920e33390909c1ecd0c3f` | `…-Kelas-1024x576/high.webp` |
| 44,472 | `8000c6c3f4af1e312d56e72d0b03ba54` | `…-Kelas-1024x576/low.webp` |

## Where the bytes are, and why they are not in this repo

`data/rights03-institutional-takedown-backup/`, pulled from R2 before the delete,
with `MANIFEST.json` recording the md5 of each object. The restore script
re-checks every md5 against the manifest before it uploads, and compares the
returned ETag afterwards.

**`data/` is gitignored (`.gitignore:16`) and that is deliberate, not an
oversight.** A Getty file and a national newspaper's photograph are exactly what
this item exists to stop the company holding in a place it can be served from.
They stay on the machine, out of the repository and off the CDN. The *record* is
what gets pushed; the pixels do not.

**There is a second, independent source for both originals.** The WordPress
export at `data/hellokahwin-export/media/wp-content/uploads/` holds them, and
both were verified byte-identical to what R2 was serving:

```
2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg   a31f3f5a292323c23b843b93ced89f4b  == R2 ETag
2025/11/IN-KursusKahwin-Kelas.jpg                          23ae4c51e934c3807d95912446f65d6c  == R2 ETag
```

Note the second line. The R2 object is named `…-Kelas-1024x576.jpg` but its bytes
are the **full-size** WordPress original, not the 1024×576 derivative the name
claims — `IN-KursusKahwin-Kelas-1024x576.jpg` on disk is 123,764 bytes and hashes
differently. The importer took the full-size file and kept the sized name. If you
ever restore from the export rather than from the backup directory, take
`IN-KursusKahwin-Kelas.jpg` and not the one whose name matches.

The two `.webp` variants exist only in the backup directory. They are derived and
could be regenerated, but a restore that reproduces them byte-for-byte is worth
more than one that re-encodes.

## After restoring

```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://hellokahwin.com/api/cron/revalidate-content
node scripts/rights/rights03-verify.mjs --before
```

`--before` is the mode that expects both images **present**. It should exit 0
after a restore. Without `--before` it expects them gone.

## And the standing question this UNDO does not answer

Restoring these two files puts the company back into the exposure decision 167
removed. Nothing here is a reason to run it. It exists so that the delete was a
**decision** rather than a one-way door — if the wrong file came down, or the
count was wrong, this is how you get the minute back.
