CREATE TABLE `event_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_reactions_event_user_emoji_idx` ON `event_reactions` (`event_id`,`user_id`,`emoji`);--> statement-breakpoint
CREATE INDEX `event_reactions_event_id_idx` ON `event_reactions` (`event_id`);