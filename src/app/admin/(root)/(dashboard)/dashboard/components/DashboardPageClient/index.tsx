"use client";

import {
  CommentStatus,
  CommentStatusName,
} from "@/packages/domain/content/comment";
import CustomPie from "../CustomPie";
import { trpc } from "@/packages/trpc/client/trpc";
import { PostType, PostTypeName } from "@/packages/domain/content/post";
import { UserLevel, UserLevelName } from "@/packages/domain/identity/user";

/**
 * 后台主看板客户端内容，负责查询统计数据并渲染图表。
 */
export default function DashboardPageClient() {
  const { data: statistics, isLoading } = trpc.statistic.index.useQuery();

  return (
    <div className="flex flex-wrap gap-3 p-3">
      <CustomPie
        loading={isLoading}
        data={statistics?.postType?.map((n) => ({
          ...n,
          item: PostTypeName[
            PostType[n.item] as keyof typeof PostTypeName
          ] as string,
        }))}
        title="文章"
      />
      <CustomPie
        loading={isLoading}
        data={statistics?.commentStatus?.map((n) => ({
          ...n,
          item: CommentStatusName[
            CommentStatus[n.item] as keyof typeof CommentStatusName
          ] as string,
        }))}
        title="评论"
      />
      <CustomPie
        loading={isLoading}
        data={statistics?.userType?.map((n) => ({
          ...n,
          item: UserLevelName[
            UserLevel[n.item] as keyof typeof UserLevelName
          ] as string,
        }))}
        title="用户"
      />
      <CustomPie loading={isLoading} data={statistics?.userPost} title="贡献" />
    </div>
  );
}
