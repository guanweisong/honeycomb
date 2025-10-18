"use client";

import { ModalType, ModalTypeName } from "@/types/ModalType";
import { useState } from "react";
import { linkTableColumns } from "./constants/linkTableColumns";
import { DataTable } from "@honeycomb/ui/extended/DataTable";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { Button } from "@honeycomb/ui/components/button";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@honeycomb/trpc/client/trpc";
import {
  LinkListQueryInput,
  LinkListQuerySchema,
} from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import { LinkInsertSchema } from "@honeycomb/validation/link/schemas/link.insert.schema";
import { LinkStatus, linkStatusOptions } from "@honeycomb/db/src/types";
import { LinkEntity } from "@honeycomb/validation/link/schemas/link.entity.schema";

/**
 * 友情链接管理页面。
 * 该组件负责展示友情链接列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Link = () => {
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `LinkEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<LinkEntity[]>([]);

  /**
   * 控制模态框的显示状态、类型（新增/编辑）以及当前编辑的链接记录。
   */
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: LinkEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });

  /**
   * 存储链接列表的查询参数。
   * 当这些参数变化时，会触发链接列表的重新加载。
   */
  const [searchParams, setSearchParams] = useState<LinkListQueryInput>({});

  /**
   * 创建链接的 tRPC mutation。
   */
  const createLink = trpc.link.create.useMutation();
  /**
   * 更新链接的 tRPC mutation。
   */
  const updateLink = trpc.link.update.useMutation();
  /**
   * 删除链接的 tRPC mutation。
   */
  const destroyLink = trpc.link.destroy.useMutation();
  /**
   * 获取链接列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示请求状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isError, refetch, isFetching } = trpc.link.index.useQuery(
    searchParams,
    {
      placeholderData: keepPreviousData,
      staleTime: 60 * 1000, // 1 minutes
    },
  );

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values) => {
    switch (modalProps.type!) {
      case ModalType.ADD:
        try {
          await createLink.mutateAsync(values);
          refetch();
          toast.success("添加成功");
          setModalProps({ open: false });
        } catch (error) {
          toast.error("添加失败");
        }
        break;
      case ModalType.EDIT:
        try {
          await updateLink.mutateAsync({
            id: modalProps.record?.id,
            ...values,
          });
          refetch();
          toast.success("更新成功");
          setModalProps({ open: false });
        } catch (error) {
          toast.error("更新失败");
        }
        break;
    }
  };

  /**
   * 新增按钮事件
   */
  const handleAddNew = () => {
    setModalProps({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
  };

  /**
   * 删除按钮事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    destroyLink
      .mutateAsync({ ids })
      .then((res) => {
        if (res.success) {
          refetch();
          toast.success("删除成功");
          return true;
        } else {
          return false;
        }
      })
      .catch(() => {
        toast.error("删除失败");
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
   * 编辑按钮事件
   * @param record
   */
  const handleEditItem = (record: LinkEntity) => {
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record: record,
    });
  };

  return (
    <>
      <DataTable<LinkEntity, LinkListQueryInput>
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        onChange={(params) => {
          setSearchParams(params);
        }}
        isFetching={isFetching}
        error={isError}
        columns={linkTableColumns}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex justify-between">
            <div className="flex gap-1">
              <Button onClick={handleAddNew} variant="outline">
                <Plus />
                添加链接
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
                schema={LinkListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入链接名称进行搜索",
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
      <Dialog
        title={`${ModalTypeName[ModalType[modalProps.type!] as keyof typeof ModalTypeName]}链接`}
        open={modalProps?.open}
        onOpenChange={(open) =>
          setModalProps((prevState) => ({ ...prevState, open }))
        }
      >
        <DynamicForm
          defaultValues={
            modalProps.type === ModalType.ADD
              ? {
                  status: LinkStatus.ENABLE,
                }
              : modalProps.record
          }
          schema={
            modalProps.type === ModalType.EDIT
              ? LinkUpdateSchema
              : LinkInsertSchema
          }
          fields={[
            {
              label: "链接名称",
              name: "name",
              type: "text",
              placeholder: "请输入链接名称",
            },
            {
              label: "链接URL",
              name: "url",
              type: "text",
              placeholder: "请以http://或者https://开头",
            },
            {
              label: "logo网址",
              name: "logo",
              type: "text",
              placeholder: "请以http://或者https://开头",
            },
            {
              label: "链接描述",
              name: "description",
              type: "textarea",
              placeholder: "请输入链接描述",
            },
            {
              label: "状态",
              name: "status",
              type: "radio",
              options: linkStatusOptions,
            },
          ]}
          onSubmit={handleModalOk}
        />
      </Dialog>
    </>
  );
};

export default Link;
