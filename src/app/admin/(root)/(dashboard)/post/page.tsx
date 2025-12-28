"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * 文章管理模块的根页面 (`/post`)。
 * 该组件的唯一作用是立即将用户重定向到文章列表页面 (`/post/list`)。
 */
const Page = () => {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/admin/post/list");
  }, []);

  return <></>;
};

export default Page;
