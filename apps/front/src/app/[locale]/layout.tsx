import React, { ReactNode } from "react";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Viewport } from "next";
import "@/assets/markdown.scss";
import "../app.scss";
import BackToTop from "@/components/BackToTop";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import { setRequestLocale } from "next-intl/server";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { NextIntlClientProvider } from "next-intl";

/**
 * 页面重新验证时间。
 * 设置为 60 秒，表示页面内容每 60 秒重新生成一次。
 */
export const revalidate = 60;

/**
 * 国际化布局组件的属性接口。
 */
export interface LocaleLayoutProps {
  /**
   * 子组件，即页面内容。
   */
  children: ReactNode;
  /**
   * 包含当前语言环境的 Promise。
   */
  params: Promise<{ locale: keyof MultiLang }>;
}

/**
 * 国际化布局组件。
 * 该组件为所有国际化页面提供统一的布局结构，包括头部、底部、主题提供者和返回顶部按钮。
 * @param {LocaleLayoutProps} { children, params } - 组件属性。
 * @returns {Promise<JSX.Element>} 国际化布局。
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <Script
          src="https://ssl.captcha.qq.com/TCaptcha.js"
          strategy="lazyOnload"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-full text-base">
            <NextIntlClientProvider>
              <Header />
              <div className={"container px-2"}>{children}</div>
              <Footer />
              <BackToTop />
            </NextIntlClientProvider>
          </div>
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-F7GLX9X5VT" />
    </html>
  );
}

/**
 * 视口配置。
 * 用于设置页面的响应式行为，确保在不同设备上显示良好。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
