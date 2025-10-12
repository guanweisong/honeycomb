import { z } from "zod";
import { enumFrom } from "../../schemas/enum.helpers";
import { COMMENT_REF_TYPE } from "@honeycomb/db";

/**
 * 从数据库枚举 `COMMENT_REF_TYPE` 创建的 Zod 枚举 schema。
 * 用于验证评论关联的实体类型（如 'post', 'page'）。
 */
const CommentTypeEnum = enumFrom(COMMENT_REF_TYPE);

/**
 * 评论查询 schema，用于根据关联实体类型进行查询。
 * 例如，当需要获取所有与文章关联的评论时，可以使用此 schema 验证查询参数 `type` 是否合法。
 */
export const CommentQuerySchema = z.object({
  type: CommentTypeEnum,
});
