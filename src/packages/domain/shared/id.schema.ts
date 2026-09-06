import { z } from "zod";

/** 数据库实体 ID 的唯一运行时契约。 */
export const IdSchema = z
  .string({ message: "该字段不可为空" })
  .length(24, "id格式不合法");
