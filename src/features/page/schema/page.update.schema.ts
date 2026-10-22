import { IdSchema } from "@/lib/validation/id.schema";
import { PageFieldsSchema, PageVersionSchema } from "./page.fields.schema";

export const PageUpdateSchema = PageFieldsSchema.partial()
  .extend({ id: IdSchema, expectedVersion: PageVersionSchema })
  .refine(
    (value) =>
      Object.entries(value).some(
        ([key, field]) =>
          key !== "id" && key !== "expectedVersion" && field !== undefined,
      ),
    "至少修改一个字段",
  );
