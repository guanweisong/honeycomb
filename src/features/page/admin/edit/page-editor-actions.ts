"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import type { PageInsert } from "@/features/page/types/page.insert";
import type { PageRecord } from "@/features/page/types/page.read-model";
import type { PageUpdate } from "@/features/page/types/page.update";
import { PageStatus } from "@/features/page/types/page.status";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";
import { notifyPublicSyncWarning } from "@/components/admin/action-state";
import type { PublicCacheInvalidationResult } from "@/lib/cache/public-content-invalidator";

type PageEditorValues = Partial<PageInsert>;
type PageSyncFeedback = { publicSync?: PublicCacheInvalidationResult["state"] };
type SavedPage = Pick<PageRecord, "id" | "version"> & PageSyncFeedback;
type SubmitPageEditorOptions = {
  pageId?: string;
  expectedVersion?: number;
  values: PageEditorValues;
  status: PageStatus;
  create: (input: PageInsert) => Promise<SavedPage>;
  update: (input: PageUpdate) => Promise<SavedPage>;
};
export type PageEditorSubmitResult =
  | ({ state: "created" | "updated"; refreshFailed?: boolean } & SavedPage)
  | { state: "error" | "unknown" | "conflict" | "stale" };

/** 将确定拒绝、版本冲突和结果未知分开；网络异常不能解释为服务端未写入。 */
export async function submitPageEditor({
  pageId,
  expectedVersion,
  values,
  status,
  create,
  update,
}: SubmitPageEditorOptions): Promise<PageEditorSubmitResult> {
  try {
    if (pageId) {
      const input = PageUpdateSchema.parse({
        ...values,
        status,
        id: pageId,
        expectedVersion,
      });
      return { ...(await update(input)), state: "updated" };
    }
    return {
      ...(await create(PageInsertSchema.parse({ ...values, status }))),
      state: "created",
    };
  } catch (error) {
    const code = readTrpcErrorCode(error);
    if (code === "CONFLICT") return { state: "conflict" };
    if (error instanceof z.ZodError || isDeterminateRejectionCode(code))
      return { state: "error" };
    return { state: "unknown" };
  }
}

/** 隔离账户/页面切换后的迟到反馈；刷新失败不改变已确认的保存结果，也不自动重放写入。 */
export function usePageEditorActions({
  pageId,
  actorId,
  expectedVersion,
  refetch,
}: {
  pageId?: string;
  actorId?: string;
  expectedVersion?: number;
  refetch: () => unknown;
}) {
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const identity = `${actorId ?? ""}:${pageId ?? "new"}`;
  const currentIdentity = useRef(identity);
  useLayoutEffect(() => {
    currentIdentity.current = identity;
    return () => {
      generation.current += 1;
    };
  }, [identity]);
  const busy = useRef(false);
  useEffect(() => {
    busy.current = false;
    setLoading(false);
  }, [identity]);
  const createPage = trpc.page.create.useMutation();
  const updatePage = trpc.page.update.useMutation();
  const submit = async (
    values: PageEditorValues,
    status: PageStatus,
  ): Promise<PageEditorSubmitResult> => {
    if (busy.current || currentIdentity.current !== identity)
      return { state: "stale" };
    busy.current = true;
    setLoading(true);
    const started = generation.current;
    const active = () =>
      generation.current === started && currentIdentity.current === identity;
    try {
      const result = await submitPageEditor({
        pageId,
        expectedVersion,
        values,
        status,
        create: createPage.mutateAsync,
        update: updatePage.mutateAsync,
      });
      if (!active()) return { state: "stale" };
      if (result.state === "updated") {
        let refreshFailed = false;
        try {
          const refreshed = await refetch();
          refreshFailed =
            !refreshed ||
            (typeof refreshed === "object" &&
              "isSuccess" in refreshed &&
              refreshed.isSuccess !== true);
        } catch {
          refreshFailed = true;
        }
        if (!active()) return { state: "stale" };
        if (refreshFailed) toast.warning("已保存，列表待刷新，请勿重复提交");
        else if (!notifyPublicSyncWarning(result, toast.warning))
          toast.success("更新成功");
        return { ...result, refreshFailed };
      }
      if (result.state === "created") {
        if (!notifyPublicSyncWarning(result, toast.warning))
          toast.success("添加成功");
      } else if (result.state === "conflict")
        toast.error("服务器已有更新，本地内容已保留，请核对最新版本");
      else if (result.state === "unknown")
        toast.error("保存结果暂时无法确认，本地内容已保留，请先核对");
      else toast.error("提交失败，请检查表单内容");
      return result;
    } finally {
      if (active()) {
        busy.current = false;
        setLoading(false);
      }
    }
  };
  return { loading, submit };
}
