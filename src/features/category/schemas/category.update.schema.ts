import { IdSchema } from "@/lib/validation/id.schema";
import { hasUpdateFields } from "@/lib/validation/validation";
import { CategoryInsertSchema } from "./category.insert.schema";

export const CategoryUpdateSchema = CategoryInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
