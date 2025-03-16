import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { CommentStatus, PostType, UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";

export interface StatisticsType {
  postType: {
    item: PostType;
    count: number;
  }[];
  userType: {
    item: UserLevel;
    count: number;
  }[];
  userPost: {
    item: string;
    count: number;
  }[];
  commentStatus: {
    item: CommentStatus;
    count: number;
  }[];
}

export async function GET(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST],
    async () => {
      const result = {} as StatisticsType;
      // 获取文章统计
      const postArray = [
        PostType.ARTICLE,
        PostType.MOVIE,
        PostType.PHOTOGRAPH,
        PostType.QUOTE,
      ];
      result.postType = [];
      for (let i = 0, len = postArray.length; i < len; i++) {
        result.postType.push({
          item: postArray[i],
          count: await prisma.post.count({ where: { type: postArray[i] } }),
        });
      }
      // 获取用户类型统计
      const userArray = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST];
      result.userType = [];
      for (let i = 0, len = userArray.length; i < len; i++) {
        result.userType.push({
          item: userArray[i],
          count: await prisma.user.count({ where: { level: userArray[i] } }),
        });
      }
      // 获取评论统计
      const commentArray = [
        CommentStatus.PUBLISH,
        CommentStatus.TO_AUDIT,
        CommentStatus.RUBBISH,
        CommentStatus.BAN,
      ];
      result.commentStatus = [];
      for (let i = 0, len = commentArray.length; i < len; i++) {
        result.commentStatus.push({
          item: commentArray[i],
          count: await prisma.comment.count({
            where: { status: commentArray[i] },
          }),
        });
      }
      // 获取用户下文章数目
      result.userPost = [];
      const userList = await prisma.user.findMany();
      for (let i = 0, len = userList.length; i < len; i++) {
        result.userPost.push({
          item: userList[i].name,
          count: await prisma.post.count({
            where: { authorId: userList[i].id },
          }),
        });
      }
      return ResponseHandler.Query(result);
    },
  );
}
