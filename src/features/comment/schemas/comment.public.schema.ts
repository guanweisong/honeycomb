import { z } from "zod";
import {
  CommentAuthorSchema,
  CommentContentSchema,
  CommentEmailSchema,
  CommentSiteSchema,
} from "./comment.fields.schema";

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
