import { z } from "zod";
import { TitleSchema } from "@/app/category/schemas/fields/title.schema";
import { PathSchema } from "@/app/category/schemas/fields/path.schema";
import { StatusSchema } from "@/app/category/schemas/fields/status.schema";
import { DescriptionSchema } from "@/app/category/schemas/fields/description.schema";
import { IdSchema } from "@/schemas/fields/id.schema";
import { MultiLangSchema } from "@/schemas/multiLang.schema";

export const CategoryCreateSchema = z.object({
  title: MultiLangSchema(TitleSchema),
  path: PathSchema,
  status: StatusSchema,
  description: MultiLangSchema(DescriptionSchema),
  parent: IdSchema,
});
