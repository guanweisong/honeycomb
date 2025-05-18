import { z } from "zod";
import { TitleSchema } from "./fields/title.schema";
import { ContentSchema } from "./fields/content.schema";
import { StatusSchema } from "./fields/status.schema";
import { MultiLangSchema } from "../../schemas/multiLang.schema";

export const PageCreateSchema = z.object({
  title: MultiLangSchema(TitleSchema),
  content: MultiLangSchema(ContentSchema),
  status: StatusSchema,
});
