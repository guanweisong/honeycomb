import { customType } from "drizzle-orm/sqlite-core";

/**
 * 创建一个 Drizzle ORM 自定义字段，用于在 SQLite 中存储数组类型。
 * SQLite 本身不支持数组类型，此函数通过将数组序列化为 JSON 字符串来模拟该功能。
 *
 * @template T - 数组中元素的类型，默认为 `string`。
 * @param {string} name - 数据库中的字段名。
 * @returns 一个 Drizzle 的自定义字段构建器。
 *
 * @property {function} dataType - 定义该字段在数据库中的底层类型，这里是 `text`。
 * @property {function} toDriver - 将应用程序中的数组数据转换为数据库驱动程序可接受的格式。
 *   - `value: T[]`: 接收一个数组。
 *   - `returns: string`: 返回该数组的 JSON 字符串表示。如果数组为空或未定义，则返回空数组的字符串 "[]"。
 * @property {function} fromDriver - 将从数据库驱动程序接收的数据转换为应用程序中的数组格式。
 *   - `value: string`: 接收一个 JSON 字符串。
 *   - `returns: T[]`: 返回解析后的数组。如果字符串为空，则返回一个空数组。
 */
export function arrayField<T = string>(name: string) {
  return customType<{ data: T[]; driverData: string }>({
    dataType() {
      return "text";
    },
    toDriver(value: T[]): string {
      return JSON.stringify(value || []);
    },
    fromDriver(value: string): T[] {
      if (!value) return [];
      return JSON.parse(value);
    },
  })(name);
}
