import { z } from "zod";

/**
 * 从一个只读的字符串元组（`readonly string[]`）创建一个 Zod 枚举 schema。
 * @template T - 一个至少包含一个字符串的只读元组类型。
 * @param {T} arr - 用于创建枚举的字符串数组。
 * @returns {z.ZodEnum<T>} 一个 Zod 枚举 schema。
 */
export const enumFrom = <T extends readonly [string, ...string[]]>(arr: T) =>
  z.enum([...arr]);

/**
 * 从一个只读的字符串元组创建一个带默认值的 Zod 枚举 schema。
 * @template T - 一个至少包含一个字符串的只读元组类型。
 * @param {T} arr - 用于创建枚举的字符串数组。
 * @param {T[number]} d - 数组中的一个值，将作为 schema 的默认值。
 * @returns {z.ZodDefault<z.ZodEnum<T>>} 一个带默认值的 Zod 枚举 schema。
 */
export const enumWithDefault = <T extends readonly [string, ...string[]]>(
  arr: T,
  d: T[number],
) => enumFrom(arr).default(d);
