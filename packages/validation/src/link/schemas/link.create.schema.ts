import { z } from "zod";
import { LinkNameSchema } from "./fields/link.name.schema";
import { DescriptionSchema } from "./fields/description.schema";
import { StatusSchema } from "./fields/status.schema";
import { UrlSchema } from "../../schemas/fields/url.schema";

export const LinkCreateSchema = z.object({
  name: LinkNameSchema.min(1, "链接名称不可为空"),
  url: UrlSchema.min(1, "链接URL不可为空"),
  logo: UrlSchema.min(1, "logo网址不可为空"),
  description: DescriptionSchema.min(1, "链接描述不可为空"),
  status: StatusSchema.optional(),
});
