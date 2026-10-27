import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";
import { PageVersionSchema } from "@/features/page/schemas/page.fields.schema";

export const PageDeleteSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: IdSchema, expectedVersion: PageVersionSchema }))
    .min(1)
    .max(MAX_BATCH_SIZE)
    .refine(
      (items) => new Set(items.map(({ id }) => id)).size === items.length,
      "页面不能重复",
    ),
});
