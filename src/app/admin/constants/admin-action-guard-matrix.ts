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
