import { AuthorSchema } from "./fields/author.schema";
import { ContentSchema } from "./fields/content.schema";
import { IdSchema } from "../../schemas/fields/id.schema";
import { EmailSchema } from "../../user/schemas/fields/email.schema";
import { CaptchaSchema } from "../../schemas/captcha.schema";
import { StatusSchema } from "./fields/status.schema";
import { UrlSchema } from "../../schemas/fields/url.schema";

export const CommentCreateSchema = CaptchaSchema.extend({
  author: AuthorSchema.min(1, "昵称不可为空"),
  content: ContentSchema.min(1, "评论内容不可为空"),
  email: EmailSchema,
  site: UrlSchema.optional(),
  parentId: IdSchema.optional(),
  postId: IdSchema.optional(),
  pageId: IdSchema.optional(),
  customId: IdSchema.optional(),
  status: StatusSchema,
});
