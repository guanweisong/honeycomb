import {
  hasUpdateFields,
  requiredString,
} from "@/packages/application/validation";
import { z } from "zod";
import { HttpUrlSchema } from "@/packages/application/http-url-schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { IdSchema } from "@/packages/domain/shared/id.schema";

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

export type LinkInsert = z.output<typeof LinkInsertSchema>;

export const LinkUpdateSchema = LinkInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");

export type LinkUpdate = z.output<typeof LinkUpdateSchema>;
