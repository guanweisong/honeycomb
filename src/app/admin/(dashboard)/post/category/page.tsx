"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import CategoryFormDialog from "@/app/admin/(dashboard)/components/CategoryFormDialog";
import categoryListTableColumns from "@/app/admin/(dashboard)/post/category/components/category-list-table-columns";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { DataTable } from "@/components/DataTable";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminListQueryOptions } from "@/app/admin/(dashboard)/config/query-options";
import type { CategoryListItem as CategoryEntity } from "@/features/category/types/category.record";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";
import {
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  runAdminMutation,
  type AdminDialogState,
} from "@/app/admin/(dashboard)/lib/action-state";

/**
 * 文章分类管理页面。
 * 该组件负责展示文章分类列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Category = () => {
  const canCreateCategory = useCan(Permission.categoryCreate);
  const canUpdateCategory = useCan(Permission.categoryUpdate);
  const canDeleteCategory = useCan(Permission.categoryDelete);
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `CategoryEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<CategoryEntity[]>([]);
  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的分类记录。
   */
  const [modalProps, setModalProps] = useState<
    AdminDialogState<CategoryEntity>
  >(createInitialAdminDialogState);
  /**
   * 获取分类列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } =
    trpc.category.adminTree.useQuery(undefined, adminListQueryOptions);
  /**
   * 删除分类的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyCategory = trpc.category.destroy.useMutation();

  /**
   * 编辑事件
   * @param record
   */
  const handleEditItem = (record: CategoryEntity) =>
    setModalProps(openEditAdminDialog(record));

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    const state = await runAdminMutation({
      input: { ids },
      mutate: destroyCategory.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });
    if (state === "success") {
      setSelectedRows((rows) => rows.filter((row) => !ids.includes(row.id)));
    }
    return state === "success";
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    return handleDeleteItem(ids);
  };

  /**
   * 新增事件
   */
  const handleAddNew = () => setModalProps(openAddAdminDialog());

  return (
    <>
      <DataTable<CategoryEntity>
        getRowId={(row) => row.id}
        columns={categoryListTableColumns}
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        maxHeightRem={12}
        pagination={false}
        isFetching={isFetching}
        error={isError}
        onRetry={() => {
          void refetch();
        }}
        selectableRows={canDeleteCategory}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex gap-1">
            {canCreateCategory && (
              <Button onClick={handleAddNew} variant="outline">
                <Plus />
                添加新分类
              </Button>
            )}
            {canDeleteCategory && (
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
            )}
          </div>
        }
        rowActions={(row) => (
          <div className="flex gap-1">
            {canUpdateCategory && (
              <Button
                aria-label="编辑分类"
                size="sm"
                variant="secondary"
                onClick={() => handleEditItem(row)}
              >
                <Pencil />
              </Button>
            )}
            {canDeleteCategory && (
              <Dialog
                trigger={
                  <Button variant="secondary" size="sm" aria-label="删除分类">
                    <Trash />
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={() => handleDeleteItem([row.id])}
              />
            )}
          </div>
        )}
      />
      <CategoryFormDialog
        modalProps={modalProps}
        setModalProps={setModalProps}
      />
    </>
  );
};

export default Category;
