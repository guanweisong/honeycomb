"use client";

import { toast } from "sonner";
import type { CommentUpdate } from "@/features/comment/types/comment.update";
import type { AdminCommentViewModel } from "@/features/comment/presentation/comment-view-model";
import type { CommentStatus } from "@/features/comment/types/comment.status";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminMutationState,
} from "@/components/admin/lib/action-state";

type SubmitCommentStatusUpdateOptions = AdminMutationFeedback & {
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
  notifyWarning,
  notifyError,
}: SubmitCommentStatusUpdateOptions): Promise<AdminMutationState> {
  return runAdminMutation({
    input: { id, status },
    mutate: update,
    refetch,
    notifySuccess,
    notifyWarning,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
}

type SubmitCommentDeleteOptions = AdminMutationFeedback & {
  ids: string[];
  destroy: (input: { ids: string[] }) => Promise<unknown>;
};

export async function submitCommentDelete({
  ids,
  destroy,
  refetch,
  notifySuccess,
  notifyWarning,
  notifyError,
}: SubmitCommentDeleteOptions): Promise<AdminMutationState> {
  return runAdminMutation({
    input: { ids },
    mutate: destroy,
    refetch,
    notifySuccess,
    notifyWarning,
    notifyError,
    successMessage: "删除成功",
    errorMessage: "删除失败",
  });
}

export function useCommentActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: AdminListActionOptions<AdminCommentViewModel>) {
  const updateComment = trpc.comment.update.useMutation();
  const destroyComment = trpc.comment.destroy.useMutation();

  const handleSetStatus = (id: string, status: CommentStatus) =>
    submitCommentStatusUpdate({
      id,
      status,
      update: updateComment.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
    });

  const handleDelete = (ids: string[]) =>
    submitCommentDelete({
      ids,
      destroy: destroyComment.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
    });

  const handleDeleteBatch = () =>
    submitAdminBatchDelete({
      selectedRows,
      deleteItems: handleDelete,
      onSelectionChange,
    });

  return { handleSetStatus, handleDelete, handleDeleteBatch };
}
/**
 * Comment 管理页的状态变更、批量操作及权限相关客户端编排。
 */
