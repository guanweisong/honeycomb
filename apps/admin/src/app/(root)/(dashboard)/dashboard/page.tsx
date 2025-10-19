"use client";

import {
  CommentStatus,
  CommentStatusName,
} from "@honeycomb/types/comment/comment.status";
import CustomPie from "./components/CustomPie";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { PostType, PostTypeName } from "@honeycomb/types/post/post.type";
import { UserLevel, UserLevelName } from "@honeycomb/types/user/user.level";

/**
 * 后台管理主看板页面。
 * 该页面用于以可视化的方式展示网站的核心统计数据。
 *
 * 功能：
 * 1. 使用 tRPC 的 `useQuery` hook 从 `statistic.index` 端点获取统计数据。
 * 2. 对获取到的数据进行转换，将英文枚举值（如 `ARTICLE`）映射为中文名称（如 `文章`）。
 * 3. 将处理后的数据分别传递给多个 `CustomPie` 组件，以饼图的形式渲染出来，
 *    展示内容包括：文章类型分布、评论状态分布、用户等级分布和用户贡献分布。
 */
const Dashboard = () => {
  const { data: statistics } = trpc.statistic.index.useQuery();

  return (
    <div className="flex flex-wrap gap-3 p-3">
      <CustomPie
        data={statistics?.postType?.map((n) => ({
          ...n,
          item: PostTypeName[
            PostType[n.item] as keyof typeof PostTypeName
          ] as string,
        }))}
        title={"文章"}
      />
      <CustomPie
        data={statistics?.commentStatus?.map((n) => ({
          ...n,
          item: CommentStatusName[
            CommentStatus[n.item] as keyof typeof CommentStatusName
          ] as string,
        }))}
        title="评论"
      />
      <CustomPie
        data={statistics?.userType?.map((n) => ({
          ...n,
          item: UserLevelName[
            UserLevel[n.item] as keyof typeof UserLevelName
          ] as string,
        }))}
        title="用户"
      />
      <CustomPie data={statistics?.userPost} title="贡献" />
    </div>
  );
};

export default Dashboard;
