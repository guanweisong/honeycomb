import { ModalType, ModalTypeName } from "@/types/ModalType";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { TagCreateSchema } from "@honeycomb/validation/tag/schemas/tag.create.schema";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import type { TagEntity } from "@/app/(root)/(dashboard)/tag/types/tag.entity";
import TagService from "@/app/(root)/(dashboard)/tag/service";
import { toast } from "sonner";

export interface AddTagDialogProps {
  type?: ModalType;
  open: boolean;
  record?: TagEntity;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddTagDialog(props: AddTagDialogProps) {
  const { type = ModalType.ADD, open, record, onClose, onSuccess } = props;

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values: any) => {
    switch (type) {
      case ModalType.ADD:
        return TagService.create(values).then((result) => {
          if (result.status === 201) {
            onSuccess?.();
            toast.success("添加成功");
            onClose?.();
          }
        });
      case ModalType.EDIT:
        return TagService.update(record?.id as string, values).then(
          (result) => {
            if (result.status === 201) {
              onSuccess?.();
              toast.success("更新成功");
              onClose?.();
            }
          },
        );
    }
  };

  return (
    <Dialog
      title={`${ModalTypeName[ModalType[type] as keyof typeof ModalTypeName]}标签`}
      open={open}
      onOpenChange={() => onClose?.()}
    >
      <DynamicForm
        defaultValues={record}
        schema={type === ModalType.EDIT ? TagUpdateSchema : TagCreateSchema}
        fields={[
          {
            label: "标签名称",
            name: "name",
            type: "text",
            placeholder: "请输入标签名称",
            multiLang: true,
          },
        ]}
        onSubmit={handleModalOk}
      />
    </Dialog>
  );
}
