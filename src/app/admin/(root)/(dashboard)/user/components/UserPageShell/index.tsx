"use client";

import { useState } from "react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useCan } from "@/app/admin/hooks/useCurrentUser";
import { Permission } from "@/packages/identity/auth/permissions";
import type { UserListQueryInput } from "@/packages/trpc/api/modules/user/schemas/user.list.query.schema";
import { UserListQuerySchema } from "@/packages/trpc/api/modules/user/schemas/user.list.query.schema";
import type { UserEntity } from "@/packages/trpc/api/outputs";
import { Button } from "@/packages/ui/components/button";
import { DataTable } from "@/packages/ui/extended/DataTable";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { UserFormDialog } from "../UserFormDialog";
import { useUserActions } from "../../actions/userActions";
import { userTableColumns } from "../../columns/userColumns";
import { useUserQuery } from "../../queries/userQuery";
import {
  canDeleteUserResource,
  isUserResourceProtected,
} from "../../transforms/userTransforms";

export function UserPageShell() {
  const canManageUsers = useCan(Permission.userManage);
  const [selectedRows, setSelectedRows] = useState<UserEntity[]>([]);
  const query = useUserQuery();
  const actions = useUserActions({
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
      <DataTable<UserEntity, UserListQueryInput>
        data={{
          list: query.data?.list ?? [],
          total: query.data?.total ?? 0,
        }}
        columns={userTableColumns}
        isFetching={query.isFetching}
        error={query.isError}
        selectableRows={canManageUsers}
        disabledRowSelectable={isUserResourceProtected}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onChange={query.setSearchParams}
        toolBar={
          <div className="flex justify-between">
            {canManageUsers && (
              <div className="flex gap-1">
                <Button onClick={handleAddNew} variant="outline">
                  <Plus />
                  添加新用户
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
            )}
            <div className="flex gap-1">
              <DynamicForm
                schema={UserListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入用户名进行搜索",
                  },
                ]}
                onSubmit={query.setSearchParams}
                inline={true}
                submitProps={{ children: "查询", variant: "outline" }}
              />
            </div>
          </div>
        }
        rowActions={
          canManageUsers
            ? (row) => (
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditItem(row)}
                  >
                    <Pencil />
                  </Button>
                  {canDeleteUserResource(row) && (
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
              )
            : undefined
        }
      />
      <UserFormDialog
        state={dialogState}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleModalOk}
      />
    </>
  );
}
/**
 * 用户管理页组件，负责查询用户、组合表格和执行用户操作。
 */
