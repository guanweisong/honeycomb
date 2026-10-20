"use client";

import { useState } from "react";
import { Trash } from "lucide-react";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import { CommentListQuerySchema } from "@/features/comment/schemas/comment.list.query.schema";
import type { AdminCommentViewModel as CommentEntity } from "../../../presentation/comment-view-model";
import { CommentStatus } from "@/features/comment/comment-status";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { useCommentActions } from "@/features/comment/admin/comment-actions";
import { commentTableColumns } from "../../columns/comment-columns";
import { useCommentQuery } from "@/features/comment/admin/comment-query";

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
  const [selectedRows, setSelectedRows] = useState<CommentEntity[]>([]);
  const query = useCommentQuery();
  const { handleSetStatus, handleDelete, handleDeleteBatch } =
    useCommentActions({
      selectedRows,
      onSelectionChange: setSelectedRows,
      refetch: query.refetch,
    });

  const renderOpt = (record: CommentEntity): React.ReactNode => {
    const actionsByStatus = [];
    switch (record.status) {
      case CommentStatus.TO_AUDIT:
        actionsByStatus.push(
          <Dialog
            key="publish"
            trigger={
              <Button variant="secondary" size="sm">
                通过
              </Button>
            }
            type="warning"
            title="确定要通过吗？"
            onOK={async () => {
              await handleSetStatus(record.id, CommentStatus.PUBLISH);
            }}
          />,
        );
        actionsByStatus.push(
          <Dialog
            key="rubbish"
            trigger={
              <Button variant="secondary" size="sm">
                驳回
              </Button>
            }
            type="warning"
            title="确定要驳回吗？"
            onOK={async () => {
              await handleSetStatus(record.id, CommentStatus.RUBBISH);
            }}
          />,
        );
        break;
      case CommentStatus.PUBLISH:
        actionsByStatus.push(
          <Dialog
            key="ban"
            trigger={
              <Button variant="secondary" size="sm">
                屏蔽
              </Button>
            }
            type="warning"
            title="确定要屏蔽吗？"
            onOK={async () => {
              await handleSetStatus(record.id, CommentStatus.BAN);
            }}
          />,
        );
        break;
      case CommentStatus.RUBBISH:
        actionsByStatus.push(
          <Dialog
            key="publish"
            trigger={
              <Button variant="secondary" size="sm">
                通过
              </Button>
            }
            type="warning"
            title="确定要通过吗？"
            onOK={async () => {
              await handleSetStatus(record.id, CommentStatus.PUBLISH);
            }}
          />,
        );
        break;
      case CommentStatus.BAN:
        actionsByStatus.push(
          <Dialog
            trigger={
              <Button variant="secondary" size="sm">
                解除屏蔽
              </Button>
            }
            type="warning"
            title="确定要解除屏蔽吗？"
            onOK={async () => {
              await handleSetStatus(record.id, CommentStatus.PUBLISH);
            }}
          />,
        );
        break;
    }
    actionsByStatus.push(
      <Dialog
        key="delete"
        trigger={
          <Button variant="secondary" size="sm">
            <Trash />
          </Button>
        }
        type="danger"
        title="确定要删除吗？"
        onOK={async () => {
          await handleDelete([record.id]);
        }}
      />,
    );
    return actionsByStatus;
  };

  return (
    <DataTable<CommentEntity>
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
        query.setSearchParams(CommentListQuerySchema.parse(params))
      }
      selectableRows={canModerateComments}
      selectedRows={selectedRows}
      onSelectionChange={setSelectedRows}
      toolBar={
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
                  placeholder: "请输入评论内容进行搜索",
                },
              ]}
              onSubmit={query.setSearchParams}
              inline={true}
              submitProps={{ children: "查询", variant: "outline" }}
            />
          </div>
        </div>
      }
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
