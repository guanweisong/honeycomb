import type { ActionGuardFile } from "./admin-action-guard-types";

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
