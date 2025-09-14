import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import type { CommentStatus, PostType, UserLevel } from "@honeycomb/db";
import { POST_TYPE, USER_LEVEL, COMMENT_STATUS } from "@honeycomb/db";
import * as schema from "@honeycomb/db/src/schema";
import { eq } from "drizzle-orm";

export interface StatisticsType {
  postType: { item: PostType; count: number }[];
  userType: { item: UserLevel; count: number }[];
  userPost: { item: string; count: number }[];
  commentStatus: { item: CommentStatus; count: number }[];
}

export const statisticRouter = router({
  index: protectedProcedure(["ADMIN", "EDITOR", "GUEST"]).query(
    async ({ ctx }) => {
      const result = {} as StatisticsType;

      const postArray = POST_TYPE;
      result.postType = [];
      for (let i = 0; i < postArray.length; i++) {
        const count = await ctx.db.tables.post.count(
          undefined,
          eq(schema.post.type, postArray[i] as any),
        );
        result.postType.push({ item: postArray[i], count });
      }

      const userArray = USER_LEVEL;
      result.userType = [];
      for (let i = 0; i < userArray.length; i++) {
        const count = await ctx.db.tables.user.count(
          undefined,
          eq(schema.user.level, userArray[i] as any),
        );
        result.userType.push({ item: userArray[i], count });
      }

      const commentArray = COMMENT_STATUS;
      result.commentStatus = [];
      for (let i = 0; i < commentArray.length; i++) {
        const count = await ctx.db.tables.comment.count(
          undefined,
          eq(schema.comment.status, commentArray[i] as any),
        );
        result.commentStatus.push({ item: commentArray[i], count });
      }

      result.userPost = [];
      const userList = await ctx.db.tables.user.select({});
      for (let i = 0; i < userList.length; i++) {
        const count = await ctx.db.tables.post.count(
          undefined,
          eq(schema.post.authorId, userList[i].id),
        );
        result.userPost.push({ item: userList[i].name as any, count });
      }

      return result;
    },
  ),
});
