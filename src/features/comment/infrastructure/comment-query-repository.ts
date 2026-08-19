import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import listToTree from "list-to-tree-lite";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { buildDrizzleOrderBy, buildDrizzleWhere, type QueryRecord } from "@/packages/infrastructure/db/query/tools";
import { toPublicComment } from "./comment-dto";
import { createCommentTargetRepository } from "./comment-target-repository";

export type CommentListInput = { page?: number; limit?: number; sortField?: string; sortOrder?: string } & QueryRecord;
export type CommentRefInput = { id: string; type: "CATEGORY" | "PAGE" | "CUSTOM" };
export type CommentListItem = typeof schema.comment.$inferSelect & {
  post: typeof schema.post.$inferSelect | null;
  page: typeof schema.page.$inferSelect | null;
  custom: typeof schema.post.$inferSelect | null;
};
export type PublicCommentNode = ReturnType<typeof toPublicComment> & {
  children?: PublicCommentNode[];
};
export interface CommentQueryRepository {
  list(input: CommentListInput): Promise<{ list: CommentListItem[]; total: number }>;
  listPublicByRef(input: CommentRefInput): Promise<{ list: PublicCommentNode[]; total: number }>;
}

export function createCommentQueryRepository(db: Database): CommentQueryRepository {
  return {
    async list(input) {
      const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
      const where = buildDrizzleWhere(schema.comment, rest, ["status"]);
      const orderBy = buildDrizzleOrderBy(schema.comment, sortField, sortOrder as "asc" | "desc", "createdAt");
      const [commentIds, countRows] = await Promise.all([
        observeDbOperation("comment.service.ids", "select", () => db.select({ id: schema.comment.id }).from(schema.comment).where(where).orderBy(orderBy).limit(limit).offset((page - 1) * limit)),
        observeDbOperation("comment.service.count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.comment).where(where)),
      ]);
      const ids = commentIds.map(({ id }) => id);
      const comments = ids.length ? await observeDbOperation("comment.service.list", "select", () => db.query.comment.findMany({ where: inArray(schema.comment.id, ids), with: { post: true, page: true } })) : [];
      const order = new Map(ids.map((id, index) => [id, index]));
      const ordered = comments.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
      const customIds = Array.from(new Set(ordered.map(({ customId }) => customId).filter((id): id is string => Boolean(id))));
      const customPosts = customIds.length ? await observeDbOperation("comment.service.custom-posts", "select", () => db.select().from(schema.post).where(inArray(schema.post.id, customIds))) : [];
      const customPostMap = Object.fromEntries(customPosts.map((post) => [post.id, post]));
      return { list: ordered.map((comment) => ({ ...comment, custom: comment.customId ? (customPostMap[comment.customId] ?? null) : null })) as CommentListItem[], total: Number(countRows[0]?.count) || 0 };
    },
    async listPublicByRef(input) {
      const target = { postId: input.type === "CATEGORY" ? input.id : undefined, pageId: input.type === "PAGE" ? input.id : undefined, customId: input.type === "CUSTOM" ? input.id : undefined };
      await createCommentTargetRepository(db).assertPublic(target);
      let where: SQL | undefined = inArray(schema.comment.status, ["PUBLISH", "BAN"] as const);
      if (input.type === "CATEGORY") where = and(where, eq(schema.comment.postId, input.id));
      else if (input.type === "PAGE") where = and(where, eq(schema.comment.pageId, input.id));
      else where = and(where, eq(schema.comment.customId, input.id));
      const result = await observeDbOperation("comment.service.public-list", "select", () => db.query.comment.findMany({ columns: { id: true, author: true, content: true, site: true, email: true, parentId: true, status: true, createdAt: true }, where, orderBy: [asc(schema.comment.createdAt), desc(schema.comment.id)] }));
      const list = result.length ? listToTree(result.map(toPublicComment), { idKey: "id", parentKey: "parentId" }) as PublicCommentNode[] : [];
      const [countResult] = await observeDbOperation("comment.service.public-count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.comment).where(where));
      return { list, total: Number(countResult?.count) || 0 };
    },
  };
}
