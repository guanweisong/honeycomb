"use client";

import { PageState } from "@/packages/ui/extended/PageState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageState
      compact
      description="后台暂时无法加载。"
      actions={
        <button type="button" onClick={reset}>
          重试
        </button>
      }
    />
  );
}
