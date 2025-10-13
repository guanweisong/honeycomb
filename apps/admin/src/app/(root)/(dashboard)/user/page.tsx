"use client";

import { ModalType, ModalTypeName } from "@/types/ModalType";
import md5 from "md5";
import { useState } from "react";
import { userTableColumns } from "./constants/userTableColumns";
import { DataTable } from "@honeycomb/ui/extended/DataTable";
import { Button } from "@honeycomb/ui/components/button";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { toast } from "sonner";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";
import {
  UserListQueryInput,
  UserListQuerySchema,
} from "@honeycomb/validation/user/schemas/user.list.query.schema";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { UserEntity } from "@honeycomb/validation/user/schemas/user.entity.schema";
import {
  UserLevel,
  userLevelOptions,
  UserStatus,
  userStatusOptions,
} from "@honeycomb/db";

/**
 * 用户管理页面。
 * 该组件负责展示用户列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const User = () => {
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `UserEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<UserEntity[]>([]);
  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的用户记录。
   */
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: UserEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  /**
   * 存储用户列表的查询参数。
   * 当这些参数变化时，会触发用户列表的重新加载。
   */
  const [searchParams, setSearchParams] = useState<UserListQueryInput>({});
  /**
   * 获取用户列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isLoading` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isLoading, isError, refetch } =
    trpc.user.index.useQuery(searchParams);
  /**
   * 创建用户的 tRPC mutation。
   */
  const createUser = trpc.user.create.useMutation();
  /**
   * 更新用户的 tRPC mutation。
   */
  const updateUser = trpc.user.update.useMutation();
  /**
   * 删除用户的 tRPC mutation。
   */
  const destroyUser = trpc.user.destroy.useMutation();

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    try {
      const res = await destroyUser.mutateAsync({ ids });
      if (res.success) {
        refetch();
        toast.success("删除成功");
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
   * 编辑事件
   * @param record
   */
  const handleEditItem = (record: UserEntity) => {
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record: record,
    });
  };

  /**
   * 新增、修改保存事件
   */
  const handleModalOk = async (values) => {
    const { password, ...rest } = values;
    const params = rest;
    if (password) {
      params.password = md5(values.password);
    }
    switch (modalProps.type!) {
      case ModalType.ADD:
        try {
          await createUser.mutateAsync(params);
          refetch();
          toast.success("添加成功");
          setModalProps({ open: false });
        } catch (e) {
          toast.error("添加失败");
        }
        break;
      case ModalType.EDIT:
        try {
          await updateUser.mutateAsync({
            ...params,
            id: modalProps.record?.id,
          });
          refetch();
          toast.success("更新成功");
          setModalProps({ open: false });
        } catch (e) {
          toast.error("更新失败");
        }
        break;
    }
  };

  /**
   * 新增事件
   */
  const handleAddNew = () => {
    setModalProps({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
  };

  return (
    <>
      <DataTable<UserEntity, UserListQueryInput>
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        columns={userTableColumns}
        loading={isLoading}
        error={isError}
        selectableRows={true}
        disabledRowSelectable={(row) => row.level === UserLevel.ADMIN}
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
              variant="secondary"
              size="sm"
              onClick={() => handleEditItem(row)}
            >
              <Pencil />
            </Button>
            {row.level !== UserLevel.ADMIN &&
              row.status !== UserStatus.DELETED && (
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
              )}
          </div>
        )}
      />
      <Dialog
        title={`${ModalTypeName[ModalType[modalProps.type!] as keyof typeof ModalTypeName]}用户`}
        open={modalProps.open}
        onOpenChange={(open) =>
          setModalProps((prevState) => ({ ...prevState, open }))
        }
      >
        <DynamicForm
          defaultValues={
            modalProps.type === ModalType.ADD
              ? {
                  status: UserStatus.ENABLE,
                  level: UserLevel.EDITOR,
                }
              : modalProps.record
          }
          schema={
            modalProps.type === ModalType.EDIT
              ? UserUpdateSchema
              : UserInsertSchema
          }
          fields={[
            {
              label: "用户名",
              name: "name",
              type: "text",
              placeholder: "请输入用户名",
            },
            {
              label: "密码",
              name: "password",
              type: "password",
              placeholder:
                modalProps.type === ModalType.EDIT
                  ? "留空则为不修改"
                  : "请输入密码",
            },
            {
              label: "邮箱",
              name: "email",
              type: "text",
              placeholder: "请输入邮箱",
            },
            {
              label: "级别",
              name: "level",
              type: "radio",
              options: userLevelOptions,
              disabled: () => modalProps.record?.level === UserLevel.ADMIN,
            },
            {
              label: "状态",
              name: "status",
              type: "radio",
              options: userStatusOptions,
              disabled: () => modalProps.record?.level === UserLevel.ADMIN,
            },
          ]}
          onSubmit={handleModalOk}
        />
      </Dialog>
    </>
  );
};

export default User;
