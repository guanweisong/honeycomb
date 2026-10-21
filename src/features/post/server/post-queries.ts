import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { PostStatus } from "../post-status";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { getLocalizedImageLinks } from "@/lib/content/image-links";
import { observeDbOperation } from "@/lib/observability/server";
import {
  loadPostRelations,
  loadPublicPostListItems,
  toMediaRecord,
} from "./post-relations";
import type {
  PostListInput,
  PostVisibility,
  PostListResult,
  PostDetailResult,
  PublicPostListResult,
} from "../types";

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
    const postIds = await observeDbOperation(
      "post.service.ids-by-tag",
      "select",
      () =>
        db
          .select({ postId: schema.postTag.postId })
          .from(schema.postTag)
          .where(eq(schema.postTag.tagId, tagId)),
    );
    const ids = postIds.map((post) => post.postId);
    if (!ids.length) return { list: [], total: 0 };
    const clause = inArray(schema.post.id, ids);
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
        .orderBy(order)
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
): Promise<PostListResult> {
  const result = await listPostIds(db, input, visibility);
  return {
    ...result,
    list: await loadPostRelations(db, result.list, visibility),
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
  const idFilter = eq(schema.post.id, id);
  const [item] = await observeDbOperation("post.service.detail", "select", () =>
    db
      .select({ id: schema.post.id })
      .from(schema.post)
      .where(
        visibility === "ALL"
          ? idFilter
          : and(idFilter, eq(schema.post.status, PostStatus.PUBLISHED)),
      )
      .limit(1),
  );
  if (!item) return null;
  const [result] = await loadPostRelations(db, [item], visibility);
  if (!result) return null;
  const urls = getLocalizedImageLinks(result.content);
  const imagesInContent = urls.length
    ? await observeDbOperation("post.service.detail-images", "select", () =>
        db.select().from(schema.media).where(inArray(schema.media.url, urls)),
      )
    : [];
  const uniqueImages = new Map(
    imagesInContent.map((image) => [image.url, image]),
  );
  return {
    ...result,
    imagesInContent: [...uniqueImages.values()].map(toMediaRecord),
  };
}
