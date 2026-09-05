import type { PaginationInput } from "@/packages/application/pagination";
import type { PageStatus } from "@/packages/domain/content/page";
import type { PageTemplate } from "@/packages/domain/content/page-template";
import type { I18n } from "@/packages/domain/localization/i18n";
import type { MediaRecord } from "@/features/contracts";

export type LocalizedText = I18n;

export type PageCreateCommand = import("zod").output<
  typeof import("./write-schema").PageInsertSchema
>;
export type PageUpdateCommand = Partial<PageCreateCommand> & { id: string };
export type PageVisibility = "PUBLISHED_ONLY" | "ALL";
export type PageInput = PaginationInput & {
  title?: string;
  content?: string;
  status?: string[];
};
export interface PageRecord {
  id: string;
  authorId: string;
  content: LocalizedText | null;
  status: PageStatus;
  template: PageTemplate;
  title: LocalizedText | null;
  views: number;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface PageWithRelations extends PageRecord {
  author: { id: string; name: string | null } | null;
  imagesInContent: MediaRecord[];
}
export interface PageCommandRepository {
  create(input: PageCreateCommand, authorId: string): Promise<{ id: string }>;
  destroy(ids: string[]): Promise<{ success: true }>;
  findStatus(id: string): Promise<PageStatus | null>;
  update(input: PageUpdateCommand): Promise<{ id: string }>;
  incrementViews(id: string): Promise<{ views: number } | undefined>;
}
export interface PageQueryRepository {
  list(
    input: PageInput,
    visibility: PageVisibility,
  ): Promise<{ list: PageWithRelations[]; total: number }>;
  detail(
    id: string,
    visibility: PageVisibility,
  ): Promise<PageWithRelations | null>;
  author(id: string): Promise<{ id: string; name: string | null } | null>;
}
