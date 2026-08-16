import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import listToTree from "list-to-tree-lite";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { toPublicComment } from "./comment-dto";
import { assertPublicCommentTarget } from "./comment-target";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

type CommentRefInput = { id: string; type: "CATEGORY" | "PAGE" | "CUSTOM" };

/** 查询公开评论并构建评论树。 */
export async function listPublicCommentsByRef(
  db: Database,
  input: CommentRefInput,
) {
  await assertPublicCommentTarget(db, {
    postId: input.type === "CATEGORY" ? input.id : undefined,
    pageId: input.type === "PAGE" ? input.id : undefined,
    customId: input.type === "CUSTOM" ? input.id : undefined,
  });
  let where: SQL | undefined = inArray(schema.comment.status, [
    "PUBLISH",
    "BAN",
  ] as const);
  if (input.type === "CATEGORY") {
    where = and(where, eq(schema.comment.postId, input.id));
  } else if (input.type === "PAGE") {
    where = and(where, eq(schema.comment.pageId, input.id));
  } else {
    where = and(where, eq(schema.comment.customId, input.id));
  }
  const result = await observeDbOperation(
    "comment.service.public-list",
    "select",
    () =>
      db.query.comment.findMany({
        columns: {
          id: true,
          author: true,
          content: true,
          site: true,
          email: true,
          parentId: true,
          status: true,
          createdAt: true,
        },
        where,
        orderBy: [asc(schema.comment.createdAt), desc(schema.comment.id)],
      }),
  );
  const list = result.length
    ? listToTree(result.map(toPublicComment), {
        idKey: "id",
        parentKey: "parentId",
      })
    : [];
  const [countResult] = await observeDbOperation(
    "comment.service.public-count",
    "select",
    () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.comment)
        .where(where),
  );
  return { list, total: Number(countResult?.count) || 0 };
}
