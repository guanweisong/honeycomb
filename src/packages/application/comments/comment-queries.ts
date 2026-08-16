import "server-only";

import { inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { QueryRecord } from "@/packages/infrastructure/db/query/tools";

type CommentListInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
} & QueryRecord;

export async function listComments(db: Database, input: CommentListInput) {
  const { page = 1, limit = 10, sortField, sortOrder, ...rest } = input;
  const where = buildDrizzleWhere(schema.comment, rest, ["status"]);
  const orderBy = buildDrizzleOrderBy(
    schema.comment,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [commentIds, countRows] = await Promise.all([
    observeDbOperation("comment.service.ids", "select", () =>
      db
        .select({ id: schema.comment.id })
        .from(schema.comment)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("comment.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.comment)
        .where(where),
    ),
  ]);
  const ids = commentIds.map(({ id }) => id);
  const comments = ids.length
    ? await observeDbOperation("comment.service.list", "select", () =>
        db.query.comment.findMany({
          where: inArray(schema.comment.id, ids),
          with: { post: true, page: true },
        }),
      )
    : [];
  const order = new Map(ids.map((id, index) => [id, index]));
  const ordered = comments.sort(
    (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
  );
  const customIds = Array.from(
    new Set(
      ordered
        .map(({ customId }) => customId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const customPosts = customIds.length
    ? await observeDbOperation("comment.service.custom-posts", "select", () =>
        db.select().from(schema.post).where(inArray(schema.post.id, customIds)),
      )
    : [];
  const customPostMap = Object.fromEntries(
    customPosts.map((post) => [post.id, post]),
  );
  const [countResult] = countRows;

  return {
    list: ordered.map((comment) => ({
      ...comment,
      custom: comment.customId
        ? (customPostMap[comment.customId] ?? null)
        : null,
    })),
    total: Number(countResult?.count) || 0,
  };
}
