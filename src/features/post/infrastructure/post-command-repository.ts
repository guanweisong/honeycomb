import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { bumpCacheVersion } from "@/packages/infrastructure/cache/upstash-cache";
import { TagType } from "@/packages/domain/content/tag";
import { PostStatus } from "@/packages/domain/content/post-status";
import { toPostInsertValues, toPostUpdateValues, type PostCommandInput } from "./post-transforms";
const CACHE_VERSION_KEY = "cache:post:index:version";
const CACHE_NAMESPACE = "post.index";
async function invalidate() { await bumpCacheVersion(CACHE_NAMESPACE, CACHE_VERSION_KEY); }
export interface PostCommandRepository {
  create(input: PostCommandInput, authorId: string): Promise<typeof schema.post.$inferSelect>;
  destroy(ids: string[]): Promise<{ success: true }>;
  update(input: PostCommandInput & { id: string }): Promise<typeof schema.post.$inferSelect>;
  updateTags(input: { postId: string; tagIds: string[]; type: TagType }): Promise<{ success: true }>;
  incrementViews(id: string): Promise<{ views: number | null } | undefined>;
}
export function createPostCommandRepository(db: Database): PostCommandRepository {
  return {
    async create(input, authorId) { const [post] = await observeDbOperation("post.create", "insert", () => db.insert(schema.post).values(toPostInsertValues(input, authorId)).returning()); await invalidate(); return post; },
    async destroy(ids) { await observeDbOperation("post.destroy", "delete", () => db.delete(schema.post).where(inArray(schema.post.id, ids))); await invalidate(); return { success: true } as const; },
    async update(input) { const { id, ...rest } = input; const [post] = await observeDbOperation("post.update", "update", () => db.update(schema.post).set(toPostUpdateValues(rest)).where(eq(schema.post.id, id)).returning()); await invalidate(); return post; },
    async updateTags(input) { await observeDbOperation("post.update-tags", "transaction", () => db.transaction(async (tx) => { await tx.delete(schema.postTag).where(and(eq(schema.postTag.postId, input.postId), eq(schema.postTag.type, input.type))); if (input.tagIds.length) await tx.insert(schema.postTag).values(input.tagIds.map((tagId) => ({ postId: input.postId, tagId, type: input.type }))); })); await invalidate(); return { success: true } as const; },
    async incrementViews(id) { const [post] = await observeDbOperation("post.increment-views", "update", () => db.update(schema.post).set({ views: sql`${schema.post.views} + 1` }).where(and(eq(schema.post.id, id), eq(schema.post.status, PostStatus.PUBLISHED))).returning({ views: schema.post.views })); return post; },
  };
}
