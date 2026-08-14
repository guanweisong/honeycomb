import type { ActionGuardFile } from "./admin-action-guard-types";
export type {
  ActionControlIdentity,
  ActionGuardContract,
  ActionGuardFile,
  GuardMode,
  GuardPolarity,
} from "./admin-action-guard-types";

import { commentActionGuardMatrix } from "./admin-action-guard-comment";
import { linkActionGuardMatrix } from "./admin-action-guard-link";
import { mediaActionGuardMatrix } from "./admin-action-guard-media";
import { menuActionGuardMatrix } from "./admin-action-guard-menu";
import { pageActionGuardMatrix } from "./admin-action-guard-page";
import { postActionGuardMatrix } from "./admin-action-guard-post";
import { settingActionGuardMatrix } from "./admin-action-guard-setting";
import { tagActionGuardMatrix } from "./admin-action-guard-tag";
import { userActionGuardMatrix } from "./admin-action-guard-user";

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
