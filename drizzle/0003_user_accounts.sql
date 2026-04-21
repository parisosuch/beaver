ALTER TABLE `users` ADD COLUMN `must_change_password` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `temp_password` text;
