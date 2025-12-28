"use client";

import { ModalType } from "@/app/admin/types/ModalType";
import { useState } from "react";
import { tagTableColumns } from "./constants/tagTableColumns";
import { DataTable } from "@/packages/ui/extended/DataTable";
import { Button } from "@/packages/ui/components/button";
import { toast } from "sonner";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import {
  TagListQueryInput,
  TagListQuerySchema,
} from "@/packages/validation/tag/schemas/tag.list.query.schema";
import AddTagDialog from "@/app/admin/(root)/(dashboard)/tag/components/AddTagDialog";
import { trpc } from "@/packages/trpc/client/trpc";
import { useGetState } from "ahooks";
import { keepPreviousData } from "@tanstack/react-query";
import { TagEntity } from "@/packages/trpc/server/types/tag.entity";

/**
 * 标签管理页面。
 * 该组件负责展示标签列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Tag = () => {
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `TagEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<TagEntity[]>([]);
  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的标签记录。
   */
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: TagEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });

  /**
   * 存储标签列表的查询参数。
   * 使用 `useGetState` 钩子，可以在异步操作中获取最新的 `searchParams`。
   */
  const [searchParams, setSearchParams] = useGetState<TagListQueryInput>({});

  /**
   * 获取标签列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } = trpc.tag.index.useQuery(
    searchParams,
    {
      placeholderData: keepPreviousData,
      staleTime: 60 * 1000, // 1 minutes
    },
  );
  /**
   * 删除标签的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyTag = trpc.tag.destroy.useMutation();

  /**
   * 新增按钮事件
   */
  const handleAddNew = () => {
    setModalProps({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
  };

  /**
   * 删除按钮事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    try {
      const res = await destroyTag.mutateAsync({ ids });
      if (res.success) {
        toast.success("删除成功");
        refetch();
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    await handleDeleteItem(ids);
    setSelectedRows([]);
  };

  /**
   * 编辑按钮事件
   */
  const handleEditItem = (record: TagEntity) => {
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record,
    });
  };

  return (
    <>
      <DataTable<TagEntity, TagListQueryInput>
        columns={tagTableColumns}
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        isFetching={isFetching}
        error={isError}
        selectableRows
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onChange={(params) => {
          setSearchParams(params);
        }}
        toolBar={
          <div className="flex justify-between">
            <div className="flex gap-1">
              <Button onClick={handleAddNew} variant="outline">
                <Plus />
                添加新标签
              </Button>
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
                schema={TagListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入标签名进行搜索",
                  },
                ]}
                onSubmit={(values) =>
                  setSearchParams((prev: any) => ({
                    ...prev,
                    ...values,
                    page: 1,
                  }))
                }
                inline
                submitProps={{
                  children: "查询",
                  variant: "outline",
                }}
              />
            </div>
          </div>
        }
        rowActions={(row) => (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleEditItem(row)}
            >
              <Pencil />
            </Button>
            <Dialog
              trigger={
                <Button variant="secondary" size="sm">
                  <Trash />
                </Button>
              }
              type="danger"
              title="确定要删除吗？"
              onOK={() => handleDeleteItem([row.id])}
            />
          </div>
        )}
      />

      <AddTagDialog
        {...modalProps}
        onClose={() => setModalProps((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
};

export default Tag;
