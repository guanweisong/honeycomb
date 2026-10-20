"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

import { PageState } from "@/components/PageState";

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
