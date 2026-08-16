import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";

export const settingActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/setting/components/SettingClient/index.tsx",
    actions: [
      {
        id: "setting.update",
        permission: "settingUpdate",
        control: {
          tag: "DynamicForm",
          attribute: "onSubmit",
          reference: "handleSubmit",
        },
        guard: {
          kind: "attribute",
          attribute: "renderSubmitButton",
          polarity: "positive",
        },
      },
    ],
  },
];
