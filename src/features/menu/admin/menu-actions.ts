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
} from "@/components/admin/action-state";
import { MenuSaveSnapshotSchema } from "../schema";
import type { MenuSaveSnapshot } from "../types";
import { buildMenuSaveInput, type MenuEntityTree } from "./menu-transforms";

export type MenuSaveResult = {
  count: number;
  version: number;
  publicSync?: string;
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

export function useMenuActions(
  checkedList: MenuEntityTree[],
  expectedVersion: number | undefined,
  refetchMenu: () => unknown,
  onCommitted: (submitted: MenuEntityTree[], version: number) => void,
  setProtected: (value: boolean) => void,
) {
  const mutation = trpc.menu.saveAll.useMutation();
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  return {
    loading,
    blocked,
    clearBlocked: () => {
      setBlocked(false);
      setProtected(false);
    },
    submit: async () => {
      if (busy.current || blocked) return;
      busy.current = true;
      setProtected(true);
      setLoading(true);
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
        if (
          active() &&
          (outcome.state === "conflict" || outcome.state === "unknown")
        ) {
          needsReview = true;
          setBlocked(true);
        }
      } finally {
        if (active()) {
          busy.current = false;
          setLoading(false);
          if (!needsReview) setProtected(false);
        }
      }
    },
  };
}
