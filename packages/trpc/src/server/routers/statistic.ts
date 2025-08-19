import { protectedProcedure, router } from "@honeycomb/trpc/server/core";
import { CommentStatus, PostType, UserLevel } from ".prisma/client";

export interface StatisticsType {
  postType: { item: PostType; count: number }[];
  userType: { item: UserLevel; count: number }[];
  userPost: { item: string; count: number }[];
  commentStatus: { item: CommentStatus; count: number }[];
}

export const statisticRouter = router({
  index: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST])
    .query(async ({ ctx }) => {
      const result = {} as StatisticsType;

      const postArray = [
        PostType.ARTICLE,
        PostType.MOVIE,
        PostType.PHOTOGRAPH,
        PostType.QUOTE,
      ];
      result.postType = [];
      for (let i = 0; i < postArray.length; i++) {
        result.postType.push({
          item: postArray[i],
          count: await ctx.prisma.post.count({ where: { type: postArray[i] } }),
        });
      }

      const userArray = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST];
      result.userType = [];
      for (let i = 0; i < userArray.length; i++) {
        result.userType.push({
          item: userArray[i],
          count: await ctx.prisma.user.count({ where: { level: userArray[i] } }),
        });
      }

      const commentArray = [
        CommentStatus.PUBLISH,
        CommentStatus.TO_AUDIT,
        CommentStatus.RUBBISH,
        CommentStatus.BAN,
      ];
      result.commentStatus = [];
      for (let i = 0; i < commentArray.length; i++) {
        result.commentStatus.push({
          item: commentArray[i],
          count: await ctx.prisma.comment.count({ where: { status: commentArray[i] } }),
        });
      }

      result.userPost = [];
      const userList = await ctx.prisma.user.findMany();
      for (let i = 0; i < userList.length; i++) {
        result.userPost.push({
          item: userList[i].name,
          count: await ctx.prisma.post.count({ where: { authorId: userList[i].id } }),
        });
      }

      return result;
    }),
});
