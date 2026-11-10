"use client";

import { toast } from "sonner";
import type { PageInsert } from "@/features/page/types/page.insert";
import type { PageRecord } from "@/features/page/types/page.read-model";
import type { PageUpdate } from "@/features/page/types/page.update";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";
import { notifyPublicSyncWarning } from "@/app/admin/(dashboard)/lib/action-state";
import type { PublicCacheInvalidationResult } from "@/lib/cache/public-content-invalidator";

type PageSyncFeedback = { publicSync?: PublicCacheInvalidationResult["state"] };
type SavedPage = Pick<PageRecord, "id" | "version"> & PageSyncFeedback;
type SubmitPageEditorOptions = {
  input: PageInsert | PageUpdate;
  create: (input: PageInsert) => Promise<SavedPage>;
  update: (input: PageUpdate) => Promise<SavedPage>;
};
type PageEditorSubmitResult =
  | ({ state: "created" | "updated" } & SavedPage)
  | { state: "error" | "unknown" | "conflict" };

/** 将确定拒绝、版本冲突和结果未知分开；网络异常不能解释为服务端未写入。 */
export async function submitPageEditor({
  input,
  create,
  update,
}: SubmitPageEditorOptions): Promise<PageEditorSubmitResult> {
  try {
    if ("id" in input) {
      return { ...(await update(input)), state: "updated" };
    }
    return { ...(await create(input)), state: "created" };
  } catch (error) {
    const code = readTrpcErrorCode(error);
    if (code === "CONFLICT") return { state: "conflict" };
    if (isDeterminateRejectionCode(code)) return { state: "error" };
    return { state: "unknown" };
  }
}

/** 使用编辑器的请求归属判断，只在当前访问中刷新详情并显示反馈。 */
export function usePageEditorActions(
  refetch: () => Promise<{ isSuccess: boolean }>,
) {
  const utils = trpc.useUtils();
  const createPage = trpc.page.create.useMutation();
  const updatePage = trpc.page.update.useMutation();
  return async (input: PageInsert | PageUpdate, active: () => boolean) => {
    const result = await submitPageEditor({
      input,
      create: createPage.mutateAsync,
      update: updatePage.mutateAsync,
    });
    if (result.state === "updated" || result.state === "created") {
      // A confirmed write refreshes the list even after the editor is left.
      void utils.page.adminIndex.invalidate().catch(() => {});
    }
    if (!active()) return;
    if (result.state === "updated") {
      let refreshed = false;
      try {
        refreshed = (await refetch()).isSuccess;
      } catch {
        // A failed refresh does not undo a confirmed write.
      }
      if (!active()) return;
      if (!refreshed) toast.warning("已保存，列表待刷新，请勿重复提交");
      else if (!notifyPublicSyncWarning(result, toast.warning))
        toast.success("更新成功");
    } else if (result.state === "created") {
      if (!notifyPublicSyncWarning(result, toast.warning))
        toast.success("添加成功");
    } else if (result.state === "conflict")
      toast.error("服务器已有更新，本地内容已保留，请核对最新版本");
    else if (result.state === "unknown")
      toast.error("保存结果暂时无法确认，本地内容已保留，请先核对");
    else toast.error("提交失败，请检查表单内容");
    return result;
  };
}
