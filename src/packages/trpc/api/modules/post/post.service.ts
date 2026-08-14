import "server-only";

import { and, eq, sql, inArray } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import {
  buildDrizzleWhere,
  buildDrizzleOrderBy,
} from "@/packages/trpc/api/utils/tools";
import { buildCategoryFilter } from "./utils/filters";
import { loadPostRelations } from "./utils/relations";
import { getAllImageLinkFormHtml } from "@/packages/trpc/api/utils/get-all-image-link-form-html";

/**
 * 获取文章列表的业务逻辑
 * @param db - 数据库实例
 * @param input - 查询参数
 * @returns 包含文章列表和总数的对象
 */
import { PostListQueryInput } from "./schemas/post.list.query.schema";
import { PostStatus } from "@/packages/domain/content/post-status";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { TRPCError } from "@trpc/server";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";
import { TagType } from "@/packages/domain/content/tag";
import {
  bumpCacheVersion,
  getCacheJSON,
  getCacheVersion,
  setCacheJSON,
} from "@/packages/trpc/api/utils/upstash-cache";

const POST_INDEX_CACHE_VERSION_KEY = "cache:post:index:version";
const POST_INDEX_CACHE_NAMESPACE = "post.index";

export async function getPostList(
  db: Database,
  input: PostListQueryInput,
  visibility = ContentVisibility.PUBLISHED_ONLY,
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

export async function getPostDetail(
  db: Database,
  id: string,
  visibility = ContentVisibility.PUBLISHED_ONLY,
) {
  const idFilter = eq(schema.post.id, id);
  const [item] = await observeDbOperation("post.service.detail", "select", () =>
    db
      .select()
      .from(schema.post)
      .where(
        visibility === ContentVisibility.ALL
          ? idFilter
          : and(idFilter, eq(schema.post.status, PostStatus.PUBLISHED)),
      )
      .limit(1),
  );

  if (!item) return null;

  const [result] = await loadPostRelations(db, [item]);
  const imageUrls = getAllImageLinkFormHtml(result?.content?.zh);
  const imagesInContent = imageUrls.length
    ? await observeDbOperation("post.service.detail-images", "select", () =>
        db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.url, imageUrls)),
      )
    : [];

  return {
    ...result,
    imagesInContent,
  };
}

/**
 * 查询公开文章列表并使用版本化缓存。
 * @param db - 数据库实例。
 * @param input - 文章列表查询条件。
 * @returns 文章列表和总数。
 */
export async function getCachedPostList(
  db: Database,
  input: PostListQueryInput,
) {
  const cacheVersion = await getCacheVersion(
    POST_INDEX_CACHE_NAMESPACE,
    POST_INDEX_CACHE_VERSION_KEY,
  );
  const cacheKey = `post:index:v${cacheVersion}:${JSON.stringify(input)}`;
  const cached = await getCacheJSON<Awaited<ReturnType<typeof getPostList>>>(
    POST_INDEX_CACHE_NAMESPACE,
    cacheKey,
  );
  if (cached) return cached;

  const result = await getPostList(db, input, ContentVisibility.PUBLISHED_ONLY);
  await setCacheJSON(POST_INDEX_CACHE_NAMESPACE, cacheKey, result, 60 * 60);
  return result;
}

async function invalidatePostIndex() {
  await bumpCacheVersion(
    POST_INDEX_CACHE_NAMESPACE,
    POST_INDEX_CACHE_VERSION_KEY,
  );
}

/**
 * 创建文章并失效文章索引缓存。
 * @param db - 数据库实例。
 * @param input - 文章创建数据。
 * @param authorId - 当前作者 ID。
 * @returns 新建文章。
 */
export async function createPost(
  db: Database,
  input: PostInsertInput,
  authorId: string,
) {
  const [newPost] = await observeDbOperation("post.create", "insert", () =>
    db
      .insert(schema.post)
      .values(toPostInsertValues(input, authorId))
      .returning(),
  );
  await invalidatePostIndex();
  return newPost;
}

/**
 * 批量删除文章并失效文章索引缓存。
 * @param db - 数据库实例。
 * @param ids - 待删除文章 ID。
 * @returns 删除成功结果。
 */
export async function destroyPosts(db: Database, ids: string[]) {
  await observeDbOperation("post.destroy", "delete", () =>
    db.delete(schema.post).where(inArray(schema.post.id, ids)),
  );
  await invalidatePostIndex();
  return { success: true as const };
}

/**
 * 更新文章并失效文章索引缓存。
 * @param db - 数据库实例。
 * @param input - 文章更新数据。
 * @returns 更新后的文章。
 */
export async function updatePost(db: Database, input: PostUpdateInput) {
  const { id, ...rest } = input;
  const [updatedPost] = await observeDbOperation("post.update", "update", () =>
    db
      .update(schema.post)
      .set(toPostUpdateValues(rest))
      .where(eq(schema.post.id, id))
      .returning(),
  );
  await invalidatePostIndex();
  return updatedPost;
}

/**
 * 查询指定分类下的公开随机文章。
 * @param db - 数据库实例。
 * @param categoryId - 分类 ID。
 * @returns 随机文章摘要列表。
 */
export async function getRandomPostsByCategory(
  db: Database,
  categoryId: string,
) {
  return observeDbOperation("post.random-by-category", "select", () =>
    db
      .select({
        id: schema.post.id,
        title: schema.post.title,
        quoteContent: schema.post.quoteContent,
      })
      .from(schema.post)
      .where(
        and(
          eq(schema.post.categoryId, categoryId),
          eq(schema.post.status, PostStatus.PUBLISHED),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(10),
  );
}

/**
 * 将公开文章浏览量增加一次。
 * @param db - 数据库实例。
 * @param id - 文章 ID。
 * @throws 文章不存在或不是公开文章时抛出 NOT_FOUND。
 * @returns 更新后的浏览量。
 */
export async function incrementPostViews(db: Database, id: string) {
  const [updatedPost] = await observeDbOperation(
    "post.increment-views",
    "update",
    () =>
      db
        .update(schema.post)
        .set({ views: sql`${schema.post.views} + 1` })
        .where(
          and(
            eq(schema.post.id, id),
            eq(schema.post.status, PostStatus.PUBLISHED),
          ),
        )
        .returning({ views: schema.post.views }),
  );
  if (!updatedPost) throw new TRPCError({ code: "NOT_FOUND" });
  return updatedPost;
}

/**
 * 查询公开文章所属分类。
 * @param db - 数据库实例。
 * @param id - 文章 ID。
 * @returns 分类 ID；文章不存在时返回 undefined。
 */
export async function getPublishedPostCategoryId(db: Database, id: string) {
  const [result] = await observeDbOperation("post.category-id", "select", () =>
    db
      .select({ categoryId: schema.post.categoryId })
      .from(schema.post)
      .where(
        and(
          eq(schema.post.id, id),
          eq(schema.post.status, PostStatus.PUBLISHED),
        ),
      ),
  );
  return result;
}

/**
 * 在事务中替换文章标签关联。
 * @param db - 数据库实例。
 * @param input - 文章、标签和标签类型。
 * @returns 更新成功结果。
 */
export async function updatePostTags(
  db: Database,
  input: { postId: string; tagIds: string[]; type: TagType },
) {
  await observeDbOperation("post.update-tags", "transaction", () =>
    db.transaction(async (tx) => {
      await tx
        .delete(schema.postTag)
        .where(
          and(
            eq(schema.postTag.postId, input.postId),
            eq(schema.postTag.type, input.type),
          ),
        );
      if (input.tagIds.length > 0) {
        await tx
          .insert(schema.postTag)
          .values(
            input.tagIds.map((tagId) => ({
              postId: input.postId,
              tagId,
              type: input.type,
            })),
          );
      }
    }),
  );
  await invalidatePostIndex();
  return { success: true as const };
}

type PostInsertInput = Parameters<typeof toPostInsertValues>[0];
type PostUpdateInput = Parameters<typeof toPostUpdateValues>[0] & {
  id: string;
};
