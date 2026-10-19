CREATE TABLE `job_openings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company` text NOT NULL,
	`company_normalised` text NOT NULL,
	`role` text NOT NULL,
	`location` text,
	`closes_at` integer,
	`source` text,
	`sender_domain` text,
	`gmail_message_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`first_seen_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_openings_user_company_role_idx` ON `job_openings` (`user_id`,`company_normalised`,`role`);--> statement-breakpoint
CREATE INDEX `job_openings_user_status_idx` ON `job_openings` (`user_id`,`status`);