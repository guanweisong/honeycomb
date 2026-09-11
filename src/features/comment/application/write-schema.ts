import { requiredString } from "@/packages/application/validation";
import { z } from "zod";
import { HttpUrlSchema } from "@/packages/application/http-url-schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { CommentStatus } from "@/packages/domain/content/comment";

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

/**
 * 新增评论时的数据验证 schema。
 * 只定义用户可提交的业务字段；验证码由 transport 组合。
 */
export const PublicCommentBaseSchema = z.object({
  author: CommentAuthorSchema,
  content: CommentContentSchema,
  email: CommentEmailSchema,
  site: CommentSiteSchema,
  parentId: z.string().nullable().optional(),
  postId: z.string().nullable().optional(),
  pageId: z.string().nullable().optional(),
  customId: z.string().nullable().optional(),
});

export const PublicCommentSchema = PublicCommentBaseSchema.refine(
  (input) =>
    [input.postId, input.pageId, input.customId].filter(Boolean).length === 1,
  {
    message: "评论必须且只能关联一个目标",
    path: ["postId"],
  },
);

/**
 * 新增评论的 TypeScript 输入类型。
 * 从 `PublicCommentSchema` 推断而来，提供了清晰的数据结构定义。
 */
export type PublicCommentInput = z.infer<typeof PublicCommentSchema>;

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = z
  .object({
    id: IdSchema,
    author: CommentAuthorSchema.optional(),
    content: CommentContentSchema.optional(),
    email: CommentEmailSchema.optional(),
    site: CommentSiteSchema,
    status: z.nativeEnum(CommentStatus).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.author !== undefined ||
      input.content !== undefined ||
      input.email !== undefined ||
      input.site !== undefined ||
      input.status !== undefined,
    "至少修改一个字段",
  );

export type CommentUpdate = z.infer<typeof CommentUpdateSchema>;
