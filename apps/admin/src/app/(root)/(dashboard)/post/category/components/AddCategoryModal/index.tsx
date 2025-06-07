"use client";

import { enableOptions } from "@/types/EnableType";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { ModalType, ModalTypeName } from "@/types/ModalType";
import { creatCategoryTitleByDepth } from "@/utils/help";
import { useEffect, useState } from "react";
import CategoryService from "../../service";
import { CategoryEntity } from "../../types/category.entity";
import { toast } from "sonner";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { CategoryCreateSchema } from "@honeycomb/validation/category/schemas/category.create.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";

export interface ModalProps {
  type?: ModalType;
  open: boolean;
  record?: any;
}

export interface AddCategoryModalProps {
  modalProps?: ModalProps;
  setModalProps: (state: ModalProps) => void;
}

const AddCategoryModal = (props: AddCategoryModalProps) => {
  const [list, setList] = useState<CategoryEntity[]>([]);
  const { modalProps, setModalProps } = props;

  /**
   * 分类列表获取
   */
  const index = async () => {
    const result = await CategoryService.index({ limit: 9999 });
    if (result.status === 200) {
      setList(result.data.list);
    }
  };

  useEffect(() => {
    index();
  }, [modalProps?.open]);

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
  const handleModalOk = async (values: any) => {
    if (values.parent === "0") {
      delete values.parent;
    }
    switch (modalProps?.type!) {
      case ModalType.ADD:
        return CategoryService.create(values).then((result) => {
          if (result.status === 201) {
            index();
            toast.success("添加成功");
            handleModalCancel();
          }
        });
      case ModalType.EDIT:
        return CategoryService.update(
          modalProps?.record?.id as string,
          values,
        ).then((result) => {
          if (result.status === 201) {
            index();
            toast.success("更新成功");
            handleModalCancel();
          }
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
            : CategoryCreateSchema
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
            options: enableOptions,
          },
        ]}
        onSubmit={handleModalOk}
      />
    </Dialog>
  );
};

export default AddCategoryModal;
