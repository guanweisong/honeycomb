import { TagType } from "@/packages/domain/content/tag";
import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { post } from "./content-post";
import { tag } from "./content-tag";
import { enumCheck } from "../constraint-helpers";

/**
 * 文章-标签中间表 (post_tag)
 * 存储文章与标签的多对多关系。
 */
export const postTag = sqliteTable(
  "post_tag",
  {
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 标签类型：ACTOR, DIRECTOR, MOVIE_STYLE, GALLERY_STYLE
  },
  (table) => ({
    postTagUniqueIdx: uniqueIndex("post_tag_post_tag_type_unique").on(
      table.postId,
      table.tagId,
      table.type,
    ),
    postTagIdx: index("post_tag_post_tag_idx").on(table.postId, table.tagId),
    postTagTagTypeIdx: index("post_tag_tag_type_idx").on(
      table.tagId,
      table.type,
    ),
    postTagTypeCheck: enumCheck(
      "post_tag_type_check",
      table.type,
      Object.values(TagType),
    ),
  }),
);
