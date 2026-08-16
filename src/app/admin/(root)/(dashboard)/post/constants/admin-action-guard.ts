import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";

export const postActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/post/category/page.tsx",
    actions: [
      {
        id: "category.create",
        permission: "categoryCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          reference: "handleAddNew",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.update",
        permission: "categoryUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "handleEditItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.delete",
        permission: "categoryDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.delete-batch",
        permission: "categoryDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "category.selection",
        permission: "categoryDelete",
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
  {
    relativePath: "(root)/(dashboard)/post/edit/components/MultiTag/index.tsx",
    actions: [
      {
        id: "post-tags.manage",
        permission: "postManageTags",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "removeTag" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-tags.add",
        permission: "postManageTags",
        control: {
          tag: "CommandItem",
          attribute: "onSelect",
          call: { callee: "addTag" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-tags.create-tag",
        permission: "tagCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "createNewTag" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
  {
    relativePath:
      "(root)/(dashboard)/post/edit/components/PostEditorActions/index.tsx",
    actions: [
      {
        id: "post-editor.create",
        permission: "postCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "submit", argument: '"create"' },
        },
        guard: { kind: "ancestor", polarity: "positive" },
        expectedCount: 2,
      },
      {
        id: "post-editor.update",
        permission: "postUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "submit", argument: '"update"' },
        },
        guard: { kind: "ancestor", polarity: "positive" },
        expectedCount: 3,
      },
      {
        id: "post-editor.update-withdraw",
        permission: "postUpdate",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "submit", argument: '"update"' },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
  {
    relativePath:
      "(root)/(dashboard)/post/edit/components/PostSidebarFields/index.tsx",
    actions: [
      {
        id: "post-sidebar.create-category",
        permission: "categoryCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "setModalProps" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
  {
    relativePath:
      "(root)/(dashboard)/post/list/components/PostListClient/index.tsx",
    actions: [
      {
        id: "post-list.create",
        permission: "postCreate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "router.push", argument: '"/admin/post/edit"' },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-list.update",
        permission: "postUpdate",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: {
            callee: "router.push",
            argument: "`/admin/post/edit?id=${row.id}`",
          },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-list.delete",
        permission: "postDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "handleDeleteItem" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-list.delete-batch",
        permission: "postDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "post-list.selection",
        permission: "postDelete",
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
