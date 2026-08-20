import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import listToTree from "list-to-tree-lite";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { buildDrizzleOrderBy, buildDrizzleWhere } from "@/packages/infrastructure/db/query/tools";
import { toPublicComment } from "./comment-dto";
import { createCommentTargetRepository } from "./comment-target-repository";

import type { CommentQueryRepository, CommentListItem, PublicCommentNode, CommentRecord, CommentRelatedRecord } from "../repository";
export type { CommentListInput, CommentQueryRepository, CommentRefInput } from "../repository";
export type { CommentListItem, PublicCommentNode } from "../repository";

function toCommentRecord(comment: typeof schema.comment.$inferSelect): CommentRecord {
  return { id: comment.id, author: comment.author, content: comment.content, site: comment.site, email: comment.email, parentId: comment.parentId, postId: comment.postId, pageId: comment.pageId, customId: comment.customId, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt, userAgent: comment.userAgent, ip: comment.ip };
}

function toRelatedRecord(record: { id: string; title?: { en: string; zh: string } | null } | null): CommentRelatedRecord | null {
  return record ? { id: record.id, title: record.title } : null;
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
      const list: CommentListItem[] = ordered.map((comment) => ({
        ...toCommentRecord(comment),
        post: toRelatedRecord(comment.post),
        page: toRelatedRecord(comment.page),
        custom: toRelatedRecord(comment.customId ? (customPostMap[comment.customId] ?? null) : null),
      }));
      return { list, total: Number(countRows[0]?.count) || 0 };
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
