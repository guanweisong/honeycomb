import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";

export const userActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/user/components/UserPageShell/index.tsx",
    actions: [
      {
        id: "user.create",
        permission: "userManage",
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.update",
        permission: "userManage",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.delete",
        permission: "userManage",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.delete-batch",
        permission: "userManage",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "user.selection",
        permission: "userManage",
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
        permission: "userManage",
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
