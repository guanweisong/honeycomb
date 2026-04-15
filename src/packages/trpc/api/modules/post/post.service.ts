import { and, or, eq, like, sql } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import { buildDrizzleWhere, buildDrizzleOrderBy } from "@/packages/trpc/api/libs/tools";
import { buildCategoryFilter, buildTagFilter, buildAuthorFilter } from "./utils/filters";
import { loadPostRelations } from "./utils/relations";

/**
 * 获取文章列表的业务逻辑
 * @param db - 数据库实例
 * @param input - 查询参数
 * @returns 包含文章列表和总数的对象
 */
export async function getPostList(db: any, input: any) {
  const {
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    title,
    content,
    categoryId,
    tagName,
    userName,
    ...rest
  } = input;

  let where = buildDrizzleWhere(
    schema.post,
    { ...rest, title, content },
    ["status", "type"],
    { title, content },
  );

  // 分类树过滤
  if (categoryId) {
    const ids = await buildCategoryFilter(db, categoryId);
    const catClause = or(
      ...ids.map((id: string) => eq(schema.post.categoryId, id)),
    );
    where = where ? and(where, catClause) : catClause;
  }

  // 标签名过滤
  if (tagName) {
    const tagId = await buildTagFilter(db, tagName);
    if (!tagId) {
      return { list: [], total: 0 };
    }
    const idLike = `%${tagId}%`;
    const tagClause = or(
      like(schema.post.galleryStyleIds, idLike),
      like(schema.post.movieActorIds, idLike),
      like(schema.post.movieStyleIds, idLike),
      like(schema.post.movieDirectorIds, idLike),
    );
    where = where ? and(where, tagClause) : tagClause;
  }

  // 作者名过滤
  if (userName) {
    const authorId = await buildAuthorFilter(db, userName);
    if (!authorId) {
      return { list: [], total: 0 };
    }
    const authorClause = eq(schema.post.authorId, authorId);
    where = where ? and(where, authorClause) : authorClause;
  }

  const orderByClause = buildDrizzleOrderBy(
    schema.post,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );

  const list = await db
    .select()
    .from(schema.post)
    .where(where)
    .orderBy(orderByClause)
    .limit(limit)
    .offset((page - 1) * limit);

  // 加载关联数据
  const mapped = await loadPostRelations(db, list);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.post)
    .where(where);
  const total = Number(countResult?.count) || 0;

  return { list: mapped, total };
}
