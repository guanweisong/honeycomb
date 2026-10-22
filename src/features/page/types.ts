import type {
  PageFieldsSchema,
  PageInsertSchema,
  PageUpdateSchema,
  PageDeleteSchema,
  PageListQuerySchema,
} from "./schema";
import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { PageStatus } from "@/features/page/page-status";
import type { PageTemplate } from "@/features/page/page-template";
import type { I18n } from "@/lib/i18n/i18n";
import type { MediaRecord } from "@/features/media/types";

export type PageVisibility = "PUBLISHED_ONLY" | "ALL";
export type PageInput = PaginationInput & {
  title?: string;
  content?: string;
  status?: string[];
};
export interface PageRecord {
  id: string;
  version: number;
  authorId: string;
  content: I18n | null;
  status: PageStatus;
  template: PageTemplate;
  title: I18n | null;
  views: number;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface PageWithRelations extends PageRecord {
  author: { id: string; name: string | null } | null;
  imagesInContent: MediaRecord[];
}

/** 后台表格行，保留条件删除使用的版本，不携带正文和媒体。 */
export type PageListItem = Omit<
  PageWithRelations,
  "content" | "imagesInContent" | "authorId"
>;
/** 菜单选项只需要标题、标识和原始时间。 */
export type PageMenuOption = Pick<
  PageRecord,
  "id" | "title" | "createdAt" | "updatedAt"
>;

export type PageFields = z.output<typeof PageFieldsSchema>;
export type PageInsert = z.output<typeof PageInsertSchema>;
export type PageUpdate = z.output<typeof PageUpdateSchema>;
export type PageDelete = z.output<typeof PageDeleteSchema>;
export type PageListQueryInput = z.output<typeof PageListQuerySchema>;
