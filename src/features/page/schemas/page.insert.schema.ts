import { z } from "zod";
import { PageFieldsSchema } from "@/features/page/schemas/page.fields.schema";

export const PageInsertSchema = PageFieldsSchema.extend({
  creationToken: z.uuid(),
});

export const PageCreationResultInputSchema = z.strictObject({
  creationToken: z.uuid(),
});
