import { ModalType, ModalTypeName } from "@/types/ModalType";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";
import { TagInsertSchema } from "@honeycomb/validation/tag/schemas/tag.insert.schema";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { TagEntity } from "@honeycomb/trpc/server/types/tag.entity";

/**
 * 添加/编辑标签对话框的属性接口。
 */
export interface AddTagDialogProps {
  /**
   * 模态框的类型，表示是新增还是编辑。
   */
  type?: ModalType;
  /**
   * 控制模态框的显示与隐藏。
   */
  open: boolean;
  /**
   * 当前编辑的标签记录，仅在编辑模式下有效。
   */
  record?: TagEntity;
  /**
   * 模态框关闭时的回调函数。
   */
  onClose?: () => void;
  /**
   * 操作成功（添加或编辑成功）时的回调函数。
   */
  onSuccess?: () => void;
}

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
