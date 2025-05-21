import { z } from "zod";
import { TitleSchema } from "./fields/title.schema";
import { ContentSchema } from "./fields/content.schema";
import { StatusSchema } from "./fields/status.schema";
import { MultiLangSchema } from "../../schemas/multiLang.schema";

export const PageCreateSchema = z.object({
  title: MultiLangSchema(TitleSchema.min(1, "文章标题不能为空")),
  content: MultiLangSchema(ContentSchema.min(1, "文章内容不能为空")),
  status: StatusSchema,
});
