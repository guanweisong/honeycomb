import { z } from "zod";
import { TitleSchema } from "./fields/title.schema";
import { PathSchema } from "./fields/path.schema";
import { StatusSchema } from "./fields/status.schema";
import { DescriptionSchema } from "./fields/description.schema";
import { IdSchema } from "../../schemas/fields/id.schema";
import { MultiLangSchema } from "../../schemas/multiLang.schema";

export const CategoryCreateSchema = z.object({
  title: MultiLangSchema(TitleSchema),
  path: PathSchema,
  status: StatusSchema,
  description: MultiLangSchema(DescriptionSchema),
  parent: IdSchema.nullable(),
});
