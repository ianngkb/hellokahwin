# CONT-09 undo — cover re-selection, 26 Aug 2026

Captured BEFORE any production write, per the standing rule. Restores 19
articles' covers and 7 media rows' focal points and smart crops to exactly the
state production was in at 2026-08-26.

## What is here

| File | What it holds |
|---|---|
| `articles.before.json` | All six `cover_image_*` columns for the 19 articles, plus `updated_at` |
| `media.before.json` | `focal_point`, `smart_crops`, `variants` for the 19 chosen media rows |
| `plan2.json` | The 19 `slug → filename → mediaId` decisions the run applied |
| `fpover.json` | The 7 focal-point overrides, by slug |
| `undo-restore.mjs` | The restore itself — dry run by default, `--commit` to write |

## The R2 half, and why it is separate

The focal-point regeneration overwrites crop objects **at their existing keys**
(`generateSmartCrops` versions the URL, not the key). Restoring the JSON alone
would leave the OLD url pointing at the NEW image — worse than either state. The
28 pre-change crop objects are therefore backed up as bytes, in R2, not in git:

- bucket `hellokahwin-assets`
- prefix `undo/cont-09-cover-standard/2026-08-26/crops`
- 28 objects, 15,305,178 bytes, named `<mediaId>--<cropName>.webp`

## To restore

```
cd <site worktree>
node .tmp-cont09-undo-restore.mjs            # dry run
node .tmp-cont09-undo-restore.mjs --commit   # write
```

`undo-restore.mjs` reads `.tmp-cont09/undo/crops/`. If that scratch directory is
gone, pull the 28 objects back out of the R2 prefix above into it first — the
filenames are the keys.

Then drop the caches, or the site keeps serving the reverted-away pages:

```
curl -X POST -H "authorization: Bearer $CRON_SECRET" \
  https://hellokahwin.com/api/cron/revalidate-content
```
