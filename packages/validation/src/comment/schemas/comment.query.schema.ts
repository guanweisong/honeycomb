import { z } from "zod";
import { MenuType } from "@honeycomb/types/menu/menu.type";

/**
 * 从数据库枚举 `MenuType` 创建的 Zod 枚举 schema。
 * 用于验证评论关联的实体类型（如 'post', 'page'）。
 */
const CommentTypeEnum = z.enum(MenuType);

/**
 * 评论查询 schema，用于根据关联实体类型进行查询。
 * 例如，当需要获取所有与文章关联的评论时，可以使用此 schema 验证查询参数 `type` 是否合法。
 */
export const CommentQuerySchema = z.object({
  type: CommentTypeEnum,
});
