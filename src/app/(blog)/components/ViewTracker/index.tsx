"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/packages/trpc/client/trpc";

interface ViewTrackerProps {
  id: string;
}

/** 在文章客户端首次挂载时尽力上报一次浏览量，不阻塞正文渲染。 */
export function PostViewTracker({ id }: ViewTrackerProps) {
  const { mutate } = trpc.post.incrementViews.useMutation();
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedId.current === id) return;
    trackedId.current = id;
    mutate({ id });
  }, [id, mutate]);

  return null;
}

/** 在独立页面客户端首次挂载时尽力上报一次浏览量。 */
export function PageViewTracker({ id }: ViewTrackerProps) {
  const { mutate } = trpc.page.incrementViews.useMutation();
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedId.current === id) return;
    trackedId.current = id;
    mutate({ id });
  }, [id, mutate]);

  return null;
}
