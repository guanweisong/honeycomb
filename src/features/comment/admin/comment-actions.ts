"use client";

import { toast } from "sonner";
import type { AdminCommentViewModel } from "@/features/comment/presentation/comment-view-model";
import type { CommentStatus } from "@/features/comment/types/comment.status";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminListActionOptions,
} from "@/components/admin/lib/action-state";

export function useCommentActions({
  selectedRows,
  onSelectionChange,
  refetch,
}: AdminListActionOptions<AdminCommentViewModel>) {
  const updateComment = trpc.comment.update.useMutation();
  const destroyComment = trpc.comment.destroy.useMutation();

  const handleSetStatus = (id: string, status: CommentStatus) =>
    runAdminMutation({
      input: { id, status },
      mutate: updateComment.mutateAsync,
      successMessage: "更新成功",
      errorMessage: "更新失败",
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
    });

  const handleDelete = (ids: string[]) =>
    runAdminMutation({
      input: { ids },
      mutate: destroyComment.mutateAsync,
      successMessage: "删除成功",
      errorMessage: "删除失败",
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
