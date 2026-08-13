"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <html lang="zh-CN"><body><main role="alert"><p>站点暂时不可用。</p><button type="button" onClick={reset}>重试</button><form action="/"><button type="submit">返回首页</button></form></main></body></html>;
}
