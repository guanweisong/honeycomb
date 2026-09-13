"use client";

import { toast } from "sonner";
import type { CommentUpdate } from "@/features/comment/application/write-schema";
import type { AdminCommentViewModel as CommentEntity } from "../../presentation/comment-view-model";
import type { CommentStatus } from "@/packages/domain/content/comment";
import { trpc } from "@/packages/trpc/client/trpc";
import {
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminMutationState,
} from "@/packages/ui/admin/action-state";

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
  notifyError,
}: SubmitCommentStatusUpdateOptions): Promise<AdminMutationState> {
  return runAdminMutation({
    input: { id, status },
    mutate: update,
    refetch,
    notifySuccess,
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
  notifyError,
}: SubmitCommentDeleteOptions): Promise<AdminMutationState> {
  return runAdminMutation({
    input: { ids },
    mutate: destroy,
    refetch,
    notifySuccess,
    notifyError,
    successMessage: "删除成功",
    errorMessage: "删除失败",
  });
}

export function useCommentActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: AdminListActionOptions<CommentEntity>) {
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
