# Undo record — publishing the eight C2.4 articles

**Written BEFORE any production write.** 24 Ogos 2026.
Production carries `pitr_enabled=false` and zero platform backups; the R2
recovery point is being built separately and does not exist yet. This file and
`A1-before-state.json` beside it are the only way back.

Target: `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`.

---

## 1. Rows this run CREATES — seven new slugs

Every one is new; none existed before this run. Deleting these seven returns the
database to its prior state exactly.

```
apa-itu-mas-kahwin
mas-kahwin-melebihi-kadar-minimum
mas-kahwin-pahang-negeri-sembilan
mas-kahwin-kelantan-terengganu
mas-kahwin-johor
mas-kahwin-perak
mas-kahwin-sabah-sarawak
```

### Undo for the seven

```sql
-- Verify first. Expect exactly 7 rows, all created today.
select id, slug, status, created_at from articles
where slug in ('apa-itu-mas-kahwin','mas-kahwin-melebihi-kadar-minimum',
               'mas-kahwin-pahang-negeri-sembilan','mas-kahwin-kelantan-terengganu',
               'mas-kahwin-johor','mas-kahwin-perak','mas-kahwin-sabah-sarawak');

begin;
  create temp table doomed as
    select id from articles where slug in (
      'apa-itu-mas-kahwin','mas-kahwin-melebihi-kadar-minimum',
      'mas-kahwin-pahang-negeri-sembilan','mas-kahwin-kelantan-terengganu',
      'mas-kahwin-johor','mas-kahwin-perak','mas-kahwin-sabah-sarawak');

  delete from media_article_usage where article_id in (select id from doomed);
  delete from article_tags        where article_id in (select id from doomed);
  delete from article_categories  where article_id in (select id from doomed);
  delete from media               where original_article_id in (select id from doomed);
  delete from articles            where id in (select id from doomed);
commit;
```

Then drop the content caches, or the site keeps serving the deleted pages:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

R2 objects for the covers live under `inspire/<slug>/<stamp>-*-kad-tajuk.*`.
They are new keys, orphaned by the delete above, and cost storage only.

---

## 2. The row this run UPDATES — A1, in place

`mas-kahwin-ikut-negeri` is live and ranking (position 11–14, ~300 impressions
over 90 days). It is **updated, never duplicated**: same id, same slug.

Full pre-write row: **`A1-before-state.json`** (article row, its two category
links, its four media rows, its three usage rows).

| Field | BEFORE | AFTER this run |
|---|---|---|
| `id` | `b1484478-a5b5-44ce-85c2-10f2c2a32d0c` | unchanged |
| `slug` | `mas-kahwin-ikut-negeri` | unchanged |
| `title` | Mas Kahwin Ikut Negeri: Negeri Mana Paling Tinggi & Paling Rendah? | Mas kahwin ikut negeri 2026: kadar minimum setiap negeri |
| `primary_category_id` | `1d81e279…` (`idea-dan-nasihat`) | `97473db…` (P2 `hantaran-mas-kahwin`) |
| **canonical URL** | `/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri` | `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` |
| `published_at` | `2025-11-23T21:56:36.000Z` | **preserved** — carried in the file's `publishedAt` |
| `author_id` | `hellokahwin-editorial` | unchanged |
| `authorship` | `human` | `ai` |
| `review_status` | `pending_review` | `pending_review` |
| `status` | `published` | `published` |
| `content` | 73 nodes, 24,056 bytes | replaced with the reviewed A1 body |

**The URL does change.** The brief said it would not; re-parenting into P2 · C2.4
necessarily moves it, because article URLs are `/artikel/{categorySlug}/{slug}`.
The move is safe and is the standard way to move a URL: the article route
compares the requested category against the article's own and issues a permanent
redirect when they differ
(`src/app/(public)/artikel/[category]/[slug]/page.tsx:503`), so the old path
keeps resolving and carries its ranking signal forward. The slug — the part every
external link and the legacy root permalink use — is untouched.

### Undo for A1

`A1-before-state.json` holds every column. To restore:

```sql
update articles set
  title               = <before.title>,
  content             = <before.content>::jsonb,
  meta_description    = <before.meta_description>,
  cover_image_url     = <before.cover_image_url>,
  cover_image_variants= <before.cover_image_variants>::jsonb,
  cover_image_smart_crops = <before.cover_image_smart_crops>::jsonb,
  cover_image_focal_point = <before.cover_image_focal_point>::jsonb,
  cover_image_detection_data = <before.cover_image_detection_data>::jsonb,
  primary_category_id = '1d81e279-c4d0-4daa-a870-f57f752cbe87',
  published_at        = '2025-11-23T21:56:36.000Z',
  authorship          = 'human'::article_authorship,
  is_ai_generated     = false,
  updated_at          = now()
where id = 'b1484478-a5b5-44ce-85c2-10f2c2a32d0c';

-- and remove the two pillar-architecture links this run added
delete from article_categories
where article_id = 'b1484478-a5b5-44ce-85c2-10f2c2a32d0c'
  and category_id in (select id from inspire_categories where pillar_code in ('P2','C2.4'));
```

A1's two legacy WordPress category links (`idea-dan-nasihat`, `perancangan`) are
**not touched by this run** — ingest only reconciles categories that carry a
`pillar_code`, deliberately, so a legacy category stays somebody else's decision.

---

## 3. What is NOT touched

- No other article's parent category. The URL migration for the rest of the site
  is a separate job.
- No `redirects` table row.
- No category, tag or profile row.
- No existing R2 object. Every upload is a new timestamped key, so nothing served
  under `max-age=31536000, immutable` is overwritten.
