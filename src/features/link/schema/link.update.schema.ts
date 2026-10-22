import { hasUpdateFields } from "@/lib/validation/validation";
import { IdSchema } from "@/lib/validation/id.schema";
import { LinkInsertSchema } from "@/features/link/schema/link.insert.schema";

export const LinkUpdateSchema = LinkInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
