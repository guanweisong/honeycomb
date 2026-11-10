"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminTargetMutationState,
} from "@/app/admin/(dashboard)/lib/action-state";
import { useDialogSession } from "@/app/admin/(dashboard)/lib/use-dialog-session";

export function useAdminRecordActions<
  Record extends { id: string },
  Create,
  Update,
>(
  { selectedRows, onSelectionChange, refetch }: AdminListActionOptions<Record>,
  commands: {
    create: (input: Create) => Promise<unknown>;
    update: (
      record: Record | undefined,
      values: Update,
      feedback: AdminMutationFeedback,
    ) => Promise<AdminTargetMutationState>;
    destroy: (input: { ids: string[] }) => Promise<{ success: boolean }>;
  },
) {
  const [dialogState, setDialogState] = useState(
    createInitialAdminDialogState<Record>,
  );
  const session = useDialogSession(
    dialogState.open,
    dialogState.type,
    dialogState.record?.id,
  );
  const feedback = {
    refetch,
    notifySuccess: toast.success,
    notifyWarning: toast.warning,
    notifyError: toast.error,
  };
  const closeAfterSave = (save: () => Promise<AdminTargetMutationState>) =>
    session.closeAfter(save, () => setDialogState(closeAdminDialog()));

  const handleDeleteItem = (ids: string[]) =>
    runAdminMutation({
      ...feedback,
      input: { ids },
      mutate: commands.destroy,
      isSuccess: (result) => result.success,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });

  return {
    dialogState,
    handleAddNew: () => {
      session.invalidate();
      setDialogState(openAddAdminDialog());
    },
    handleEditItem: (record: Record) => {
      session.invalidate();
      setDialogState(openEditAdminDialog(record));
    },
    handleDialogOpenChange: (open: boolean) => {
      session.invalidate();
      setDialogState((state) => ({ ...state, open }));
    },
    handleDeleteItem,
    handleDeleteBatch: () =>
      submitAdminBatchDelete({
        selectedRows,
        deleteItems: handleDeleteItem,
        onSelectionChange,
      }),
    handleCreate: (values: Create) =>
      closeAfterSave(() =>
        runAdminMutation({
          ...feedback,
          input: values,
          mutate: commands.create,
          successMessage: "添加成功",
          errorMessage: "添加失败",
        }),
      ),
    handleUpdate: (values: Update) =>
      closeAfterSave(() =>
        commands.update(dialogState.record, values, feedback),
      ),
  };
}
