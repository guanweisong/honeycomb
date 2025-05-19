"use client";

import {
  CommentStatus,
  CommentStatusName,
} from "@/app/(root)/(dashboard)/comment/types/CommentStatus";
import CustomPie from "./components/CustomPie";
import {
  PostType,
  PostTypeName,
} from "@/app/(root)/(dashboard)/post/types/PostType";
import {
  UserLevel,
  UserLevelName,
} from "@/app/(root)/(dashboard)/user/types/UserLevel";
import { useEffect, useState } from "react";
import DashboardService from "./service";
import type { StatisticsType } from "./types/StatisticsType";

const Dashboard = () => {
  const [statistics, setStatistics] = useState<StatisticsType>();

  const index = async () => {
    const result = await DashboardService.index();
    if (result.status === 200) {
      setStatistics(result.data);
    }
  };

  useEffect(() => {
    index();
  }, []);

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
