import { ApplicationError } from "@/packages/application/errors";

/** 从权威字符串枚举构造 ORM 要求的非空元组，不复制成员集合。 */
export function stringEnumValues<T extends string>(
  definition: Record<string, T>,
): [T, ...T[]] {
  const [first, ...rest] = Object.values(definition);
  if (first === undefined) throw new Error("Empty enum");
  return [first, ...rest];
}

/** 数据库存储字符串进入领域契约前，按权威枚举检查。错误不回显原始数据。 */
export function parseEnumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T {
  const matched = values.find((candidate) => candidate === value);
  if (matched === undefined) {
    throw new ApplicationError(
      "INTERNAL_SERVER_ERROR",
      `Invalid stored ${field}`,
    );
  }
  return matched;
}

/** 写入必须返回记录；更新未命中与创建异常使用不同错误语义。 */
export function requireWriteResult<T>(
  value: T | undefined,
  operation: "create" | "update",
  resource: string,
): T {
  if (value === undefined) {
    throw new ApplicationError(
      operation === "update" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
      operation === "update"
        ? `${resource} not found`
        : `${resource} insert returned no record`,
    );
  }
  return value;
}
