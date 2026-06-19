CREATE TABLE `email_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`smtp_host` text,
	`smtp_port` integer,
	`smtp_username` text,
	`smtp_password` text,
	`smtp_secure` integer DEFAULT true NOT NULL,
	`smtp_from_email` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
