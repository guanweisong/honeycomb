"use client";

import { ModalType } from "@/app/admin/(dashboard)/types/modal-type";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  UserInsertSchema,
  UserUpdateSchema,
} from "@/features/user/schemas/user.write.schema";
import type { UserInsert } from "@/features/user/types/user.insert";
import type { UserUpdate } from "@/features/user/types/user.update";
import type { UserRecord as UserEntity } from "@/features/user/types/user.record";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  runAdminMutation,
  submitAdminBatchDelete,
  withAdminRecordId,
  type AdminDialogState,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminTargetMutationState,
} from "@/app/admin/(dashboard)/lib/action-state";

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
  notifyWarning,
  notifyError,
}: SubmitUserUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少用户ID");
    return "missing-target";
  }

  const { name, ...remainingValues } = values;
  // The form resolver trims names; legacy stored display names may not be trimmed.
  const patch =
    name === undefined || name.trim() === record.name?.trim()
      ? remainingValues
      : values;

  return runAdminMutation({
    input: withAdminRecordId(record, patch),
    mutate: update,
    refetch,
    notifySuccess,
    notifyWarning,
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
  const dialogGeneration = useRef(0);
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
      notifyWarning: toast.warning,
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
    const generation = dialogGeneration.current;
    const state =
      dialogState.type === ModalType.ADD
        ? await runAdminMutation({
            input: UserInsertSchema.parse(values),
            mutate: createUser.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyWarning: toast.warning,
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
            notifyWarning: toast.warning,
            notifyError: toast.error,
          });

    if (state === "success" && generation === dialogGeneration.current) {
      setDialogState(closeAdminDialog());
    }
  };

  return {
    dialogState,
    handleAddNew: () => {
      dialogGeneration.current += 1;
      setDialogState(openAddAdminDialog());
    },
    handleEditItem: (record: UserEntity) => {
      dialogGeneration.current += 1;
      setDialogState(openEditAdminDialog(record));
    },
    handleDeleteItem,
    handleDeleteBatch,
    handleModalOk,
    handleDialogOpenChange: (open: boolean) => {
      dialogGeneration.current += 1;
      setDialogState((state) => ({ ...state, open }));
    },
  };
}
/**
 * 用户管理的弹窗状态、增删改操作及权限相关客户端编排。
 */
