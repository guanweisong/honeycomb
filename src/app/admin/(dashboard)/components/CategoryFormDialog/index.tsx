"use client";
import { useEffect, useRef } from "react";
import type { CategoryListItem as CategoryEntity } from "@/features/category/types/category.record";

import { enableStatusOptions } from "@/app/admin/(dashboard)/config/enable-status-options";
import { Dialog } from "@/components/Dialog";
import { ModalType } from "@/app/admin/(dashboard)/types/modal-type";
import { ModalTypeName } from "@/app/admin/(dashboard)/types/modal-type-name";
import { renderCategoryTitleByDepth } from "@/app/admin/(dashboard)/post/edit/components/category-title";
import { toast } from "sonner";
import type { FieldConfig } from "@/components/DynamicForm/types";
import { DynamicForm } from "@/components/DynamicForm";
import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  runAdminMutation,
  withAdminRecordId,
  type AdminDialogState,
} from "@/app/admin/(dashboard)/lib/action-state";

/**
 * 模态框属性接口。
 * 定义了模态框的类型、显示状态以及可能关联的记录。
 */
export type ModalProps = AdminDialogState<CategoryEntity>;

/**
 * 新增或编辑分类对话框的属性接口。
 */
export interface CategoryFormDialogProps {
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
 * @param {CategoryFormDialogProps} props - 组件属性。
 * @returns {JSX.Element} 添加/编辑分类的模态框。
 */
const CategoryFormDialog = (props: CategoryFormDialogProps) => {
  const { modalProps, setModalProps } = props;
  const session = useRef(0);
  useEffect(
    () => () => {
      session.current += 1;
    },
    [modalProps?.open, modalProps?.type, modalProps?.record?.id],
  );
  const defaultValues = modalProps?.record
    ? {
        ...modalProps.record,
        parent: modalProps.record.parent ?? "0",
        title: modalProps.record.title ?? undefined,
        description: modalProps.record.description ?? undefined,
      }
    : undefined;

  /**
   * 分类列表获取
   */
  /**
   * 获取分类列表的 tRPC 查询。
   * 用于填充父级分类选择器。
   */
  const categoryQuery = trpc.category.adminTree.useQuery();
  const list = categoryQuery.data?.list ?? [];
  /**
   * 创建分类的 tRPC mutation。
   */
  const createCategory = trpc.category.create.useMutation();
  /**
   * 更新分类的 tRPC mutation。
   */
  const updateCategory = trpc.category.update.useMutation();

  /**
   * 关闭弹窗
   */
  const handleModalCancel = () => {
    session.current += 1;
    setModalProps({
      open: false,
    });
  };

  /**
   * 确认按钮事件
   */
  const handleModalOk = async (values: Record<string, unknown>) => {
    const submittedSession = session.current;
    const modalType = modalProps?.type;
    if (modalType === undefined) {
      return;
    }
    if (values.parent === "0") {
      if (modalType === ModalType.EDIT) values.parent = null;
      else delete values.parent;
    }
    const feedback = {
      refetch: categoryQuery.refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
    };
    let state;
    switch (modalType) {
      case ModalType.ADD:
        state = await runAdminMutation({
          ...feedback,
          input: CategoryInsertSchema.parse(values),
          mutate: createCategory.mutateAsync,
          successMessage: "添加成功",
          errorMessage: "添加失败",
        });
        break;
      case ModalType.EDIT:
        if (!modalProps?.record?.id) return;
        state = await runAdminMutation({
          ...feedback,
          input: CategoryUpdateSchema.parse(
            withAdminRecordId({ id: modalProps.record.id }, values),
          ),
          mutate: updateCategory.mutateAsync,
          successMessage: "更新成功",
          errorMessage: "更新失败",
        });
        break;
    }
    if (state === "success" && session.current === submittedSession)
      handleModalCancel();
  };

  const fields: FieldConfig[] = [
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
      options: [
        { label: "根分类", value: "0" },
        ...list.map((option) => ({
          label: renderCategoryTitleByDepth(option.title?.zh ?? "", option),
          value: option.id,
        })),
      ],
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
  ];

  return (
    <Dialog
      title={
        modalProps?.type
          ? `${modalProps.type === ModalType.EDIT ? ModalTypeName.EDIT : ModalTypeName.ADD}分类`
          : "分类"
      }
      open={modalProps?.open}
      onOpenChange={(open) => {
        if (!open) session.current += 1;
        setModalProps({ ...modalProps, open });
      }}
    >
      {modalProps?.type === ModalType.EDIT ? (
        <DynamicForm
          key={`edit:${modalProps.record?.id}:${modalProps.open}`}
          defaultValues={defaultValues}
          schema={CategoryUpdateSchema}
          fields={fields}
          onSubmit={handleModalOk}
        />
      ) : (
        <DynamicForm
          key={`add:${modalProps?.open}`}
          defaultValues={defaultValues}
          schema={CategoryInsertSchema}
          fields={fields}
          onSubmit={handleModalOk}
        />
      )}
    </Dialog>
  );
};

export default CategoryFormDialog;
