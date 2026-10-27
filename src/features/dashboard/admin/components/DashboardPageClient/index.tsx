"use client";

import { CommentStatusName } from "@/features/comment/types/comment.status-name";
import CustomPie from "@/features/dashboard/admin/components/CustomPie";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client/trpc";
import { PostTypeName } from "@/features/post/types/post.type-name";
import { UserLevelName } from "@/features/user/types/user.level-name";

/**
 * 后台主看板客户端内容，负责查询统计数据并渲染图表。
 */
export default function DashboardPageClient() {
  const {
    data: statistics,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = trpc.statistic.index.useQuery();
  const errorNotice = isError ? (
    <div
      role="alert"
      className="w-full rounded border border-destructive/40 p-3"
    >
      <p>
        {statistics
          ? "统计刷新失败，正在显示上次的数据"
          : "统计加载失败，请重试"}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={isFetching}
        onClick={() => void refetch()}
      >
        {isFetching ? "重试中…" : "重试"}
      </Button>
    </div>
  ) : null;

  if (isError && !statistics) {
    return <div className="p-3">{errorNotice}</div>;
  }

  return (
    <div className="flex flex-wrap gap-3 p-3">
      {errorNotice}
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
