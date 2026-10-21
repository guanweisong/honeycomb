import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { CommentStatus } from "@/features/comment/comment-status";
import { PostType } from "@/features/post/post-type";
import { UserLevel } from "@/features/user/user";
import { observeDbOperation } from "@/lib/observability/server";

export async function getStatistics(db: Database) {
  const countByValues = async <T extends string>(
    values: readonly T[],
    table: typeof schema.post | typeof schema.user | typeof schema.comment,
    column:
      | typeof schema.post.type
      | typeof schema.user.level
      | typeof schema.comment.status,
    operation: Parameters<typeof observeDbOperation>[0],
  ) => {
    const rows = await observeDbOperation(operation, "select", () =>
      db
        .select({ item: column, count: sql<number>`count(*)`.as("count") })
        .from(table)
        .groupBy(column),
    );
    const counts = new Map(
      rows.map((row) => [row.item, Number(row.count) || 0]),
    );
    return values.map((item) => ({ item, count: counts.get(item) ?? 0 }));
  };
  const [postType, userType, commentStatus, userList, postCounts] =
    await Promise.all([
      countByValues(
        Object.values(PostType),
        schema.post,
        schema.post.type,
        "statistics.posts-by-type",
      ),
      countByValues(
        Object.values(UserLevel),
        schema.user,
        schema.user.level,
        "statistics.users-by-level",
      ),
      countByValues(
        Object.values(CommentStatus),
        schema.comment,
        schema.comment.status,
        "statistics.comments-by-status",
      ),
      observeDbOperation("statistics.user-list", "select", () =>
        db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user),
      ),
      observeDbOperation("statistics.posts-by-author", "select", () =>
        db
          .select({
            authorId: schema.post.authorId,
            count: sql<number>`count(*)`.as("count"),
          })
          .from(schema.post)
          .groupBy(schema.post.authorId),
      ),
    ]);
  const postCountByAuthor = new Map(
    postCounts.map((row) => [row.authorId, Number(row.count) || 0]),
  );
  return {
    postType,
    userType,
    commentStatus,
    userPost: userList.map((user) => ({
      item: user.name ?? user.id,
      count: postCountByAuthor.get(user.id) ?? 0,
    })),
  };
}
