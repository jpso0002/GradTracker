CREATE TABLE "job_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"company_normalised" text NOT NULL,
	"role" text NOT NULL,
	"location" text,
	"closes_at" timestamp with time zone,
	"source" text,
	"sender_domain" text,
	"gmail_message_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_openings_user_company_role_idx" ON "job_openings" USING btree ("user_id","company_normalised","role");--> statement-breakpoint
CREATE INDEX "job_openings_user_status_idx" ON "job_openings" USING btree ("user_id","status");