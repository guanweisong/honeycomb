import { z } from "zod";

/**
 * Token 内容字段验证 schema。
 *
 * 此 schema 用于验证 token 字符串本身。
 * 验证规则：
 * 1. 必须是一个字符串。
 * 2. 最小长度为 1。
 * 3. 最大长度为 200，并提供了自定义的中文错误提示信息。
 */
export const ContentSchema = z
  .string()
  .min(1)
  .max(200, "token最大长度不可超过200");
