ALTER TABLE "inspire_categories" ADD COLUMN "pillar_code" text;--> statement-breakpoint
ALTER TABLE "inspire_categories" ADD COLUMN "entity_phrase" text;--> statement-breakpoint
ALTER TABLE "inspire_categories" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "inspire_categories" ADD COLUMN "is_pillar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "credit" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "credit_url" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "license_class" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "licensor_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "inspire_categories_pillar_code_idx" ON "inspire_categories" USING btree ("pillar_code") WHERE "inspire_categories"."pillar_code" IS NOT NULL;