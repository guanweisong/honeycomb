"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import {
  PageInsertSchema,
  PageUpdateSchema,
  type PageInsert,
  type PageUpdate,
} from "@/features/page/schema";
import { PageStatus } from "@/features/page/page-status";
import { trpc } from "@/lib/trpc/client/trpc";
import { useRouter } from "next/navigation";
import { notifyPublicSyncWarning } from "@/components/admin/action-state";
import type { PublicCacheInvalidationResult } from "@/lib/cache/public-content-invalidator";

type PageEditorValues = Partial<PageInsert>;
type PageSyncFeedback = { publicSync?: PublicCacheInvalidationResult["state"] };

type SubmitPageEditorOptions = {
  pageId?: string;
  values: PageEditorValues;
  status: PageStatus;
  create: (input: PageInsert) => Promise<{ id: string } & PageSyncFeedback>;
  update: (input: PageUpdate) => Promise<PageSyncFeedback | undefined>;
};

export type PageEditorSubmitResult =
  | ({ state: "created"; id: string } & PageSyncFeedback)
  | ({ state: "updated" } & PageSyncFeedback)
  | { state: "error" };

export async function submitPageEditor({
  pageId,
  values,
  status,
  create,
  update,
}: SubmitPageEditorOptions): Promise<PageEditorSubmitResult> {
  const data = { ...values, status };

  try {
    if (pageId) {
      const result = await update(
        PageUpdateSchema.parse({ id: pageId, ...data }),
      );
      return { state: "updated", publicSync: result?.publicSync };
    }

    const result = await create(PageInsertSchema.parse(data));
    return { state: "created", id: result.id, publicSync: result.publicSync };
  } catch {
    return { state: "error" };
  }
}

type UsePageEditorActionsOptions = {
  pageId?: string;
  refetch: () => unknown;
};

export function usePageEditorActions({
  pageId,
  refetch,
}: UsePageEditorActionsOptions) {
  const [loading, setLoading] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const createPage = trpc.page.create.useMutation();
  const updatePage = trpc.page.update.useMutation();

  const submit = async (values: PageEditorValues, status: PageStatus) => {
    setLoading(true);
    const result = await submitPageEditor({
      pageId,
      values,
      status,
      create: createPage.mutateAsync,
      update: updatePage.mutateAsync,
    });
    if (result.state === "updated") {
      if (!notifyPublicSyncWarning(result, toast.warning))
        toast.success("更新成功");
      try {
        await refetch();
      } catch {
        // The mutation already succeeded; a failed refresh must not undo it.
      }
    } else if (result.state === "created") {
      if (!notifyPublicSyncWarning(result, toast.warning))
        toast.success("添加成功");
      startNavigation(() => router.push(`/admin/page/edit?id=${result.id}`));
    } else {
      clientLogger.error(LogEvent.clientError, {
        operation: "page.submit",
        outcome: "error",
      });
      toast.error("提交失败，请检查表单内容");
    }
    setLoading(false);
    return result;
  };

  return { loading: loading || isNavigating, submit };
}
/**
 * 页面编辑提交操作及表单 Mutation 编排。
 */
