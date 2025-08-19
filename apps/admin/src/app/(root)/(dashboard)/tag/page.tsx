"use client";

import { ModalType } from "@/types/ModalType";
import { useRef, useState } from "react";
import { tagTableColumns } from "./constants/tagTableColumns";
import type { TagEntity } from "./types/tag.entity";
import { TagIndexRequest } from "./types/tag.index.request";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { Button } from "@honeycomb/ui/components/button";
import { toast } from "sonner";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { Pencil, Plus, Trash } from "lucide-react";
import { TagListQuerySchema } from "@honeycomb/validation/tag/schemas/tag.list.query.schema";
import AddTagDialog from "@/app/(root)/(dashboard)/tag/components/AddTagDialog";
import { trpc } from "@honeycomb/trpc/client/trpc";

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
  const { refetch } = trpc.tag.index.useQuery(searchParams as any, { enabled: false });
  const destroyTag = trpc.tag.destroy.useMutation();

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
    try {
      const res = await destroyTag.mutateAsync({ ids });
      if (res.success) {
        tableRef.current?.reload();
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

  return (
    <>
      <DataTable<TagEntity, TagIndexRequest>
        columns={tagTableColumns}
        request={async (params) => {
          setSearchParams(params);
          const res = await refetch();
          return {
            status: 200,
            data: {
              list: (res.data?.list as any) ?? [],
              total: res.data?.total ?? 0,
            },
          };
        }}
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
      <AddTagDialog
        {...modalProps}
        onClose={() =>
          setModalProps((prevState) => ({ ...prevState, open: false }))
        }
        onSuccess={() => {
          tableRef.current?.reload();
        }}
      />
    </>
  );
};

export default Tag;
