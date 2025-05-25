"use client";

import { EnableType, enableOptions } from "@/types/EnableType";
import { ModalType, ModalTypeName } from "@/types/ModalType";
import { useRef, useState } from "react";
import { linkTableColumns } from "./constants/linkTableColumns";
import LinkService from "./service";
import type { LinkEntity } from "./types/link.entity";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { LinkIndexRequest } from "@/app/(root)/(dashboard)/link/types/link.index.request";
import { TagIndexRequest } from "@/app/(root)/(dashboard)/tag/types/tag.index.request";
import { Button } from "@honeycomb/ui/components/button";
import { toast } from "sonner";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import { LinkUpdateSchema } from "@honeycomb/validation/link/schemas/link.update.schema";
import { LinkCreateSchema } from "@honeycomb/validation/link/schemas/link.create.schema";

const Link = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<LinkEntity[]>([]);

  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: LinkEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });

  const [searchParams, setSearchParams] = useState<TagIndexRequest>();

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values: any) => {
    switch (modalProps.type!) {
      case ModalType.ADD:
        return LinkService.create(values).then((result) => {
          if (result.status === 201) {
            tableRef.current?.reload();
            toast.success("添加成功");
            setModalProps({ open: false });
          }
        });
      case ModalType.EDIT:
        return LinkService.update(modalProps.record?.id as string, values).then(
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
    return LinkService.destroy(ids).then((result) => {
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
      <DataTable<LinkEntity, LinkIndexRequest>
        request={LinkService.index}
        columns={linkTableColumns}
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
                  status: EnableType.ENABLE,
                }
              : modalProps.record
          }
          schema={
            modalProps.type === ModalType.EDIT
              ? LinkUpdateSchema
              : LinkCreateSchema
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
              options: enableOptions,
            },
          ]}
          onSubmit={handleModalOk}
        />
      </Dialog>
    </>
  );
};

export default Link;
