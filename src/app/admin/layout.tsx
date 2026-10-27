import { GoogleAnalytics } from "@next/third-parties/google";
import { clientEnv } from "@/env/client";
import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import "@/app/admin/globals.scss";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Admin 根布局为登录页及受保护页面提供 HTML、通知与分析组件。
 * 认证与 tRPC / QueryClient Provider 由 (dashboard)/layout 在认证后安装。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-cn">
      <body>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
      {clientEnv.NEXT_PUBLIC_GA_ADMIN_ID ? (
        <GoogleAnalytics gaId={clientEnv.NEXT_PUBLIC_GA_ADMIN_ID} />
      ) : null}
    </html>
  );
}
