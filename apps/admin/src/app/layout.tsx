"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import React from "react";
import { Toaster } from "@honeycomb/ui/components/sonner";
import { trpc, trpcClient } from "@honeycomb/trpc/client/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./globals.scss";

// 创建一个 React Query 客户端实例
const queryClient = new QueryClient();

/**
 * 强制 Next.js 将此布局视为动态渲染。
 */
export const dynamic = "force-dynamic";

/**
 * Admin 应用的根布局组件。
 * 该组件会包裹所有页面，并提供全局的上下文和资源。
 *
 * @param {{ children: React.ReactNode }} props - 包含子组件的 props。
 * @returns {JSX.Element} 返回一个包含了全局提供者和基本 HTML 结构的布局。
 *
 * 全局配置包括：
 * - **`trpc.Provider`**: 为整个应用提供 tRPC 客户端实例，使其可以在任何组件中调用 API。
 * - **`QueryClientProvider`**: 提供 React Query 的客户端实例，用于数据缓存和状态管理。
 * - **`<Toaster />`**: 全局的消息提示组件。
 * - **第三方脚本**: 引入 EasyMDE (Markdown 编辑器) 的样式和腾讯防水墙的验证码脚本。
 * - **Google Analytics**: 集成谷歌分析。
 * - **Viewport**: 设置移动设备友好的视口。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-cn">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/easymde/dist/easymde.min.css"
        />
        <Script src="https://ssl.captcha.qq.com/TCaptcha.js" />
      </head>
      <body>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </trpc.Provider>
        <Toaster />
      </body>
      <GoogleAnalytics gaId="G-15D5ZQ68JX" />
    </html>
  );
}
