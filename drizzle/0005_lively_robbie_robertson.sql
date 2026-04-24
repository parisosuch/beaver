CREATE INDEX `channel_groups_project_id_idx` ON `channel_groups` (`project_id`);--> statement-breakpoint
CREATE INDEX `channels_project_id_idx` ON `channels` (`project_id`);--> statement-breakpoint
CREATE INDEX `channels_name_idx` ON `channels` (`name`);--> statement-breakpoint
CREATE INDEX `event_tags_event_id_idx` ON `event_tags` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_tags_event_id_key_value_idx` ON `event_tags` (`event_id`,`key`,`value`);--> statement-breakpoint
CREATE INDEX `events_channel_id_created_at_idx` ON `events` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_project_id_created_at_idx` ON `events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_members_project_id_user_id_idx` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `project_members_user_id_idx` ON `project_members` (`user_id`);
