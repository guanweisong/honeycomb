import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { requiredString } from "@/packages/validation/utils/required.string.schema";
import { CleanZod } from "@/packages/validation/utils/clean.zod";
import { z } from "zod";

/**
 * 新增友情链接时的数据验证 schema。
 * 该 schema 基于数据库 'link' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新链接时允许传入的字段。
 */
export const LinkInsertSchema = createInsertSchema(schema.link)
  .pick({
    url: true,
    status: true,
    name: true,
    description: true,
    logo: true,
  })
  .extend({
    url: requiredString("链接地址不能为空"),
    name: requiredString("链接名称不能为空"),
    logo: requiredString("Logo 不能为空"),
    description: z.string().trim().optional(),
  });

export type LinkInsert = CleanZod<typeof LinkInsertSchema>;
