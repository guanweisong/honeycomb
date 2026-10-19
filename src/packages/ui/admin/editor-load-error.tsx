"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/packages/ui/components/button";

export function EditorLoadError({
  kind,
  notFound,
  listHref,
  onRetry,
}: {
  kind: "文章" | "页面";
  notFound: boolean;
  listHref: string;
  onRetry: () => Promise<unknown>;
}) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // Keep the actionable error visible if the retry also fails.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section role="alert" className="space-y-4 rounded-lg border p-6">
      <p>
        {notFound ? `${kind}不存在或已被删除` : `${kind}加载失败，请稍后重试`}
      </p>
      <div className="flex gap-3">
        <Button type="button" disabled={retrying} onClick={() => void retry()}>
          {retrying ? "正在重试…" : "重试"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={listHref}>返回{kind}列表</Link>
        </Button>
      </div>
    </section>
  );
}
