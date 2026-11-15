ALTER TABLE "inspire_categories" ADD COLUMN "series_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inspire_categories" ADD COLUMN "series_description" text;