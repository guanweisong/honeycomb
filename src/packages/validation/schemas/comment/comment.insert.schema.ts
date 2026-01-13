import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { CaptchaSchema } from "@/packages/validation/utils/captcha.schema";
import { CleanZod } from "../../utils/clean.zod";
import { requiredString } from "@/packages/validation/utils/required.string.schema";

/**
 * 新增评论时的数据验证 schema。
 * 1. 基于数据库 'comment' 表的插入 schema 生成。
 * 2. 使用 `.pick()` 精确选择了用户可以提交的字段。
 * 3. 使用 `.extend()` 扩展了验证码 schema (`CaptchaSchema`)，用于防止机器人提交。
 */
export const CommentInsertSchema = createInsertSchema(schema.comment)
  .pick({
    author: true,
    content: true,
    email: true,
    site: true,
    parentId: true,
    postId: true,
    pageId: true,
    customId: true,
  })
  .extend(CaptchaSchema.shape)
  .extend({
    author: requiredString("作者不能为空"),
    content: requiredString("内容不能为空"),
    email: requiredString("邮箱不能为空"),
  });

/**
 * 新增评论的 TypeScript 输入类型。
 * 从 `CommentInsertSchema` 推断而来，提供了清晰的数据结构定义。
 */
export type CommentInsertInput = CleanZod<typeof CommentInsertSchema>;
