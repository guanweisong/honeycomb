import { Permission } from "@/lib/auth/permissions";
import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";

export const pageActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    sourcePath:
      "src/app/admin/(dashboard)/page/edit/components/PageEditorActionButtons/index.tsx",
    actions: [
      {
        id: "page-editor.create",
        permission: Permission.pageCreate,
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
        when: { name: "isEdit", value: false },
        permission: Permission.pageCreate,
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
        permission: Permission.pageUpdate,
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
        permission: Permission.pageUpdate,
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
        permission: Permission.pageUpdate,
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
        when: { name: "isEdit", value: true },
        permission: Permission.pageUpdate,
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
    sourcePath: "src/app/admin/(dashboard)/page/list/page.tsx",
    actions: [
      {
        id: "page-list.create",
        permission: Permission.pageCreate,
        control: {
          tag: "Link",
          attribute: "href",
          expression: '"/admin/page/edit"',
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.update",
        permission: Permission.pageUpdate,
        control: {
          tag: "Link",
          attribute: "href",
          expression: "`/admin/page/edit?id=${row.id}`",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.delete",
        permission: Permission.pageDelete,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.delete-batch",
        permission: Permission.pageDelete,
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "page-list.selection",
        permission: Permission.pageDelete,
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
