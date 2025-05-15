import { z } from "zod";
import { TagNameSchema } from "@/app/tag/schemas/fields/tag.name.schema";
import { MultiLangSchema } from "@/schemas/multiLang.schema";

export const TagCreateSchema = z.object({
  name: MultiLangSchema(TagNameSchema),
});
