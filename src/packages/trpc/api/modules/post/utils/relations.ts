import { inArray } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import type { Database } from "@/packages/db/db";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";
import { InferSelectModel } from "drizzle-orm";

type PostRecord = InferSelectModel<typeof schema.post>;
type CategoryRecord = InferSelectModel<typeof schema.category>;
type UserRecord = InferSelectModel<typeof schema.user>;
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
 * 通过一次性查询所有关联实体的 ID，然后批量查询对应的实体数据，最后将实体数据关联到文章对象上。
 * 这种方式避免了 N+1 查询问题，提高了查询效率。
 */
export async function loadPostRelations(
  db: Database,
  posts: PostRecord[],
): Promise<PostWithRelations[]> {
  const categoryIds = Array.from(new Set(posts.map((p) => p.categoryId)));
  const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));
  const coverIds = Array.from(
    new Set(posts.map((p) => p.coverId).filter((id): id is string => Boolean(id))),
  );
  const postIds = Array.from(new Set(posts.map((p) => p.id).filter(Boolean)));

  const [categories, authors, covers, postTags, tags] = await Promise.all([
    categoryIds.length
      ? db
          .select()
          .from(schema.category)
          .where(inArray(schema.category.id, categoryIds))
      : Promise.resolve([]),
    authorIds.length
      ? db
          .select()
          .from(schema.user)
          .where(inArray(schema.user.id, authorIds))
      : Promise.resolve([]),
    coverIds.length
      ? db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.id, coverIds))
      : Promise.resolve([]),
    postIds.length
      ? db
          .select()
          .from(schema.postTag)
          .where(inArray(schema.postTag.postId, postIds))
      : Promise.resolve([]),
    postIds.length
      ? db
          .select()
          .from(schema.tag)
      : Promise.resolve([]),
  ]);

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category]),
  ) as Record<string, CategoryRecord>;
  const authorMap = Object.fromEntries(
    authors.map((author) => [author.id, author]),
  ) as Record<string, UserRecord>;
  const coverMap = Object.fromEntries(
    covers.map((cover) => [cover.id, cover]),
  ) as Record<string, MediaRecord>;
  const tagMap = Object.fromEntries(tags.map((tag) => [tag.id, tag])) as Record<
    string,
    TagRecord
  >;

  // 按 postId 分组 postTags
  const postTagMap: Record<string, PostTagRecord[]> = {};
  for (const pt of postTags) {
    if (!postTagMap[pt.postId]) {
      postTagMap[pt.postId] = [];
    }
    postTagMap[pt.postId].push(pt);
  }

  const mapRelationTags = (
    postTagsArray: PostTagRecord[],
    type: TagType,
  ): TagRecord[] =>
    postTagsArray
      .filter((postTag) => postTag.type === type)
      .map((postTag) => tagMap[postTag.tagId])
      .filter((tag): tag is TagRecord => Boolean(tag));

  return posts.map((item) => {
    const postTagsArray = postTagMap[item.id] || [];

    return {
      ...item,
      category: item.categoryId ? categoryMap[item.categoryId] : undefined,
      author: item.authorId ? authorMap[item.authorId] : undefined,
      cover: item.coverId ? coverMap[item.coverId] : undefined,
      movieActors: mapRelationTags(postTagsArray, TagType.ACTOR),
      movieDirectors: mapRelationTags(postTagsArray, TagType.DIRECTOR),
      movieStyles: mapRelationTags(postTagsArray, TagType.MOVIE_STYLE),
      galleryStyles: mapRelationTags(postTagsArray, TagType.GALLERY_STYLE),
    };
  });
}
