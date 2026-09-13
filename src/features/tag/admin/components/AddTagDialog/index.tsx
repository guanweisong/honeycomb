import { ModalType, ModalTypeName } from "@/packages/ui/admin/modal-type";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import {
  TagInsertSchema,
  TagUpdateSchema,
} from "@/features/tag/application/write-schema";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { toast } from "sonner";
import { trpc } from "@/packages/trpc/client/trpc";
import type { TagViewModel as TagEntity } from "../../../presentation/tag-view-model";
import { z } from "zod";
import type { FieldConfig } from "@/packages/ui/extended/DynamicForm/types";
import {
  runAdminMutation,
  withAdminRecordId,
  type AdminDialogState,
} from "@/packages/ui/admin/action-state";

const tagFields: FieldConfig[] = [
  {
    label: "标签名称",
    name: "name",
    type: "text",
    placeholder: "请输入标签名称",
    multiLang: true,
  },
];

type TagInsertValues = z.infer<typeof TagInsertSchema>;
type TagUpdateValues = z.infer<typeof TagUpdateSchema>;

/**
 * 添加/编辑标签对话框的属性接口。
 */
export type AddTagDialogProps = AdminDialogState<TagEntity> & {
  /**
   * 模态框关闭时的回调函数。
   */
  onClose?: () => void;
  /**
   * 操作成功（添加或编辑成功）时的回调函数。
   */
  onSuccess?: () => void;
};

/**
 * 添加/编辑标签的对话框组件。
 * 封装了标签的新增和编辑逻辑，包括表单渲染和数据提交。
 * @param {AddTagDialogProps} props - 组件属性。
 * @returns {JSX.Element} 添加/编辑标签的对话框。
 */
export default function AddTagDialog(props: AddTagDialogProps) {
  const { type = ModalType.ADD, open, record, onClose, onSuccess } = props;
  /**
   * 创建标签的 tRPC mutation。
   */
  const createTag = trpc.tag.create.useMutation();
  /**
   * 更新标签的 tRPC mutation。
   */
  const updateTag = trpc.tag.update.useMutation();

  /**
   * 新增、编辑弹窗表单保存事件
   */
  const handleModalOk = async (values: TagInsertValues | TagUpdateValues) => {
    switch (type) {
      case ModalType.ADD:
        if (
          (await runAdminMutation({
            input: TagInsertSchema.parse(values),
            mutate: createTag.mutateAsync,
            refetch: () => onSuccess?.(),
            notifySuccess: toast.success,
            notifyError: toast.error,
            successMessage: "添加成功",
            errorMessage: "添加失败",
          })) === "success"
        )
          onClose?.();
        break;
      case ModalType.EDIT:
        if (!record) {
          toast.error("标签不存在，无法更新");
          return;
        }
        if (
          (await runAdminMutation({
            input: TagUpdateSchema.parse(withAdminRecordId(record, values)),
            mutate: updateTag.mutateAsync,
            refetch: () => onSuccess?.(),
            notifySuccess: toast.success,
            notifyError: toast.error,
            successMessage: "更新成功",
            errorMessage: "更新失败",
          })) === "success"
        )
          onClose?.();
        break;
    }
  };

  return (
    <Dialog
      title={`${type === ModalType.EDIT ? ModalTypeName.EDIT : ModalTypeName.ADD}标签`}
      open={open}
      onOpenChange={() => onClose?.()}
    >
      {type === ModalType.EDIT ? (
        <DynamicForm
          defaultValues={
            record
              ? {
                  id: record.id,
                  name: record.name ?? undefined,
                }
              : undefined
          }
          schema={TagUpdateSchema}
          fields={tagFields}
          onSubmit={handleModalOk}
        />
      ) : (
        <DynamicForm
          defaultValues={
            record ? { name: record.name ?? undefined } : undefined
          }
          schema={TagInsertSchema}
          fields={tagFields}
          onSubmit={handleModalOk}
        />
      )}
    </Dialog>
  );
}
