import { ModalType, ModalTypeName } from "@/types/ModalType";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { TagInsertSchema } from "@honeycomb/validation/tag/schemas/tag.insert.schema";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import type { TagEntity } from "@/app/(root)/(dashboard)/tag/types/tag.entity";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";

export interface AddTagDialogProps {
  type?: ModalType;
  open: boolean;
  record?: TagEntity;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddTagDialog(props: AddTagDialogProps) {
  const { type = ModalType.ADD, open, record, onClose, onSuccess } = props;
  const createTag = trpc.tag.create.useMutation();
  const updateTag = trpc.tag.update.useMutation();

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values: any) => {
    switch (type) {
      case ModalType.ADD:
        try {
          await createTag.mutateAsync(values);
          onSuccess?.();
          toast.success("添加成功");
          onClose?.();
        } catch (e) {
          toast.error("添加失败");
        }
        break;
      case ModalType.EDIT:
        try {
          await updateTag.mutateAsync({
            id: record?.id,
            ...values,
          });
          onSuccess?.();
          toast.success("更新成功");
          onClose?.();
        } catch (e) {
          toast.error("更新失败");
        }
        break;
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
        schema={type === ModalType.EDIT ? TagUpdateSchema : TagInsertSchema}
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
