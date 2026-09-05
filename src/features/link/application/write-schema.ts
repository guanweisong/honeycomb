import { requiredString } from "@/packages/application/validation";
import { z } from "zod";

/**
 * 新增友情链接时的数据验证 schema。
 * 该 schema 定义创建链接时允许传入的字段，不依赖数据库表结构。
 */
export const LinkInsertSchema = z.object({
  url: requiredString("链接地址不能为空"),
  status: z.string().optional(),
  name: requiredString("链接名称不能为空"),
  logo: requiredString("Logo 不能为空"),
  description: z.string().trim().optional(),
});

export type LinkInsert = z.output<typeof LinkInsertSchema>;
