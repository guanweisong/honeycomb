import { Permission } from "@/packages/identity/auth/permissions";
import type { ActionGuardFile } from "@/packages/identity/auth/admin-action-guard-types";

export const menuActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/menu/components/MenuPageShell/index.tsx",
    actions: [
      {
        id: "menu.update",
        permission: Permission.menuUpdate,
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "submit",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
];
