import type { CommentTargetReference } from "../types";
import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { PostStatus } from "@/features/post/post-status";
import { PageStatus } from "@/features/page/page-status";
import { EnableStatus } from "@/lib/validation/enable-status";
import { observeDbOperation } from "@/lib/observability/server";
import { parseEnumValue } from "@/lib/db/value-validation";

export function createCommentTargetRepository(db: Database) {
  return {
    async findTarget(target: CommentTargetReference) {
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
    async findParentTarget(parentId: string) {
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

export type CommentTargetRepository = ReturnType<
  typeof createCommentTargetRepository
>;
