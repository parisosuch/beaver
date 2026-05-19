DROP INDEX IF EXISTS `events_channel_id_name_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `events_project_id_name_id_idx`;--> statement-breakpoint
ALTER TABLE `events` ADD `event_object` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `event_action` text DEFAULT 'imported' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `events` SET `title` = `name`;--> statement-breakpoint
CREATE INDEX `events_project_id_event_object_event_action_idx` ON `events` (`project_id`,`event_object`,`event_action`);--> statement-breakpoint
CREATE INDEX `events_channel_id_event_object_event_action_idx` ON `events` (`channel_id`,`event_object`,`event_action`);--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `name`;
