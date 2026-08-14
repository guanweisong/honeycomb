"use client";

import { useState } from "react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useCan } from "@/app/admin/hooks/useCurrentUser";
import { Permission } from "@/packages/identity/auth/permissions";
import type { LinkListQueryInput } from "@/packages/trpc/api/modules/link/schemas/link.list.query.schema";
import { LinkListQuerySchema } from "@/packages/trpc/api/modules/link/schemas/link.list.query.schema";
import type { LinkEntity } from "@/packages/trpc/api/outputs";
import { Button } from "@/packages/ui/components/button";
import { DataTable } from "@/packages/ui/extended/DataTable";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { LinkFormDialog } from "../LinkFormDialog";
import { useLinkActions } from "../../actions/linkActions";
import { linkTableColumns } from "../../columns/linkColumns";
import { useLinkQuery } from "../../queries/linkQuery";

export function LinkPageShell() {
  const canCreateLink = useCan(Permission.linkCreate);
  const canUpdateLink = useCan(Permission.linkUpdate);
  const canDeleteLink = useCan(Permission.linkDelete);
  const [selectedRows, setSelectedRows] = useState<LinkEntity[]>([]);
  const query = useLinkQuery();
  const actions = useLinkActions({
    selectedRows,
    onSelectionChange: setSelectedRows,
    refetch: query.refetch,
  });
  const {
    dialogState,
    handleAddNew,
    handleEditItem,
    handleDeleteItem,
    handleDeleteBatch,
    handleModalOk,
    handleDialogOpenChange,
  } = actions;

  return (
    <>
      <DataTable<LinkEntity, LinkListQueryInput>
        data={{
          list: query.data?.list ?? [],
          total: query.data?.total ?? 0,
        }}
        onChange={query.setSearchParams}
        isFetching={query.isFetching}
        error={query.isError}
        columns={linkTableColumns}
        selectableRows={canDeleteLink}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
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
                schema={LinkListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入链接名称进行搜索",
                  },
                ]}
                onSubmit={query.setSearchParams}
                inline={true}
                submitProps={{ children: "查询", variant: "outline" }}
              />
            </div>
          </div>
        }
        rowActions={(row) => (
          <div className="flex gap-1">
            {canUpdateLink && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEditItem(row)}
              >
                <Pencil />
              </Button>
            )}
            {canDeleteLink && (
              <Dialog
                trigger={
                  <Button variant="secondary" size="sm">
                    <Trash />
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={async () => {
                  await handleDeleteItem([row.id]);
                }}
              />
            )}
          </div>
        )}
      />
      <LinkFormDialog
        state={dialogState}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleModalOk}
      />
    </>
  );
}
/**
 * 链接管理页组件，负责查询、表格展示、筛选和链接操作。
 */
