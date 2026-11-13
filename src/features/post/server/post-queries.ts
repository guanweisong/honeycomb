import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  getTableName,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
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
  readPublicPostListRows,
  toPublicPostListItem,
  type PostListSelection,
  toMediaRecord,
} from "@/features/post/server/post-relations";
import type {
  PostListInput,
  PostVisibility,
  PublicPostCursor,
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

async function buildPostListWhere(
  db: Database,
  input: PostListInput,
  visibility: PostVisibility,
) {
  const { title, content, categoryId, tagId, authorId, status, type } = input;
  let where = buildDrizzleWhere(schema.post, { status, type }, [
    "status",
    "type",
  ]);
  for (const [column, value] of [
    [schema.postTranslation.title, title],
    [schema.postTranslation.content, content],
  ] as const) {
    if (!value) continue;
    // Preserve the inner table qualifier when RQB aliases the outer post.
    const translationTable = sql.identifier(
      getTableName(schema.postTranslation),
    );
    const match = sql`exists (
      select 1 from ${schema.postTranslation}
      where ${translationTable}.${sql.identifier(schema.postTranslation.postId.name)} = ${schema.post.id}
        and ${translationTable}.${sql.identifier(column.name)} like ${`%${value}%`}
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
    const tagTable = sql.identifier(getTableName(schema.postTag));
    const clause = sql`exists (
      select 1 from ${schema.postTag}
      where ${tagTable}.${sql.identifier(schema.postTag.postId.name)} = ${schema.post.id}
        and ${tagTable}.${sql.identifier(schema.postTag.tagId.name)} = ${tagId}
    )`;
    where = where ? and(where, clause) : clause;
  }
  if (authorId) {
    const clause = eq(schema.post.authorId, authorId);
    where = where ? and(where, clause) : clause;
  }
  return where;
}

async function countPostIds(db: Database, where: SQL | undefined) {
  const rows = await observeDbOperation("post.service.count", "select", () =>
    db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.post)
      .where(where),
  );
  return Number(rows[0]?.count) || 0;
}

async function numberedPostSelection(
  db: Database,
  input: PostListInput,
  visibility: PostVisibility,
): Promise<PostListSelection> {
  const {
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
    sortField,
    sortOrder,
  } = input;
  const where = await buildPostListWhere(db, input, visibility);
  const order = buildDrizzleOrderBy(
    schema.post,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
  );
  return {
    where,
    orderBy: [order, ...(sortField === "id" ? [] : [asc(schema.post.id)])],
    limit,
    offset: (page - 1) * limit,
  };
}

async function listPublicPostFeed(
  db: Database,
  input: PostListInput,
  cursor: PublicPostCursor | null,
): Promise<PublicPostListResult> {
  const { limit = repositoryPaginationDefaults.limit } = input;
  const { id, createdAt } = schema.post;
  const where = await buildPostListWhere(db, input, "PUBLISHED_ONLY");
  let after: SQL | undefined;
  if (cursor) {
    after =
      cursor.createdAt === null
        ? and(isNull(createdAt), gt(id, cursor.id))
        : or(
            lt(createdAt, cursor.createdAt),
            and(eq(createdAt, cursor.createdAt), gt(id, cursor.id)),
            isNull(createdAt),
          );
  }
  const [rows, total] = await Promise.all([
    limit === 0
      ? []
      : readPublicPostListRows(db, {
          where: and(where, after),
          orderBy: [desc(createdAt), asc(id)],
          limit: limit + 1,
        }),
    countPostIds(db, where),
  ]);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    list: page.map(toPublicPostListItem),
    total,
    nextCursor:
      rows.length > limit && last
        ? { id: last.id, createdAt: last.createdAt }
        : null,
  };
}

export async function listPosts(
  db: Database,
  input: PostListInput,
  visibility: PostVisibility,
): Promise<AdminPostListResult> {
  const selection = await numberedPostSelection(db, input, visibility);
  const [list, total] = await Promise.all([
    loadAdminPostListItems(db, selection),
    countPostIds(db, selection.where),
  ]);
  return { list, total };
}

export async function listPublicPosts(
  db: Database,
  input: PostListInput,
  cursor?: PublicPostCursor | null,
): Promise<PublicPostListResult> {
  if (cursor !== undefined) return listPublicPostFeed(db, input, cursor);
  const selection = await numberedPostSelection(db, input, "PUBLISHED_ONLY");
  const [rows, total] = await Promise.all([
    readPublicPostListRows(db, selection),
    countPostIds(db, selection.where),
  ]);
  return { list: rows.map(toPublicPostListItem), total };
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

/** Published-only IDs used to prerender public author and tag list routes. */
export async function listPublishedPostListFilterIds(db: Database) {
  const [authors, tags] = await Promise.all([
    observeDbOperation("post.public-list-path-ids.authors", "select", () =>
      db
        .select({ id: schema.post.authorId })
        .from(schema.post)
        .where(eq(schema.post.status, PostStatus.PUBLISHED))
        .groupBy(schema.post.authorId),
    ),
    observeDbOperation("post.public-list-path-ids.tags", "select", () =>
      db
        .select({ id: schema.postTag.tagId })
        .from(schema.postTag)
        .where(
          sql`exists (
            select 1 from ${schema.post}
            where ${schema.post.id} = ${schema.postTag.postId}
              and ${schema.post.status} = ${PostStatus.PUBLISHED}
          )`,
        )
        .groupBy(schema.postTag.tagId),
    ),
  ]);

  return {
    authorIds: authors.map(({ id }) => id),
    tagIds: tags.map(({ id }) => id),
  };
}

export function countPublishedPosts(db: Database) {
  return countPostIds(db, eq(schema.post.status, PostStatus.PUBLISHED));
}
