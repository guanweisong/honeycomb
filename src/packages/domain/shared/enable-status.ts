/**
 * 禁用启用的吗枚举
 */
export enum EnableStatus {
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
}

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
