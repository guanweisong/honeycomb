import type { ActionGuardFile } from "@tests/helpers/admin-action-guard-types";
export type {
  ActionControlIdentity,
  ActionGuardContract,
  ActionGuardFile,
  GuardMode,
  GuardPolarity,
} from "@tests/helpers/admin-action-guard-types";

import { commentActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/comment";
import { linkActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/link";
import { mediaActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/media";
import { menuActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/menu";
import { pageActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/page";
import { postActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/post";
import { settingActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/setting";
import { tagActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/tag";
import { userActionGuardMatrix } from "@tests/fixtures/admin-action-guard-matrix/user";

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
