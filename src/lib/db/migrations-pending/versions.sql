-- migrations-pending/versions.sql — article version history: capture trigger + baseline
--
-- WHAT THIS DOES
--   1. Enables RLS on `article_versions` (no policies — same as every table in
--      migration 0001; only server actions on the direct connection read it).
--   2. Creates `article_version_capture()`, the ONLY thing that writes version
--      rows. It snapshots the article's 13 editorial columns plus its tag ids
--      after a save commits.
--   3. Seeds ONE baseline version ('import') for every non-deleted article that
--      has no history yet, so the state before the first post-deploy save is
--      restorable.
--   4. Attaches the function to `articles` as two DEFERRED constraint triggers
--      (UPDATE of the editorial columns, and INSERT).
--
-- PREREQUISITE
--   The `article_versions` TABLE must already exist. It is defined in
--   src/lib/db/schema/article-versions.ts and created by the drizzle-generated
--   migration; run this file AFTER that migration.
--
-- IDEMPOTENT
--   CREATE OR REPLACE / DROP TRIGGER IF EXISTS / INSERT ... WHERE NOT EXISTS.
--   Safe to re-run; a re-run seeds only articles that still have no versions.
--
-- WHY A TRIGGER, AND ONLY A TRIGGER
--   The editor save, the restore, the tag merge's link patch, media deletion
--   and the cover regenerator all write `articles`. A trigger cannot be
--   forgotten by any of them. The app never inserts version rows itself; it
--   only declares WHO is saving (and an optional version name) with
--   transaction-local settings — see declareVersionActor() in
--   src/lib/articles/versioning.ts. One writer means no double snapshots.
--
--   Settings read (all transaction-local, set_config(..., true)):
--     app.article_actor_id      profiles.id of the saving admin  (unset => machine)
--     app.article_actor_label   the admin's email                (unset => NULL)
--     app.article_version_label a name for this version, <= 80   (unset => NULL)
--     app.article_version_mode  'skip' opts the transaction out  (unset => capture)
--
-- WHY A SAVE CAN NEVER FAIL BECAUSE OF THIS
--   * The whole capture body runs inside BEGIN ... EXCEPTION WHEN OTHERS. Any
--     error (a constraint, a bad value, a full disk on the history table, a
--     bug) rolls back ONLY the snapshot's subtransaction, logs a WARNING, and
--     the article save commits as if versioning did not exist. The one class
--     PL/pgSQL cannot catch is a cancel (statement_timeout / admin cancel);
--     the work here is a few indexed single-article reads and one write, far
--     inside any timeout this app uses.
--   * Size cap: a body over 8 MB (on-disk, compressed) is not snapshotted — a
--     WARNING is logged and the save proceeds.
--   * No recursion: the function writes only `article_versions`, which has no
--     triggers, and never writes `articles`.
--   * Nulls: every compare is IS NOT DISTINCT FROM; arrays coalesce to '{}'.
--   * Deleted articles (status = 'deleted', the "(Deleted) …" tombstone) are
--     not versioned.
--
-- HOW VERSIONS ARE FORMED
--   * Nothing changed since the newest version  -> no row (if a version name
--     was given and the newest version has none, it is named instead).
--   * Same transaction as the newest version    -> fold into it.
--   * Same admin, unnamed, within 30 minutes    -> fold into it (an editing
--     session, including the 60-second autosave, is ONE version).
--   * Otherwise (a name was given, a different admin, a machine write, a
--     restore, a gap of 30+ minutes)            -> append a new version.
--   * Machine versions beyond 50 per article are pruned, oldest first. Human,
--     named, imported and the first version are never pruned.
--
-- ROLLBACK (complete; removes every object this file and the table migration add)
--   DROP TRIGGER IF EXISTS trg_article_version_capture        ON articles;
--   DROP TRIGGER IF EXISTS trg_article_version_capture_insert ON articles;
--   DROP FUNCTION IF EXISTS article_version_capture();
--   DROP TABLE IF EXISTS article_versions;   -- only if removing the feature entirely
-- Dropping the two triggers alone is enough to stop all capture instantly;
-- saves are unaffected either way.

BEGIN;

ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION article_version_capture() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  v_article_id uuid := NEW.id;
  v_art        RECORD;
  v_latest     RECORD;
  v_has_latest boolean := false;
  v_tags       uuid[];
  v_actor_id   text;
  v_actor_lbl  text;
  v_label      text;
  v_by         text;
  v_actor      text;
  v_same       boolean;
BEGIN
  BEGIN
    IF coalesce(current_setting('app.article_version_mode', true), '') = 'skip' THEN
      RETURN NULL;
    END IF;

    -- Deferred: this runs at COMMIT, so the row holds the transaction's FINAL
    -- state. Only the versioned columns — never `SELECT *`.
    SELECT title, excerpt, content, cover_image_url, cover_image_variants,
           cover_image_quality, cover_image_focal_point, cover_image_detection_data,
           cover_image_smart_crops, cover_image_focal_point_override,
           meta_title, meta_description, pinterest_board_name, status
      INTO v_art
      FROM articles WHERE id = v_article_id;
    IF NOT FOUND THEN
      RETURN NULL;  -- deleted later in the same transaction
    END IF;
    IF v_art.status::text = 'deleted' THEN
      RETURN NULL;  -- a tombstone is not an edit
    END IF;

    IF coalesce(pg_column_size(v_art.content), 0) > 8388608 THEN
      RAISE WARNING 'article_version_capture: article % body is % bytes; not snapshotted',
        v_article_id, pg_column_size(v_art.content);
      RETURN NULL;
    END IF;

    SELECT coalesce(array_agg(t.tag_id ORDER BY t.tag_id), '{}')
      INTO v_tags
      FROM article_tags t WHERE t.article_id = v_article_id;

    v_actor_id  := nullif(current_setting('app.article_actor_id', true), '');
    v_actor_lbl := nullif(current_setting('app.article_actor_label', true), '');
    v_label     := left(nullif(btrim(coalesce(current_setting('app.article_version_label', true), '')), ''), 80);

    -- Resolve the actor against profiles rather than trusting it: an unknown id
    -- would otherwise trip the foreign key (caught, but then nothing is saved).
    IF v_actor_id IS NOT NULL THEN
      SELECT p.id INTO v_by FROM profiles p WHERE p.id = v_actor_id;
    END IF;
    v_actor := CASE WHEN v_actor_id IS NOT NULL THEN 'human' ELSE 'machine' END;

    SELECT id, version_number, actor_type, created_by, label, updated_at, created_txid,
           title, excerpt, content, cover_image_url, cover_image_variants,
           cover_image_quality, cover_image_focal_point, cover_image_detection_data,
           cover_image_smart_crops, cover_image_focal_point_override,
           meta_title, meta_description, pinterest_board_name, tag_ids
      INTO v_latest
      FROM article_versions
     WHERE article_id = v_article_id
     ORDER BY version_number DESC
     LIMIT 1;
    v_has_latest := FOUND;

    IF v_has_latest THEN
      v_same :=
            v_latest.title                            IS NOT DISTINCT FROM v_art.title
        AND v_latest.excerpt                          IS NOT DISTINCT FROM v_art.excerpt
        AND v_latest.content                          IS NOT DISTINCT FROM v_art.content
        AND v_latest.cover_image_url                  IS NOT DISTINCT FROM v_art.cover_image_url
        AND v_latest.cover_image_variants             IS NOT DISTINCT FROM v_art.cover_image_variants
        AND v_latest.cover_image_quality              IS NOT DISTINCT FROM v_art.cover_image_quality
        AND v_latest.cover_image_focal_point          IS NOT DISTINCT FROM v_art.cover_image_focal_point
        AND v_latest.cover_image_detection_data       IS NOT DISTINCT FROM v_art.cover_image_detection_data
        AND v_latest.cover_image_smart_crops          IS NOT DISTINCT FROM v_art.cover_image_smart_crops
        AND v_latest.cover_image_focal_point_override IS NOT DISTINCT FROM v_art.cover_image_focal_point_override
        AND v_latest.meta_title                       IS NOT DISTINCT FROM v_art.meta_title
        AND v_latest.meta_description                 IS NOT DISTINCT FROM v_art.meta_description
        AND v_latest.pinterest_board_name             IS NOT DISTINCT FROM v_art.pinterest_board_name
        AND v_latest.tag_ids                          IS NOT DISTINCT FROM v_tags;

      IF v_same THEN
        -- Nothing to record. A name given now names the current state, if the
        -- newest version has no name yet; otherwise it gets its own row below.
        IF v_label IS NULL OR v_latest.created_txid = txid_current() THEN
          RETURN NULL;
        END IF;
        IF v_latest.label IS NULL THEN
          UPDATE article_versions SET label = v_label WHERE id = v_latest.id;
          RETURN NULL;
        END IF;
      ELSIF v_latest.created_txid = txid_current()
         OR (    v_label IS NULL
             AND v_latest.label IS NULL
             AND v_actor = 'human'
             AND v_latest.actor_type = 'human'
             AND v_by IS NOT NULL
             AND v_latest.created_by = v_by
             AND v_latest.updated_at > now() - interval '30 minutes') THEN
        -- Same transaction, or the same admin's ongoing editing session: fold.
        UPDATE article_versions SET
          title                            = v_art.title,
          excerpt                          = v_art.excerpt,
          content                          = v_art.content,
          cover_image_url                  = v_art.cover_image_url,
          cover_image_variants             = v_art.cover_image_variants,
          cover_image_quality              = v_art.cover_image_quality,
          cover_image_focal_point          = v_art.cover_image_focal_point,
          cover_image_detection_data       = v_art.cover_image_detection_data,
          cover_image_smart_crops          = v_art.cover_image_smart_crops,
          cover_image_focal_point_override = v_art.cover_image_focal_point_override,
          meta_title                       = v_art.meta_title,
          meta_description                 = v_art.meta_description,
          pinterest_board_name             = v_art.pinterest_board_name,
          tag_ids                          = v_tags,
          label                            = coalesce(v_label, label),
          updated_at                       = now(),
          created_txid                     = txid_current()
        WHERE id = v_latest.id;
        RETURN NULL;
      END IF;
    END IF;

    INSERT INTO article_versions (
      article_id, version_number, actor_type, created_by, created_by_label, label, note,
      title, excerpt, content, cover_image_url, cover_image_variants,
      cover_image_quality, cover_image_focal_point, cover_image_detection_data,
      cover_image_smart_crops, cover_image_focal_point_override,
      meta_title, meta_description, pinterest_board_name, tag_ids,
      created_txid
    ) VALUES (
      v_article_id,
      CASE WHEN v_has_latest THEN v_latest.version_number + 1 ELSE 1 END,
      v_actor, v_by, CASE WHEN v_actor = 'human' THEN v_actor_lbl END, v_label,
      CASE WHEN v_actor = 'machine'
           THEN left(nullif(current_setting('application_name', true), ''), 200) END,
      v_art.title, v_art.excerpt, v_art.content, v_art.cover_image_url, v_art.cover_image_variants,
      v_art.cover_image_quality, v_art.cover_image_focal_point, v_art.cover_image_detection_data,
      v_art.cover_image_smart_crops, v_art.cover_image_focal_point_override,
      v_art.meta_title, v_art.meta_description, v_art.pinterest_board_name, v_tags,
      txid_current()
    );

    -- Cap runaway machine history at 50 rows per article. Never touches a
    -- human, named or imported version, nor version 1.
    DELETE FROM article_versions
     WHERE id IN (
       SELECT id FROM article_versions
        WHERE article_id = v_article_id
          AND actor_type = 'machine'
          AND label IS NULL
          AND version_number > 1
        ORDER BY version_number DESC
        OFFSET 50
     );
  EXCEPTION WHEN OTHERS THEN
    -- The snapshot is a convenience; the save is not. Never let one cost the other.
    RAISE WARNING 'article_version_capture skipped for article %: % (SQLSTATE %)',
      v_article_id, SQLERRM, SQLSTATE;
  END;
  RETURN NULL;
END;
$fn$;

-- Baseline: one 'import' version per live article with no history yet.
INSERT INTO article_versions (
  article_id, version_number, actor_type, note,
  title, excerpt, content, cover_image_url, cover_image_variants,
  cover_image_quality, cover_image_focal_point, cover_image_detection_data,
  cover_image_smart_crops, cover_image_focal_point_override,
  meta_title, meta_description, pinterest_board_name, tag_ids,
  created_at, updated_at
)
SELECT a.id, 1, 'import', 'baseline before version history',
       a.title, a.excerpt, a.content, a.cover_image_url, a.cover_image_variants,
       a.cover_image_quality, a.cover_image_focal_point, a.cover_image_detection_data,
       a.cover_image_smart_crops, a.cover_image_focal_point_override,
       a.meta_title, a.meta_description, a.pinterest_board_name,
       coalesce((SELECT array_agg(t.tag_id ORDER BY t.tag_id)
                   FROM article_tags t WHERE t.article_id = a.id), '{}'),
       a.updated_at, a.updated_at
  FROM articles a
 WHERE a.status::text <> 'deleted'
   AND NOT EXISTS (SELECT 1 FROM article_versions v WHERE v.article_id = a.id);

-- UPDATE OF lists exactly the 13 versioned columns: a save that touches only
-- status / dates / author / category never reaches the function at all.
DROP TRIGGER IF EXISTS trg_article_version_capture ON articles;
CREATE CONSTRAINT TRIGGER trg_article_version_capture
  AFTER UPDATE OF
    title, excerpt, content, cover_image_url, cover_image_variants,
    cover_image_quality, cover_image_focal_point, cover_image_detection_data,
    cover_image_smart_crops, cover_image_focal_point_override,
    meta_title, meta_description, pinterest_board_name
  ON articles
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION article_version_capture();

DROP TRIGGER IF EXISTS trg_article_version_capture_insert ON articles;
CREATE CONSTRAINT TRIGGER trg_article_version_capture_insert
  AFTER INSERT ON articles
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION article_version_capture();

COMMIT;
