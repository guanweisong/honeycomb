import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";

export const menuActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/menu/components/MenuPageShell/index.tsx",
    actions: [
      {
        id: "menu.update",
        permission: "menuUpdate",
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
