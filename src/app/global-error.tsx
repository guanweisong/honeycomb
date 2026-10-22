"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main role="alert">
          <p>站点暂时不可用。</p>
          <button type="button" onClick={retry}>
            重试
          </button>
          <form action="/">
            <button type="submit">返回首页</button>
          </form>
        </main>
      </body>
    </html>
  );
}
