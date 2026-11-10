"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import { LinkListQuerySchema } from "@/features/link/schemas/link.list.schema";
import type { LinkRecord as LinkEntity } from "@/features/link/types/link.record";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useAdminTableState } from "@/app/admin/(dashboard)/lib/use-admin-table-state";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { LinkFormDialog } from "@/app/admin/(dashboard)/link/components/LinkFormDialog";
import { useLinkActions } from "@/app/admin/(dashboard)/link/link-actions";
import { linkTableColumns } from "@/app/admin/(dashboard)/link/components/link-columns";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminListQueryOptions } from "@/app/admin/(dashboard)/config/query-options";

export function LinkPageShell() {
  const canCreateLink = useCan(Permission.linkCreate);
  const canUpdateLink = useCan(Permission.linkUpdate);
  const canDeleteLink = useCan(Permission.linkDelete);
  const tableState = useAdminTableState();
  const query = trpc.link.adminIndex.useQuery(
    LinkListQuerySchema.parse(tableState.requestState.requestParams),
    adminListQueryOptions,
  );
  const selectedRows = tableState.getSelectedRows(query.data?.list);
  const actions = useLinkActions({
    selectedRows,
    onSelectionChange: tableState.clearSelection,
    refetch: query.refetch,
  });
  const {
    dialogState,
    handleAddNew,
    handleEditItem,
    handleDeleteItem,
    handleDeleteBatch,
    handleCreate,
    handleUpdate,
    handleDialogOpenChange,
  } = actions;

  return (
    <>
      <DataTable<LinkEntity>
        getRowId={tableState.getRowId}
        requestState={tableState.requestState}
        data={{
          list: query.data?.list ?? [],
          total: query.data?.total ?? 0,
        }}
        isFetching={query.isFetching}
        error={query.isError}
        onRetry={() => {
          void query.refetch();
        }}
        columns={linkTableColumns}
        selectableRows={canDeleteLink}
        selectedRowIds={tableState.selectedRowIds}
        onSelectedRowIdsChange={tableState.setSelectedRowIds}
        toolBar={(table) => (
          <div className="flex justify-between">
            <div className="flex gap-1">
              {canCreateLink && (
                <Button onClick={handleAddNew} variant="outline">
                  <Plus />
                  添加链接
                </Button>
              )}
              {canDeleteLink && (
                <Dialog
                  trigger={
                    <Button
                      variant="outline"
                      disabled={selectedRows.length === 0}
                    >
                      <Trash aria-hidden="true" />
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
                schema={LinkListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    label: "搜索链接",
                    labelHidden: true,
                    placeholder: "请输入链接名称进行搜索",
                  },
                ]}
                onSubmit={({ name }) =>
                  table.getColumn("name")?.setFilterValue(name)
                }
                inline={true}
                submitProps={{ children: "查询", variant: "outline" }}
              />
            </div>
          </div>
        )}
        rowActions={
          canUpdateLink || canDeleteLink
            ? (row) => (
                <div className="flex gap-1">
                  {canUpdateLink && (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="编辑链接"
                      onClick={() => handleEditItem(row)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  )}
                  {canDeleteLink && (
                    <Dialog
                      trigger={
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label="删除链接"
                        >
                          <Trash aria-hidden="true" />
                        </Button>
                      }
                      type="danger"
                      title="确定要删除吗？"
                      onOK={async () => {
                        return (await handleDeleteItem([row.id])) === "success";
                      }}
                    />
                  )}
                </div>
              )
            : undefined
        }
      />
      <LinkFormDialog
        state={dialogState}
        onOpenChange={handleDialogOpenChange}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </>
  );
}
/**
 * 链接管理页组件，负责查询、表格展示、筛选和链接操作。
 */
