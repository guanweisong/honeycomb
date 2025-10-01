import { createInsertSchema } from "drizzle-zod";
import { comment } from "@honeycomb/db/src/schema";
import { CaptchaSchema } from "@honeycomb/validation/schemas/captcha.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const CommentInsertSchema = createInsertSchema(comment)
  .pick({
    author: true,
    content: true,
    email: true,
    site: true,
    parentId: true,
    postId: true,
    pageId: true,
  })
  .extend(CaptchaSchema.shape);

export type CommentInsertInput = CleanZod<typeof CommentInsertSchema>;
