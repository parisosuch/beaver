CREATE TABLE `channel_notification_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_notification_subscriptions_user_channel_idx` ON `channel_notification_subscriptions` (`user_id`,`channel_id`);--> statement-breakpoint
CREATE INDEX `channel_notification_subscriptions_channel_id_idx` ON `channel_notification_subscriptions` (`channel_id`);--> statement-breakpoint
ALTER TABLE `project_members` DROP COLUMN `notifications_enabled`;