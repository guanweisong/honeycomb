"use client";

import MultiLangFormItem from "@/src/components/MultiLangFormItem";
import { formItemLayout } from "@/src/constants/formItemLayout";
import { ModalType, ModalTypeName } from "@/src/types/ModalType";
import { Form, Popconfirm } from "antd";
import { useRef, useState } from "react";
import { tagTableColumns } from "./constants/tagTableColumns";
import TagService from "./service";
import type { TagEntity } from "./types/tag.entity";
import { TagIndexRequest } from "./types/tag.index.request";
import { DataTable, DataTableRef } from "@ui/extended/DataTable";
import { Button } from "@ui/components/button";
import { toast } from "sonner";
import { Dialog } from "@ui/extended/Dialog";
import { Input } from "@ui/components/input";
import { DynamicForm } from "@ui/extended/DynamicForm";
import { z } from "zod";

const Tag = () => {
  const [form] = Form.useForm();
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
    form.resetFields();
  };

  /**
   * 删除按钮事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    const result = await TagService.destroy(ids);
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
   * 编辑按钮事件
   * @param record
   */
  const handleEditItem = (record: TagEntity) => {
    form.setFieldsValue(record);
    setModalProps({
      type: ModalType.EDIT,
      open: true,
      record: record,
    });
  };

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = () => {
    form
      .validateFields()
      .then(async (values) => {
        switch (modalProps.type!) {
          case ModalType.ADD:
            const createResult = await TagService.create(values);
            if (createResult.status === 201) {
              tableRef.current?.reload();
              toast.success("添加成功");
              setModalProps({ open: false });
            }
            break;
          case ModalType.EDIT:
            const updateResult = await TagService.update(
              modalProps.record?.id as string,
              values,
            );
            if (updateResult.status === 201) {
              tableRef.current?.reload();
              toast.success("更新成功");
              setModalProps({ open: false });
            }
            break;
        }
      })
      .catch((e) => {
        console.error(e);
      });
  };

  /**
   * 校验标签名是否存在
   * @param _rule
   * @param value
   */
  const validateTagName = async (_rule: any, value: string) => {
    if (value && value.length > 0) {
      let exist = false;
      const result = await TagService.index({ name: value });
      const currentId = modalProps.record?.id;
      if (result.data.total > 0 && result.data.list[0].id !== currentId) {
        exist = true;
      }
      if (exist) {
        return Promise.reject("抱歉，标签已存在，请换一个标签");
      }
      return Promise.resolve();
    }
    return Promise.resolve();
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
              <Button onClick={handleAddNew}>添加新标签</Button>
              <Dialog
                title="确认删除吗？"
                trigger={
                  <Button
                    variant="destructive"
                    disabled={selectedRows.length === 0}
                  >
                    批量删除
                  </Button>
                }
                onOK={handleDeleteBatch}
              />
            </div>
            <div className="flex gap-1">
              <DynamicForm
                schema={z.object({ name: z.string().optional() })}
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
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditItem(row)}
            >
              编辑
            </Button>
            &nbsp;
            <Popconfirm
              title="确定要删除吗？"
              onConfirm={() => handleDeleteItem([row.id])}
            >
              <Button size="sm" variant="outline">
                删除
              </Button>
            </Popconfirm>
          </div>
        )}
      />
      <Dialog
        title={`${ModalTypeName[ModalType[modalProps.type!] as keyof typeof ModalTypeName]}标签`}
        open={modalProps.open}
        onOpenChange={(open) =>
          setModalProps((prevState) => ({ ...prevState, open }))
        }
        onOK={handleModalOk}
      >
        <Form form={form}>
          <MultiLangFormItem>
            <Form.Item
              {...formItemLayout}
              name={"name"}
              label="标签名称"
              rules={[
                { required: true, message: "请输入标签名称" },
                { validator: validateTagName },
              ]}
            >
              <Input maxLength={100} />
            </Form.Item>
          </MultiLangFormItem>
        </Form>
      </Dialog>
    </>
  );
};

export default Tag;
