import { z } from "zod";
import { I18nSchema, hasUpdateFields } from "@/packages/application/validation";
import { IdSchema } from "@/packages/domain/shared/id.schema";

/** 标签写入字段的唯一运行时契约。 */
export const TagInsertSchema = z.object({ name: I18nSchema });
export const TagUpdateSchema = TagInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
export type TagInsert = z.output<typeof TagInsertSchema>;
export type TagUpdate = z.output<typeof TagUpdateSchema>;
