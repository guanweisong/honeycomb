"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * 应用的根页面 (/)。
 * 该组件的唯一作用是立即将用户重定向到主看板页面 (`/dashboard`)。
 * 使用 `useLayoutEffect` 是为了在浏览器绘制内容之前执行重定向，
 * 从而避免用户看到空白或闪烁的页面。
 */
const Home = () => {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/dashboard");
  }, []);

  // 此处无需渲染任何内容，因为页面会立即跳转。
  return <></>;
};

export default Home;
