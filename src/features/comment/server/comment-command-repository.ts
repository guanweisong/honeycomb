import "server-only";
import { parseCommentStatus, toCommentRecord } from "./comment-dto";
import { requireWriteResult } from "@/lib/db/value-validation";

import { and, eq, exists, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { objectId } from "@/lib/db/object-id";

import type {
  CommentRequestMetadata,
  PublicCommentInput,
} from "@/features/comment/types/comment.insert";
import type { CommentUpdate } from "@/features/comment/types/comment.update";
import type { CommentTargetState } from "@/features/comment/types/comment.target";

export function createCommentCommandRepository(db: Database) {
  return {
    async findStatus(id: string) {
      const [comment] = await observeDbOperation(
        "comment.service.update",
        "select",
        () =>
          db
            .select({ status: schema.comment.status })
            .from(schema.comment)
            .where(eq(schema.comment.id, id))
            .limit(1),
      );
      return comment ? parseCommentStatus(comment.status) : null;
    },
    async update(input: CommentUpdate, expectedStatus?: CommentStatus) {
      const { id, ...changes } = input;
      const [updated] = await observeDbOperation(
        "comment.service.update",
        "update",
        () =>
          db
            .update(schema.comment)
            .set(changes)
            .where(
              and(
                eq(schema.comment.id, id),
                expectedStatus === undefined
                  ? undefined
                  : eq(schema.comment.status, expectedStatus),
              ),
            )
            .returning(),
      );
      if (!updated && expectedStatus !== undefined) return null;
      return toCommentRecord(requireWriteResult(updated, "update", "comment"));
    },
    async destroy(ids: string[]) {
      await observeDbOperation("comment.service.destroy", "delete", () =>
        db.delete(schema.comment).where(inArray(schema.comment.id, ids)),
      );
      return { success: true } as const;
    },
    // comment/server.ts 决定可评论状态；同一 INSERT 的条件读取保护该快照和父评论归属。
    async createIfTargetMatches(
      metadata: CommentRequestMetadata,
      input: PublicCommentInput,
      expectedTarget: CommentTargetState,
    ) {
      const targetTable =
        expectedTarget.type === "page" ? schema.page : schema.post;
      const targetId =
        expectedTarget.type === "page"
          ? input.pageId
          : (input.postId ?? input.customId);
      const timestamp = new Date().toISOString();
      const [created] = await observeDbOperation(
        "comment.service.create",
        "insert",
        () =>
          db
            .insert(schema.comment)
            .select((query) =>
              query
                .select({
                  id: objectId().mapWith(String),
                  userAgent: sql<string | null>`${metadata.userAgent}`,
                  author: sql<string>`${input.author}`,
                  content: sql<string>`${input.content}`,
                  site: sql<string | null>`${input.site ?? null}`,
                  email: sql<string>`${input.email}`,
                  ip: sql<string | null>`${metadata.ip}`,
                  parentId: sql<string | null>`${input.parentId ?? null}`,
                  postId: sql<string | null>`${input.postId ?? null}`,
                  pageId: sql<string | null>`${input.pageId ?? null}`,
                  customId: sql<string | null>`${input.customId ?? null}`,
                  status: sql<string>`${CommentStatus.PUBLISH}`,
                  createdAt: sql<string>`${timestamp}`,
                  updatedAt: sql<string>`${timestamp}`,
                })
                .from(targetTable)
                .where(
                  and(
                    eq(targetTable.id, targetId ?? ""),
                    eq(targetTable.status, expectedTarget.status),
                    expectedTarget.type === "post"
                      ? eq(
                          schema.post.commentStatus,
                          expectedTarget.commentStatus,
                        )
                      : undefined,
                    input.parentId
                      ? exists(
                          query
                            .select({ id: schema.comment.id })
                            .from(schema.comment)
                            .where(
                              and(
                                eq(schema.comment.id, input.parentId),
                                sql`${schema.comment.postId} is ${input.postId ?? null}`,
                                sql`${schema.comment.pageId} is ${input.pageId ?? null}`,
                                sql`${schema.comment.customId} is ${input.customId ?? null}`,
                              ),
                            ),
                        )
                      : undefined,
                  ),
                )
                .getSQL(),
            )
            .returning(),
      );
      return created ? toCommentRecord(created) : null;
    },
  };
}

export type CommentCommandRepository = ReturnType<
  typeof createCommentCommandRepository
>;
