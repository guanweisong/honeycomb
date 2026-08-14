export type GuardPolarity = "positive" | "negative";

export interface ActionControlIdentity {
  tag: string;
  attribute: string;
  reference?: string;
  call?: {
    callee: string;
    argument?: string;
  };
  label?: string;
}

export type GuardMode =
  | {
      kind: "ancestor";
      polarity: GuardPolarity;
    }
  | {
      kind: "attribute";
      attribute: string;
      polarity: GuardPolarity;
    };

export interface ActionGuardContract {
  id: string;
  permission: string;
  control: ActionControlIdentity;
  guard: GuardMode;
  expectedCount?: number;
}

export interface ActionGuardFile {
  relativePath: string;
  actions: readonly ActionGuardContract[];
}

export const actionGuardMatrix: readonly ActionGuardFile[] = [
  {
    relativePath: "(root)/(dashboard)/comment/components/CommentPageShell/index.tsx",
    actions: [
      {
        id: "comment.moderate",
        permission: "commentModerate",
        control: {
          tag: "DataTable",
          attribute: "rowActions",
          call: { callee: "renderOpt" },
        },
        guard: {
          kind: "attribute",
          attribute: "rowActions",
          polarity: "positive",
        },
      },
      {
        id: "comment.delete-batch",
        permission: "commentModerate",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          reference: "handleDeleteBatch",
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "comment.selection",
        permission: "commentModerate",
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
  {
    relativePath: "(root)/(dashboard)/media/components/MediaPageShell/index.tsx",
    actions: [
      {
        id: "media.upload",
        permission: "mediaUpload",
        control: {
          tag: "input",
          attribute: "onChange",
          call: { callee: "handleUpload" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "media.upload-trigger",
        permission: "mediaUpload",
        control: {
          tag: "Button",
          attribute: "onClick",
          call: { callee: "fileInputRef.current?.click" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
  {
    relativePath: "(root)/(dashboard)/media/components/MediaGrid/index.tsx",
    actions: [
      {
        id: "media.delete",
        permission: "mediaDelete",
        control: {
          tag: "Dialog",
          attribute: "onOK",
          call: { callee: "onDelete" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
    ],
  },
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
    relativePath: "(root)/(dashboard)/post/list/page.tsx",
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
  {
    relativePath: "(root)/(dashboard)/setting/components/SettingClient/index.tsx",
    actions: [
      {
        id: "setting.update",
        permission: "settingUpdate",
        control: {
          tag: "DynamicForm",
          attribute: "onSubmit",
          reference: "handleSubmit",
        },
        guard: {
          kind: "attribute",
          attribute: "renderSubmitButton",
          polarity: "positive",
        },
      },
    ],
  },
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
