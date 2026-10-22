import { hasUpdateFields } from "@/lib/validation/validation";
import { IdSchema } from "@/lib/validation/id.schema";
import { TagInsertSchema } from "@/features/tag/schema/tag.insert.schema";

export const TagUpdateSchema = TagInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
