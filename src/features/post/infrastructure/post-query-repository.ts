import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { TagType } from "@/packages/domain/content/tag";
import { PostStatus } from "@/packages/domain/content/post-status";
import { buildDrizzleOrderBy, buildDrizzleWhere } from "@/packages/infrastructure/db/query/tools";
import { getAllImageLinkFormHtml } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { PostQueryRepository, PostWithRelations, PostMediaRecord, PostAuthorRecord, PostCategoryRecord, PostTagRecord } from "../application/repository";
export type { PostListInput, PostQueryRepository, PostVisibility, PostWithRelations } from "../application/repository";
type PostRecord = typeof schema.post.$inferSelect;
type TagRecord = typeof schema.tag.$inferSelect;

function toMediaRecord(media: typeof schema.media.$inferSelect): PostMediaRecord {
  return { id: media.id, key: media.key, name: media.name, size: media.size, type: media.type, url: media.url, color: media.color, height: media.height, width: media.width, createdAt: media.createdAt, updatedAt: media.updatedAt };
}

function toPostViewModel(post: PostRecord, relations: { category?: typeof schema.category.$inferSelect | null; author?: PostAuthorRecord | null; cover?: typeof schema.media.$inferSelect | null; movieActors: PostTagRecord[]; movieDirectors: PostTagRecord[]; movieStyles: PostTagRecord[]; galleryStyles: PostTagRecord[] }): PostWithRelations {
  const category = relations.category;
  return {
    ...post,
    category: category ? { id: category.id, title: category.title, description: category.description, parent: category.parent, status: category.status, path: category.path, createdAt: category.createdAt, updatedAt: category.updatedAt } satisfies PostCategoryRecord : undefined,
    author: relations.author ?? undefined,
    cover: relations.cover ? toMediaRecord(relations.cover) : undefined,
    movieActors: relations.movieActors, movieDirectors: relations.movieDirectors, movieStyles: relations.movieStyles, galleryStyles: relations.galleryStyles,
  } as PostWithRelations;
}
export async function loadPostRelations(db: Database, posts: PostRecord[]): Promise<PostWithRelations[]> {
  const postIds = Array.from(new Set(posts.map((post) => post.id).filter(Boolean)));
  if (!postIds.length) return [];
  const rows = await observeDbOperation("post.service.relations", "select", () => db.query.post.findMany({ where: inArray(schema.post.id, postIds), with: { category: true, author: { columns: { id: true, email: true, level: true, name: true, status: true, createdAt: true, updatedAt: true } }, cover: true, postTags: { with: { tag: true } } } }));
  const relationMap = new Map(rows.map((row) => [row.id, row]));
  return posts.map((item) => {
    const row = relationMap.get(item.id);
    const tags = row?.postTags ?? [];
    const mapTags = (type: TagType) => tags.filter((postTag) => postTag.type === type).map((postTag) => postTag.tag).filter((tag): tag is TagRecord => Boolean(tag));
    const mapTag = (tag: TagRecord): PostTagRecord => ({ id: tag.id, name: tag.name, createdAt: tag.createdAt, updatedAt: tag.updatedAt });
    return toPostViewModel(item, { category: row?.category, author: row?.author ? { id: row.author.id, email: row.author.email, level: row.author.level, name: row.author.name, status: row.author.status, createdAt: row.author.createdAt, updatedAt: row.author.updatedAt } : null, cover: row?.cover, movieActors: mapTags(TagType.ACTOR).map(mapTag), movieDirectors: mapTags(TagType.DIRECTOR).map(mapTag), movieStyles: mapTags(TagType.MOVIE_STYLE).map(mapTag), galleryStyles: mapTags(TagType.GALLERY_STYLE).map(mapTag) });
  });
}

export function createPostQueryRepository(
  db: Database,
  dependencies: { loadRelations?: typeof loadPostRelations } = {},
): PostQueryRepository {
  const loadRelations = dependencies.loadRelations ?? loadPostRelations;
  return {
    async categoryFilter(categoryId) {
      const subCategories = await observeDbOperation("post.service.category-tree", "select", () => db.select().from(schema.category).where(eq(schema.category.parent, categoryId)));
      return [categoryId, ...subCategories.map((category) => category.id)];
    },
    async list(input, visibility) {
      const { page = 1, limit = 10, sortField, sortOrder, title, content, categoryId, tagId, authorId, ...rest } = input;
      let where = buildDrizzleWhere(schema.post, { ...rest, title, content }, ["status", "type"], { title, content });
      if (visibility === "PUBLISHED_ONLY") { const published = eq(schema.post.status, PostStatus.PUBLISHED); where = where ? and(where, published) : published; }
      if (categoryId) { const ids = await this.categoryFilter(categoryId); const clause = inArray(schema.post.categoryId, ids); where = where ? and(where, clause) : clause; }
      if (tagId) { const postIds = await observeDbOperation("post.service.ids-by-tag", "select", () => db.select({ postId: schema.postTag.postId }).from(schema.postTag).where(eq(schema.postTag.tagId, tagId))); const ids = postIds.map((post) => post.postId); if (!ids.length) return { list: [], total: 0 }; const clause = inArray(schema.post.id, ids); where = where ? and(where, clause) : clause; }
      if (authorId) { const clause = eq(schema.post.authorId, authorId); where = where ? and(where, clause) : clause; }
      const order = buildDrizzleOrderBy(schema.post, sortField, sortOrder as "asc" | "desc", "createdAt");
      const [list, countRows] = await Promise.all([
        observeDbOperation("post.service.list", "select", () => db.select().from(schema.post).where(where).orderBy(order).limit(limit).offset((page - 1) * limit)),
        observeDbOperation("post.service.count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.post).where(where)),
      ]);
      return { list: await loadRelations(db, list), total: Number(countRows[0]?.count) || 0 };
    },
    async detail(id, visibility) {
      const idFilter = eq(schema.post.id, id);
      const [item] = await observeDbOperation("post.service.detail", "select", () => db.select().from(schema.post).where(visibility === "ALL" ? idFilter : and(idFilter, eq(schema.post.status, PostStatus.PUBLISHED))).limit(1));
      if (!item) return null;
      const [result] = await loadRelations(db, [item]);
      const urls = getAllImageLinkFormHtml(result?.content?.zh);
      const imagesInContent = urls.length ? await observeDbOperation("post.service.detail-images", "select", () => db.select().from(schema.media).where(inArray(schema.media.url, urls))) : [];
      return { ...result, imagesInContent: imagesInContent.map(toMediaRecord) };
    },
  };
}
