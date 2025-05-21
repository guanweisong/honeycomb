"use client";

import { ModalType } from "@/types/ModalType";
import { Button } from "@honeycomb/ui/components/button";
import { useRef, useState } from "react";
import AddCategoryModal from "./components/AddCategoryModal";
import { categoryListTableColumns } from "./constans/categoryListTableColumns";
import CategoryService from "./service";
import type { CategoryEntity } from "./types/category.entity";
import { TagIndexRequest } from "@/app/(root)/(dashboard)/tag/types/tag.index.request";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import type { CategoryIndexRequest } from "@/app/(root)/(dashboard)/post/category/types/category.index.request";
import { toast } from "sonner";

const Category = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<CategoryEntity[]>([]);
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: CategoryEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  const [searchParams, setSearchParams] = useState<TagIndexRequest>();

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
    return CategoryService.destroy(ids).then((result) => {
      if (result.status === 204) {
        tableRef.current?.reload();
        toast.success("删除成功");
      }
    });
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
      <DataTable<CategoryEntity, CategoryIndexRequest>
        columns={categoryListTableColumns}
        request={CategoryService.index}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        params={searchParams}
        ref={tableRef}
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
                schema={TagListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入标签名进行搜索",
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
