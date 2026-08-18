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
