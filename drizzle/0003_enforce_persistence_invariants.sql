PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`singleton_key` integer DEFAULT 1 NOT NULL,
	`site_record_no` text,
	`site_record_url` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT "setting_singleton_check" CHECK("__new_setting"."singleton_key" = 1)
);
--> statement-breakpoint
INSERT INTO `__new_setting`("id", "singleton_key", "site_record_no", "site_record_url", "created_at", "updated_at") SELECT "id", 1, "site_record_no", "site_record_url", "created_at", "updated_at" FROM `setting`;--> statement-breakpoint
DROP TABLE `setting`;--> statement-breakpoint
ALTER TABLE `__new_setting` RENAME TO `setting`;--> statement-breakpoint
CREATE UNIQUE INDEX `setting_singleton_idx` ON `setting` (`singleton_key`);--> statement-breakpoint
CREATE TABLE `__new_login_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`provider` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "login_history_event_check" CHECK("__new_login_history"."event" in ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SIGN_OUT', 'REVOKE_OTHER_SESSIONS'))
);
--> statement-breakpoint
INSERT INTO `__new_login_history`("id", "user_id", "event", "provider", "ip_address", "user_agent", "created_at") SELECT "id", "user_id", "event", "provider", "ip_address", "user_agent", "created_at" FROM `login_history`;--> statement-breakpoint
DROP TABLE `login_history`;--> statement-breakpoint
ALTER TABLE `__new_login_history` RENAME TO `login_history`;--> statement-breakpoint
CREATE INDEX `login_history_user_created_idx` ON `login_history` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_history_event_created_idx` ON `login_history` (`event`,`created_at`);--> statement-breakpoint
CREATE INDEX `login_history_created_idx` ON `login_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `__new_user` (
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
	`updated_at` text,
	CONSTRAINT "user_level_check" CHECK("__new_user"."level" in ('ADMIN', 'EDITOR', 'GUEST')),
	CONSTRAINT "user_status_check" CHECK("__new_user"."status" in ('DELETED', 'ENABLE', 'DISABLE'))
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "email", "email_verified", "image", "level", "name", "password", "username", "display_username", "status", "created_at", "updated_at") SELECT "id", "email", "email_verified", "image", "level", "name", "password", "username", "display_username", "status", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `__new_category` (
	`id` text PRIMARY KEY NOT NULL,
	`parent` text,
	`status` text DEFAULT 'ENABLE' NOT NULL,
	`path` text NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`parent`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "category_status_check" CHECK("__new_category"."status" in ('ENABLE', 'DISABLE'))
);
--> statement-breakpoint
INSERT INTO `__new_category`("id", "parent", "status", "path", "created_at", "updated_at") SELECT "id", "parent", "status", "path", "created_at", "updated_at" FROM `category`;--> statement-breakpoint
DROP TABLE `category`;--> statement-breakpoint
ALTER TABLE `__new_category` RENAME TO `category`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_path_idx` ON `category` (`path`);--> statement-breakpoint
CREATE INDEX `category_status_idx` ON `category` (`status`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `category` (`parent`);--> statement-breakpoint
CREATE TABLE `__new_comment` (
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
	FOREIGN KEY (`parent_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "comment_status_check" CHECK("__new_comment"."status" in ('TO_AUDIT', 'PUBLISH', 'RUBBISH', 'BAN')),
	CONSTRAINT "comment_target_check" CHECK(("__new_comment"."post_id" is not null) + ("__new_comment"."page_id" is not null) + ("__new_comment"."custom_id" is not null) = 1)
);
--> statement-breakpoint
INSERT INTO `__new_comment`("id", "user_agent", "author", "content", "site", "email", "ip", "parent_id", "post_id", "page_id", "custom_id", "status", "created_at", "updated_at") SELECT "id", "user_agent", "author", "content", "site", "email", "ip", "parent_id", "post_id", "page_id", "custom_id", "status", "created_at", "updated_at" FROM `comment`;--> statement-breakpoint
DROP TABLE `comment`;--> statement-breakpoint
ALTER TABLE `__new_comment` RENAME TO `comment`;--> statement-breakpoint
CREATE INDEX `comment_post_status_created_idx` ON `comment` (`post_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_page_status_created_idx` ON `comment` (`page_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_custom_status_created_idx` ON `comment` (`custom_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_parent_idx` ON `comment` (`parent_id`);--> statement-breakpoint
CREATE TABLE `__new_link` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`logo` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'ENABLE',
	`created_at` text,
	`updated_at` text,
	CONSTRAINT "link_status_check" CHECK("__new_link"."status" in ('ENABLE', 'DISABLE'))
);
--> statement-breakpoint
INSERT INTO `__new_link`("id", "url", "name", "logo", "description", "status", "created_at", "updated_at") SELECT "id", "url", "name", "logo", "description", "status", "created_at", "updated_at" FROM `link`;--> statement-breakpoint
DROP TABLE `link`;--> statement-breakpoint
ALTER TABLE `__new_link` RENAME TO `link`;--> statement-breakpoint
CREATE UNIQUE INDEX `link_url_unique` ON `link` (`url`);--> statement-breakpoint
CREATE INDEX `link_status_idx` ON `link` (`status`);--> statement-breakpoint
CREATE TABLE `__new_media` (
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
	`updated_at` text,
	CONSTRAINT "media_size_check" CHECK("__new_media"."size" >= 0),
	CONSTRAINT "media_height_check" CHECK("__new_media"."height" is null or "__new_media"."height" >= 0),
	CONSTRAINT "media_width_check" CHECK("__new_media"."width" is null or "__new_media"."width" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "key", "name", "size", "type", "url", "color", "height", "width", "created_at", "updated_at") SELECT "id", "key", "name", "size", "type", "url", "color", "height", "width", "created_at", "updated_at" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
CREATE INDEX `media_key_idx` ON `media` (`key`);--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE TABLE `__new_menu` (
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
	FOREIGN KEY (`parent`) REFERENCES `menu`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "menu_type_check" CHECK("__new_menu"."type" in ('CATEGORY', 'PAGE', 'CUSTOM'))
);
--> statement-breakpoint
INSERT INTO `__new_menu`("id", "parent", "category_id", "page_id", "custom_id", "power", "type", "created_at", "updated_at") SELECT "id", "parent", "category_id", "page_id", "custom_id", "power", "type", "created_at", "updated_at" FROM `menu`;--> statement-breakpoint
DROP TABLE `menu`;--> statement-breakpoint
ALTER TABLE `__new_menu` RENAME TO `menu`;--> statement-breakpoint
CREATE INDEX `menu_parent_idx` ON `menu` (`parent`);--> statement-breakpoint
CREATE INDEX `menu_power_idx` ON `menu` (`power`);--> statement-breakpoint
CREATE INDEX `menu_type_idx` ON `menu` (`type`);--> statement-breakpoint
CREATE TABLE `__new_page` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'TO_AUDIT' NOT NULL,
	`template` text DEFAULT 'default' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "page_status_check" CHECK("__new_page"."status" in ('PUBLISHED', 'DRAFT', 'TO_AUDIT')),
	CONSTRAINT "page_template_check" CHECK("__new_page"."template" in ('default', 'friendly-links')),
	CONSTRAINT "page_views_check" CHECK("__new_page"."views" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_page`("id", "author_id", "status", "template", "views", "created_at", "updated_at") SELECT "id", "author_id", "status", "template", "views", "created_at", "updated_at" FROM `page`;--> statement-breakpoint
DROP TABLE `page`;--> statement-breakpoint
ALTER TABLE `__new_page` RENAME TO `page`;--> statement-breakpoint
CREATE INDEX `page_status_template_created_idx` ON `page` (`status`,`template`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_author_created_idx` ON `page` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_post` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_status` text DEFAULT 'ENABLE' NOT NULL,
	`gallery_time` text,
	`movie_time` text,
	`author_id` text NOT NULL,
	`category_id` text NOT NULL,
	`cover_id` text,
	`status` text DEFAULT 'TO_AUDIT' NOT NULL,
	`type` text DEFAULT 'ARTICLE' NOT NULL,
	`views` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cover_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "post_comment_status_check" CHECK("__new_post"."comment_status" in ('ENABLE', 'DISABLE')),
	CONSTRAINT "post_status_check" CHECK("__new_post"."status" in ('PUBLISHED', 'DRAFT', 'TO_AUDIT')),
	CONSTRAINT "post_type_check" CHECK("__new_post"."type" in ('ARTICLE', 'MOVIE', 'PHOTOGRAPH', 'QUOTE')),
	CONSTRAINT "post_views_check" CHECK("__new_post"."views" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "comment_status", "gallery_time", "movie_time", "author_id", "category_id", "cover_id", "status", "type", "views", "created_at", "updated_at") SELECT "id", "comment_status", "gallery_time", "movie_time", "author_id", "category_id", "cover_id", "status", "type", "views", "created_at", "updated_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
CREATE INDEX `post_status_category_created_idx` ON `post` (`status`,`category_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_status_type_created_idx` ON `post` (`status`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_author_created_idx` ON `post` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_cover_idx` ON `post` (`cover_id`);--> statement-breakpoint
CREATE TABLE `__new_post_tag` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "post_tag_type_check" CHECK("__new_post_tag"."type" in ('ACTOR', 'DIRECTOR', 'MOVIE_STYLE', 'GALLERY_STYLE'))
);
--> statement-breakpoint
INSERT INTO `__new_post_tag`("post_id", "tag_id", "type") SELECT "post_id", "tag_id", "type" FROM `post_tag`;--> statement-breakpoint
DROP TABLE `post_tag`;--> statement-breakpoint
ALTER TABLE `__new_post_tag` RENAME TO `post_tag`;--> statement-breakpoint
CREATE UNIQUE INDEX `post_tag_post_tag_type_unique` ON `post_tag` (`post_id`,`tag_id`,`type`);--> statement-breakpoint
CREATE INDEX `post_tag_post_tag_idx` ON `post_tag` (`post_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `post_tag_tag_type_idx` ON `post_tag` (`tag_id`,`type`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
