"use client";

import { Button } from "@/packages/ui/components/button";
import { PageState } from "@/packages/ui/extended/PageState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
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
