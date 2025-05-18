"use client";

import { ModalType, ModalTypeName } from "@/types/ModalType";
import md5 from "md5";
import { useRef, useState } from "react";
import { userTableColumns } from "./constants/userTableColumns";
import UserService from "./service";
import { UserLevel, userLevelOptions } from "./types/UserLevel";
import { UserStatus, userStatusOptions } from "./types/UserStatus";
import type { UserEntity } from "./types/user.entity";
import type { UserIndexRequest } from "./types/user.index.request";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { Button } from "@honeycomb/ui/components/button";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { toast } from "sonner";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import { TagIndexRequest } from "@/app/(root)/(dashboard)/tag/types/tag.index.request";
import { UserUpdateSchema } from "@honeycomb/validation/user/schemas/user.update.schema";
import { UserCreateSchema } from "@honeycomb/validation/user/schemas/user.create.schema";
import { UserListQuerySchema } from "@honeycomb/validation/user/schemas/user.list.query.schema";

const User = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<UserEntity[]>([]);
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: UserEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  const [searchParams, setSearchParams] = useState<TagIndexRequest>();

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    const result = await UserService.destroy(ids);
    if (result.status === 204) {
      tableRef.current?.reload();
      toast.success("删除成功");
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
  const handleModalOk = async (values: any) => {
    const { password, ...rest } = values;
    const params = rest;
    if (password) {
      params.password = md5(values.password);
    }
    switch (modalProps.type!) {
      case ModalType.ADD:
        return UserService.create(params).then((result) => {
          if (result.status === 201) {
            tableRef.current?.reload();
            toast.success("添加成功");
            setModalProps({ open: false });
          }
        });
      case ModalType.EDIT:
        return UserService.update(modalProps.record?.id as string, params).then(
          (result) => {
            if (result.status === 201) {
              tableRef.current?.reload();
              toast.success("更新成功");
              setModalProps({ open: false });
            }
          },
        );
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
      <DataTable<UserEntity, UserIndexRequest>
        request={UserService.index}
        columns={userTableColumns}
        selectableRows={true}
        disabledRowSelectable={(row) => row.level === UserLevel.ADMIN}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        params={searchParams}
        ref={tableRef}
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
          labelPosition="left"
          schema={
            modalProps.type === ModalType.EDIT
              ? UserUpdateSchema
              : UserCreateSchema
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
