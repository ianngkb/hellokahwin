-- AI authorship + review tracking.
--
-- HAND-ORDERED, deliberately. `drizzle-kit generate` emits the two columns with
-- `DEFAULT 'ai' NOT NULL` in the ADD COLUMN itself, which back-stamps every
-- EXISTING row as 'ai'. Against production that would mark all 29 legacy
-- WordPress migrations as AI-written — the exact wrong answer, and one that is
-- tedious to unpick once the owner has started reviewing against it.
--
-- The order below is: create types -> add NULLABLE -> backfill from the columns
-- that already hold the truth -> only then SET DEFAULT / SET NOT NULL. No row is
-- ever briefly wrong, and the NOT NULL is proven by the backfill rather than
-- assumed.

CREATE TYPE "public"."article_authorship" AS ENUM('ai', 'ai_assisted', 'human');--> statement-breakpoint
CREATE TYPE "public"."article_review_status" AS ENUM('pending_review', 'reviewed', 'needs_changes');--> statement-breakpoint

-- Nullable and defaultless for now, so existing rows are untouched by the ADD.
ALTER TABLE "articles" ADD COLUMN "authorship" "article_authorship";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "review_status" "article_review_status";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "reviewed_by" text;--> statement-breakpoint

-- Backfill, DERIVED from the two columns that already carry this information
-- rather than written as literals. Against production this sets all 29 rows to
-- 'human' / 'pending_review' / reviewed_at NULL (every row there is
-- is_ai_generated = false with human_reviewed_at IS NULL). Written as a
-- derivation so it is also correct on any other database where the old flag HAS
-- been used — a local verification DB, a future restore, a preview branch.
--
-- The 29 legacy posts become 'pending_review', NOT 'reviewed'. Nobody has
-- reviewed them; marking them reviewed would record a review that never
-- happened. The admin filters, not a false timestamp, keep them out of the
-- owner's way.
--
-- reviewed_by is left NULL throughout: there is no record of WHO performed any
-- historic review, and inventing an attribution is worse than having none.
UPDATE "articles" SET
  "authorship"    = CASE WHEN "is_ai_generated" THEN 'ai' ELSE 'human' END::"public"."article_authorship",
  "review_status" = CASE WHEN "human_reviewed_at" IS NOT NULL
                         THEN 'reviewed' ELSE 'pending_review' END::"public"."article_review_status",
  "reviewed_at"   = "human_reviewed_at";--> statement-breakpoint

-- Now that every row holds a value, lock the columns down.
ALTER TABLE "articles" ALTER COLUMN "authorship" SET DEFAULT 'ai';--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "authorship" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "review_status" SET DEFAULT 'pending_review';--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "review_status" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "articles" ADD CONSTRAINT "articles_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_review_queue_idx" ON "articles" USING btree ("review_status","authorship");
