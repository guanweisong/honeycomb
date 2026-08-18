"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ModalType } from "@/packages/ui/admin/modal-type";
import type { LinkInsert } from "@/packages/trpc/api/modules/link/schemas/link.insert.schema";
import type { LinkUpdate } from "@/packages/trpc/api/modules/link/schemas/link.update.schema";
import type { LinkEntity } from "@/packages/trpc/api/outputs";
import { trpc } from "@/packages/trpc/client/trpc";
import { buildLinkUpdateInput } from "../transforms/link-transforms";

export type LinkDialogState = {
  type?: ModalType;
  open: boolean;
  record?: LinkEntity;
};

export type LinkActionState = "success" | "error" | "missing-target" | "noop";

export function createInitialLinkDialogState(): LinkDialogState {
  return { type: ModalType.ADD, open: false };
}

export function openAddLinkDialog(): LinkDialogState {
  return { type: ModalType.ADD, open: true, record: undefined };
}

export function openEditLinkDialog(record: LinkEntity): LinkDialogState {
  return { type: ModalType.EDIT, open: true, record };
}

export function closeLinkDialog(): LinkDialogState {
  return { open: false };
}

type LinkMutationFeedback = {
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

type SubmitLinkCreateOptions = LinkMutationFeedback & {
  values: LinkInsert;
  create: (input: LinkInsert) => Promise<unknown>;
};

export async function submitLinkCreate({
  values,
  create,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitLinkCreateOptions): Promise<LinkActionState> {
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

type SubmitLinkUpdateOptions = LinkMutationFeedback & {
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
}: SubmitLinkUpdateOptions): Promise<LinkActionState> {
  if (!record?.id) {
    notifyError("缺少记录ID");
    return "missing-target";
  }

  try {
    await update(buildLinkUpdateInput(record, values));
    refetch();
    notifySuccess("更新成功");
    return "success";
  } catch {
    notifyError("更新失败");
    return "error";
  }
}

type SubmitLinkDeleteOptions = LinkMutationFeedback & {
  ids: string[];
  destroy: (input: { ids: string[] }) => Promise<{ success: boolean }>;
};

export async function submitLinkDelete({
  ids,
  destroy,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitLinkDeleteOptions): Promise<LinkActionState> {
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

type SubmitLinkBatchDeleteOptions = {
  selectedRows: LinkEntity[];
  deleteItems: (ids: string[]) => Promise<LinkActionState>;
  onSelectionChange: (rows: LinkEntity[]) => void;
};

export async function submitLinkBatchDelete({
  selectedRows,
  deleteItems,
  onSelectionChange,
}: SubmitLinkBatchDeleteOptions): Promise<void> {
  await deleteItems(selectedRows.map((row) => row.id));
  onSelectionChange([]);
}

type UseLinkActionsOptions = {
  selectedRows: LinkEntity[];
  onSelectionChange: (rows: LinkEntity[]) => void;
  refetch: () => unknown;
};

export function useLinkActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: UseLinkActionsOptions) {
  const [dialogState, setDialogState] = useState<LinkDialogState>(
    createInitialLinkDialogState,
  );
  const createLink = trpc.link.create.useMutation();
  const updateLink = trpc.link.update.useMutation();
  const destroyLink = trpc.link.destroy.useMutation();

  const handleDeleteItem = (ids: string[]) =>
    submitLinkDelete({
      ids,
      destroy: destroyLink.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyError: toast.error,
    });

  const handleDeleteBatch = () =>
    submitLinkBatchDelete({
      selectedRows,
      deleteItems: handleDeleteItem,
      onSelectionChange,
    });

  const handleModalOk = async (values: LinkInsert | LinkUpdate) => {
    const state =
      dialogState.type === ModalType.ADD
        ? await submitLinkCreate({
            values: values as LinkInsert,
            create: createLink.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          })
        : await submitLinkUpdate({
            record: dialogState.record,
            values: values as LinkUpdate,
            update: updateLink.mutateAsync,
            refetch,
            notifySuccess: toast.success,
            notifyError: toast.error,
          });

    if (state === "success") setDialogState(closeLinkDialog());
  };

  return {
    dialogState,
    handleAddNew: () => setDialogState(openAddLinkDialog()),
    handleEditItem: (record: LinkEntity) =>
      setDialogState(openEditLinkDialog(record)),
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
