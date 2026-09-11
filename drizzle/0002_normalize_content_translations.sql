CREATE TEMP TABLE translation_migration_guard (value integer);--> statement-breakpoint
CREATE TEMP TABLE translation_migration_counts (table_name text primary key, row_count integer not null);--> statement-breakpoint
INSERT INTO translation_migration_counts VALUES
  ('category', (SELECT count(*) FROM category)),
  ('post', (SELECT count(*) FROM post)),
  ('page', (SELECT count(*) FROM page)),
  ('setting', (SELECT count(*) FROM setting)),
  ('tag', (SELECT count(*) FROM tag));--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_category
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM category
  WHERE CASE WHEN
    json_valid(title) = 1 AND json_type(title) = 'object' AND
    json_type(title, '$.en') = 'text' AND trim(json_extract(title, '$.en')) <> '' AND
    json_type(title, '$.zh') = 'text' AND trim(json_extract(title, '$.zh')) <> '' AND
    json_valid(description) = 1 AND json_type(description) = 'object' AND
    json_type(description, '$.en') = 'text' AND trim(json_extract(description, '$.en')) <> '' AND
    json_type(description, '$.zh') = 'text' AND trim(json_extract(description, '$.zh')) <> ''
  THEN 0 ELSE 1 END = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid category translations: query category ids with invalid JSON or missing en/zh values before migrating');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TRIGGER translation_guard_category;--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_page
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM page
  WHERE CASE WHEN
    json_valid(title) = 1 AND json_type(title) = 'object' AND
    json_type(title, '$.en') = 'text' AND trim(json_extract(title, '$.en')) <> '' AND
    json_type(title, '$.zh') = 'text' AND trim(json_extract(title, '$.zh')) <> '' AND
    json_valid(content) = 1 AND json_type(content) = 'object' AND
    json_type(content, '$.en') = 'text' AND trim(json_extract(content, '$.en')) <> '' AND
    json_type(content, '$.zh') = 'text' AND trim(json_extract(content, '$.zh')) <> ''
  THEN 0 ELSE 1 END = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid page translations: query page ids with invalid JSON or missing en/zh values before migrating');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TRIGGER translation_guard_page;--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_tag
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM tag
  WHERE CASE WHEN
    json_valid(name) = 1 AND json_type(name) = 'object' AND
    json_type(name, '$.en') = 'text' AND trim(json_extract(name, '$.en')) <> '' AND
    json_type(name, '$.zh') = 'text' AND trim(json_extract(name, '$.zh')) <> ''
  THEN 0 ELSE 1 END = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid tag translations: query tag ids with invalid JSON or missing en/zh values before migrating');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TRIGGER translation_guard_tag;--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_post
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM post
  WHERE (title IS NOT NULL AND (json_valid(title) <> 1 OR json_type(title) <> 'object'))
     OR (content IS NOT NULL AND (json_valid(content) <> 1 OR json_type(content) <> 'object'))
     OR (excerpt IS NOT NULL AND (json_valid(excerpt) <> 1 OR json_type(excerpt) <> 'object'))
     OR (gallery_location IS NOT NULL AND (json_valid(gallery_location) <> 1 OR json_type(gallery_location) <> 'object'))
     OR (quote_author IS NOT NULL AND (json_valid(quote_author) <> 1 OR json_type(quote_author) <> 'object'))
     OR (quote_content IS NOT NULL AND (json_valid(quote_content) <> 1 OR json_type(quote_content) <> 'object'))
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid post translations: query post ids containing invalid JSON before migrating');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TRIGGER translation_guard_post;--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_setting
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM setting
  WHERE json_valid(site_name) <> 1 OR json_type(site_name) <> 'object'
     OR json_valid(site_sub_name) <> 1 OR json_type(site_sub_name) <> 'object'
     OR json_valid(site_signature) <> 1 OR json_type(site_signature) <> 'object'
     OR json_valid(site_copyright) <> 1 OR json_type(site_copyright) <> 'object'
)
BEGIN
  SELECT RAISE(ABORT, 'Invalid setting translations: query setting ids containing invalid JSON before migrating');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TRIGGER translation_guard_setting;--> statement-breakpoint

CREATE TABLE `category_translation` (
	`category_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	PRIMARY KEY(`category_id`, `locale`),
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "category_translation_locale_check" CHECK("category_translation"."locale" in ('zh', 'en'))
);
--> statement-breakpoint
CREATE TABLE `page_translation` (
	`page_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`page_id`, `locale`),
	FOREIGN KEY (`page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "page_translation_locale_check" CHECK("page_translation"."locale" in ('zh', 'en'))
);
--> statement-breakpoint
CREATE TABLE `post_translation` (
	`post_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text,
	`content` text,
	`excerpt` text,
	`gallery_location` text,
	`quote_author` text,
	`quote_content` text,
	PRIMARY KEY(`post_id`, `locale`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "post_translation_locale_check" CHECK("post_translation"."locale" in ('zh', 'en'))
);
--> statement-breakpoint
CREATE TABLE `setting_translation` (
	`setting_id` text NOT NULL,
	`locale` text NOT NULL,
	`site_name` text,
	`site_sub_name` text,
	`site_signature` text,
	`site_copyright` text,
	PRIMARY KEY(`setting_id`, `locale`),
	FOREIGN KEY (`setting_id`) REFERENCES `setting`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "setting_translation_locale_check" CHECK("setting_translation"."locale" in ('zh', 'en'))
);
--> statement-breakpoint
CREATE TABLE `tag_translation` (
	`tag_id` text NOT NULL,
	`locale` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`tag_id`, `locale`),
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tag_translation_locale_check" CHECK("tag_translation"."locale" in ('zh', 'en'))
);
--> statement-breakpoint
INSERT INTO category_translation (category_id, locale, title, description)
SELECT id, 'en', json_extract(title, '$.en'), json_extract(description, '$.en') FROM category
UNION ALL
SELECT id, 'zh', json_extract(title, '$.zh'), json_extract(description, '$.zh') FROM category;--> statement-breakpoint
INSERT INTO page_translation (page_id, locale, title, content)
SELECT id, 'en', json_extract(title, '$.en'), json_extract(content, '$.en') FROM page
UNION ALL
SELECT id, 'zh', json_extract(title, '$.zh'), json_extract(content, '$.zh') FROM page;--> statement-breakpoint
INSERT INTO tag_translation (tag_id, locale, name)
SELECT id, 'en', json_extract(name, '$.en') FROM tag
UNION ALL
SELECT id, 'zh', json_extract(name, '$.zh') FROM tag;--> statement-breakpoint
INSERT INTO post_translation (post_id, locale, title, content, excerpt, gallery_location, quote_author, quote_content)
SELECT id, 'en', json_extract(title, '$.en'), json_extract(content, '$.en'), json_extract(excerpt, '$.en'), json_extract(gallery_location, '$.en'), json_extract(quote_author, '$.en'), json_extract(quote_content, '$.en')
FROM post
WHERE json_type(title, '$.en') = 'text' OR json_type(content, '$.en') = 'text' OR json_type(excerpt, '$.en') = 'text' OR json_type(gallery_location, '$.en') = 'text' OR json_type(quote_author, '$.en') = 'text' OR json_type(quote_content, '$.en') = 'text'
UNION ALL
SELECT id, 'zh', json_extract(title, '$.zh'), json_extract(content, '$.zh'), json_extract(excerpt, '$.zh'), json_extract(gallery_location, '$.zh'), json_extract(quote_author, '$.zh'), json_extract(quote_content, '$.zh')
FROM post
WHERE json_type(title, '$.zh') = 'text' OR json_type(content, '$.zh') = 'text' OR json_type(excerpt, '$.zh') = 'text' OR json_type(gallery_location, '$.zh') = 'text' OR json_type(quote_author, '$.zh') = 'text' OR json_type(quote_content, '$.zh') = 'text';--> statement-breakpoint
INSERT INTO setting_translation (setting_id, locale, site_name, site_sub_name, site_signature, site_copyright)
SELECT id, 'en', json_extract(site_name, '$.en'), json_extract(site_sub_name, '$.en'), json_extract(site_signature, '$.en'), json_extract(site_copyright, '$.en')
FROM setting
WHERE json_type(site_name, '$.en') = 'text' OR json_type(site_sub_name, '$.en') = 'text' OR json_type(site_signature, '$.en') = 'text' OR json_type(site_copyright, '$.en') = 'text'
UNION ALL
SELECT id, 'zh', json_extract(site_name, '$.zh'), json_extract(site_sub_name, '$.zh'), json_extract(site_signature, '$.zh'), json_extract(site_copyright, '$.zh')
FROM setting
WHERE json_type(site_name, '$.zh') = 'text' OR json_type(site_sub_name, '$.zh') = 'text' OR json_type(site_signature, '$.zh') = 'text' OR json_type(site_copyright, '$.zh') = 'text';--> statement-breakpoint
ALTER TABLE `category` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `category` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `page` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `page` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `gallery_location`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `excerpt`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `quote_author`;--> statement-breakpoint
ALTER TABLE `post` DROP COLUMN `quote_content`;--> statement-breakpoint
ALTER TABLE `setting` DROP COLUMN `site_name`;--> statement-breakpoint
ALTER TABLE `setting` DROP COLUMN `site_sub_name`;--> statement-breakpoint
ALTER TABLE `setting` DROP COLUMN `site_signature`;--> statement-breakpoint
ALTER TABLE `setting` DROP COLUMN `site_copyright`;--> statement-breakpoint
ALTER TABLE `tag` DROP COLUMN `name`;--> statement-breakpoint

CREATE TEMP TRIGGER translation_guard_final
BEFORE INSERT ON translation_migration_guard
WHEN EXISTS (
  SELECT 1 FROM translation_migration_counts c
  WHERE c.row_count <> CASE c.table_name
    WHEN 'category' THEN (SELECT count(*) FROM category)
    WHEN 'post' THEN (SELECT count(*) FROM post)
    WHEN 'page' THEN (SELECT count(*) FROM page)
    WHEN 'setting' THEN (SELECT count(*) FROM setting)
    WHEN 'tag' THEN (SELECT count(*) FROM tag)
  END
)
OR EXISTS (SELECT 1 FROM category WHERE (SELECT count(*) FROM category_translation WHERE category_id = category.id) <> 2)
OR EXISTS (SELECT 1 FROM page WHERE (SELECT count(*) FROM page_translation WHERE page_id = page.id) <> 2)
OR EXISTS (SELECT 1 FROM tag WHERE (SELECT count(*) FROM tag_translation WHERE tag_id = tag.id) <> 2)
OR EXISTS (SELECT 1 FROM category_translation WHERE category_id NOT IN (SELECT id FROM category))
OR EXISTS (SELECT 1 FROM post_translation WHERE post_id NOT IN (SELECT id FROM post))
OR EXISTS (SELECT 1 FROM page_translation WHERE page_id NOT IN (SELECT id FROM page))
OR EXISTS (SELECT 1 FROM setting_translation WHERE setting_id NOT IN (SELECT id FROM setting))
OR EXISTS (SELECT 1 FROM tag_translation WHERE tag_id NOT IN (SELECT id FROM tag))
OR EXISTS (SELECT 1 FROM pragma_table_info('category') WHERE name IN ('description', 'title'))
OR EXISTS (SELECT 1 FROM pragma_table_info('page') WHERE name IN ('content', 'title'))
OR EXISTS (SELECT 1 FROM pragma_table_info('post') WHERE name IN ('gallery_location', 'content', 'excerpt', 'title', 'quote_author', 'quote_content'))
OR EXISTS (SELECT 1 FROM pragma_table_info('setting') WHERE name IN ('site_name', 'site_sub_name', 'site_signature', 'site_copyright'))
OR EXISTS (SELECT 1 FROM pragma_table_info('tag') WHERE name = 'name')
BEGIN
  SELECT RAISE(ABORT, 'Translation migration verification failed: compare parent counts, required translations, orphans, and legacy columns');
END;--> statement-breakpoint
INSERT INTO translation_migration_guard VALUES (1);--> statement-breakpoint
DROP TABLE translation_migration_guard;--> statement-breakpoint
DROP TABLE translation_migration_counts;
