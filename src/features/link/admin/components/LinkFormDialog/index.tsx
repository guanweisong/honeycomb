"use client";

import { ModalType, ModalTypeName } from "@/components/admin/modal-type";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import type { LinkInsert } from "@/features/link/types/link.insert";
import type { LinkUpdate } from "@/features/link/types/link.update";
import { EnableStatus } from "@/lib/validation/enable-status";
import { enableStatusOptions } from "@/components/admin/enable-status-options";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import type { LinkDialogState } from "../../link-actions";
import { toLinkFormDefaults } from "../../link-transforms";

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
      title={`${isEdit ? ModalTypeName.EDIT : ModalTypeName.ADD}链接`}
      open={state.open}
      onOpenChange={onOpenChange}
    >
      {isEdit ? (
        <DynamicForm
          key={`edit:${state.record?.id}:${state.open}`}
          defaultValues={toLinkFormDefaults(state.record)}
          schema={LinkUpdateSchema}
          fields={fields}
          onSubmit={(values) => onSubmit(values)}
        />
      ) : (
        <DynamicForm
          key={`add:${state.open}`}
          defaultValues={{ status: EnableStatus.ENABLE }}
          schema={LinkInsertSchema}
          fields={fields}
          onSubmit={(values) => onSubmit(values)}
        />
      )}
    </Dialog>
  );
}
/**
 * 链接编辑弹窗，负责链接表单、输入校验和新增/编辑提交。
 */
