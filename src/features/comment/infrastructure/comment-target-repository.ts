import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageStatus } from "@/packages/domain/content/page";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export type CommentTarget = Partial<{ postId: string | null; pageId: string | null; customId: string | null }>;
export class CommentTargetError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN", message?: string) { super(message); this.name = "CommentTargetError"; }
}
export interface CommentTargetRepository {
  assertPublic(target: CommentTarget): Promise<void>;
  assertParent(parentId: string, target: CommentTarget): Promise<void>;
}
export function createCommentTargetRepository(db: Database): CommentTargetRepository {
  return {
    async assertPublic(target) {
      if (target.pageId) {
        const [page] = await observeDbOperation("comment.target.page", "select", () => db.select({ id: schema.page.id, status: schema.page.status }).from(schema.page).where(eq(schema.page.id, target.pageId!)).limit(1));
        if (!page || page.status !== PageStatus.PUBLISHED) throw new CommentTargetError("NOT_FOUND");
        return;
      }
      const postId = target.postId ?? target.customId;
      if (!postId) throw new CommentTargetError("BAD_REQUEST");
      const [post] = await observeDbOperation("comment.target.post", "select", () => db.select({ status: schema.post.status, commentStatus: schema.post.commentStatus }).from(schema.post).where(eq(schema.post.id, postId)).limit(1));
      if (!post || post.status !== PostStatus.PUBLISHED) throw new CommentTargetError("NOT_FOUND");
      if (post.commentStatus !== EnableStatus.ENABLE) throw new CommentTargetError("FORBIDDEN");
    },
    async assertParent(parentId, target) {
      const [parent] = await observeDbOperation("comment.target.parent", "select", () => db.select({ postId: schema.comment.postId, pageId: schema.comment.pageId, customId: schema.comment.customId }).from(schema.comment).where(eq(schema.comment.id, parentId)).limit(1));
      if (!parent || parent.postId !== (target.postId ?? null) || parent.pageId !== (target.pageId ?? null) || parent.customId !== (target.customId ?? null)) throw new CommentTargetError("BAD_REQUEST", "Parent comment belongs to a different resource");
    },
  };
}
