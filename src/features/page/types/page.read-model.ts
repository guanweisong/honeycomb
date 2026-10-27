import type { PageStatus } from "@/features/page/types/page.status";
import type { PageTemplate } from "@/features/page/types/page.template";
import type { I18n } from "@/lib/i18n/i18n";
import type { MediaRecord } from "@/features/media/types/media.record";

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
