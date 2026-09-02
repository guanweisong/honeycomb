"use client";

import { Button } from "@/packages/ui/components/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      role="alert"
      className="flex min-h-screen items-center justify-center p-6"
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">页面遇到了一点问题</h1>
          <p className="text-muted-foreground">
            内容暂时无法加载，请稍后重试。
          </p>
        </div>
        <Button type="button" onClick={reset}>
          重试
        </Button>
      </div>
    </main>
  );
}
