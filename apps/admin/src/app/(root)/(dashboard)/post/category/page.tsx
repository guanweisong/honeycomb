"use client";

import { ModalType } from "@/types/ModalType";
import { Button } from "@honeycomb/ui/components/button";
import { useState } from "react";
import AddCategoryModal from "./components/AddCategoryModal";
import { categoryListTableColumns } from "./constans/categoryListTableColumns";
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

const Category = () => {
  const [selectedRows, setSelectedRows] = useState<CategoryEntity[]>([]);
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: CategoryEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  const [searchParams, setSearchParams] = useState<CategoryListQueryInput>({
    limit: 999,
  });
  const { data, isLoading, isError, refetch } =
    trpc.category.index.useQuery(searchParams);
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
        loading={isLoading}
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
