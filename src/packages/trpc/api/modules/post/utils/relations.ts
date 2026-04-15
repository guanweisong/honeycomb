import { inArray } from "drizzle-orm";
import * as schema from "@/packages/db/schema";

/**
 * 加载文章列表的关联数据（分类、作者、封面）
 * @param db - 数据库实例
 * @param posts - 文章列表
 * @returns 带有关联数据的文章列表
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

  const [categories, authors, covers] = await Promise.all([
    categoryIds.length
      ? db
          .select()
          .from(schema.category)
          .where(inArray(schema.category.id, categoryIds as any))
      : Promise.resolve([]),
    authorIds.length
      ? db
          .select()
          .from(schema.user)
          .where(inArray(schema.user.id, authorIds as any))
      : Promise.resolve([]),
    coverIds.length
      ? db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.id, coverIds as any))
      : Promise.resolve([]),
  ]);

  const categoryMap = Object.fromEntries(
    categories.map((c: any) => [c.id, c]),
  );
  const authorMap = Object.fromEntries(authors.map((u: any) => [u.id, u]));
  const coverMap = Object.fromEntries(covers.map((m: any) => [m.id, m]));

  return posts.map((item) => ({
    ...item,
    category: item.categoryId ? categoryMap[item.categoryId] : undefined,
    author: item.authorId ? authorMap[item.authorId] : undefined,
    cover: item.coverId ? coverMap[item.coverId] : undefined,
  }));
}
