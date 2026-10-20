import { EnableStatus } from "@/lib/validation/enable-status";

export enum EnableStatusName {
  ENABLE = "启用",
  DISABLE = "禁用",
}

export const enableStatusOptions = [
  {
    label: EnableStatusName.ENABLE,
    value: EnableStatus.ENABLE,
  },
  {
    label: EnableStatusName.DISABLE,
    value: EnableStatus.DISABLE,
  },
];
