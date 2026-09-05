import "server-only";
import { parseCommentStatus, toCommentRecord } from "./comment-dto";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import { createCommentTargetRepository } from "./comment-target-repository";

import type { CommentCommandRepository } from "../application/repository";
export type {
  CommentCommandRepository,
  CommentUpdate,
  PublicCommentInput,
} from "../application/repository";

export function createCommentCommandRepository(
  db: Database,
): CommentCommandRepository {
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
    async create(headers, input) {
      const target = {
        postId: input.postId,
        pageId: input.pageId,
        customId: input.customId,
      };
      const targetRepository = createCommentTargetRepository(db);
      await targetRepository.assertPublic(target);
      if (input.parentId)
        await targetRepository.assertParent(input.parentId, target);
      const [created] = await observeDbOperation(
        "comment.service.create",
        "insert",
        () =>
          db
            .insert(schema.comment)
            .values({
              ...input,
              ip: headers.get("x-forwarded-for") ?? null,
              userAgent: headers.get("user-agent") ?? null,
              status: CommentStatus.PUBLISH,
            })
            .returning(),
      );
      return toCommentRecord(requireWriteResult(created, "create", "comment"));
    },
  };
}
