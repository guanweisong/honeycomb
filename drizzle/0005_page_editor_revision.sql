PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_page` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'TO_AUDIT' NOT NULL,
	`template` text DEFAULT 'default' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`creation_token` text,
	`creation_input_hash` text,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "page_status_check" CHECK("__new_page"."status" in ('PUBLISHED', 'DRAFT', 'TO_AUDIT')),
	CONSTRAINT "page_template_check" CHECK("__new_page"."template" in ('default', 'friendly-links')),
	CONSTRAINT "page_version_check" CHECK("__new_page"."version" >= 0),
	CONSTRAINT "page_views_check" CHECK("__new_page"."views" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_page`("id", "author_id", "status", "template", "version", "creation_token", "creation_input_hash", "views", "created_at", "updated_at") SELECT "id", "author_id", "status", "template", 0, NULL, NULL, "views", "created_at", "updated_at" FROM `page`;--> statement-breakpoint
DROP TABLE `page`;--> statement-breakpoint
ALTER TABLE `__new_page` RENAME TO `page`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `page_status_template_created_idx` ON `page` (`status`,`template`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_author_created_idx` ON `page` (`author_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `page_author_creation_token_unique` ON `page` (`author_id`,`creation_token`);