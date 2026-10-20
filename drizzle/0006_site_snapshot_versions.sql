CREATE TABLE `menu_revision` (
	`singleton_key` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_revision_singleton_check" CHECK("menu_revision"."singleton_key" = 1),
	CONSTRAINT "menu_revision_version_check" CHECK("menu_revision"."version" >= 0)
);
--> statement-breakpoint
-- Preserve the parent and every translation inside the migrator transaction.
-- Explicitly empty children before rebuilding the parent so this works with
-- foreign_keys=ON (PRAGMA foreign_keys=OFF has no effect inside a transaction).
CREATE TABLE `__setting_version_backup` AS SELECT * FROM `setting`;
--> statement-breakpoint
CREATE TABLE `__setting_translation_version_backup` AS SELECT * FROM `setting_translation`;
--> statement-breakpoint
DELETE FROM `setting_translation`;
--> statement-breakpoint
DROP TABLE `setting`;
--> statement-breakpoint
CREATE TABLE `setting` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`singleton_key` integer DEFAULT 1 NOT NULL,
	`site_record_no` text,
	`site_record_url` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT "setting_version_check" CHECK("setting"."version" >= 0),
	CONSTRAINT "setting_singleton_check" CHECK("setting"."singleton_key" = 1)
);
--> statement-breakpoint
INSERT INTO `setting` (`id`, `version`, `singleton_key`, `site_record_no`, `site_record_url`, `created_at`, `updated_at`)
SELECT `id`, 0, `singleton_key`, `site_record_no`, `site_record_url`, `created_at`, `updated_at` FROM `__setting_version_backup`;
--> statement-breakpoint
CREATE UNIQUE INDEX `setting_singleton_idx` ON `setting` (`singleton_key`);
--> statement-breakpoint
INSERT INTO `setting_translation` (`setting_id`, `locale`, `site_name`, `site_sub_name`, `site_signature`, `site_copyright`)
SELECT `setting_id`, `locale`, `site_name`, `site_sub_name`, `site_signature`, `site_copyright` FROM `__setting_translation_version_backup`;
--> statement-breakpoint
DROP TABLE `__setting_translation_version_backup`;
--> statement-breakpoint
DROP TABLE `__setting_version_backup`;
--> statement-breakpoint
INSERT INTO `menu_revision` (`singleton_key`, `version`) VALUES (1, 0);
