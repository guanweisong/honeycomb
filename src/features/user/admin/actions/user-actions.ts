"use client";

import { ModalType } from "@/packages/ui/admin/modal-type";
import { useState } from "react";
import { toast } from "sonner";
import {
  UserInsertSchema,
  UserUpdateSchema,
  type UserInsert,
  type UserUpdate,
} from "@/features/user/application/write-schema";
import type { UserViewModel as UserEntity } from "../../presentation/user-view-model";
import { trpc } from "@/packages/trpc/client/trpc";
import { buildUserUpdateInput } from "../transforms/user-transforms";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminDialogState,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminTargetMutationState,
} from "@/packages/ui/admin/action-state";

export type UserDialogState = AdminDialogState<UserEntity>;

type SubmitUserUpdateOptions = AdminMutationFeedback & {
  record?: UserEntity;
  values: UserUpdate;
  update: (input: UserUpdate) => Promise<unknown>;
};

export async function submitUserUpdate({
  record,
  values,
  update,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitUserUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少用户ID");
    return "missing-target";
  }

  return runAdminMutation({
    input: buildUserUpdateInput(record, values),
    mutate: update,
    refetch,
    notifySuccess,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
}

export function useUserActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: AdminListActionOptions<UserEntity>) {
  const [dialogState, setDialogState] = useState<UserDialogState>(
    createInitialAdminDialogState,
  );
  const createUser = trpc.user.create.useMutation();
  const updateUser = trpc.user.update.useMutation();
  const destroyUser = trpc.user.destroy.useMutation();

  const handleDeleteItem = (ids: string[]) =>
    runAdminMutation({
      input: { ids },
      mutate: destroyUser.mutateAsync,
      isSuccess: (result) => result.success,
      refetch,
      notifySuccess: toast.success,
      notifyError: toast.error,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });

  const handleDeleteBatch = () =>
    submitAdminBatchDelete({
      selectedRows,
      deleteItems: handleDeleteItem,
      onSelectionChange,
    });

  const handleModalOk = async (values: UserInsert | UserUpdate) => {
    const state =
      dialogState.type === ModalType.ADD
        ? await runAdminMutation({
            input: UserInsertSchema.parse(values),
            mutate: createUser.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
            successMessage: "添加成功",
            errorMessage: "添加失败",
          })
        : await submitUserUpdate({
            record: dialogState.record,
            values: UserUpdateSchema.parse(values),
            update: updateUser.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          });

    if (state === "success") setDialogState(closeAdminDialog());
  };

  return {
    dialogState,
    handleAddNew: () => setDialogState(openAddAdminDialog()),
    handleEditItem: (record: UserEntity) =>
      setDialogState(openEditAdminDialog(record)),
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
