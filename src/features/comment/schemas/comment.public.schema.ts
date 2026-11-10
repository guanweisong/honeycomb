import { z } from "zod";
import {
  CommentAuthorSchema,
  CommentContentSchema,
  CommentEmailSchema,
  CommentSiteSchema,
} from "@/features/comment/schemas/comment.fields.schema";

const OptionalCommentReferenceSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "评论引用不能为空")
  .nullable()
  .optional();

/**
 * 新增评论时的数据验证 schema。
 * 只定义用户可提交的业务字段；验证码由 transport 组合。
 */
export const PublicCommentBaseSchema = z.object({
  author: CommentAuthorSchema,
  content: CommentContentSchema,
  email: CommentEmailSchema,
  site: CommentSiteSchema,
  parentId: OptionalCommentReferenceSchema,
  postId: OptionalCommentReferenceSchema,
  pageId: OptionalCommentReferenceSchema,
  customId: OptionalCommentReferenceSchema,
});

export const PublicCommentSchema = PublicCommentBaseSchema.refine(
  (input) =>
    [input.postId, input.pageId, input.customId].filter(Boolean).length === 1,
  {
    message: "评论必须且只能关联一个目标",
    path: ["postId"],
  },
);
