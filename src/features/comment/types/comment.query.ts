import type { MenuType } from "@/features/menu/types/menu.type";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";
import type { CommentListQuerySchema } from "@/features/comment/schemas/comment.list-query.schema";

type CommentListFilters = Omit<
  z.output<typeof CommentListQuerySchema>,
  keyof PaginationInput
>;

// 内部查询仍允许省略分页；可选过滤字段不扩大为显式 undefined。
export type CommentListInput = PaginationInput & {
  [Key in keyof CommentListFilters]: Exclude<
    CommentListFilters[Key],
    undefined
  >;
};

export type CommentRefInput = { id: string; type: `${MenuType}` };
