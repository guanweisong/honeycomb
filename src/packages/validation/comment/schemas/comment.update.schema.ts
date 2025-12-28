import { createUpdateSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";

/**
 * 更新评论状态的数据验证 schema。
 * 这个 schema 主要用于后台管理，允许对评论的状态进行修改（如通过、标记为垃圾评论等）。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中字段默认为可选。
 * 2. 使用 `.pick()` 限定操作只涉及 'id' 和 'status' 两个字段。
 * 3. 使用 `.required()` 强制要求 'id' 和 'status' 在请求中必须提供，
 *    以确保能定位到要更新的评论并明确其新的状态。
 */
export const CommentUpdateSchema = createUpdateSchema(schema.comment)
  .pick({
    id: true,
    status: true,
  })
  .required({
    id: true,
    status: true,
  });
