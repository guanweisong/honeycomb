"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  useTrackedViews,
  type ViewTrackerProps,
} from "@/lib/hooks/use-tracked-views";

/** 在独立页面客户端首次挂载时尽力上报一次浏览量。 */
export function PageViewTracker(props: ViewTrackerProps) {
  const { mutate } = trpc.page.incrementViews.useMutation();
  const views = useTrackedViews(props, mutate);
  const t = useTranslations("PostInfo");

  return <>{t("views", { count: views })}</>;
}
