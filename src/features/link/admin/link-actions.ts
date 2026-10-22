"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ModalType } from "@/components/admin/modal-type";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import type { LinkInsert } from "@/features/link/types/link.insert";
import type { LinkUpdate } from "@/features/link/types/link.update";
import type { LinkRecord as LinkEntity } from "@/features/link/types/link.record";
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
} from "@/components/admin/action-state";

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
  notifyWarning,
  notifyError,
}: SubmitLinkUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少记录ID");
    return "missing-target";
  }

  return runAdminMutation({
    input: withAdminRecordId(record, values),
    mutate: update,
    refetch,
    notifySuccess,
    notifyWarning,
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
  const dialogGeneration = useRef(0);
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

  const handleModalOk = async (values: LinkInsert | LinkUpdate) => {
    const generation = dialogGeneration.current;
    const state =
      dialogState.type === ModalType.ADD
        ? await runAdminMutation({
            input: LinkInsertSchema.parse(values),
            mutate: createLink.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyWarning: toast.warning,
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
    handleEditItem: (record: LinkEntity) => {
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
 * 链接管理的弹窗状态、增删改操作及权限相关客户端编排。
 */
