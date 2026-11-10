"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";
import {
  notifyPublicSyncWarning,
  type AdminMutationFeedback,
} from "@/app/admin/(dashboard)/lib/action-state";
import { MenuSaveSnapshotSchema } from "@/features/menu/schemas/menu.save-snapshot.schema";
import type { MenuSaveSnapshot } from "@/features/menu/types/menu.save-snapshot";
import type { PublicCacheInvalidationResult } from "@/lib/cache/public-content-invalidator";
import {
  buildMenuSaveInput,
  type MenuEntityTree,
} from "@/app/admin/(dashboard)/menu/components/menu-transforms";

export type MenuSaveResult = {
  count: number;
  version: number;
  publicSync?: PublicCacheInvalidationResult["state"];
};
export type MenuSubmitResult =
  | { state: "success"; result: MenuSaveResult; refreshFailed: boolean }
  | { state: "error" | "conflict" | "unknown" | "stale" };
interface SubmitMenuChangesOptions extends AdminMutationFeedback {
  checkedList: MenuEntityTree[];
  expectedVersion: number | undefined;
  saveAll: (input: MenuSaveSnapshot) => Promise<MenuSaveResult>;
  onCommitted?: (result: MenuSaveResult) => void;
  isActive?: () => boolean;
}

export async function submitMenuChanges(
  options: SubmitMenuChangesOptions,
): Promise<MenuSubmitResult> {
  const active = options.isActive ?? (() => true);
  let result: MenuSaveResult;
  try {
    const input = MenuSaveSnapshotSchema.parse({
      items: buildMenuSaveInput(options.checkedList),
      expectedVersion: options.expectedVersion,
    });
    result = await options.saveAll(input);
  } catch (error) {
    if (!active()) return { state: "stale" };
    const code = readTrpcErrorCode(error);
    const state =
      code === "CONFLICT"
        ? "conflict"
        : error instanceof z.ZodError || isDeterminateRejectionCode(code)
          ? "error"
          : "unknown";
    options.notifyError(
      state === "conflict"
        ? "菜单已有更新，本地输入已保留，请核对最新版本"
        : state === "unknown"
          ? "保存结果无法确认，本地输入已保留，请先核对服务器"
          : "更新失败，请检查输入和权限",
    );
    return { state };
  }
  if (!active()) return { state: "stale" };
  options.onCommitted?.(result);
  let refreshFailed = false;
  try {
    const refreshed = await options.refetch();
    refreshFailed =
      !!refreshed &&
      typeof refreshed === "object" &&
      "isSuccess" in refreshed &&
      refreshed.isSuccess !== true;
  } catch {
    refreshFailed = true;
  }
  if (!active()) return { state: "stale" };
  if (refreshFailed)
    (options.notifyWarning ?? options.notifyError)(
      "已保存，菜单待刷新，请勿重复提交",
    );
  else if (
    !notifyPublicSyncWarning(
      result,
      options.notifyWarning ?? options.notifyError,
    )
  )
    options.notifySuccess("更新成功");
  return { state: "success", result, refreshFailed };
}

export function useMenuActions(refetchMenu: () => unknown) {
  const mutation = trpc.menu.saveAll.useMutation();
  const [phase, setPhase] = useState<"idle" | "saving" | "review">("idle");
  const busy = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!busy.current)
      setPhase((previous) => (previous === "saving" ? "idle" : previous));
    return () => {
      generation.current += 1;
      busy.current = false;
    };
  }, []);

  return {
    loading: phase === "saving",
    blocked: phase === "review",
    clearBlocked: () => setPhase("idle"),
    submit: async (
      checkedList: MenuEntityTree[],
      expectedVersion: number | undefined,
      onCommitted: (submitted: MenuEntityTree[], version: number) => void,
    ) => {
      if (busy.current || phase === "review") return;
      busy.current = true;
      setPhase("saving");
      const current = generation.current;
      const active = () => generation.current === current;
      let needsReview = false;
      try {
        const outcome = await submitMenuChanges({
          checkedList,
          expectedVersion,
          saveAll: mutation.mutateAsync,
          refetch: refetchMenu,
          onCommitted: (result) => onCommitted(checkedList, result.version),
          isActive: active,
          notifySuccess: toast.success,
          notifyWarning: toast.warning,
          notifyError: toast.error,
        });
        needsReview =
          outcome.state === "conflict" || outcome.state === "unknown";
      } finally {
        if (active()) {
          busy.current = false;
          setPhase(needsReview ? "review" : "idle");
        }
      }
    },
  };
}
