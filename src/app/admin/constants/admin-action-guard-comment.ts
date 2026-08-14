import type { ActionGuardFile } from "./admin-action-guard-types";

export const commentActionGuardMatrix: readonly ActionGuardFile[] = [
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
];
