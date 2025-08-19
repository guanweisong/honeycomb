"use client";

import React, { useRef, useState } from "react";
import { commentTableColumns } from "./constants/commentTableColumns";
import { CommentStatus } from "./types/CommentStatus";
import type { CommentEntity } from "./types/comment.entity";
import { TagIndexRequest } from "@/app/(root)/(dashboard)/tag/types/tag.index.request";
import { Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { Button } from "@honeycomb/ui/components/button";
import { toast } from "sonner";
import { CommentListQuerySchema } from "@honeycomb/validation/comment/schemas/comment.list.query.schema";
import { trpc } from "@honeycomb/trpc/client/trpc";

const Comment = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<CommentEntity[]>([]);
  const [searchParams, setSearchParams] = useState<TagIndexRequest>();
  const listQuery = trpc.comment.index.useQuery(searchParams as any, { enabled: false });
  const updateComment = trpc.comment.update.useMutation();
  const destroyComment = trpc.comment.destroy.useMutation();

  /**
   * 评论状态操作
   * @param id
   * @param type
   */
  const handleSetStatus = async (id: string, type: CommentStatus) => {
    try {
      await updateComment.mutateAsync({ id, data: { status: type } });
      tableRef.current?.reload();
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
      tableRef.current?.reload();
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
      <DataTable<CommentEntity, TagIndexRequest>
        columns={commentTableColumns}
        request={async (params) => {
          setSearchParams(params);
          const { data } = await listQuery.refetch();
          return { status: 200, data } as any;
        }}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        params={searchParams}
        ref={tableRef}
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
