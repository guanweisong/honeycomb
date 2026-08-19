import "server-only";

import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import { createCommentTargetRepository } from "./comment-target-repository";

export type CommentUpdate = { id: string } & Partial<InferInsertModel<typeof schema.comment>>;
export type PublicCommentInput = {
  author: string; content: string; email: string; site?: string | null;
  parentId?: string | null; postId?: string | null; pageId?: string | null; customId?: string | null;
};
export interface CommentCommandRepository {
  update(input: CommentUpdate): Promise<typeof schema.comment.$inferSelect | undefined>;
  destroy(ids: string[]): Promise<{ success: true }>;
  create(headers: Headers, input: PublicCommentInput): Promise<typeof schema.comment.$inferSelect>;
}

export function createCommentCommandRepository(db: Database): CommentCommandRepository {
  return {
    async update(input) {
      const { id, ...changes } = input;
      const [updated] = await observeDbOperation("comment.service.update", "update", () => db.update(schema.comment).set(changes).where(eq(schema.comment.id, id)).returning());
      return updated;
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
      return created;
    },
  };
}
