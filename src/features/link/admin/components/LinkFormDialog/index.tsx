"use client";

import { ModalType, ModalTypeName } from "@/packages/ui/admin/modal-type";
import type { LinkInsert } from "@/features/link/schemas/link.insert.schema";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import type { LinkUpdate } from "@/features/link/schemas/link.update.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import {
  EnableStatus,
  enableStatusOptions,
} from "@/packages/domain/shared/enable-status";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import type { LinkDialogState } from "../../actions/link-actions";
import { toLinkFormDefaults } from "../../transforms/link-transforms";

type LinkFormDialogProps = {
  state: LinkDialogState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LinkInsert | LinkUpdate) => void | Promise<void>;
};

export function LinkFormDialog({
  state,
  onOpenChange,
  onSubmit,
}: LinkFormDialogProps) {
  if (!state.open) return null;

  const isEdit = state.type === ModalType.EDIT;
  const fields = [
    {
      label: "链接名称",
      name: "name",
      type: "text" as const,
      placeholder: "请输入链接名称",
    },
    {
      label: "链接URL",
      name: "url",
      type: "text" as const,
      placeholder: "请以http://或者https://开头",
    },
    {
      label: "logo网址",
      name: "logo",
      type: "text" as const,
      placeholder: "请以http://或者https://开头",
    },
    {
      label: "链接描述",
      name: "description",
      type: "textarea" as const,
      placeholder: "请输入链接描述",
    },
    {
      label: "状态",
      name: "status",
      type: "radio" as const,
      options: enableStatusOptions,
    },
  ];

  return (
    <Dialog
      title={`${ModalTypeName[ModalType[state.type!] as keyof typeof ModalTypeName]}链接`}
      open={state.open}
      onOpenChange={onOpenChange}
    >
      <DynamicForm
        defaultValues={
          isEdit
            ? toLinkFormDefaults(state.record)
            : { status: EnableStatus.ENABLE }
        }
        schema={isEdit ? LinkUpdateSchema : LinkInsertSchema}
        fields={fields}
        onSubmit={(values) => onSubmit(values)}
      />
    </Dialog>
  );
}
/**
 * 链接编辑弹窗，负责链接表单、输入校验和新增/编辑提交。
 */
