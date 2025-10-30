/**
 * 禁用启用的吗枚举
 */
export enum EnableStatus {
  ENABLE = "ENABLE",
  DISABLED = "DISABLED",
}

export enum EnableStatusName {
  ENABLE = "启用",
  DISABLED = "禁用",
}

export const enableStatusOptions = [
  {
    label: EnableStatusName.ENABLE,
    value: EnableStatus.ENABLE,
  },
  {
    label: EnableStatusName.DISABLED,
    value: EnableStatus.DISABLED,
  },
];
