"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  runAdminMutation,
  type AdminMutationFeedback,
  type AdminMutationState,
} from "@/components/admin/action-state";
import {
  buildMenuSaveInput,
  type MenuEntityTree,
  type MenuSaveItem,
} from "./menu-transforms";

interface SubmitMenuChangesOptions extends AdminMutationFeedback {
  checkedList: MenuEntityTree[];
  saveAll: (input: MenuSaveItem[]) => Promise<unknown>;
}

export async function submitMenuChanges({
  checkedList,
  saveAll,
  refetch,
  notifySuccess,
  notifyWarning,
  notifyError,
}: SubmitMenuChangesOptions): Promise<AdminMutationState> {
  return runAdminMutation({
    input: buildMenuSaveInput(checkedList),
    mutate: saveAll,
    refetch,
    notifySuccess,
    notifyWarning,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
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
        notifyWarning: toast.warning,
        notifyError: toast.error,
      }),
  };
}
/**
 * 菜单管理的保存操作及权限相关客户端编排。
 */
