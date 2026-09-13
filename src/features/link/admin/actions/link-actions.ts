"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ModalType } from "@/packages/ui/admin/modal-type";
import {
  LinkInsertSchema,
  LinkUpdateSchema,
  type LinkInsert,
  type LinkUpdate,
} from "@/features/link/application/write-schema";
import type { LinkViewModel as LinkEntity } from "../../presentation/link-view-model";
import { trpc } from "@/packages/trpc/client/trpc";
import { buildLinkUpdateInput } from "../transforms/link-transforms";
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

export type LinkDialogState = AdminDialogState<LinkEntity>;

type SubmitLinkUpdateOptions = AdminMutationFeedback & {
  record?: LinkEntity;
  values: LinkUpdate;
  update: (input: LinkUpdate) => Promise<unknown>;
};

export async function submitLinkUpdate({
  record,
  values,
  update,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitLinkUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少记录ID");
    return "missing-target";
  }

  return runAdminMutation({
    input: buildLinkUpdateInput(record, values),
    mutate: update,
    refetch,
    notifySuccess,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
}

export function useLinkActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: AdminListActionOptions<LinkEntity>) {
  const [dialogState, setDialogState] = useState<LinkDialogState>(
    createInitialAdminDialogState,
  );
  const createLink = trpc.link.create.useMutation();
  const updateLink = trpc.link.update.useMutation();
  const destroyLink = trpc.link.destroy.useMutation();

  const handleDeleteItem = (ids: string[]) =>
    runAdminMutation({
      input: { ids },
      mutate: destroyLink.mutateAsync,
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

  const handleModalOk = async (values: LinkInsert | LinkUpdate) => {
    const state =
      dialogState.type === ModalType.ADD
        ? await runAdminMutation({
            input: LinkInsertSchema.parse(values),
            mutate: createLink.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
            successMessage: "添加成功",
            errorMessage: "添加失败",
          })
        : await submitLinkUpdate({
            record: dialogState.record,
            values: LinkUpdateSchema.parse(values),
            update: updateLink.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          });

    if (state === "success") setDialogState(closeAdminDialog());
  };

  return {
    dialogState,
    handleAddNew: () => setDialogState(openAddAdminDialog()),
    handleEditItem: (record: LinkEntity) =>
      setDialogState(openEditAdminDialog(record)),
    handleDeleteItem,
    handleDeleteBatch,
    handleModalOk,
    handleDialogOpenChange: (open: boolean) =>
      setDialogState((state) => ({ ...state, open })),
  };
}
/**
 * 链接管理的弹窗状态、增删改操作及权限相关客户端编排。
 */
