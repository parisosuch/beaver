CREATE TABLE `channel_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `project_id` integer NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
  `order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
ALTER TABLE `channels` ADD COLUMN `group_id` integer REFERENCES `channel_groups`(`id`);
