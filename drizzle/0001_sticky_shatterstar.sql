-- Refuse ambiguous public URLs before changing indexes or association data.
CREATE TABLE category_path_migration_guard (
  value integer CONSTRAINT "Duplicate category paths: resolve paths before migrating" CHECK (value = 0)
);--> statement-breakpoint
INSERT INTO category_path_migration_guard (value)
SELECT 1 WHERE EXISTS (SELECT path FROM category GROUP BY path HAVING count(*) > 1);--> statement-breakpoint
DROP TABLE category_path_migration_guard;--> statement-breakpoint
-- Keep the earliest association row for each tuple without changing meaning.
DELETE FROM post_tag WHERE rowid NOT IN (
  SELECT min(rowid) FROM post_tag GROUP BY post_id, tag_id, type
);--> statement-breakpoint
DROP INDEX `category_path_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_path_idx` ON `category` (`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_tag_post_tag_type_unique` ON `post_tag` (`post_id`,`tag_id`,`type`);
