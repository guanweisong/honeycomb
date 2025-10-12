import { z } from "zod";

/**
 * 通用的 ID 字段验证 schema。
 *
 * 此 schema 用于验证通常由数据库（如 MongoDB ObjectId）生成的 ID。
 * 验证规则：
 * 1. 必须是一个字符串。
 * 2. 字符串长度必须为 24 个字符。
 * 3. 提供了自定义的中文错误提示信息。
 */
export const IdSchema = z
  .string({ required_error: "该字段不可为空" })
  .length(24, "id格式不合法");
