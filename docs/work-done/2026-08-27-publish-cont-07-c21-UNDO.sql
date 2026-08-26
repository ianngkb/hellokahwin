-- UNDO — publish the seven C2.1 articles (CONT-07). 27 Ogos 2026.
-- Written BEFORE the first write. Companion prose: 2026-08-27-publish-cont-07-c21-UNDO.md
--
-- Pre-write state, captured 2026-08-26T21:37:29.783Z UTC:
--   articles 74 (74 published) · media 938 · inspire_tags 96
--   jsonb_typeof(content) = object for all 74, zero string rows
--   none of the seven target slugs present (target_slugs_present = 0)
--
-- Production runs pitr_enabled=false with zero platform backups. This file is
-- the only way back. Run it whole, inside the transaction, against $DB.
begin;

-- 1. Media FIRST. media.original_article_id is ON DELETE SET NULL, not
--    CASCADE: once the articles are gone these rows can no longer be found.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array[
    'hantaran-untuk-lelaki',
    'barang-hantaran-perempuan',
    'hantaran-kahwin-bajet',
    'barang-hantaran-berguna',
    'adat-hantaran-ikut-keluarga',
    'persiapan-hantaran-kahwin',
    'tempat-beli-hantaran'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage, article_category_redirects, article_edit_locks,
--    dynamic_block_rules.
delete from articles
where slug = any(array[
  'hantaran-untuk-lelaki',
  'barang-hantaran-perempuan',
  'hantaran-kahwin-bajet',
  'barang-hantaran-berguna',
  'adat-hantaran-ikut-keluarga',
  'persiapan-hantaran-kahwin',
  'tempat-beli-hantaran'
]);

-- 3. The 15 tags this run creates. `adat-hantaran` and `dulang-hantaran` are
--    DELIBERATELY ABSENT — both already existed at 21:37Z on 26 Ogos 2026,
--    verified by select against inspire_tags, and belong to live articles.
delete from inspire_tags where slug = any(array[
  'hantaran-untuk-lelaki',
  'barang-hantaran-lelaki',
  'hantaran-kahwin',
  'barang-hantaran-perempuan',
  'hantaran-kahwin-perempuan',
  'hantaran-kahwin-bajet',
  'kos-hantaran-kahwin',
  'barang-hantaran',
  'idea-hantaran',
  'adat-perkahwinan-melayu',
  'persiapan-hantaran',
  'checklist-hantaran',
  'tempat-beli-hantaran',
  'kedai-hantaran',
  'sewa-dulang-hantaran'
]);

commit;

-- After running, re-assert the pre-write state:
--   select count(*) from articles;                                -- expect 74
--   select count(*) from media;                                   -- expect 938
--   select count(*) from inspire_tags;                            -- expect 96
--   select count(*) from articles where slug = any(array[...]);   -- expect 0
--
-- Then purge the edge so readers stop seeing the removed pages:
--   POST https://hellokahwin.com/api/cron/revalidate-content
--   Authorization: Bearer $CRON_SECRET
-- and request /artikel/hantaran-mas-kahwin once, SEQUENTIALLY, to re-warm it.
