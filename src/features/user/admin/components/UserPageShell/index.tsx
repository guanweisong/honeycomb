"use client";

import { useState } from "react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import {
  UserListQuerySchema,
  type UserListQueryInput,
} from "@/features/user/schema";
import type { UserRecord as UserEntity } from "@/features/user/types";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { UserFormDialog } from "../UserFormDialog";
import { useUserActions } from "@/features/user/admin/user-actions";
import { userTableColumns } from "../../columns/user-columns";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminListQueryOptions } from "@/components/admin/query-options";
import {
  canDeleteUserResource,
  isUserResourceProtected,
} from "../../transforms/user-transforms";

export function UserPageShell() {
  const canManageUsers = useCan(Permission.userManage);
  const [selectedRows, setSelectedRows] = useState<UserEntity[]>([]);
  const [searchParams, setSearchParams] = useState<UserListQueryInput>({});
  const query = trpc.user.index.useQuery(searchParams, adminListQueryOptions);
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
      <DataTable<UserEntity>
        data={{
          list: query.data?.list ?? [],
          total: query.data?.total ?? 0,
        }}
        columns={userTableColumns}
        isFetching={query.isFetching}
        error={query.isError}
        onRetry={() => {
          void query.refetch();
        }}
        selectableRows={canManageUsers}
        disabledRowSelectable={isUserResourceProtected}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onChange={(params) =>
          setSearchParams(UserListQuerySchema.parse(params))
        }
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
                onSubmit={setSearchParams}
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
                        return (await handleDeleteItem([row.id])) === "success";
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
