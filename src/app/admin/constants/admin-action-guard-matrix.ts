import type { ActionGuardFile } from "@/app/admin/constants/admin-action-guard-types";
export type {
  ActionControlIdentity,
  ActionGuardContract,
  ActionGuardFile,
  GuardMode,
  GuardPolarity,
} from "@/app/admin/constants/admin-action-guard-types";

import { commentActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/comment/constants/admin-action-guard";
import { linkActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/link/constants/admin-action-guard";
import { mediaActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/media/constants/admin-action-guard";
import { menuActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/menu/constants/admin-action-guard";
import { pageActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/page/constants/admin-action-guard";
import { postActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/post/constants/admin-action-guard";
import { settingActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/setting/constants/admin-action-guard";
import { tagActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/tag/constants/admin-action-guard";
import { userActionGuardMatrix } from "@/app/admin/(root)/(dashboard)/user/constants/admin-action-guard";

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
