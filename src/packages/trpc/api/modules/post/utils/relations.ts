import { inArray, eq } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";

/**
 * 批量加载文章的关联数据（分类、作者、封面、标签）。
 * 通过一次性查询所有关联实体的 ID，然后批量查询对应的实体数据，最后将实体数据关联到文章对象上。
 * 这种方式避免了 N+1 查询问题，提高了查询效率。
 */
export async function loadPostRelations(db: any, posts: any[]): Promise<any[]> {
  const categoryIds = Array.from(
    new Set(posts.map((p) => p.categoryId).filter(Boolean)),
  );
  const authorIds = Array.from(
    new Set(posts.map((p) => p.authorId).filter(Boolean)),
  );
  const coverIds = Array.from(
    new Set(posts.map((p) => p.coverId).filter(Boolean)),
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
    categories.map((c: any) => [c.id, c]),
  );
  const authorMap = Object.fromEntries(authors.map((u: any) => [u.id, u]));
  const coverMap = Object.fromEntries(covers.map((m: any) => [m.id, m]));
  const tagMap = Object.fromEntries(tags.map((t: any) => [t.id, t]));

  // 按 postId 分组 postTags
  const postTagMap: Record<string, any[]> = {};
  for (const pt of postTags) {
    if (!postTagMap[pt.postId]) {
      postTagMap[pt.postId] = [];
    }
    postTagMap[pt.postId].push(pt);
  }

  return posts.map((item) => {
    const postTagsArray = postTagMap[item.id] || [];

    // 根据 type 字段分类
    const movieActors = postTagsArray
      .filter((pt: any) => pt.type === TagType.ACTOR)
      .map((pt: any) => tagMap[pt.tagId])
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, name: t.name }));
    const movieDirectors = postTagsArray
      .filter((pt: any) => pt.type === TagType.DIRECTOR)
      .map((pt: any) => tagMap[pt.tagId])
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, name: t.name }));
    const movieStyles = postTagsArray
      .filter((pt: any) => pt.type === TagType.MOVIE_STYLE)
      .map((pt: any) => tagMap[pt.tagId])
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, name: t.name }));
    const galleryStyles = postTagsArray
      .filter((pt: any) => pt.type === TagType.GALLERY_STYLE)
      .map((pt: any) => tagMap[pt.tagId])
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, name: t.name }));

    return {
      ...item,
      category: item.categoryId ? categoryMap[item.categoryId] : undefined,
      author: item.authorId ? authorMap[item.authorId] : undefined,
      cover: item.coverId ? coverMap[item.coverId] : undefined,
      movieActors,
      movieDirectors,
      movieStyles,
      galleryStyles,
    };
  });
}
