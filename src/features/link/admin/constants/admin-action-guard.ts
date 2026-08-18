import type { ActionGuardFile } from "@/packages/identity/auth/admin-action-guard-types";

export const linkActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/link/components/LinkPageShell/index.tsx",
    actions: [
      {
        id: "link.create",
        permission: "linkCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "link.update",
        permission: "linkUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "link.delete",
        permission: "linkDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "link.delete-batch",
        permission: "linkDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "link.selection",
        permission: "linkDelete",
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
    ],
  },
];
