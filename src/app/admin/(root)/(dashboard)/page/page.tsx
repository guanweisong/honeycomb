"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * 页面管理模块的根页面 (`/page`)。
 * 该组件的唯一作用是立即将用户重定向到页面列表页面 (`/page/list`)。
 */
const Page = () => {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/admin/page/list");
  }, []);

  return <></>;
};

export default Page;
