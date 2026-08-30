-- UNDO — publish the eight C2.5 articles (CONT-08). 26 Aug 2026.
-- Written BEFORE the first write. Companion prose: 2026-08-26-publish-cont-08-c25-UNDO.md
--
-- Pre-write state, 2026-08-26T15:29:09.924Z UTC:
--   articles 61 (61 published) · media 884 · inspire_tags 76
--   jsonb_typeof(content) = object for all 61, zero string rows
--   none of the eight target slugs present
begin;

-- 1. Media FIRST. media.original_article_id is ON DELETE SET NULL, not
--    CASCADE: once the articles are gone these rows can no longer be found.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array[
    'nisbah-hantaran',
    'hantaran-kahwin-5-balas-7',
    'hantaran-tunang-3-balas-5',
    'bilangan-dulang-hantaran-ganjil',
    'duit-hantaran-kahwin',
    'cara-tetapkan-duit-hantaran',
    'adat-hantaran-berbeza-negeri',
    'hantaran-wajib-atau-adat'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage, article_category_redirects, article_edit_locks,
--    dynamic_block_rules.
delete from articles
where slug = any(array[
  'nisbah-hantaran',
  'hantaran-kahwin-5-balas-7',
  'hantaran-tunang-3-balas-5',
  'bilangan-dulang-hantaran-ganjil',
  'duit-hantaran-kahwin',
  'cara-tetapkan-duit-hantaran',
  'adat-hantaran-berbeza-negeri',
  'hantaran-wajib-atau-adat'
]);

-- 3. The 14 tags this run created. hantaran, dulang-hantaran, adat-perkahwinan
--    and bertunang are DELIBERATELY ABSENT — they pre-date this run and belong
--    to live articles.
delete from inspire_tags where slug = any(array[
  'nisbah-hantaran',
  'hantaran-kahwin-5-balas-7',
  'hantaran-tunang-3-balas-5',
  'hantaran-tunang',
  'bilangan-dulang-hantaran',
  'duit-hantaran-kahwin',
  'duit-hantaran',
  'mas-kahwin',
  'wang-hantaran',
  'jumlah-duit-hantaran',
  'merisik',
  'adat-hantaran',
  'hantaran-wajib-atau-adat',
  'hukum-hantaran'
]);

commit;
