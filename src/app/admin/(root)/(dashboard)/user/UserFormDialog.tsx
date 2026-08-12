"use client";

import { ModalType, ModalTypeName } from "@/app/admin/types/ModalType";
import type { UserInsert } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import { UserInsertSchema } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import type { UserUpdate } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import { UserUpdateSchema } from "@/packages/trpc/api/modules/user/schemas/user.update.schema";
import {
  UserLevel,
  userLevelOptions,
} from "@/packages/domain/identity/user";
import {
  UserStatus,
  userStatusOptions,
} from "@/packages/domain/identity/user";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import type { UserDialogState } from "./userActions";
import { isUserResourceProtected, toUserFormDefaults } from "./userTransforms";

type UserFormDialogProps = {
  state: UserDialogState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserInsert | UserUpdate) => void | Promise<void>;
};

export function UserFormDialog({
  state,
  onOpenChange,
  onSubmit,
}: UserFormDialogProps) {
  const isEdit = state.type === ModalType.EDIT;
  const protectedResource = isUserResourceProtected(state.record);
  const fields = [
    {
      label: "用户名",
      name: "name",
      type: "text" as const,
      placeholder: "请输入用户名",
    },
    {
      label: "密码",
      name: "password",
      type: "password" as const,
      placeholder: isEdit ? "留空则为不修改" : "请输入密码",
    },
    {
      label: "邮箱",
      name: "email",
      type: "text" as const,
      placeholder: "请输入邮箱",
    },
    {
      label: "级别",
      name: "level",
      type: "radio" as const,
      options: userLevelOptions,
      disabled: () => protectedResource,
    },
    {
      label: "状态",
      name: "status",
      type: "radio" as const,
      options: userStatusOptions,
      disabled: () => protectedResource,
    },
  ];

  return (
    <Dialog
      title={`${ModalTypeName[ModalType[state.type!] as keyof typeof ModalTypeName]}用户`}
      open={state.open}
      onOpenChange={onOpenChange}
    >
      {isEdit ? (
        <DynamicForm
          defaultValues={toUserFormDefaults(state.record)}
          schema={UserUpdateSchema}
          fields={fields}
          onSubmit={(values) => onSubmit(values)}
        />
      ) : (
        <DynamicForm
          defaultValues={{
            status: UserStatus.ENABLE,
            level: UserLevel.GUEST,
          }}
          schema={UserInsertSchema}
          fields={fields}
          onSubmit={(values) => onSubmit(values)}
        />
      )}
    </Dialog>
  );
}
