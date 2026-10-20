"use client";

import { CommentStatusName } from "@/features/comment/admin/options";
import CustomPie from "../CustomPie";
import { trpc } from "@/lib/trpc/client/trpc";
import { PostTypeName } from "@/features/post/admin/options";
import { UserLevelName } from "@/features/user/admin/options";

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
          item: PostTypeName[n.item],
        }))}
        title="文章"
      />
      <CustomPie
        loading={isLoading}
        data={statistics?.commentStatus?.map((n) => ({
          ...n,
          item: CommentStatusName[n.item],
        }))}
        title="评论"
      />
      <CustomPie
        loading={isLoading}
        data={statistics?.userType?.map((n) => ({
          ...n,
          item: UserLevelName[n.item],
        }))}
        title="用户"
      />
      <CustomPie loading={isLoading} data={statistics?.userPost} title="贡献" />
    </div>
  );
}
