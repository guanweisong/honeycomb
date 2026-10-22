import { requiredString } from "@/lib/validation/validation";
import { z } from "zod";
import { HttpUrlSchema } from "@/lib/validation/http-url-schema";
import { EnableStatus } from "@/lib/validation/enable-status";

/**
 * 新增友情链接时的数据验证 schema。
 * 该 schema 定义创建链接时允许传入的字段，不依赖数据库表结构。
 */
export const LinkInsertSchema = z.object({
  url: HttpUrlSchema,
  status: z.enum(EnableStatus).optional(),
  name: requiredString("链接名称不能为空"),
  logo: HttpUrlSchema,
  description: z.string().trim().optional(),
});
