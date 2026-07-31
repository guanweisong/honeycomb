"use client";

import { toast } from "sonner";
import { trpc } from "@/packages/trpc/client/trpc";
import {
  buildMenuSaveInput,
  type MenuEntityTree,
  type MenuSaveItem,
} from "./menuTransforms";

type MenuActionState = "success" | "error";

type SubmitMenuChangesOptions = {
  checkedList: MenuEntityTree[];
  saveAll: (input: MenuSaveItem[]) => Promise<unknown>;
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

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
