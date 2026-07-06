CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`link_path` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_project_created_idx` ON `notifications` (`user_id`,`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_project_read_idx` ON `notifications` (`user_id`,`project_id`,`read_at`);