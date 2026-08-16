CREATE TABLE `email_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text,
	`gmail_message_id` text NOT NULL,
	`gmail_thread_id` text NOT NULL,
	`received_at` integer NOT NULL,
	`sender_domain` text,
	`detected_stage` text,
	`detected_deadline_at` integer,
	`detected_next_action` text,
	`confidence` real NOT NULL,
	`review_status` text NOT NULL,
	`classifier_model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_events_user_message_uq` ON `email_events` (`user_id`,`gmail_message_id`);--> statement-breakpoint
CREATE INDEX `email_events_job_idx` ON `email_events` (`job_id`);--> statement-breakpoint
CREATE INDEX `email_events_user_review_idx` ON `email_events` (`user_id`,`review_status`);--> statement-breakpoint
CREATE TABLE `job_field_provenance` (
	`job_id` text NOT NULL,
	`field` text NOT NULL,
	`source` text NOT NULL,
	`confidence` real,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`job_id`, `field`),
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company` text NOT NULL,
	`company_normalised` text NOT NULL,
	`role` text NOT NULL,
	`stage` text NOT NULL,
	`deadline_at` integer,
	`next_action` text,
	`sender_domain` text,
	`confidence` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_event_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `jobs_user_status_idx` ON `jobs` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `jobs_user_company_idx` ON `jobs` (`user_id`,`company_normalised`);--> statement-breakpoint
CREATE INDEX `jobs_user_deadline_idx` ON `jobs` (`user_id`,`deadline_at`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`history_id` text,
	`last_full_scan_at` integer,
	`state` text DEFAULT 'idle' NOT NULL,
	`last_error` text,
	`emails_read_total` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`anon_key` text NOT NULL,
	`refresh_token_ciphertext` text NOT NULL,
	`refresh_token_iv` text NOT NULL,
	`refresh_token_tag` text NOT NULL,
	`review_threshold` real DEFAULT 0.75 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_sync_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_unique` ON `users` (`google_sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_anon_key_unique` ON `users` (`anon_key`);