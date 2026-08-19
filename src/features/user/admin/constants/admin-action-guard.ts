import { Permission } from "@/packages/identity/auth/permissions";
import type { ActionGuardFile } from "@/packages/identity/auth/admin-action-guard-types";

export const userActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/user/components/UserPageShell/index.tsx",
    actions: [
      {
        id: "user.create",
        permission: Permission.userManage,
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.update",
        permission: Permission.userManage,
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.delete",
        permission: Permission.userManage,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.delete-batch",
        permission: Permission.userManage,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.selection",
        permission: Permission.userManage,
        control: {
          tag: "DataTable",
          attribute: "onSelectionChange",
          reference: "setSelectedRows",
        },
        guard: {
          kind: "attribute",
          attribute: "selectableRows",
          polarity: "positive",
        },
      },
      {
        id: "user.manage",
        permission: Permission.userManage,
        control: {
          tag: "DataTable",
          attribute: "rowActions",
          call: { callee: "handleEditItem" },
        },
        guard: {
          kind: "attribute",
          attribute: "rowActions",
          polarity: "positive",
        },
      },
    ],
  },
];
