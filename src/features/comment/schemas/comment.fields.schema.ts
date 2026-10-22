import { z } from "zod";
import { requiredString } from "@/lib/validation/validation";
import { HttpUrlSchema } from "@/lib/validation/http-url-schema";

export const CommentAuthorSchema = requiredString("作者不能为空").max(
  20,
  "作者不能超过 20 个字符",
);

export const CommentContentSchema = requiredString("内容不能为空").max(
  200,
  "内容不能超过 200 个字符",
);

export const CommentEmailSchema = requiredString("邮箱不能为空")
  .email("邮箱格式不正确")
  .max(254, "邮箱不能超过 254 个字符");

export const CommentSiteSchema = z
  .union([
    HttpUrlSchema.pipe(z.string().max(200, "网址不能超过 200 个字符")),
    z
      .string()
      .trim()
      .length(0)
      .transform(() => undefined),
  ])
  .nullable()
  .optional();
