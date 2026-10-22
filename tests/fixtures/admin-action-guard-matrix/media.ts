import { Permission } from "@/lib/auth/permissions";
import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";

export const mediaActionGuardMatrix: readonly ActionGuardFile[] = [
  {
    sourcePath: "src/features/media/admin/components/MediaPageShell/index.tsx",
    actions: [
      {
        id: "media.upload",
        permission: Permission.mediaUpload,
        control: {
          tag: "input",
          attribute: "onChange",
          call: { callee: "handleUpload" },
        },
        guard: { kind: "ancestor", polarity: "positive" },
      },
      {
        id: "media.upload-trigger",
        permission: Permission.mediaUpload,
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
    sourcePath: "src/features/media/admin/components/MediaGrid/index.tsx",
    actions: [
      {
        id: "media.delete",
        permission: Permission.mediaDelete,
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
