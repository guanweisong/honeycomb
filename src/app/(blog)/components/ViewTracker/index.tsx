"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/packages/trpc/client/trpc";

interface ViewTrackerProps {
  id: string;
  initialViews?: number;
}

type IncrementViewsMutation = ReturnType<
  typeof trpc.post.incrementViews.useMutation
>["mutate"];

function useTrackedViews(
  { id, initialViews = 0 }: ViewTrackerProps,
  mutate: IncrementViewsMutation,
) {
  const trackedId = useRef<string | null>(null);
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    if (trackedId.current === id) return;
    trackedId.current = id;
    setViews(initialViews);
    mutate(
      { id },
      { onSuccess: (result) => setViews(result.views ?? initialViews) },
    );
  }, [id, initialViews, mutate]);

  return views;
}

/** 在文章客户端首次挂载时尽力上报一次浏览量，不阻塞正文渲染。 */
export function PostViewTracker(props: ViewTrackerProps) {
  const { mutate } = trpc.post.incrementViews.useMutation();
  const views = useTrackedViews(props, mutate);
  const t = useTranslations("PostInfo");

  return <>{t("views", { count: views })}</>;
}

/** 在独立页面客户端首次挂载时尽力上报一次浏览量。 */
export function PageViewTracker(props: ViewTrackerProps) {
  const { mutate } = trpc.page.incrementViews.useMutation();
  const views = useTrackedViews(props, mutate);
  const t = useTranslations("PostInfo");

  return <>{t("views", { count: views })}</>;
}
