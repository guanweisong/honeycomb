ALTER TABLE `user` ADD `login_email_key` text GENERATED ALWAYS AS (lower(replace("email", 'K', 'K'))) VIRTUAL;--> statement-breakpoint
CREATE INDEX `user_login_email_key_idx` ON `user` (`login_email_key`);
