ALTER TABLE `users` ADD COLUMN `can_create_projects` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `project_members` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `project_id` integer NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'guest',
  `created_at` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
