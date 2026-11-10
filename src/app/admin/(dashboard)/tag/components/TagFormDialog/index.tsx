import { useDialogSession } from "@/app/admin/(dashboard)/lib/use-dialog-session";
import { ModalType } from "@/app/admin/(dashboard)/types/modal-type";
import { ModalTypeName } from "@/app/admin/(dashboard)/types/modal-type-name";
import { DynamicForm } from "@/components/DynamicForm";
import { TagInsertSchema } from "@/features/tag/schemas/tag.insert.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import { Dialog } from "@/components/Dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client/trpc";
import type { TagRecord as TagEntity } from "@/features/tag/types/tag.record";
import { z } from "zod";
import type { FieldConfig } from "@/components/DynamicForm/types";
import {
  runAdminMutation,
  withAdminRecordId,
  type AdminDialogState,
} from "@/app/admin/(dashboard)/lib/action-state";

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
export type TagFormDialogProps = AdminDialogState<TagEntity> & {
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
 * @param {TagFormDialogProps} props - 组件属性。
 * @returns {JSX.Element} 添加/编辑标签的对话框。
 */
export default function TagFormDialog(props: TagFormDialogProps) {
  const { type = ModalType.ADD, open, record, onClose, onSuccess } = props;
  const session = useDialogSession(open, type, record?.id);
  const close = () => {
    session.invalidate();
    onClose?.();
  };
  const createTag = trpc.tag.create.useMutation();
  const updateTag = trpc.tag.update.useMutation();
  const feedback = {
    refetch: () => onSuccess?.(),
    notifySuccess: toast.success,
    notifyWarning: toast.warning,
    notifyError: toast.error,
  };
  const handleCreate = (values: TagInsertValues) =>
    session.closeAfter(
      () =>
        runAdminMutation({
          ...feedback,
          input: values,
          mutate: createTag.mutateAsync,
          successMessage: "添加成功",
          errorMessage: "添加失败",
        }),
      close,
    );
  const handleUpdate = async (values: TagUpdateValues) => {
    if (!record) {
      toast.error("标签不存在，无法更新");
      return;
    }
    await session.closeAfter(
      () =>
        runAdminMutation({
          ...feedback,
          input: withAdminRecordId(record, values),
          mutate: updateTag.mutateAsync,
          successMessage: "更新成功",
          errorMessage: "更新失败",
        }),
      close,
    );
  };

  return (
    <Dialog
      title={`${type === ModalType.EDIT ? ModalTypeName.EDIT : ModalTypeName.ADD}标签`}
      open={open}
      onOpenChange={close}
    >
      {type === ModalType.EDIT ? (
        <DynamicForm
          key={`edit:${record?.id}:${open}`}
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
          onSubmit={handleUpdate}
        />
      ) : (
        <DynamicForm
          key={`add:${open}`}
          defaultValues={
            record ? { name: record.name ?? undefined } : undefined
          }
          schema={TagInsertSchema}
          fields={tagFields}
          onSubmit={handleCreate}
        />
      )}
    </Dialog>
  );
}
