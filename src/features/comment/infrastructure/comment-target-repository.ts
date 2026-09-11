import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageStatus } from "@/packages/domain/content/page";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";

import type { CommentTargetRepository } from "../application/repository";
export type {
  CommentTarget,
  CommentTargetReference,
  CommentTargetRepository,
  CommentTargetState,
} from "../application/repository";
export function createCommentTargetRepository(
  db: Database,
): CommentTargetRepository {
  return {
    async findTarget(target) {
      if (target.type === "page") {
        const [page] = await observeDbOperation(
          "comment.target.page",
          "select",
          () =>
            db
              .select({ id: schema.page.id, status: schema.page.status })
              .from(schema.page)
              .where(eq(schema.page.id, target.id))
              .limit(1),
        );
        return page
          ? {
              type: "page" as const,
              status: parseEnumValue(
                page.status,
                Object.values(PageStatus),
                "page.status",
              ),
            }
          : null;
      }
      const [post] = await observeDbOperation(
        "comment.target.post",
        "select",
        () =>
          db
            .select({
              status: schema.post.status,
              commentStatus: schema.post.commentStatus,
            })
            .from(schema.post)
            .where(eq(schema.post.id, target.id))
            .limit(1),
      );
      return post
        ? {
            type: "post" as const,
            status: parseEnumValue(
              post.status,
              Object.values(PostStatus),
              "post.status",
            ),
            commentStatus: parseEnumValue(
              post.commentStatus,
              Object.values(EnableStatus),
              "post.commentStatus",
            ),
          }
        : null;
    },
    async findParentTarget(parentId) {
      const [parent] = await observeDbOperation(
        "comment.target.parent",
        "select",
        () =>
          db
            .select({
              postId: schema.comment.postId,
              pageId: schema.comment.pageId,
              customId: schema.comment.customId,
            })
            .from(schema.comment)
            .where(eq(schema.comment.id, parentId))
            .limit(1),
      );
      if (!parent) return null;
      const targets = [
        parent.postId ? { type: "post" as const, id: parent.postId } : null,
        parent.pageId ? { type: "page" as const, id: parent.pageId } : null,
        parent.customId
          ? { type: "custom" as const, id: parent.customId }
          : null,
      ].filter((target) => target !== null);
      return targets.length === 1 ? targets[0]! : null;
    },
  };
}
