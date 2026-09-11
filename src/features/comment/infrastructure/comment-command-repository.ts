import "server-only";
import { parseCommentStatus, toCommentRecord } from "./comment-dto";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { and, eq, exists, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";
import { objectId } from "@/packages/infrastructure/db/object-id";

import type {
  CommentCommandRepository,
  CommentRecord,
  CommentRequestMetadata,
  PublicCommentInput,
} from "../application/repository";
export type {
  CommentCommandRepository,
  CommentUpdate,
  PublicCommentInput,
} from "../application/repository";

type CommentCommandRepositoryAdapter = CommentCommandRepository & {
  /** 兼容既有持久化调用；公开创建只经 Application 的条件插入端口。 */
  create(
    metadata: CommentRequestMetadata | Headers,
    input: PublicCommentInput,
  ): Promise<CommentRecord>;
};

function toCommentRequestMetadata(
  metadata: CommentRequestMetadata | Headers,
): CommentRequestMetadata {
  if (metadata instanceof Headers) {
    return {
      ip: getClientIp({ headers: metadata }),
      userAgent: metadata.get("user-agent"),
    };
  }
  return metadata;
}

export function createCommentCommandRepository(
  db: Database,
): CommentCommandRepositoryAdapter {
  return {
    async findStatus(id) {
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
    async update(input) {
      const { id, ...changes } = input;
      const [updated] = await observeDbOperation(
        "comment.service.update",
        "update",
        () =>
          db
            .update(schema.comment)
            .set(changes)
            .where(eq(schema.comment.id, id))
            .returning(),
      );
      return toCommentRecord(requireWriteResult(updated, "update", "comment"));
    },
    async destroy(ids) {
      await observeDbOperation("comment.service.destroy", "delete", () =>
        db.delete(schema.comment).where(inArray(schema.comment.id, ids)),
      );
      return { success: true } as const;
    },
    // Application 决定可评论状态；同一 INSERT 的条件读取保护该快照和父评论归属。
    async createIfTargetMatches(metadata, input, expectedTarget) {
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
    async create(metadataOrHeaders, input) {
      const metadata = toCommentRequestMetadata(metadataOrHeaders);
      const [created] = await observeDbOperation(
        "comment.service.create",
        "insert",
        () =>
          db
            .insert(schema.comment)
            .values({
              ...input,
              ip: metadata.ip,
              userAgent: metadata.userAgent,
              status: CommentStatus.PUBLISH,
            })
            .returning(),
      );
      return toCommentRecord(requireWriteResult(created, "create", "comment"));
    },
  };
}
