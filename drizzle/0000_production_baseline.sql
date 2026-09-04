CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_provider_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `login_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`provider` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `login_history_user_created_idx` ON `login_history` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_history_event_created_idx` ON `login_history` (`event`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_history_created_idx` ON `login_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`created_at` integer NOT NULL,
	`aaguid` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credential_id_unique` ON `passkey` (`credential_id`);--> statement-breakpoint
CREATE INDEX `passkey_user_id_idx` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`level` text DEFAULT 'GUEST' NOT NULL,
	`name` text,
	`password` text,
	`username` text,
	`display_username` text,
	`status` text DEFAULT 'ENABLE' NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`title` text NOT NULL,
	`parent` text,
	`status` text DEFAULT 'ENABLE' NOT NULL,
	`path` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`parent`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `category_path_idx` ON `category` (`path`);--> statement-breakpoint
CREATE INDEX `category_status_idx` ON `category` (`status`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `category` (`parent`);--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_agent` text,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`site` text,
	`email` text NOT NULL,
	`ip` text,
	`parent_id` text,
	`post_id` text,
	`page_id` text,
	`custom_id` text,
	`status` text DEFAULT 'PUBLISH',
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comment_post_status_created_idx` ON `comment` (`post_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_page_status_created_idx` ON `comment` (`page_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_custom_status_created_idx` ON `comment` (`custom_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_parent_idx` ON `comment` (`parent_id`);--> statement-breakpoint
CREATE TABLE `link` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`logo` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'ENABLE',
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_url_unique` ON `link` (`url`);--> statement-breakpoint
CREATE INDEX `link_status_idx` ON `link` (`status`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`color` text,
	`height` integer,
	`width` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `media_key_idx` ON `media` (`key`);--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE TABLE `menu` (
	`id` text PRIMARY KEY NOT NULL,
	`parent` text,
	`category_id` text,
	`page_id` text,
	`custom_id` text,
	`power` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent`) REFERENCES `menu`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `menu_parent_idx` ON `menu` (`parent`);--> statement-breakpoint
CREATE INDEX `menu_power_idx` ON `menu` (`power`);--> statement-breakpoint
CREATE INDEX `menu_type_idx` ON `menu` (`type`);--> statement-breakpoint
CREATE TABLE `page` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'TO_AUDIT' NOT NULL,
	`template` text DEFAULT 'default' NOT NULL,
	`title` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `page_status_template_created_idx` ON `page` (`status`,`template`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_author_created_idx` ON `page` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `post` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_status` text DEFAULT 'ENABLE' NOT NULL,
	`gallery_location` text,
	`gallery_time` text,
	`movie_time` text,
	`author_id` text NOT NULL,
	`category_id` text NOT NULL,
	`content` text,
	`cover_id` text,
	`excerpt` text,
	`status` text DEFAULT 'TO_AUDIT' NOT NULL,
	`title` text,
	`type` text DEFAULT 'ARTICLE' NOT NULL,
	`views` integer DEFAULT 0,
	`quote_author` text,
	`quote_content` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cover_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `post_status_category_created_idx` ON `post` (`status`,`category_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_status_type_created_idx` ON `post` (`status`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_author_created_idx` ON `post` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_cover_idx` ON `post` (`cover_id`);--> statement-breakpoint
CREATE TABLE `post_tag` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_tag_post_tag_idx` ON `post_tag` (`post_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `post_tag_tag_type_idx` ON `post_tag` (`tag_id`,`type`);--> statement-breakpoint
CREATE TABLE `setting` (
	`id` text PRIMARY KEY NOT NULL,
	`site_name` text NOT NULL,
	`site_sub_name` text NOT NULL,
	`site_signature` text NOT NULL,
	`site_copyright` text NOT NULL,
	`site_record_no` text,
	`site_record_url` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
