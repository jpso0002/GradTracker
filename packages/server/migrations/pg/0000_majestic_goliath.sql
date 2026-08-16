CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"gmail_message_id" text NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"sender_domain" text,
	"detected_stage" text,
	"detected_deadline_at" timestamp with time zone,
	"detected_next_action" text,
	"confidence" real NOT NULL,
	"review_status" text NOT NULL,
	"classifier_model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_field_provenance" (
	"job_id" uuid NOT NULL,
	"field" text NOT NULL,
	"source" text NOT NULL,
	"confidence" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_field_provenance_job_id_field_pk" PRIMARY KEY("job_id","field")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"company_normalised" text NOT NULL,
	"role" text NOT NULL,
	"stage" text NOT NULL,
	"deadline_at" timestamp with time zone,
	"next_action" text,
	"sender_domain" text,
	"confidence" real NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_event_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"history_id" text,
	"last_full_scan_at" timestamp with time zone,
	"state" text DEFAULT 'idle' NOT NULL,
	"last_error" text,
	"emails_read_total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"anon_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"refresh_token_ciphertext" text NOT NULL,
	"refresh_token_iv" text NOT NULL,
	"refresh_token_tag" text NOT NULL,
	"review_threshold" real DEFAULT 0.75 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_anon_key_unique" UNIQUE("anon_key")
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_field_provenance" ADD CONSTRAINT "job_field_provenance_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_user_message_uq" ON "email_events" USING btree ("user_id","gmail_message_id");--> statement-breakpoint
CREATE INDEX "email_events_job_idx" ON "email_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "email_events_user_review_idx" ON "email_events" USING btree ("user_id","review_status");--> statement-breakpoint
CREATE INDEX "jobs_user_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "jobs_user_company_idx" ON "jobs" USING btree ("user_id","company_normalised");--> statement-breakpoint
CREATE INDEX "jobs_user_deadline_idx" ON "jobs" USING btree ("user_id","deadline_at");