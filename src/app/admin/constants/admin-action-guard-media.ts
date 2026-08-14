import type { ActionGuardFile } from "./admin-action-guard-types";

export const mediaActionGuardMatrix: readonly ActionGuardFile[] = [
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
];
