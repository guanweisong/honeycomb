"use client";

import { ModalType } from "@/app/admin/types/ModalType";
import { useState } from "react";
import { toast } from "sonner";
import type { UserInsert } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import type { UserUpdate } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import type { UserEntity } from "@/packages/trpc/api/outputs";
import { trpc } from "@/packages/trpc/client/trpc";
import { buildUserUpdateInput } from "../transforms/userTransforms";

export type UserDialogState = {
  type?: ModalType;
  open: boolean;
  record?: UserEntity;
};

export type UserActionState = "success" | "error" | "missing-target" | "noop";

export function createInitialUserDialogState(): UserDialogState {
  return { type: ModalType.ADD, open: false };
}

export function openAddUserDialog(): UserDialogState {
  return { type: ModalType.ADD, open: true, record: undefined };
}

export function openEditUserDialog(record: UserEntity): UserDialogState {
  return { type: ModalType.EDIT, open: true, record };
}

export function closeUserDialog(): UserDialogState {
  return { open: false };
}

type SubmitUserUpdateOptions = {
  record?: UserEntity;
  values: UserUpdate;
  update: (input: UserUpdate) => Promise<unknown>;
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

export async function submitUserUpdate({
  record,
  values,
  update,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitUserUpdateOptions): Promise<UserActionState> {
  if (!record?.id) {
    notifyError("缺少用户ID");
    return "missing-target";
  }

  try {
    await update(buildUserUpdateInput(record, values));
    refetch();
    notifySuccess("更新成功");
    return "success";
  } catch {
    notifyError("更新失败");
    return "error";
  }
}

type SubmitUserCreateOptions = {
  values: UserInsert;
  create: (input: UserInsert) => Promise<unknown>;
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

export async function submitUserCreate({
  values,
  create,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitUserCreateOptions): Promise<UserActionState> {
  try {
    await create(values);
    refetch();
    notifySuccess("添加成功");
    return "success";
  } catch {
    notifyError("添加失败");
    return "error";
  }
}

type SubmitUserDeleteOptions = {
  ids: string[];
  destroy: (input: { ids: string[] }) => Promise<{ success: boolean }>;
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

export async function submitUserDelete({
  ids,
  destroy,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitUserDeleteOptions): Promise<UserActionState> {
  try {
    const result = await destroy({ ids });
    if (!result.success) return "noop";
    refetch();
    notifySuccess("删除成功");
    return "success";
  } catch {
    notifyError("删除失败");
    return "error";
  }
}

type UseUserActionsOptions = {
  selectedRows: UserEntity[];
  onSelectionChange: (rows: UserEntity[]) => void;
  refetch: () => unknown;
};

export function useUserActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: UseUserActionsOptions) {
  const [dialogState, setDialogState] = useState<UserDialogState>(
    createInitialUserDialogState,
  );
  const createUser = trpc.user.create.useMutation();
  const updateUser = trpc.user.update.useMutation();
  const destroyUser = trpc.user.destroy.useMutation();

  const handleDeleteItem = (ids: string[]) =>
    submitUserDelete({
      ids,
      destroy: destroyUser.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyError: toast.error,
    });

  const handleDeleteBatch = async () => {
    await handleDeleteItem(selectedRows.map((row) => row.id));
    onSelectionChange([]);
  };

  const handleModalOk = async (values: UserInsert | UserUpdate) => {
    const state =
      dialogState.type === ModalType.ADD
        ? await submitUserCreate({
            values: values as UserInsert,
            create: createUser.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          })
        : await submitUserUpdate({
            record: dialogState.record,
            values: values as UserUpdate,
            update: updateUser.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          });

    if (state === "success") setDialogState(closeUserDialog());
  };

  return {
    dialogState,
    handleAddNew: () => setDialogState(openAddUserDialog()),
    handleEditItem: (record: UserEntity) =>
      setDialogState(openEditUserDialog(record)),
    handleDeleteItem,
    handleDeleteBatch,
    handleModalOk,
    handleDialogOpenChange: (open: boolean) =>
      setDialogState((state) => ({ ...state, open })),
  };
}
/**
 * 用户管理的弹窗状态、增删改操作及权限相关客户端编排。
 */
