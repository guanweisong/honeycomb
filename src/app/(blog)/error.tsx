"use client";

import { Button } from "@/packages/ui/components/button";
import { PageState } from "@/packages/ui/extended/PageState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const isOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  const isChinese =
    typeof document !== "undefined" &&
    document.documentElement.lang.startsWith("zh");

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
      title="页面遇到了一点问题"
      description="内容暂时无法加载，请稍后重试。"
      actions={
        <Button type="button" onClick={reset}>
          重试
        </Button>
      }
    />
  );
}
