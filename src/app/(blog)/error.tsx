"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main role="alert"><p>内容暂时无法加载。</p><button type="button" onClick={reset}>重试</button></main>;
}
