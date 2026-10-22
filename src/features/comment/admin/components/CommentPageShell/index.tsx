"use client";

import type { z } from "zod";
import { useState } from "react";
import { Trash } from "lucide-react";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import { CommentListQuerySchema } from "@/features/comment/schemas/comment.list-query.schema";
import type { AdminCommentViewModel } from "../../../presentation/comment-view-model";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { useCommentActions } from "@/features/comment/admin/comment-actions";
import { commentTableColumns } from "../../columns/comment-columns";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminListQueryOptions } from "@/components/admin/config/query-options";

const moderationActions = {
  [CommentStatus.TO_AUDIT]: [
    { key: "publish", label: "通过", status: CommentStatus.PUBLISH },
    { key: "rubbish", label: "驳回", status: CommentStatus.RUBBISH },
  ],
  [CommentStatus.PUBLISH]: [
    { key: "ban", label: "屏蔽", status: CommentStatus.BAN },
  ],
  [CommentStatus.RUBBISH]: [
    { key: "publish", label: "通过", status: CommentStatus.PUBLISH },
  ],
  [CommentStatus.BAN]: [
    { key: "unban", label: "解除屏蔽", status: CommentStatus.PUBLISH },
  ],
} satisfies Record<
  CommentStatus,
  { key: string; label: string; status: CommentStatus }[]
>;

export function CommentPageShell() {
  const canModerateComments = useCan(Permission.commentModerate);
  const canReadPrivate = useCan(Permission.commentReadPrivate);
  const columns = canReadPrivate
    ? commentTableColumns
    : commentTableColumns
        .filter(
          (column) =>
            !(
              "accessorKey" in column &&
              ["email", "ip"].includes(String(column.accessorKey))
            ),
        )
        .map((column) =>
          "accessorKey" in column && column.accessorKey === "postId"
            ? { ...column, enableSorting: false }
            : column,
        );
  const [selectedRows, setSelectedRows] = useState<AdminCommentViewModel[]>([]);
  const [searchParams, setSearchParams] = useState<
    z.input<typeof CommentListQuerySchema>
  >({});
  const query = trpc.comment.index.useQuery(
    searchParams,
    adminListQueryOptions,
  );
  const { handleSetStatus, handleDelete, handleDeleteBatch } =
    useCommentActions({
      selectedRows,
      onSelectionChange: setSelectedRows,
      refetch: query.refetch,
    });

  const renderOpt = (record: AdminCommentViewModel): React.ReactNode => {
    const actionsByStatus = (
      record.status === null ? [] : moderationActions[record.status]
    ).map((action) => (
      <Dialog
        key={action.key}
        trigger={
          <Button variant="secondary" size="sm">
            {action.label}
          </Button>
        }
        type="warning"
        title={`确定要${action.label}吗？`}
        onOK={async () =>
          (await handleSetStatus(record.id, action.status)) === "success"
        }
      />
    ));
    actionsByStatus.push(
      <Dialog
        key="delete"
        trigger={
          <Button variant="secondary" size="sm" aria-label="删除评论">
            <Trash aria-hidden="true" />
          </Button>
        }
        type="danger"
        title="确定要删除吗？"
        onOK={async () => {
          return (await handleDelete([record.id])) === "success";
        }}
      />,
    );
    return actionsByStatus;
  };

  return (
    <DataTable<AdminCommentViewModel>
      getRowId={(row) => row.id}
      columns={columns}
      data={{
        list: query.data?.list ?? [],
        total: query.data?.total ?? 0,
      }}
      isFetching={query.isFetching}
      error={query.isError}
      onRetry={() => {
        void query.refetch();
      }}
      onChange={(params) =>
        setSearchParams(CommentListQuerySchema.parse(params))
      }
      selectableRows={canModerateComments}
      selectedRows={selectedRows}
      onSelectionChange={setSelectedRows}
      toolBar={(table) => (
        <div className="flex justify-between">
          {canModerateComments && (
            <div className="flex gap-1">
              <Dialog
                trigger={
                  <Button
                    variant="outline"
                    disabled={selectedRows.length === 0}
                  >
                    <Trash />
                    批量删除
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={handleDeleteBatch}
              />
            </div>
          )}
          <div className="flex gap-1">
            <DynamicForm
              schema={CommentListQuerySchema}
              fields={[
                {
                  name: "content",
                  type: "text",
                  label: "搜索评论",
                  placeholder: "请输入评论内容进行搜索",
                },
              ]}
              onSubmit={({ content }) =>
                table.getColumn("content")?.setFilterValue(content)
              }
              inline={true}
              submitProps={{ children: "查询", variant: "outline" }}
            />
          </div>
        </div>
      )}
      rowActions={
        canModerateComments
          ? (row) => <div className="flex gap-1">{renderOpt(row)}</div>
          : undefined
      }
    />
  );
}
/**
 * 评论管理页组件，负责查询评论、组合表格和执行评论操作。
 */
