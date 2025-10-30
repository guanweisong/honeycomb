import {
  protectedProcedure,
  createTRPCRouter,
} from "@honeycomb/trpc/server/core";
import { CommentStatus } from "@honeycomb/types/comment/comment.status";
import { PostType } from "@honeycomb/types/post/post.type";
import { UserLevel } from "@honeycomb/types/user/user.level";
import * as schema from "@honeycomb/db/schema";
import { eq, sql } from "drizzle-orm";

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
   * @notice 性能警告：当前的实现方式是在多个 for 循环中 `await` 数据库查询，
   * 这会导致串行的数据库请求，效率低下。未来应优化为使用 `Promise.all` 并行执行查询，
   * 或者使用更高效的 SQL `GROUP BY` 聚合查询来一次性获取所有数据。
   */
  index: protectedProcedure([
    UserLevel.ADMIN,
    UserLevel.EDITOR,
    UserLevel.GUEST,
  ]).query(async ({ ctx }) => {
    const result = {} as StatisticsType;

    // 统计各类型文章数量
    const postArray = Object.values(PostType);
    result.postType = [];
    for (let i = 0; i < postArray.length; i++) {
      const [postCountResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.post)
        .where(eq(schema.post.type, postArray[i]));
      const count = Number(postCountResult?.count) || 0;
      result.postType.push({ item: postArray[i], count });
    }

    // 统计各等级用户数量
    const userArray = Object.values(UserLevel);
    result.userType = [];
    for (let i = 0; i < userArray.length; i++) {
      const [userCountResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.user)
        .where(eq(schema.user.level, userArray[i]));
      const count = Number(userCountResult?.count) || 0;
      result.userType.push({ item: userArray[i], count });
    }

    // 统计各状态评论数量
    const commentArray = Object.values(CommentStatus);
    result.commentStatus = [];
    for (let i = 0; i < commentArray.length; i++) {
      const [commentCountResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.comment)
        .where(eq(schema.comment.status, commentArray[i]));
      const count = Number(commentCountResult?.count) || 0;
      result.commentStatus.push({ item: commentArray[i], count });
    }

    // 统计每个用户的文章数
    result.userPost = [];
    const userList = await ctx.db.select().from(schema.user);
    for (let i = 0; i < userList.length; i++) {
      const [postCountResult] = await ctx.db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.post)
        .where(eq(schema.post.authorId, userList[i].id));
      const count = Number(postCountResult?.count) || 0;
      result.userPost.push({ item: userList[i].name!, count });
    }

    return result;
  }),
});
