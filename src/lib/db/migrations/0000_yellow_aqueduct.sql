CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."media_source" AS ENUM('article_upload', 'library_upload');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('couple', 'vendor', 'admin', 'pending');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_slug" text,
	"is_public_author" boolean DEFAULT false NOT NULL,
	"author_title" text,
	"author_bio" text,
	"author_website_url" text,
	"author_instagram_url" text,
	"author_linkedin_url" text,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_label" text,
	"performed_by" text,
	"performed_by_label" text,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "article_categories_unique" UNIQUE("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "article_category_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"from_category_slug" text NOT NULL,
	"to_category_slug" text NOT NULL,
	"changed_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_edit_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"locked_by" text NOT NULL,
	"locked_by_name" text NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "article_edit_locks_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "article_tags_unique" UNIQUE("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" jsonb,
	"cover_image_url" text,
	"cover_image_variants" jsonb,
	"cover_image_quality" text,
	"cover_image_focal_point" jsonb,
	"cover_image_detection_data" jsonb,
	"cover_image_smart_crops" jsonb,
	"cover_image_focal_point_override" jsonb,
	"fts" "tsvector",
	"meta_title" text,
	"meta_description" text,
	"pinterest_board_name" text,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"human_reviewed_at" timestamp with time zone,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"share_token" text,
	"author_id" text NOT NULL,
	"primary_category_id" uuid,
	"published_at" timestamp with time zone,
	"scheduled_publish_at" timestamp with time zone,
	"wp_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inspire_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"display_order" integer DEFAULT 0,
	"wp_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspire_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inspire_nav_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"category_id" uuid,
	"url" text,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspire_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"wp_id" integer,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspire_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"destination_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_source_path_unique" UNIQUE("source_path")
);
--> statement-breakpoint
CREATE TABLE "legacy_image_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wp_url" text NOT NULL,
	"wp_filename" text NOT NULL,
	"wp_size_suffix" text,
	"wp_year" smallint NOT NULL,
	"wp_month" smallint NOT NULL,
	"mapping_tier" text NOT NULL,
	"media_id" uuid,
	"article_id" uuid,
	"wp_post_id" integer,
	"image_destination_url" text NOT NULL,
	"article_destination_url" text NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"image_hit_count" integer DEFAULT 0 NOT NULL,
	"article_hit_count" integer DEFAULT 0 NOT NULL,
	"first_hit_at" timestamp with time zone,
	"last_hit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_image_redirects_wp_url_unique" UNIQUE("wp_url")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"r2_key" text NOT NULL,
	"url" text NOT NULL,
	"original_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text DEFAULT '',
	"caption" text DEFAULT '',
	"caption_url" text,
	"variants" jsonb,
	"default_quality" text DEFAULT 'high',
	"smart_crops" jsonb,
	"focal_point" jsonb,
	"detection_data" jsonb,
	"source" "media_source" NOT NULL,
	"original_article_id" uuid,
	"parent_media_id" uuid,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_article_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_article_usage_unique" UNIQUE("media_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "dynamic_block_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"category_id" uuid,
	"tag_id" uuid,
	"article_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dynamic_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" jsonb,
	"placement" text DEFAULT 'end' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_indexnow_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"article_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" boolean NOT NULL,
	"http_status" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_profiles_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_inspire_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inspire_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_category_redirects" ADD CONSTRAINT "article_category_redirects_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_edit_locks" ADD CONSTRAINT "article_edit_locks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_edit_locks" ADD CONSTRAINT "article_edit_locks_locked_by_profiles_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_inspire_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."inspire_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_primary_category_id_inspire_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."inspire_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspire_nav_items" ADD CONSTRAINT "inspire_nav_items_category_id_inspire_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inspire_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_image_redirects" ADD CONSTRAINT "legacy_image_redirects_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_image_redirects" ADD CONSTRAINT "legacy_image_redirects_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_original_article_id_articles_id_fk" FOREIGN KEY ("original_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_article_usage" ADD CONSTRAINT "media_article_usage_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_article_usage" ADD CONSTRAINT "media_article_usage_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_block_rules" ADD CONSTRAINT "dynamic_block_rules_block_id_dynamic_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."dynamic_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_block_rules" ADD CONSTRAINT "dynamic_block_rules_category_id_inspire_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inspire_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_block_rules" ADD CONSTRAINT "dynamic_block_rules_tag_id_inspire_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."inspire_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_block_rules" ADD CONSTRAINT "dynamic_block_rules_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_indexnow_submissions" ADD CONSTRAINT "seo_indexnow_submissions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "article_categories_category_id_idx" ON "article_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "article_category_redirects_article_id_idx" ON "article_category_redirects" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_tags_tag_id_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_primary_category_id_idx" ON "articles" USING btree ("primary_category_id");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_cover_image_url_idx" ON "articles" USING btree ("cover_image_url");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_articles_share_token" ON "articles" USING btree ("share_token") WHERE "articles"."share_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "inspire_categories_slug_idx" ON "inspire_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "inspire_categories_parent_id_idx" ON "inspire_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "inspire_nav_items_parent_id_idx" ON "inspire_nav_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "inspire_nav_items_category_id_idx" ON "inspire_nav_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "inspire_nav_items_position_idx" ON "inspire_nav_items" USING btree ("position");--> statement-breakpoint
CREATE INDEX "inspire_tags_slug_idx" ON "inspire_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "inspire_tags_hidden_idx" ON "inspire_tags" USING btree ("name") WHERE "inspire_tags"."is_hidden";--> statement-breakpoint
CREATE INDEX "redirects_source_path_idx" ON "redirects" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "redirects_is_active_idx" ON "redirects" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "legacy_image_redirects_mapping_tier_idx" ON "legacy_image_redirects" USING btree ("mapping_tier");--> statement-breakpoint
CREATE INDEX "legacy_image_redirects_article_id_idx" ON "legacy_image_redirects" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "legacy_image_redirects_last_hit_at_idx" ON "legacy_image_redirects" USING btree ("last_hit_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_media_r2_key_unique" ON "media" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "idx_media_url" ON "media" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_media_source" ON "media" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_media_original_article_id" ON "media" USING btree ("original_article_id");--> statement-breakpoint
CREATE INDEX "idx_media_created_at" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_media_uploaded_by" ON "media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_media_parent_media_id" ON "media" USING btree ("parent_media_id");--> statement-breakpoint
CREATE INDEX "idx_media_article_usage_article_id" ON "media_article_usage" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "dynamic_block_rules_block_id_idx" ON "dynamic_block_rules" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "dynamic_block_rules_category_id_idx" ON "dynamic_block_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "dynamic_block_rules_tag_id_idx" ON "dynamic_block_rules" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "dynamic_block_rules_article_id_idx" ON "dynamic_block_rules" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dynamic_block_rules_block_category_uniq" ON "dynamic_block_rules" USING btree ("block_id","category_id") WHERE category_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dynamic_block_rules_block_tag_uniq" ON "dynamic_block_rules" USING btree ("block_id","tag_id") WHERE tag_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dynamic_block_rules_block_article_uniq" ON "dynamic_block_rules" USING btree ("block_id","article_id") WHERE article_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "dynamic_blocks_status_idx" ON "dynamic_blocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_seo_indexnow_submissions_article_id" ON "seo_indexnow_submissions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_seo_indexnow_submissions_submitted_at" ON "seo_indexnow_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_seo_indexnow_submissions_failures" ON "seo_indexnow_submissions" USING btree ("success","submitted_at");