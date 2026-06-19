CREATE TABLE `alert_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` integer NOT NULL,
	`name` text NOT NULL,
	`event_object` text NOT NULL,
	`event_action` text NOT NULL,
	`threshold` integer NOT NULL,
	`window_minutes` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_triggered_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alert_rules_channel_id_idx` ON `alert_rules` (`channel_id`);--> statement-breakpoint
CREATE INDEX `alert_rules_channel_id_event_object_event_action_idx` ON `alert_rules` (`channel_id`,`event_object`,`event_action`);