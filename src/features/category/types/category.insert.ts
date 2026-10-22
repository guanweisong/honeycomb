import type { z } from "zod";
import type { CategoryInsertSchema } from "../schema/category.insert.schema";

export type CategoryInsertInput = z.output<typeof CategoryInsertSchema>;

/** 分类写入契约；与数据库持久化字段分开定义。 */
export type CategoryInsert = CategoryInsertInput & { id?: string };
