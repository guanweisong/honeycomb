import { z } from "zod";
import { TitleSchema } from "@/app/page/schemas/fields/title.schema";
import { ContentSchema } from "@/app/page/schemas/fields/content.schema";
import { StatusSchema } from "@/app/page/schemas/fields/status.schema";
import { MultiLangSchema } from "@/schemas/multiLang.schema";

export const PageCreateSchema = z.object({
  title: MultiLangSchema(TitleSchema),
  content: MultiLangSchema(ContentSchema),
  status: StatusSchema,
});
