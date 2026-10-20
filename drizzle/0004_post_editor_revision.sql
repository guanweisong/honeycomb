PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`version` integer DEFAULT 0 NOT NULL,
	`creation_token` text,
	`creation_input_hash` text,
	`views` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cover_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "post_version_check" CHECK("__new_post"."version" >= 0),
	CONSTRAINT "post_comment_status_check" CHECK("__new_post"."comment_status" in ('ENABLE', 'DISABLE')),
	CONSTRAINT "post_status_check" CHECK("__new_post"."status" in ('PUBLISHED', 'DRAFT', 'TO_AUDIT')),
	CONSTRAINT "post_type_check" CHECK("__new_post"."type" in ('ARTICLE', 'MOVIE', 'PHOTOGRAPH', 'QUOTE')),
	CONSTRAINT "post_views_check" CHECK("__new_post"."views" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "comment_status", "gallery_time", "movie_time", "author_id", "category_id", "cover_id", "status", "type", "version", "creation_token", "creation_input_hash", "views", "created_at", "updated_at") SELECT "id", "comment_status", "gallery_time", "movie_time", "author_id", "category_id", "cover_id", "status", "type", 0, NULL, NULL, "views", "created_at", "updated_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `post_status_category_created_idx` ON `post` (`status`,`category_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_status_type_created_idx` ON `post` (`status`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_author_created_idx` ON `post` (`author_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_author_creation_token_unique` ON `post` (`author_id`,`creation_token`);--> statement-breakpoint
CREATE INDEX `post_cover_idx` ON `post` (`cover_id`);