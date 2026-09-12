"use client";

import { toast } from "sonner";
import { trpc } from "@/packages/trpc/client/trpc";
import type { AdminMutationFeedback } from "@/packages/ui/admin/action-state";
import {
  buildMenuSaveInput,
  type MenuEntityTree,
  type MenuSaveItem,
} from "../transforms/menu-transforms";

type MenuActionState = "success" | "error";

interface SubmitMenuChangesOptions extends AdminMutationFeedback {
  checkedList: MenuEntityTree[];
  saveAll: (input: MenuSaveItem[]) => Promise<unknown>;
}

export async function submitMenuChanges({
  checkedList,
  saveAll,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitMenuChangesOptions): Promise<MenuActionState> {
  try {
    await saveAll(buildMenuSaveInput(checkedList));
    notifySuccess("更新成功");
    refetch();
    return "success";
  } catch {
    notifyError("更新失败");
    return "error";
  }
}

export function useMenuActions(
  checkedList: MenuEntityTree[],
  refetchMenu: () => unknown,
) {
  const saveAllMenu = trpc.menu.saveAll.useMutation();

  return {
    submit: () =>
      submitMenuChanges({
        checkedList,
        saveAll: saveAllMenu.mutateAsync,
        refetch: refetchMenu,
        notifySuccess: toast.success,
        notifyError: toast.error,
      }),
  };
}
/**
 * 菜单管理的保存操作及权限相关客户端编排。
 */
