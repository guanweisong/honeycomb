"use client";

import type { TagRecord as TagEntity } from "@/features/tag/types/tag.record";
import { useState } from "react";
import { tagTableColumns } from "@/app/admin/(dashboard)/tag/components/tag-table-columns";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import type { TagListQueryInput } from "@/features/tag/types/tag.list";
import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.schema";
import TagFormDialog from "@/app/admin/(dashboard)/tag/components/TagFormDialog";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminListQueryOptions } from "@/app/admin/(dashboard)/config/query-options";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  runAdminMutation,
  submitAdminBatchDelete,
  type AdminDialogState,
} from "@/app/admin/(dashboard)/lib/action-state";

/**
 * 标签管理页面。
 * 该组件负责展示标签列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Tag = () => {
  const canCreateTag = useCan(Permission.tagCreate);
  const canUpdateTag = useCan(Permission.tagUpdate);
  const canDeleteTag = useCan(Permission.tagDelete);
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `TagEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<TagEntity[]>([]);
  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的标签记录。
   */
  const [modalProps, setModalProps] = useState<AdminDialogState<TagEntity>>(
    createInitialAdminDialogState,
  );

  /**
   * 存储标签列表的查询参数。
   */
  const [searchParams, setSearchParams] = useState<TagListQueryInput>({});

  /**
   * 获取标签列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } = trpc.tag.index.useQuery(
    searchParams,
    adminListQueryOptions,
  );
  /**
   * 删除标签的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyTag = trpc.tag.destroy.useMutation();

  /**
   * 新增按钮事件
   */
  const handleAddNew = () => setModalProps(openAddAdminDialog());

  /**
   * 删除按钮事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    return runAdminMutation({
      input: { ids },
      mutate: destroyTag.mutateAsync,
      isSuccess: (result) => result.success,
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = () =>
    submitAdminBatchDelete({
      selectedRows,
      deleteItems: handleDeleteItem,
      onSelectionChange: setSelectedRows,
    });

  /**
   * 编辑按钮事件
   */
  const handleEditItem = (record: TagEntity) =>
    setModalProps(openEditAdminDialog(record));

  return (
    <>
      <div className="flex min-h-0 flex-col">
        <DataTable<TagEntity>
          getRowId={(row) => row.id}
          columns={tagTableColumns}
          data={{
            list: data?.list ?? [],
            total: data?.total ?? 0,
          }}
          isFetching={isFetching}
          error={isError}
          onRetry={() => {
            void refetch();
          }}
          selectableRows={canDeleteTag}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          onChange={(params) => {
            setSearchParams(TagListQuerySchema.parse(params));
          }}
          toolBar={(table) => (
            <div className="flex justify-between">
              <div className="flex gap-1">
                {canCreateTag && (
                  <Button onClick={handleAddNew} variant="outline">
                    <Plus />
                    添加新标签
                  </Button>
                )}
                {canDeleteTag && (
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
              <div className="flex gap-1">
                <DynamicForm
                  schema={TagListQuerySchema}
                  fields={[
                    {
                      name: "name",
                      type: "text",
                      label: "搜索标签",
                      labelHidden: true,
                      placeholder: "请输入标签名进行搜索",
                    },
                  ]}
                  onSubmit={({ name }) =>
                    table.getColumn("name")?.setFilterValue(name)
                  }
                  inline
                  submitProps={{
                    children: "查询",
                    variant: "outline",
                  }}
                />
              </div>
            </div>
          )}
          rowActions={(row) => (
            <div className="flex gap-1">
              {canUpdateTag && (
                <Button
                  aria-label="编辑标签"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEditItem(row)}
                >
                  <Pencil />
                </Button>
              )}
              {canDeleteTag && (
                <Dialog
                  trigger={
                    <Button variant="secondary" size="sm" aria-label="删除标签">
                      <Trash />
                    </Button>
                  }
                  type="danger"
                  title="确定要删除吗？"
                  onOK={async () =>
                    (await handleDeleteItem([row.id])) === "success"
                  }
                />
              )}
            </div>
          )}
        />
      </div>

      <TagFormDialog
        {...modalProps}
        onClose={() => setModalProps(closeAdminDialog())}
        onSuccess={() => refetch()}
      />
    </>
  );
};

export default Tag;
