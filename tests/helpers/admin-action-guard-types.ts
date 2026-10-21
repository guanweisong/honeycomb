import type { Permission } from "@/lib/auth/permissions";

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
  permission: Permission;
  control: ActionControlIdentity;
  guard: GuardMode;
  expectedCount?: number;
}

export interface ActionGuardFile {
  sourcePath: string;
  actions: readonly ActionGuardContract[];
}
