import { z } from "zod";
import { NameSchema } from "@/app/tag/schemas/fields/name.schema";
import { MultiLangSchema } from "@/schemas/multiLang.schema";

export const TagCreateSchema = z.object({
  name: MultiLangSchema(NameSchema),
});
