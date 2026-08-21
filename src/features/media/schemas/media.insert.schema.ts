import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import { z } from "zod";

/**
 * 新增上传文件时的数据验证 schema，不依赖数据库表结构。
 */
export const MediaInsertSchema = z.object({
  name: requiredString("文件名不能为空"),
  size: z.number().int().nonnegative(),
  type: requiredString("文件类型不能为空"),
  key: requiredString("Key 不能为空"),
  color: z.string().nullable().optional(),
  height: z.number().int().nullable().optional(),
  width: z.number().int().nullable().optional(),
});

/**
 * 媒体实体的 TypeScript 类型。
 * 这是从 MediaInsertSchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用媒体对象的结构。
 */
export type MediaEntity = CleanZod<typeof MediaInsertSchema>;
