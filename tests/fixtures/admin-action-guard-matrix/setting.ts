import { Permission } from "@/lib/auth/permissions";
import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";

export const settingActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    sourcePath: "src/features/setting/admin/components/SettingClient/index.tsx",
    actions: [
      {
        id: "setting.update",
        permission: Permission.settingUpdate,
        control: {
          tag: "Button",
          attribute: "disabled",
        },
        guard: {
          kind: "ancestor",
          polarity: "positive",
        },
      },
    ],
  },
];
