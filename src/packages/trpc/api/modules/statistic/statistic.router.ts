import "server-only";

import { Permission } from "@/packages/identity/auth/permissions";
import {
  permissionProcedure,
  createTRPCRouter,
} from "@/packages/trpc/api/core";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PostType } from "@/packages/domain/content/post";
import { UserLevel } from "@/packages/domain/identity/user";
import * as schema from "@/packages/infrastructure/db/schema";
import { eq, sql } from "drizzle-orm";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/**
 * 统计数据接口类型定义。
 */
export interface StatisticsType {
  postType: { item: PostType; count: number }[]; // 按文章类型统计
  userType: { item: UserLevel; count: number }[]; // 按用户等级统计
  userPost: { item: string; count: number }[]; // 按用户统计文章数
  commentStatus: { item: CommentStatus; count: number }[]; // 按评论状态统计
}

/**
 * 统计数据相关的 tRPC 路由。
 */
export const statisticRouter = createTRPCRouter({
  /**
   * 获取各类别的统计数据。
   * (需要任意等级的登录权限)
   * @returns {Promise<StatisticsType>} 返回一个包含多种统计数据的对象。
   *
   * 独立维度并行统计，用户文章数使用单次 GROUP BY 聚合，避免 N+1 查询。
   */
  index: permissionProcedure(Permission.statisticsRead).query(
    async ({ ctx }) => {
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
            ctx.db
              .select({ id: schema.user.id, name: schema.user.name })
              .from(schema.user),
          ),
          observeDbOperation("statistics.posts-by-author", "select", () =>
            ctx.db
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
          item: user.name!,
          count: postCountByAuthor.get(user.id) ?? 0,
        })),
      };

      async function countByValues<T extends string>(
        values: T[] | readonly T[],
        table: typeof schema.post | typeof schema.user | typeof schema.comment,
        column: Parameters<typeof eq>[0],
        operation: Parameters<typeof observeDbOperation>[0],
      ) {
        return Promise.all(
          values.map(async (item) => {
            const [row] = await observeDbOperation(operation, "select", () =>
              ctx.db
                .select({ count: sql<number>`count(*)`.as("count") })
                .from(table)
                .where(eq(column, item)),
            );
            return { item, count: Number(row?.count) || 0 };
          }),
        );
      }
    },
  ),
});
