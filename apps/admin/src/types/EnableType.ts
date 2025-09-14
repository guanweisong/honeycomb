import { ENABLE_STATUS } from "@honeycomb/db";

export const EnableType = Object.freeze({
  DISABLE: ENABLE_STATUS[0],
  ENABLE: ENABLE_STATUS[1],
} as const);

export const EnableTypeName = Object.freeze({
  DISABLE: "禁用",
  ENABLE: "启用",
} as const);

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
