import { ENABLE_STATUS } from "@honeycomb/db";

/**
 * 启用状态类型枚举。
 * 定义了启用和禁用两种状态。
 */
export const EnableType = Object.freeze({
  DISABLE: ENABLE_STATUS[0],
  ENABLE: ENABLE_STATUS[1],
} as const);

/**
 * 启用状态对应的中文名称映射。
 */
export const EnableTypeName = Object.freeze({
  DISABLE: "禁用",
  ENABLE: "启用",
} as const);

/**
 * 启用状态的选项列表。
 * 用于表单或选择器中显示启用状态的下拉选项。
 */
export const enableOptions = [
  {
    label: EnableTypeName.DISABLE,
    value: EnableType.DISABLE,
  },
  {
    label: EnableTypeName.ENABLE,
    value: EnableType.ENABLE,
  },
];
