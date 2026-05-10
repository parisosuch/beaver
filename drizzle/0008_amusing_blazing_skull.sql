CREATE INDEX `events_channel_id_name_id_idx` ON `events` (`channel_id`,`name`,`id`);--> statement-breakpoint
CREATE INDEX `events_project_id_name_id_idx` ON `events` (`project_id`,`name`,`id`);