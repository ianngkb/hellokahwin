-- UNDO — 2026-08-26 edge-purge proof probe
--
-- Removes the single throwaway article ingested to prove the edge purge, and
-- nothing else. Every statement is scoped by the slug 'probe-edge-purge-20260826'
-- or by that article's id; none of them can reach another row.
--
-- Ordered child-first so no foreign key blocks the delete.
--
-- Production has no recovery point. Read every statement before running it.

begin;

-- 0. Prove the target exists and is the one thing expected. Should be 1.
select count(*) as articles_to_delete
from articles
where slug = 'probe-edge-purge-20260826';

-- 1. The media join, then the media row itself. Scoped to media created BY
--    this article, so a shared image (there is none here) could not be caught.
delete from media_article_usage
where article_id in (select id from articles where slug = 'probe-edge-purge-20260826');

delete from media
where original_article_id in (select id from articles where slug = 'probe-edge-purge-20260826');

-- 2. Category and tag links. The tag delete is a belt-and-braces no-op: the
--    probe file declares no tags.
delete from article_categories
where article_id in (select id from articles where slug = 'probe-edge-purge-20260826');

delete from article_tags
where article_id in (select id from articles where slug = 'probe-edge-purge-20260826');

-- 3. The article.
delete from articles
where slug = 'probe-edge-purge-20260826';

-- 4. Prove it is gone. Should be 0.
select count(*) as articles_remaining
from articles
where slug = 'probe-edge-purge-20260826';

commit;

-- R2, which SQL cannot reach: delete every object under the prefix
--   inspire/probe-edge-purge-20260826/
-- in the bucket named by R2_BUCKET_NAME. The prefix is unique to this slug.
