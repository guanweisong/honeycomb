import { createInsertSchema } from "drizzle-zod";
import { comment } from "@honeycomb/db/schema";
import { CaptchaSchema } from "@honeycomb/validation/schemas/captcha.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

/**
 * 新增评论时的数据验证 schema。
 * 1. 基于数据库 'comment' 表的插入 schema 生成。
 * 2. 使用 `.pick()` 精确选择了用户可以提交的字段。
 * 3. 使用 `.extend()` 扩展了验证码 schema (`CaptchaSchema`)，用于防止机器人提交。
 */
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

/**
 * 新增评论的 TypeScript 输入类型。
 * 从 `CommentInsertSchema` 推断而来，提供了清晰的数据结构定义。
 */
export type CommentInsertInput = CleanZod<typeof CommentInsertSchema>;
