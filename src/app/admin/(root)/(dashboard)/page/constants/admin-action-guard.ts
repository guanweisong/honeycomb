import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";

export const pageActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/page/edit/components/PageEditorActionButtons/index.tsx",
    actions: [
      {
        id: "page-editor.create",
        permission: "pageCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "onSubmit", argument: "PageStatus.DRAFT" },
          label: "保存草稿",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-editor.create-publish",
        permission: "pageCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: {
            callee: "onSubmit",
            argument: "PageStatus.PUBLISHED",
          },
          label: "发布",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-editor.update",
        permission: "pageUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: {
            callee: "onSubmit",
            argument: "PageStatus.PUBLISHED",
          },
          label: "更新",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-editor.update-withdraw",
        permission: "pageUpdate",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "onSubmit", argument: "PageStatus.DRAFT" },
          label: "撤回为草稿",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-editor.update-draft",
        permission: "pageUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "onSubmit", argument: "PageStatus.DRAFT" },
          label: "保存",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-editor.update-publish",
        permission: "pageUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: {
            callee: "onSubmit",
            argument: "PageStatus.PUBLISHED",
          },
          label: "发布",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
  {
    relativePath: "(root)/(dashboard)/page/list/page.tsx",
    actions: [
      {
        id: "page-list.create",
        permission: "pageCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "router.push", argument: '"/admin/page/edit"' },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.update",
        permission: "pageUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: {
            callee: "router.push",
            argument: "`/admin/page/edit?id=${row.id}`",
          },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.delete",
        permission: "pageDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.delete-batch",
        permission: "pageDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.selection",
        permission: "pageDelete",
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
