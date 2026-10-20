import { Permission } from "@/lib/auth/permissions";
import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";

export const settingActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(dashboard)/setting/components/SettingClient/index.tsx",
    actions: [
      {
        id: "setting.update",
        permission: Permission.settingUpdate,
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
