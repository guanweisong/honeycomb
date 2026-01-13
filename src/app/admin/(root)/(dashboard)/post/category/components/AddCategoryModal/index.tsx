"use client";

import { enableStatusOptions } from "@/packages/types/enable.status";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { ModalType, ModalTypeName } from "@/app/admin/types/ModalType";
import { creatCategoryTitleByDepth } from "@/lib/help";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { CategoryInsertSchema } from "@/packages/validation/schemas/category/category.insert.schema";
import { CategoryUpdateSchema } from "@/packages/validation/schemas/category/category.update.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import { z } from "zod";

/**
 * 模态框属性接口。
 * 定义了模态框的类型、显示状态以及可能关联的记录。
 */
export interface ModalProps {
  /**
   * 模态框的类型，例如新增或编辑。
   */
  type?: ModalType;
  /**
   * 控制模态框是否可见。
   */
  open: boolean;
  /**
   * 模态框关联的记录数据，通常在编辑模式下使用。
   */
  record?: any;
}

/**
 * 添加分类模态框组件的属性接口。
 */
export interface AddCategoryModalProps {
  /**
   * 模态框的属性，包括类型、打开状态和记录。
   */
  modalProps?: ModalProps;
  /**
   * 设置模态框属性的回调函数。
   */
  setModalProps: (state: ModalProps) => void;
}

/**
 * 添加/编辑分类的模态框组件。
 * 封装了分类的新增和编辑逻辑，包括表单渲染和数据提交。
 * @param {AddCategoryModalProps} props - 组件属性。
 * @returns {JSX.Element} 添加/编辑分类的模态框。
 */
const AddCategoryModal = (props: AddCategoryModalProps) => {
  /**
   * 存储分类列表数据。
   * 用于在父级分类选择器中展示。
   */
  const [list, setList] = useState<any[]>([]);
  const { modalProps, setModalProps } = props;

  /**
   * 分类列表获取
   */
  /**
   * 获取分类列表的 tRPC 查询。
   * 用于填充父级分类选择器。
   */
  const categoryQuery = trpc.category.index.useQuery({ limit: 9999 });
  /**
   * 创建分类的 tRPC mutation。
   */
  const createCategory = trpc.category.create.useMutation();
  /**
   * 更新分类的 tRPC mutation。
   */
  const updateCategory = trpc.category.update.useMutation();

  useEffect(() => {
    if (categoryQuery.data) setList(categoryQuery.data.list ?? []);
  }, [modalProps?.open, categoryQuery.data]);

  /**
   * 关闭弹窗
   */
  const handleModalCancel = () => {
    setModalProps({
      open: false,
    });
  };

  /**
   * 确认按钮事件
   */
  const handleModalOk = async (
    values: z.infer<typeof CategoryInsertSchema | typeof CategoryUpdateSchema>,
  ) => {
    if (values.parent === "0") {
      delete values.parent;
    }
    switch (modalProps?.type!) {
      case ModalType.ADD:
        return createCategory.mutateAsync(values).then(() => {
          categoryQuery.refetch();
          toast.success("添加成功");
          handleModalCancel();
        });
      case ModalType.EDIT:
        return updateCategory
          .mutateAsync({ ...values, id: modalProps?.record?.id })
          .then(() => {
            categoryQuery.refetch();
            toast.success("更新成功");
            handleModalCancel();
          });
    }
  };

  return (
    <Dialog
      title={`${ModalTypeName[ModalType[modalProps?.type!] as keyof typeof ModalTypeName]}分类`}
      open={modalProps?.open}
      onOpenChange={(open) => setModalProps({ ...modalProps, open })}
    >
      <DynamicForm
        defaultValues={modalProps?.record}
        schema={
          modalProps?.type === ModalType.EDIT
            ? CategoryUpdateSchema
            : CategoryInsertSchema
        }
        fields={[
          {
            label: "分类名称",
            name: "title",
            type: "text",
            placeholder: "请输入分类名称",
            multiLang: true,
          },
          {
            label: "分类路径",
            name: "path",
            type: "text",
            placeholder: "输入小写字母，单词间以中划线分隔，用于URL显示",
          },
          {
            label: "父级分类",
            name: "parent",
            type: "select",
            options: list.map((option) => ({
              label: creatCategoryTitleByDepth(option.title.zh, option),
              value: option.id ?? "0",
            })),
            placeholder: "请选择父级分类",
          },
          {
            label: "分类描述",
            name: "description",
            type: "textarea",
            placeholder: "请输入分类描述",
            multiLang: true,
          },
          {
            label: "状态",
            name: "status",
            type: "radio",
            options: enableStatusOptions,
          },
        ]}
        onSubmit={handleModalOk}
      />
    </Dialog>
  );
};

export default AddCategoryModal;
