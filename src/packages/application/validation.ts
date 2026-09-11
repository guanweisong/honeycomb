import { z } from "zod";

export function hasUpdateFields(value: { id: string }): boolean {
  return Object.entries(value).some(([key, field]) => key !== "id" && field !== undefined);
}

/** 将 Zod 推导结果展平为易读的普通对象类型。 */
export type CleanZod<T extends z.ZodTypeAny> = {
  [K in keyof z.infer<T>]: z.infer<T>[K];
};

export function requiredString(message: string) {
  return z
    .string({
      message: message,
    })
    .trim()
    .min(1, message);
}

import { createI18nSchema } from "@/packages/domain/localization/i18n";

/** 跨功能表单共用的完整本地化校验及中文反馈。 */
export const I18nSchema = createI18nSchema({
  en: "英文不能为空",
  zh: "中文不能为空",
});
