-- UNDO — publish the five C2.2 hantaran tunang articles (CONT-05). 27 Aug 2026.
-- Written BEFORE the first write. Companion prose: 2026-08-27-publish-cont-05-c22-UNDO.md
--
-- Pre-write state, captured 2026-08-26T21:35:06.639Z UTC (= 05:35 MYT 27 Ogos):
--   articles 74 (74 published) · media 938 · inspire_tags 96
--   jsonb_typeof(content) = object for all 74, zero string rows
--   P2 hantaran-mas-kahwin published: 26
--   sitemap.xml <loc> count: 91
--   none of the five target slugs present
--
-- Undo here is a DELETE, not a restore: all five slugs were absent at capture
-- time. This run's SECOND pass uses --update, but only against rows this same
-- run created minutes earlier, so the delete is still complete and correct.
-- If pass ONE ever refuses with "an article already exists at slug", STOP:
-- the assumption above no longer holds and this undo is wrong.
begin;

-- 1. Media FIRST. media.original_article_id is ON DELETE SET NULL, not
--    CASCADE: once the articles are gone these rows can no longer be found.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array[
    'hantaran-tunang-untuk-lelaki',
    'hantaran-tunang-untuk-perempuan',
    'berapa-dulang-hantaran-tunang',
    'hantaran-tunang-simple',
    'barang-hantaran-tunang'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage, article_category_redirects, article_edit_locks,
--    dynamic_block_rules.
delete from articles
where slug = any(array[
  'hantaran-tunang-untuk-lelaki',
  'hantaran-tunang-untuk-perempuan',
  'berapa-dulang-hantaran-tunang',
  'hantaran-tunang-simple',
  'barang-hantaran-tunang'
]);

-- 3. The 7 tags this run creates. FOUR ARE DELIBERATELY ABSENT from this list —
--    hantaran-tunang, bertunang, bajet-kahwin and adat-pertunangan already
--    existed at capture time and belong to live articles. Verified by query at
--    capture time, not assumed.
delete from inspire_tags where slug = any(array[
  'hantaran-tunang-untuk-lelaki',
  'hantaran-tunang-untuk-perempuan',
  'barang-hantaran-tunang',
  'dulang-hantaran-tunang',
  'berapa-dulang-hantaran-tunang',
  'hantaran-tunang-simple',
  'contoh-hantaran-tunang'
]);

-- 4. Verify before committing. Expect: articles 74, published 74,
--    P2 published 26, none of the five slugs present.
select
  (select count(*) from articles) as articles,
  (select count(*) from articles where status='published') as published,
  (select count(*) from articles a join inspire_categories c on c.id=a.primary_category_id
     where c.slug='hantaran-mas-kahwin' and a.status='published') as p2_published,
  (select count(*) from articles where slug = any(array[
    'hantaran-tunang-untuk-lelaki','hantaran-tunang-untuk-perempuan',
    'berapa-dulang-hantaran-tunang','hantaran-tunang-simple','barang-hantaran-tunang'
  ])) as target_slugs_remaining;

-- commit;   -- uncomment deliberately after reading the verify row above
rollback;
