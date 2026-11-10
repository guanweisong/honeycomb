"use client";
import { useDialogSession } from "@/app/admin/(dashboard)/lib/use-dialog-session";
import { z } from "zod";
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
  const session = useDialogSession(modalProps?.open, modalProps?.type, modalProps?.record?.id);
  const defaultValues = modalProps?.record
    ? {
        ...modalProps.record,
        parent: modalProps.record.parent ?? "0",
        title: modalProps.record.title ?? undefined,
        description: modalProps.record.description ?? undefined,
      }
    : undefined;

  // 旧路径保持原值，只有实际修改路径时才应用新 slug 规则。
  const editSchema = CategoryUpdateSchema.safeExtend({
    path: z.preprocess(
      (value: string | undefined) =>
        value === modalProps?.record?.path ? undefined : value,
      CategoryUpdateSchema.shape.path,
    ),
  });

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

  const close = () => {
    session.invalidate();
    setModalProps({ open: false });
  };
  const feedback = {
    refetch: categoryQuery.refetch,
    notifySuccess: toast.success,
    notifyWarning: toast.warning,
    notifyError: toast.error,
  };
  const handleCreate = async ({ parent, ...values }: z.output<typeof CategoryInsertSchema>) => {
    if (modalProps?.type !== ModalType.ADD) return;
    await session.closeAfter(
      () => runAdminMutation({
        ...feedback,
        input: { ...values, ...(parent !== "0" ? { parent } : {}) },
        mutate: createCategory.mutateAsync,
        successMessage: "添加成功",
        errorMessage: "添加失败",
      }),
      close,
    );
  };
  const handleUpdate = async ({ parent, ...values }: z.output<typeof editSchema>) => {
    const record = modalProps?.record;
    if (!record?.id) return;
    const input = withAdminRecordId(record, { ...values, parent: parent === "0" ? null : parent });
    await session.closeAfter(
      () => runAdminMutation({
        ...feedback,
        input,
        mutate: updateCategory.mutateAsync,
        successMessage: "更新成功",
        errorMessage: "更新失败",
      }),
      close,
    );
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
        if (!open) session.invalidate();
        setModalProps({ ...modalProps, open });
      }}
    >
      {modalProps?.type === ModalType.EDIT ? (
        <DynamicForm
          key={`edit:${modalProps.record?.id}:${modalProps.open}`}
          defaultValues={defaultValues}
          schema={editSchema}
          fields={fields}
          onSubmit={handleUpdate}
        />
      ) : (
        <DynamicForm
          key={`add:${modalProps?.open}`}
          defaultValues={defaultValues}
          schema={CategoryInsertSchema}
          fields={fields}
          onSubmit={handleCreate}
        />
      )}
    </Dialog>
  );
};

export default CategoryFormDialog;
