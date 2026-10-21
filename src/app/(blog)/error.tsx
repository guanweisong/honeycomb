"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { PageState } from "@/components/PageState";

const subscribeToLanguage = () => () => {};
const getLanguage = () => document.documentElement.lang || "zh";
// Match the server snapshot during hydration; no provider is required to recover.
const getServerLanguage = () => "zh";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  const isOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  const isChinese = useSyncExternalStore(
    subscribeToLanguage,
    getLanguage,
    getServerLanguage,
  ).startsWith("zh");

  if (isOffline) {
    return (
      <PageState
        title={isChinese ? "当前处于离线状态" : "You're offline"}
        description={
          isChinese
            ? "请检查网络连接后重试。"
            : "Please check your internet connection and try again"
        }
        actions={
          <Button type="button" onClick={() => window.location.reload()}>
            {isChinese ? "重试" : "Retry"}
          </Button>
        }
      />
    );
  }

  return (
    <PageState
      title={isChinese ? "页面遇到了一点问题" : "Something went wrong!"}
      description={
        isChinese
          ? "内容暂时无法加载，请稍后重试。"
          : "An error occurred while loading this page. Please try again later."
      }
      actions={
        <Button type="button" onClick={reset}>
          {isChinese ? "重试" : "Try again"}
        </Button>
      }
    />
  );
}
