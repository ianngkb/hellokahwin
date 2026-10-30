CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_hash" text NOT NULL,
	"visitor_id" uuid,
	"session_id" text,
	"event_name" text NOT NULL,
	"pathname" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"browser" text,
	"os" text,
	"device_type" text,
	"screen_width" integer,
	"country" text,
	"region" text,
	"city" text,
	"latitude" real,
	"longitude" real,
	"user_agent" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"bot_reason" text,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_analytics_events_created_at" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_pathname_created" ON "analytics_events" USING btree ("pathname","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_session_created" ON "analytics_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_country_created" ON "analytics_events" USING btree ("country","created_at");--> statement-breakpoint
-- RLS on with NO policies, matching 0001_enable_rls_public_schema.sql: closes the
-- table to the public PostgREST surface while the app (the `postgres` owner role)
-- keeps full access.
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
