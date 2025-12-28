import { customType } from "drizzle-orm/sqlite-core";
import { z } from "zod";

/**
 * 默认的国际化 (i18n) 文本对象的 Zod schema。
 * 用于验证一个包含 `en` (英文) 和 `zh` (中文) 两个字符串字段的对象。
 * 该 schema 允许对象本身为 `null`。
 */
export const defaultI18nSchema = z
  .object({
    en: z.string(),
    zh: z.string(),
  })
  .nullable();

/**
 * 国际化 (i18n) 文本对象的 TypeScript 类型。
 * 从 `defaultI18nSchema` 推断而来。
 */
export type DefaultI18n = z.infer<typeof defaultI18nSchema>;

/**
 * 创建一个 Drizzle ORM 自定义字段，用于在 SQLite 中存储国际化 (i18n) 文本对象。
 * 通过将包含多种语言文本的对象序列化为 JSON 字符串进行存储。
 *
 * @param {string} name - 数据库中的字段名。
 * @returns 一个 Drizzle 的自定义字段构建器。
 *
 * @property {function} dataType - 定义该字段在数据库中的底层类型，为 `text`。
 * @property {function} toDriver - 将 i18n 对象转换为数据库驱动程序可接受的 JSON 字符串。
 * @property {function} fromDriver - 将从数据库读取的 JSON 字符串转换回 i18n 对象，
 *                                  并在解析失败时返回 `null` 以增强健壮性。
 */
export function i18nField(name: string) {
  return customType<{
    data: DefaultI18n | null;
    driverData: string;
  }>({
    dataType() {
      return "text";
    },
    toDriver(value: DefaultI18n | null): string {
      return value ? JSON.stringify(value) : "{}";
    },
    fromDriver(value: string): DefaultI18n | null {
      if (!value) return null;
      try {
        return defaultI18nSchema.parse(JSON.parse(value));
      } catch {
        return null;
      }
    },
  })(name);
}
