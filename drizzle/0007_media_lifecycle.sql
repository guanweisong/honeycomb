-- Rebuild to the exact Drizzle schema. Preserve every known inbound reference
-- inside the migration transaction: DROP would otherwise SET NULL post covers.
CREATE TABLE `__migration_0007_post_media_covers` AS SELECT `id`, `cover_id` FROM `post` WHERE `cover_id` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_media_0007` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'UPLOADING' NOT NULL,
	`upload_key` text,
	`upload_expires_at` text,
	`copy_started_at` text,
	`uploaded_by` text,
	`verified_at` text,
	`last_attempt_at` text,
	`last_error_code` text,
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
	CONSTRAINT "media_state_check" CHECK("__new_media_0007"."state" in ('UPLOADING','READY','DELETING','DELETED')),
	CONSTRAINT "media_error_check" CHECK("__new_media_0007"."last_error_code" is null or "__new_media_0007"."last_error_code" in ('STORAGE_PENDING','INVALID_IMAGE','DATABASE_PENDING','DELETE_PENDING')),
	CONSTRAINT "media_size_check" CHECK("__new_media_0007"."size" >= 0),
	CONSTRAINT "media_height_check" CHECK("__new_media_0007"."height" is null or "__new_media_0007"."height" >= 0),
	CONSTRAINT "media_width_check" CHECK("__new_media_0007"."width" is null or "__new_media_0007"."width" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_media_0007` (`id`, `key`, `name`, `size`, `type`, `url`, `color`, `height`, `width`, `created_at`, `updated_at`, `state`) SELECT `id`, `key`, `name`, `size`, `type`, `url`, `color`, `height`, `width`, `created_at`, `updated_at`, 'READY' FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media_0007` RENAME TO `media`;--> statement-breakpoint
CREATE INDEX `media_state_idx` ON `media` (`state`);--> statement-breakpoint
CREATE INDEX `media_key_idx` ON `media` (`key`);--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
UPDATE `post` SET `cover_id` = (SELECT `cover_id` FROM `__migration_0007_post_media_covers` WHERE `__migration_0007_post_media_covers`.`id` = `post`.`id`) WHERE `id` IN (SELECT `id` FROM `__migration_0007_post_media_covers`);--> statement-breakpoint
DROP TABLE `__migration_0007_post_media_covers`;
