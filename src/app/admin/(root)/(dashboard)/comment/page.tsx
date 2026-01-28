"use client";

import React, { useState } from "react";
import { commentTableColumns } from "./constants/commentTableColumns";
import { CommentStatus } from "@/packages/types/comment/comment.status";
import { Trash } from "lucide-react";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { DataTable } from "@/packages/ui/extended/DataTable";
import { Button } from "@/packages/ui/components/button";
import { toast } from "sonner";
import { CommentListQuerySchema } from "@/packages/validation/schemas/comment/comment.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import { TagListQueryInput } from "@/packages/validation/schemas/tag/tag.list.query.schema";
import { keepPreviousData } from "@tanstack/react-query";
import { CommentEntity } from "@/packages/trpc/server/types/comment.entity";
import { CommentUpdate } from "@/packages/validation/schemas/comment/comment.update.schema";

/**
 * 评论管理页面。
 * 该组件负责展示评论列表，并提供搜索、状态管理（通过、驳回、屏蔽）、删除等功能。
 */
const Comment = () => {
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `CommentEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<CommentEntity[]>([]);
  /**
   * 存储评论列表的查询参数。
   * 当这些参数变化时，会触发评论列表的重新加载。
   */
  const [searchParams, setSearchParams] = useState<TagListQueryInput>({});
  /**
   * 获取评论列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } = trpc.comment.index.useQuery(
    searchParams,
    {
      placeholderData: keepPreviousData,
      staleTime: 60 * 1000, // 1 minutes
    },
  );
  /**
   * 更新评论的 tRPC mutation。
   * 用于更新评论的状态。
   */
  const updateComment = trpc.comment.update.useMutation();
  /**
   * 删除评论的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyComment = trpc.comment.destroy.useMutation();

  /**
   * 评论状态操作
   * @param id
   * @param type
   */
  const handleSetStatus = async (id: string, type: CommentStatus) => {
    try {
      await updateComment.mutateAsync({ id, status: type } as CommentUpdate);
      refetch();
      toast.success("更新成功");
    } catch (e) {
      toast.error("更新失败");
    }
  };

  /**
   * 列操作栏渲染
   * @param record
   */
  const renderOpt = (record: CommentEntity): React.ReactNode => {
    let dom = [];
    switch (record.status) {
      case CommentStatus.TO_AUDIT:
        dom.push(
          <Dialog
            key="publish"
            trigger={
              <Button variant="secondary" size="sm">
                通过
              </Button>
            }
            type="warning"
            title="确定要通过吗？"
            onOK={() => handleSetStatus(record.id, CommentStatus.PUBLISH)}
          />,
        );
        dom.push(
          <Dialog
            key="rubbish"
            trigger={
              <Button variant="secondary" size="sm">
                驳回
              </Button>
            }
            type="warning"
            title="确定要驳回吗？"
            onOK={() => handleSetStatus(record.id, CommentStatus.RUBBISH)}
          />,
        );
        break;
      case CommentStatus.PUBLISH:
        dom.push(
          <Dialog
            key="ban"
            trigger={
              <Button variant="secondary" size="sm">
                屏蔽
              </Button>
            }
            type="warning"
            title="确定要屏蔽吗？"
            onOK={() => handleSetStatus(record.id, CommentStatus.BAN)}
          />,
        );
        break;
      case CommentStatus.RUBBISH:
        dom.push(
          <Dialog
            key="publish"
            trigger={
              <Button variant="secondary" size="sm">
                通过
              </Button>
            }
            type="warning"
            title="确定要通过吗？"
            onOK={() => handleSetStatus(record.id, CommentStatus.PUBLISH)}
          />,
        );
        break;
      case CommentStatus.BAN:
        dom.push(
          <Dialog
            trigger={
              <Button variant="secondary" size="sm">
                解除屏蔽
              </Button>
            }
            type="warning"
            title="确定要解除屏蔽吗？"
            onOK={() => handleSetStatus(record.id, CommentStatus.PUBLISH)}
          />,
        );
        break;
      default:
    }
    dom.push(
      <Dialog
        key="delete"
        trigger={
          <Button variant="secondary" size="sm">
            <Trash />
          </Button>
        }
        type="danger"
        title="确定要删除吗？"
        onOK={() => handleDelete([record.id])}
      />,
    );
    return dom;
  };

  /**
   * 删除事件
   * @param ids
   */
  const handleDelete = async (ids: string[]) => {
    try {
      await destroyComment.mutateAsync({ ids });
      refetch();
      toast.success("删除成功");
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    await handleDelete(ids);
    setSelectedRows([]);
  };

  return (
    <>
      <DataTable<CommentEntity, TagListQueryInput>
        columns={commentTableColumns}
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        isFetching={isFetching}
        error={isError}
        onChange={(params) => {
          setSearchParams(params);
        }}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex justify-between">
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
                onSubmit={setSearchParams}
                inline={true}
                submitProps={{
                  children: "查询",
                  variant: "outline",
                }}
              />
            </div>
          </div>
        }
        rowActions={(row) => <div className="flex gap-1">{renderOpt(row)}</div>}
      />
    </>
  );
};

export default Comment;
