import "server-only";
import { parseCommentStatus, toCommentRecord } from "./comment-dto";
import { requireWriteResult } from "@/packages/infrastructure/db/value-validation";

import { eq, inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";

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
  create(headers: Headers, input: PublicCommentInput): Promise<CommentRecord>;
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
