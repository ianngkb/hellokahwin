CREATE TABLE "article_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"actor_type" text NOT NULL,
	"created_by" text,
	"created_by_label" text,
	"label" text,
	"note" text,
	"title" text NOT NULL,
	"excerpt" text,
	"content" jsonb,
	"cover_image_url" text,
	"cover_image_variants" jsonb,
	"cover_image_quality" text,
	"cover_image_focal_point" jsonb,
	"cover_image_detection_data" jsonb,
	"cover_image_smart_crops" jsonb,
	"cover_image_focal_point_override" jsonb,
	"meta_title" text,
	"meta_description" text,
	"pinterest_board_name" text,
	"tag_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_txid" bigint DEFAULT txid_current() NOT NULL,
	CONSTRAINT "article_versions_number_unique" UNIQUE("article_id","version_number"),
	CONSTRAINT "article_versions_label_len" CHECK ("article_versions"."label" IS NULL OR length("article_versions"."label") <= 80),
	CONSTRAINT "article_versions_actor_type" CHECK ("article_versions"."actor_type" IN ('human', 'machine', 'import'))
);
--> statement-breakpoint
CREATE TABLE "article_cluster_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_cluster_members_unique" UNIQUE("cluster_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "article_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"eyebrow" text,
	"series_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_clusters_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gsc_page_daily" (
	"page_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"position_sum" double precision DEFAULT 0 NOT NULL,
	"data_state" text DEFAULT 'final' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gsc_page_daily_pkey" PRIMARY KEY("page_id","date")
);
--> statement-breakpoint
CREATE TABLE "gsc_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"entity_type" text DEFAULT 'other' NOT NULL,
	"article_id" uuid,
	"slug" text,
	"category_slug" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "gsc_pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "article_title_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"old_title" text NOT NULL,
	"new_title" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_cluster_members" ADD CONSTRAINT "article_cluster_members_cluster_id_article_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."article_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_cluster_members" ADD CONSTRAINT "article_cluster_members_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_page_daily" ADD CONSTRAINT "gsc_page_daily_page_id_gsc_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."gsc_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_pages" ADD CONSTRAINT "gsc_pages_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_title_tests" ADD CONSTRAINT "article_title_tests_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_title_tests" ADD CONSTRAINT "article_title_tests_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_versions_article_id_idx" ON "article_versions" USING btree ("article_id","version_number" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "article_cluster_members_article_id_idx" ON "article_cluster_members" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "gsc_page_daily_date_page_idx" ON "gsc_page_daily" USING btree ("date","page_id");--> statement-breakpoint
CREATE INDEX "gsc_pages_article_id_idx" ON "gsc_pages" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "gsc_pages_slug_idx" ON "gsc_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "article_title_tests_one_running_idx" ON "article_title_tests" USING btree ("article_id") WHERE "article_title_tests"."ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "article_title_tests_started_idx" ON "article_title_tests" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_artikel_pageview" ON "analytics_events" USING btree ("pathname","created_at","visitor_hash","session_id") WHERE event_name = 'pageview' AND is_bot = FALSE AND pathname LIKE '/artikel/%';