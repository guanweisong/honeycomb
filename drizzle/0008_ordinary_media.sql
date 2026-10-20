-- Abort before touching legacy data if any unresolved row remains. This guard
-- reports only a count through a named constraint, never original row contents.
CREATE TABLE `__migration_0008_ready_guard` (
  `unresolved_count` integer NOT NULL,
  CONSTRAINT `media_unresolved_rows_require_manual_review` CHECK (`unresolved_count` = 0)
);--> statement-breakpoint
INSERT INTO `__migration_0008_ready_guard` SELECT COUNT(*) FROM `media` WHERE `state` <> 'READY';--> statement-breakpoint
DROP TABLE `__migration_0008_ready_guard`;--> statement-breakpoint
-- Rebuild to the exact Drizzle schema. Preserve every known inbound reference
-- inside the migration transaction: DROP would otherwise SET NULL post covers.
CREATE TABLE `__migration_0008_post_media_covers` AS SELECT `id`, `cover_id` FROM `post` WHERE `cover_id` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_media_0008` (
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
	CONSTRAINT "media_size_check" CHECK("__new_media_0008"."size" >= 0),
	CONSTRAINT "media_height_check" CHECK("__new_media_0008"."height" is null or "__new_media_0008"."height" >= 0),
	CONSTRAINT "media_width_check" CHECK("__new_media_0008"."width" is null or "__new_media_0008"."width" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_media_0008` (`id`, `key`, `name`, `size`, `type`, `url`, `color`, `height`, `width`, `created_at`, `updated_at`) SELECT `id`, `key`, `name`, `size`, `type`, `url`, `color`, `height`, `width`, `created_at`, `updated_at` FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media_0008` RENAME TO `media`;--> statement-breakpoint
CREATE INDEX `media_key_idx` ON `media` (`key`);--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media` (`created_at`);--> statement-breakpoint
UPDATE `post` SET `cover_id` = (SELECT `cover_id` FROM `__migration_0008_post_media_covers` WHERE `__migration_0008_post_media_covers`.`id` = `post`.`id`) WHERE `id` IN (SELECT `id` FROM `__migration_0008_post_media_covers`);--> statement-breakpoint
DROP TABLE `__migration_0008_post_media_covers`;
