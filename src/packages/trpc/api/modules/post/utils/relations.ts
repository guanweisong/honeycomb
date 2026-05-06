import { inArray } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import type { Database } from "@/packages/db/db";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";
import { InferSelectModel } from "drizzle-orm";

type PostRecord = InferSelectModel<typeof schema.post>;
type CategoryRecord = InferSelectModel<typeof schema.category>;
type UserRecord = Omit<InferSelectModel<typeof schema.user>, "password">;
type MediaRecord = InferSelectModel<typeof schema.media>;
type TagRecord = InferSelectModel<typeof schema.tag>;
type PostTagRecord = InferSelectModel<typeof schema.postTag>;

export type PostWithRelations = PostRecord & {
  category?: CategoryRecord;
  author?: UserRecord;
  cover?: MediaRecord;
  movieActors: TagRecord[];
  movieDirectors: TagRecord[];
  movieStyles: TagRecord[];
  galleryStyles: TagRecord[];
};

/**
 * 批量加载文章的关联数据（分类、作者、封面、标签）。
 *
 * 实现说明：
 * 1. 使用 Drizzle relational query 一次性加载 `post` 的关联对象，避免 N+1。
 * 2. `author` 采用列白名单查询，不返回 `password` 等敏感字段。
 * 3. 最终返回顺序与入参 `posts` 一致，便于调用方按原分页顺序渲染。
 */
export async function loadPostRelations(
  db: Database,
  posts: PostRecord[],
): Promise<PostWithRelations[]> {
  const postIds = Array.from(new Set(posts.map((p) => p.id).filter(Boolean)));

  if (!postIds.length) return [];

  const relationRows = await db.query.post.findMany({
    where: inArray(schema.post.id, postIds),
    with: {
      category: true,
      author: {
        columns: {
          id: true,
          email: true,
          level: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      cover: true,
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const relationMap = new Map(relationRows.map((row) => [row.id, row]));

  /**
   * 根据标签类型筛选并映射标签实体列表。
   */
  const mapRelationTags = (
    postTagsArray: Array<PostTagRecord & { tag: TagRecord | null }>,
    type: TagType,
  ): TagRecord[] =>
    postTagsArray
      .filter((postTag) => postTag.type === type)
      .map((postTag) => postTag.tag)
      .filter((tag): tag is TagRecord => Boolean(tag));

  return posts.map((item) => {
    const row = relationMap.get(item.id);
    const postTagsArray = row?.postTags ?? [];

    return {
      ...item,
      category: row?.category ?? undefined,
      author: row?.author ?? undefined,
      cover: row?.cover ?? undefined,
      movieActors: mapRelationTags(postTagsArray, TagType.ACTOR),
      movieDirectors: mapRelationTags(postTagsArray, TagType.DIRECTOR),
      movieStyles: mapRelationTags(postTagsArray, TagType.MOVIE_STYLE),
      galleryStyles: mapRelationTags(postTagsArray, TagType.GALLERY_STYLE),
    };
  });
}
