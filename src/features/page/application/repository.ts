import type { PageStatus } from "@/packages/domain/content/page";
import type { PageTemplate } from "@/packages/domain/content/page-template";

export type LocalizedText = { en: string; zh: string };

export interface PageCreateCommand {
  title: LocalizedText;
  content: LocalizedText;
  status?: PageStatus;
  template: PageTemplate;
}
export type PageUpdateCommand = Partial<PageCreateCommand> & { id: string };
export type PageVisibility = "PUBLISHED_ONLY" | "ALL";
export type PageInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  title?: string;
  content?: string;
  [key: string]: unknown;
};
export interface PageRecord {
  id: string;
  authorId: string;
  content: LocalizedText;
  status: PageStatus;
  template: PageTemplate;
  title: LocalizedText;
  views: number;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface PageWithRelations extends PageRecord {
  author: { id: string; name: string | null } | null;
  imagesInContent: Array<{ id: string; url: string; key: string; name: string; size: number; type: string; color: string | null; height: number | null; width: number | null; createdAt: string | null; updatedAt: string | null }>;
}
export interface PageCommandRepository {
  create(input: PageCreateCommand, authorId: string): Promise<{ id: string }>;
  destroy(ids: string[]): Promise<{ success: true }>;
  findStatus(id: string): Promise<PageStatus | null>;
  update(input: PageUpdateCommand): Promise<{ id: string }>;
  incrementViews(id: string): Promise<{ views: number } | undefined>;
}
export interface PageQueryRepository {
  list(input: PageInput, visibility: PageVisibility): Promise<{ list: PageWithRelations[]; total: number }>;
  detail(id: string, visibility: PageVisibility): Promise<PageWithRelations | null>;
  author(id: string): Promise<{ id: string; name: string | null } | null>;
}
