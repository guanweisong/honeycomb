import type { ActionGuardFile } from "@/packages/identity/auth/admin-action-guard-types";
export type {
  ActionControlIdentity,
  ActionGuardContract,
  ActionGuardFile,
  GuardMode,
  GuardPolarity,
} from "@/packages/identity/auth/admin-action-guard-types";

import { commentActionGuardMatrix } from "@/features/comment/admin/constants/admin-action-guard";
import { linkActionGuardMatrix } from "@/features/link/admin/constants/admin-action-guard";
import { mediaActionGuardMatrix } from "@/features/media/admin/constants/admin-action-guard";
import { menuActionGuardMatrix } from "@/features/menu/admin/constants/admin-action-guard";
import { pageActionGuardMatrix } from "@/features/page/admin/constants/admin-action-guard";
import { postActionGuardMatrix } from "@/features/post/admin/constants/admin-action-guard";
import { settingActionGuardMatrix } from "@/features/setting/admin/constants/admin-action-guard";
import { tagActionGuardMatrix } from "@/features/tag/admin/constants/admin-action-guard";
import { userActionGuardMatrix } from "@/features/user/admin/constants/admin-action-guard";

export const actionGuardMatrix: readonly ActionGuardFile[] = [
  ...commentActionGuardMatrix,
  ...linkActionGuardMatrix,
  ...mediaActionGuardMatrix,
  ...menuActionGuardMatrix,
  ...pageActionGuardMatrix,
  ...postActionGuardMatrix,
  ...settingActionGuardMatrix,
  ...tagActionGuardMatrix,
  ...userActionGuardMatrix,
];
