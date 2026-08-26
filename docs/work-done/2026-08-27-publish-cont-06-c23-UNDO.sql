-- UNDO — publish the five C2.3 articles (CONT-06). 27 Aug 2026.
-- Written BEFORE the first write. Companion prose: 2026-08-27-publish-cont-06-c23-UNDO.md
--
-- Pre-write state, 2026-08-26T17:20:25.409Z UTC (prestate.txt/json in EVIDENCE):
--   articles 69 (69 published) · media 911 · inspire_tags 90
--   jsonb_typeof(content) = object for all 69, zero string rows
--   none of the five target slugs present · P2 hantaran-mas-kahwin published = 21
begin;

-- 1. Media FIRST. media.original_article_id is ON DELETE SET NULL, not
--    CASCADE: once the articles are gone these rows can no longer be found.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array[
    'gubahan-hantaran-simple',
    'hantaran-tema-warna',
    'hantaran-coklat',
    'hidden-hantaran',
    'hantaran-tempah-atau-buat-sendiri'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage, article_category_redirects, article_edit_locks,
--    dynamic_block_rules.
delete from articles
where slug = any(array[
  'gubahan-hantaran-simple',
  'hantaran-tema-warna',
  'hantaran-coklat',
  'hidden-hantaran',
  'hantaran-tempah-atau-buat-sendiri'
]);

-- 3. The 6 tags this run creates. gubahan-hantaran, dulang-hantaran,
--    persiapan-kahwin and bajet-kahwin are DELIBERATELY ABSENT — they pre-date
--    this run (verified in prestate) and belong to live articles.
delete from inspire_tags where slug = any(array[
  'hantaran-simple',
  'tema-hantaran',
  'hantaran-coklat',
  'hantaran-makanan',
  'hidden-hantaran',
  'kotak-hantaran'
]);

commit;
