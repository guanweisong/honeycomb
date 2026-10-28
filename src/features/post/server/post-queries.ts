import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { assembleLocalizedField } from "@/lib/db/translation-values";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { PostStatus } from "@/features/post/types/post.status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { readMediaByUrls } from "@/features/media/server/read-media-by-urls";
import { getLocalizedImageLinks } from "@/lib/content/image-links";
import { observeDbOperation } from "@/lib/observability/server";
import {
  loadPostRelations,
  loadAdminPostListItems,
  loadPublicPostListItems,
  toMediaRecord,
} from "@/features/post/server/post-relations";
import type {
  PostListInput,
  PostVisibility,
} from "@/features/post/types/post.list-query";
import type {
  AdminPostListResult,
  PostDetailResult,
  PublicPostListResult,
} from "@/features/post/types/post.read-model";

async function getPostCategoryIds(db: Database, categoryId: string) {
  const subCategories = await observeDbOperation(
    "post.service.category-tree",
    "select",
    () =>
      db.all<{ id: string }>(sql`with recursive descendants(id) as (
        select ${categoryId}
        union
        select c.id from category c join descendants d on c.parent = d.id
      ) select id from descendants`),
  );
  return subCategories.map((category) => category.id);
}

async function listPostIds(
  db: Database,
  input: PostListInput,
  visibility: PostVisibility,
) {
  const {
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
    sortField,
    sortOrder,
    title,
    content,
    categoryId,
    tagId,
    authorId,
    ...rest
  } = input;
  let where = buildDrizzleWhere(schema.post, rest, ["status", "type"]);
  for (const [column, value] of [
    [schema.postTranslation.title, title],
    [schema.postTranslation.content, content],
  ] as const) {
    if (!value) continue;
    const match = sql`exists (
      select 1 from ${schema.postTranslation}
      where ${schema.postTranslation.postId} = ${schema.post.id}
        and ${column} like ${`%${value}%`}
    )`;
    where = where ? and(where, match) : match;
  }
  // 权限入口传入的可见范围与客户端筛选条件取交集，不能被请求中的 status 放宽。
  if (visibility === "PUBLISHED_ONLY") {
    const published = eq(schema.post.status, PostStatus.PUBLISHED);
    where = where ? and(where, published) : published;
  }
  if (categoryId) {
    const ids = await getPostCategoryIds(db, categoryId);
    const clause = inArray(schema.post.categoryId, ids);
    where = where ? and(where, clause) : clause;
  }
  if (tagId) {
    const clause = sql`exists (
      select 1 from ${schema.postTag}
      where ${schema.postTag.postId} = ${schema.post.id}
        and ${schema.postTag.tagId} = ${tagId}
    )`;
    where = where ? and(where, clause) : clause;
  }
  if (authorId) {
    const clause = eq(schema.post.authorId, authorId);
    where = where ? and(where, clause) : clause;
  }
  const order = buildDrizzleOrderBy(
    schema.post,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("post.service.list", "select", () =>
      db
        .select({ id: schema.post.id })
        .from(schema.post)
        .where(where)
        .orderBy(order, ...(sortField === "id" ? [] : [asc(schema.post.id)]))
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
  return {
    list,
    total: Number(countRows[0]?.count) || 0,
  };
}

export async function listPosts(
  db: Database,
  input: PostListInput,
  visibility: PostVisibility,
): Promise<AdminPostListResult> {
  const result = await listPostIds(db, input, visibility);
  return {
    ...result,
    list: await loadAdminPostListItems(db, result.list, visibility),
  };
}

export async function listPublicPosts(
  db: Database,
  input: PostListInput,
): Promise<PublicPostListResult> {
  const result = await listPostIds(db, input, "PUBLISHED_ONLY");
  return { ...result, list: await loadPublicPostListItems(db, result.list) };
}

export async function getPost(
  db: Database,
  id: string,
  visibility: PostVisibility,
): Promise<PostDetailResult | null> {
  const [result] = await loadPostRelations(db, [{ id }], visibility);
  if (!result) return null;
  const urls = getLocalizedImageLinks(result.content);
  const imagesInContent = await readMediaByUrls(
    db,
    urls,
    "post.service.detail-images",
  );
  const uniqueImages = new Map(
    imagesInContent.map((image) => [image.url, image]),
  );
  return {
    ...result,
    imagesInContent: [...uniqueImages.values()].map(toMediaRecord),
  };
}

export async function getRandomPostsByCategory(
  db: Database,
  categoryId: string,
) {
  // Limit parent rows first, then read their public translations in one snapshot.
  const selected = db
    .select({ id: schema.post.id })
    .from(schema.post)
    .where(
      and(
        eq(schema.post.categoryId, categoryId),
        eq(schema.post.status, PostStatus.PUBLISHED),
      ),
    )
    .orderBy(sql`abs(random())`)
    .limit(10)
    .as("random_posts");
  const rows = await observeDbOperation(
    "post.random-by-category",
    "select",
    () =>
      db
        .select({
          id: selected.id,
          locale: schema.postTranslation.locale,
          title: schema.postTranslation.title,
          quoteContent: schema.postTranslation.quoteContent,
        })
        .from(selected)
        .leftJoin(
          schema.postTranslation,
          eq(schema.postTranslation.postId, selected.id),
        ),
  );
  return [...new Set(rows.map((row) => row.id))].map((id) => {
    const translations = rows.flatMap((row) =>
      row.id === id && row.locale !== null
        ? [
            {
              locale: row.locale,
              title: row.title,
              quoteContent: row.quoteContent,
            },
          ]
        : [],
    );
    return {
      id,
      title: assembleLocalizedField(translations, (row) => row.title),
      quoteContent: assembleLocalizedField(
        translations,
        (row) => row.quoteContent,
      ),
    };
  });
}

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
  return result ? { categoryId: result.categoryId ?? undefined } : result;
}

/** Sitemap owns a published-only projection; no body, author or media hydration. */
export async function listPublishedPostSitemapEntries(
  db: Database,
  page: number,
  limit: number,
) {
  return observeDbOperation("post.service.list", "select", () =>
    db
      .select({ id: schema.post.id, updatedAt: schema.post.updatedAt })
      .from(schema.post)
      .where(eq(schema.post.status, PostStatus.PUBLISHED))
      .orderBy(desc(schema.post.updatedAt), asc(schema.post.id))
      .limit(limit)
      .offset((page - 1) * limit),
  );
}

export async function countPublishedPosts(db: Database) {
  const rows = await observeDbOperation("post.service.count", "select", () =>
    db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.post)
      .where(eq(schema.post.status, PostStatus.PUBLISHED)),
  );
  return Number(rows[0]?.count) || 0;
}
