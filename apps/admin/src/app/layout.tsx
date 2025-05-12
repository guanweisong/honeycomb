import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import React from "react";
import { Toaster } from "@ui/components/sonner";

import "./globals.scss";

export const dynamic = "force-dynamic";

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
        {children}
        <Toaster />
      </body>
      <GoogleAnalytics gaId="G-15D5ZQ68JX" />
    </html>
  );
}
