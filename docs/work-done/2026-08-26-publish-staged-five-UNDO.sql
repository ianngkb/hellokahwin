-- UNDO — publish the five staged articles + swap the kursus fee table.
-- 26 Aug 2026. Written BEFORE the first write.
-- Companion prose: 2026-08-26-publish-staged-five-UNDO.md
--
-- Pre-write state, 2026-08-25T17:51:43.464Z UTC:
--   articles 56 (56 published) · media 757 · inspire_tags 65
--   jsonb_typeof(content) = object for all 56, zero string rows
--   none of the five target slugs present
--   kursus-kahwin id=1c2e96ae-340f-4226-bb32-363da8cbe3d0, 23655 content bytes,
--   updated_at 2026-08-25T09:25:56.828Z
--
-- The two parts are INDEPENDENT. Run either alone.

-- ─────────────────────────────────────────────────────────────────────────
-- PART 1 — remove the five newly published articles
-- ─────────────────────────────────────────────────────────────────────────
begin;

-- 1. Media FIRST. media.original_article_id is ON DELETE SET NULL, not
--    CASCADE: once the articles are gone these rows can no longer be found.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array[
    'dulang-hantaran',
    'gubahan-hantaran',
    'sirih-junjung',
    'walimatul-urus',
    'skrip-pengacara-majlis-perkahwinan'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage, article_category_redirects, article_edit_locks,
--    dynamic_block_rules.
delete from articles
where slug = any(array[
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan'
]);

-- 3. The 11 tags this run created. bajet-kahwin, adat-perkahwinan,
--    adab-tetamu-majlis and jemputan-kahwin are DELIBERATELY ABSENT — they
--    pre-date this run and belong to live articles.
delete from inspire_tags where slug = any(array[
  'dulang-hantaran',
  'gubahan-hantaran',
  'hantaran',
  'persiapan-kahwin',
  'sirih-junjung',
  'walimatul-urus',
  'kenduri-kahwin',
  'protokol-majlis',
  'skrip-pengacara-majlis-perkahwinan',
  'aturcara-majlis-perkahwinan',
  'teks-pengacara-majlis'
]);

-- Expected afterwards: articles 56, published 56, media 757, inspire_tags 65,
-- hantaran-mas-kahwin 8 published, ucapan-doa 3 published.
commit;

-- ─────────────────────────────────────────────────────────────────────────
-- PART 2 — restore the kursus-kahwin fee section
-- ─────────────────────────────────────────────────────────────────────────
-- The pre-write content is 23,655 bytes of jsonb and is NOT inlined here.
-- It lives byte-exact in `2026-08-26-publish-staged-five-EVIDENCE/kursus-kahwin.BEFORE.json`
--   (key `content_text`); the session scratch copy is `.tmp-ops/pub5/kursus.BEFORE.json`.
-- Preferred route, which asserts the row id and re-checks the jsonb shape:
--
--     node docs/work-done/2026-08-26-publish-staged-five-EVIDENCE/restore-kursus.mjs --yes-really
--
-- It REFUSES if the row has moved since this run wrote it. It has: the SEO-02
-- session added five editorial links at 18:01:59Z. Read the .md before forcing
-- it with --i-know-it-moved.
--
-- Raw-SQL equivalent, if you are restoring by hand from that file:
--
--     update articles
--        set content = '<content_text from kursus.BEFORE.json>'::jsonb,
--            updated_at = now()
--      where id = '1c2e96ae-340f-4226-bb32-363da8cbe3d0';
--
-- Verify:
--     select jsonb_typeof(content),               -- must be 'object'
--            jsonb_array_length(content->'content'),  -- must be 56
--            length(content::text)                -- must be 23655
--       from articles where id = '1c2e96ae-340f-4226-bb32-363da8cbe3d0';

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER EITHER PART — drop the caches, or the site serves the undone pages
-- ─────────────────────────────────────────────────────────────────────────
--   POST https://hellokahwin.com/api/cron/revalidate-content
--        Authorization: Bearer $CRON_SECRET
--   then purge the Vercel edge for:
--     /artikel/hantaran-mas-kahwin/dulang-hantaran
--     /artikel/hantaran-mas-kahwin/gubahan-hantaran
--     /artikel/hantaran-mas-kahwin/sirih-junjung
--     /artikel/ucapan-doa/walimatul-urus
--     /artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
--     /artikel/idea-dan-nasihat/kursus-kahwin
--     /artikel/hantaran-mas-kahwin   /artikel/ucapan-doa   /artikel/idea-dan-nasihat
--     /sitemap.xml
