"use client";

import { ModalType } from "@/types/ModalType";
import { Button } from "@honeycomb/ui/components/button";
import { useState } from "react";
import AddCategoryModal from "./components/AddCategoryModal";
import categoryListTableColumns from "./constans/categoryListTableColumns";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { DataTable } from "@honeycomb/ui/extended/DataTable";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { CategoryEntity } from "@honeycomb/validation/category/schemas/category.entity.schema";
import {
  CategoryListQueryInput,
  CategoryListQuerySchema,
} from "@honeycomb/validation/category/schemas/category.list.query.schema";
import { keepPreviousData } from "@tanstack/react-query";

/**
 * 文章分类管理页面。
 * 该组件负责展示文章分类列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Category = () => {
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `CategoryEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<CategoryEntity[]>([]);
  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的分类记录。
   */
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: CategoryEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  /**
   * 存储分类列表的查询参数。
   * 默认 `limit` 为 999，以获取所有分类用于层级展示。
   */
  const [searchParams, setSearchParams] = useState<CategoryListQueryInput>({
    limit: 999,
  });
  /**
   * 获取分类列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } = trpc.category.index.useQuery(
    searchParams,
    {
      placeholderData: keepPreviousData,
      staleTime: 60 * 1000, // 1 minutes
    },
  );
  /**
   * 删除分类的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyCategory = trpc.category.destroy.useMutation();

  /**
   * 编辑事件
   * @param record
   */
  const handleEditItem = (record: CategoryEntity) => {
    setModalProps({
      record,
      open: true,
      type: ModalType.EDIT,
    });
  };

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    try {
      await destroyCategory.mutateAsync({ ids });
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
    await handleDeleteItem(ids);
    setSelectedRows([]);
  };

  /**
   * 新增事件
   */
  const handleAddNew = () => {
    setModalProps({
      open: true,
      type: ModalType.ADD,
      record: undefined,
    });
  };

  return (
    <>
      <DataTable<CategoryEntity, CategoryListQueryInput>
        columns={categoryListTableColumns}
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        onChange={(params) => {
          setSearchParams(params);
        }}
        isFetching={isFetching}
        error={isError}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex justify-between">
            <div className="flex gap-1">
              <Button onClick={handleAddNew} variant="outline">
                <Plus />
                添加新分类
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
                schema={CategoryListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入分类名进行搜索",
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
      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </>
  );
};

export default Category;
