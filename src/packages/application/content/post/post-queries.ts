import "server-only";

import { and, eq, sql, inArray } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/infrastructure/db/query/tools";
import type { QueryRecord } from "@/packages/infrastructure/db/query/tools";
import { buildCategoryFilter } from "./post-filters";
import { loadPostRelations } from "./post-relations";
import { PostStatus } from "@/packages/domain/content/post-status";

/**
 * 获取文章列表的业务逻辑
 * @param db - 数据库实例
 * @param input - 查询参数
 * @returns 包含文章列表和总数的对象
 */
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
type ContentVisibility = "PUBLISHED_ONLY" | "ALL";
const ContentVisibility = {
  PUBLISHED_ONLY: "PUBLISHED_ONLY",
  ALL: "ALL",
} as const;
export type PostListQueryInput = QueryRecord & {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  title?: string;
  content?: string;
};

export async function getPostList(
  db: Database,
  input: PostListQueryInput,
  visibility: ContentVisibility = ContentVisibility.PUBLISHED_ONLY,
) {
  const {
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    title,
    content,
    categoryId,
    tagId,
    authorId,
    ...rest
  } = input;

  let where = buildDrizzleWhere(
    schema.post,
    { ...rest, title, content },
    ["status", "type"],
    { title, content },
  );

  if (visibility === ContentVisibility.PUBLISHED_ONLY) {
    const publishedClause = eq(schema.post.status, PostStatus.PUBLISHED);
    where = where ? and(where, publishedClause) : publishedClause;
  }

  // 分类树过滤
  if (categoryId) {
    const ids = await buildCategoryFilter(db, categoryId);
    const catClause = inArray(schema.post.categoryId, ids);
    where = where ? and(where, catClause) : catClause;
  }

  // 标签过滤
  if (tagId) {
    // 使用 postTag 中间表查询
    const postIds = await observeDbOperation(
      "post.service.ids-by-tag",
      "select",
      () =>
        db
          .select({ postId: schema.postTag.postId })
          .from(schema.postTag)
          .where(eq(schema.postTag.tagId, tagId)),
    );

    const postIdList = postIds.map((p: { postId: string }) => p.postId);
    if (postIdList.length === 0) {
      return { list: [], total: 0 };
    }

    const tagClause = inArray(schema.post.id, postIdList);
    where = where ? and(where, tagClause) : tagClause;
  }

  // 作者过滤
  if (authorId) {
    const authorClause = eq(schema.post.authorId, authorId);
    where = where ? and(where, authorClause) : authorClause;
  }

  const orderByClause = buildDrizzleOrderBy(
    schema.post,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );

  const [list, countRows] = await Promise.all([
    observeDbOperation("post.service.list", "select", () =>
      db
        .select()
        .from(schema.post)
        .where(where)
        .orderBy(orderByClause)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("post.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.post)
        .where(where),
    ),
  ]);

  // 加载关联数据
  const mapped = await loadPostRelations(db, list);

  const [countResult] = countRows;
  const total = Number(countResult?.count) || 0;

  return { list: mapped, total };
}
