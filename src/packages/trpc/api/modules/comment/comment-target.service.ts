import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import { PageStatus } from "@/packages/trpc/api/modules/page/types/page.status";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";
import type { CommentRecord } from "./types/comment.model";

export type CommentTarget = Partial<
  Pick<CommentRecord, "postId" | "pageId" | "customId">
>;

export async function assertPublicCommentTarget(
  db: Database,
  target: CommentTarget,
) {
  if (target.pageId) {
    const [page] = await db
      .select({ id: schema.page.id, status: schema.page.status })
      .from(schema.page)
      .where(eq(schema.page.id, target.pageId))
      .limit(1);
    if (!page || page.status !== PageStatus.PUBLISHED) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return;
  }

  const postId = target.postId ?? target.customId;
  if (!postId) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
  const [post] = await db
    .select({
      id: schema.post.id,
      status: schema.post.status,
      commentStatus: schema.post.commentStatus,
    })
    .from(schema.post)
    .where(eq(schema.post.id, postId))
    .limit(1);
  if (!post || post.status !== PostStatus.PUBLISHED) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (post.commentStatus !== EnableStatus.ENABLE) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export async function assertCommentParentMatches(
  db: Database,
  parentId: string,
  target: CommentTarget,
) {
  const [parent] = await db
    .select({
      postId: schema.comment.postId,
      pageId: schema.comment.pageId,
      customId: schema.comment.customId,
    })
    .from(schema.comment)
    .where(eq(schema.comment.id, parentId))
    .limit(1);
  if (
    !parent ||
    parent.postId !== (target.postId ?? null) ||
    parent.pageId !== (target.pageId ?? null) ||
    parent.customId !== (target.customId ?? null)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Parent comment belongs to a different resource",
    });
  }
}
