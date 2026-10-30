import { Permission } from "@/lib/auth/permissions";
import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";

export const categoryActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    sourcePath: "src/app/admin/(dashboard)/post/category/page.tsx",
    actions: [
      {
        id: "category.create",
        permission: Permission.categoryCreate,
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.update",
        permission: Permission.categoryUpdate,
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.delete",
        permission: Permission.categoryDelete,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.delete-batch",
        permission: Permission.categoryDelete,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.selection",
        permission: Permission.categoryDelete,
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
