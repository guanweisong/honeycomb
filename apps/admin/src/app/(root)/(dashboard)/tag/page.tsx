"use client";

import { ModalType, ModalTypeName } from "@/types/ModalType";
import { useRef, useState } from "react";
import { tagTableColumns } from "./constants/tagTableColumns";
import TagService from "./service";
import type { TagEntity } from "./types/tag.entity";
import { TagIndexRequest } from "./types/tag.index.request";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { Button } from "@honeycomb/ui/components/button";
import { toast } from "sonner";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { TagCreateSchema } from "@honeycomb/validation/tag/schemas/tag.create.schema";

const Tag = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<TagEntity[]>([]);
  const [modalProps, setModalProps] = useState<{
    type?: ModalType;
    open: boolean;
    record?: TagEntity;
  }>({
    type: ModalType.ADD,
    open: false,
  });
  const [searchParams, setSearchParams] = useState<TagIndexRequest>();

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
    return TagService.destroy(ids).then((result) => {
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
  const handleEditItem = (record: TagEntity) => {
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record: record,
    });
  };

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values: any) => {
    switch (modalProps.type!) {
      case ModalType.ADD:
        return TagService.create(values).then((result) => {
          if (result.status === 201) {
            tableRef.current?.reload();
            toast.success("添加成功");
            setModalProps({ open: false });
          }
        });
      case ModalType.EDIT:
        return TagService.update(modalProps.record?.id as string, values).then(
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

  return (
    <>
      <DataTable<TagEntity, TagIndexRequest>
        columns={tagTableColumns}
        request={TagService.index}
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
                添加新标签
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
                schema={TagListQuerySchema}
                fields={[
                  {
                    name: "name",
                    type: "text",
                    placeholder: "请输入标签名进行搜索",
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
              size="sm"
              variant="secondary"
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
        title={`${ModalTypeName[ModalType[modalProps.type!] as keyof typeof ModalTypeName]}标签`}
        open={modalProps.open}
        onOpenChange={(open) =>
          setModalProps((prevState) => ({ ...prevState, open }))
        }
      >
        <DynamicForm
          defaultValues={modalProps.record}
          schema={
            modalProps.type === ModalType.EDIT
              ? TagUpdateSchema
              : TagCreateSchema
          }
          labelPosition="left"
          fields={[
            {
              label: "标签名称(zh)",
              name: "name.zh",
              type: "text",
              placeholder: "请输入标签中文名称",
            },
            {
              label: "标签名称(en)",
              name: "name.en",
              type: "text",
              placeholder: "请输入标签英文名称",
            },
          ]}
          onSubmit={handleModalOk}
        />
      </Dialog>
    </>
  );
};

export default Tag;
