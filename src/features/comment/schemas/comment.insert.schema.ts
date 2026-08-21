import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/infrastructure/db/schema";
import { CaptchaSchema } from "@/packages/trpc/api/schemas/captcha.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import { z } from "zod";

const httpUrl = z
  .string()
  .trim()
  .url("网址格式不正确")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "网址必须使用 http 或 https")
  .max(200, "网址不能超过 200 个字符");

const optionalHttpUrl = z
  .union([
    httpUrl,
    z
      .string()
      .trim()
      .length(0)
      .transform(() => undefined),
  ])
  .nullable()
  .optional();

/**
 * 新增评论时的数据验证 schema。
 * 1. 基于数据库 'comment' 表的插入 schema 生成。
 * 2. 使用 `.pick()` 精确选择了用户可以提交的字段。
 * 3. 使用 `.extend()` 扩展了验证码 schema (`CaptchaSchema`)，用于防止机器人提交。
 */
export const CommentInsertBaseSchema = createInsertSchema(schema.comment)
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
    author: requiredString("作者不能为空").max(20, "作者不能超过 20 个字符"),
    content: requiredString("内容不能为空").max(200, "内容不能超过 200 个字符"),
    email: requiredString("邮箱不能为空")
      .email("邮箱格式不正确")
      .max(254, "邮箱不能超过 254 个字符"),
    site: optionalHttpUrl,
  });

export const CommentInsertSchema = CommentInsertBaseSchema.refine(
    (input) =>
      [input.postId, input.pageId, input.customId].filter(Boolean).length === 1,
    {
      message: "评论必须且只能关联一个目标",
      path: ["postId"],
    },
);

/**
 * 新增评论的 TypeScript 输入类型。
 * 从 `CommentInsertSchema` 推断而来，提供了清晰的数据结构定义。
 */
export type CommentInsertInput = CleanZod<typeof CommentInsertSchema>;
