"use client";

import { toast } from "sonner";
import type { CommentUpdate } from "@/packages/trpc/api/modules/comment/schemas/comment.update.schema";
import type { CommentEntity } from "@/packages/trpc/api/modules/comment/types/comment.entity";
import type { CommentStatus } from "@/packages/trpc/api/modules/comment/types/comment.status";
import { trpc } from "@/packages/trpc/client/trpc";

export type CommentActionState = "success" | "error";

type CommentMutationFeedback = {
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

type SubmitCommentStatusUpdateOptions = CommentMutationFeedback & {
  id: string;
  status: CommentStatus;
  update: (input: CommentUpdate) => Promise<unknown>;
};

export async function submitCommentStatusUpdate({
  id,
  status,
  update,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitCommentStatusUpdateOptions): Promise<CommentActionState> {
  try {
    await update({ id, status } as CommentUpdate);
    refetch();
    notifySuccess("更新成功");
    return "success";
  } catch {
    notifyError("更新失败");
    return "error";
  }
}

type SubmitCommentDeleteOptions = CommentMutationFeedback & {
  ids: string[];
  destroy: (input: { ids: string[] }) => Promise<unknown>;
};

export async function submitCommentDelete({
  ids,
  destroy,
  refetch,
  notifySuccess,
  notifyError,
}: SubmitCommentDeleteOptions): Promise<CommentActionState> {
  try {
    await destroy({ ids });
    refetch();
    notifySuccess("删除成功");
    return "success";
  } catch {
    notifyError("删除失败");
    return "error";
  }
}

type SubmitCommentBatchDeleteOptions = {
  selectedRows: Pick<CommentEntity, "id">[];
  deleteItems: (ids: string[]) => Promise<CommentActionState>;
  onSelectionChange: (rows: CommentEntity[]) => void;
};

export async function submitCommentBatchDelete({
  selectedRows,
  deleteItems,
  onSelectionChange,
}: SubmitCommentBatchDeleteOptions): Promise<void> {
  await deleteItems(selectedRows.map((row) => row.id));
  onSelectionChange([]);
}

type UseCommentActionsOptions = {
  selectedRows: CommentEntity[];
  onSelectionChange: (rows: CommentEntity[]) => void;
  refetch: () => unknown;
};

export function useCommentActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: UseCommentActionsOptions) {
  const updateComment = trpc.comment.update.useMutation();
  const destroyComment = trpc.comment.destroy.useMutation();

  const handleSetStatus = (id: string, status: CommentStatus) =>
    submitCommentStatusUpdate({
      id,
      status,
      update: updateComment.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyError: toast.error,
    });

  const handleDelete = (ids: string[]) =>
    submitCommentDelete({
      ids,
      destroy: destroyComment.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyError: toast.error,
    });

  const handleDeleteBatch = () =>
    submitCommentBatchDelete({
      selectedRows,
      deleteItems: handleDelete,
      onSelectionChange,
    });

  return { handleSetStatus, handleDelete, handleDeleteBatch };
}
