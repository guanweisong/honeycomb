import "server-only";

import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import { createCommentTargetRepository } from "./comment-target-repository";

import type { CommentCommandRepository } from "../application/repository";
export type { CommentCommandRepository, CommentUpdate, PublicCommentInput } from "../application/repository";
import type { CommentRecord } from "../application/repository";

function toCommentRecord(comment: typeof schema.comment.$inferSelect): CommentRecord {
  return { id: comment.id, author: comment.author, content: comment.content, site: comment.site, email: comment.email, parentId: comment.parentId, postId: comment.postId, pageId: comment.pageId, customId: comment.customId, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt, userAgent: comment.userAgent, ip: comment.ip };
}

export function createCommentCommandRepository(db: Database): CommentCommandRepository {
  return {
    async update(input) {
      const { id, ...changes } = input;
      const [updated] = await observeDbOperation("comment.service.update", "update", () => db.update(schema.comment).set(changes).where(eq(schema.comment.id, id)).returning());
      return toCommentRecord(updated);
    },
    async destroy(ids) {
      await observeDbOperation("comment.service.destroy", "delete", () => db.delete(schema.comment).where(inArray(schema.comment.id, ids)));
      return { success: true } as const;
    },
    async create(headers, input) {
      const target = { postId: input.postId, pageId: input.pageId, customId: input.customId };
      const targetRepository = createCommentTargetRepository(db);
      await targetRepository.assertPublic(target);
      if (input.parentId) await targetRepository.assertParent(input.parentId, target);
      const [created] = await observeDbOperation("comment.service.create", "insert", () => db.insert(schema.comment).values({ ...input, ip: headers.get("x-forwarded-for") ?? null, userAgent: headers.get("user-agent") ?? null, status: CommentStatus.PUBLISH }).returning());
      return toCommentRecord(created);
    },
  };
}
