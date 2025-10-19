import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

/**
 * 获取媒体列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)，
 * 但未添加任何额外的筛选字段。因此，它只支持对媒体列表进行分页查询。
 */
export const MediaListQuerySchema = PaginationQuerySchema.partial();

/**
 * 媒体列表查询参数的 TypeScript 类型。
 * 基本上只包含分页参数。
 */
export type MediaIndexInput = CleanZod<typeof MediaListQuerySchema>;
