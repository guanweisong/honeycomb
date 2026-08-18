import type { ActionGuardFile } from "@/packages/identity/auth/admin-action-guard-types";

export const tagActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/tag/page.tsx",
    actions: [
      {
        id: "tag.create",
        permission: "tagCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "tag.update",
        permission: "tagUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "tag.delete",
        permission: "tagDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "tag.delete-batch",
        permission: "tagDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "tag.selection",
        permission: "tagDelete",
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
