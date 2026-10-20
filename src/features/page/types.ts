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
