"use client";

import { useState } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import type { PageInsert } from "@/packages/trpc/api/modules/page/schemas/page.insert.schema";
import type { PageUpdate } from "@/packages/trpc/api/modules/page/schemas/page.update.schema";
import { PageStatus } from "@/packages/domain/content/page";
import { trpc } from "@/packages/trpc/client/trpc";
import { useRouter } from "next/navigation";

type PageEditorValues = Partial<PageInsert>;

type SubmitPageEditorOptions = {
  pageId?: string;
  values: PageEditorValues;
  status: PageStatus;
  create: (input: PageInsert) => Promise<{ id: string }>;
  update: (input: PageUpdate) => Promise<unknown>;
};

export type PageEditorSubmitResult =
  | { state: "created"; id: string }
  | { state: "updated" }
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
      await update({ id: pageId, ...data } as PageUpdate);
      return { state: "updated" };
    }

    const result = await create(data as PageInsert);
    return { state: "created", id: result.id };
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
    setLoading(false);

    if (result.state === "updated") {
      toast.success("更新成功");
      refetch();
    } else if (result.state === "created") {
      toast.success("添加成功");
      router.push(`/admin/page/edit?id=${result.id}`);
    } else {
      clientLogger.error(LogEvent.clientError, {
        operation: "page.submit",
        outcome: "error",
      });
      toast.error("提交失败，请检查表单内容");
    }
  };

  return { loading, submit };
}
