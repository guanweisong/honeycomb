export type LinkInsert = {
  url: string;
  name: string;
  logo: string;
  description?: string;
  status?: string;
};
export type LinkUpdate = { id: string } & Partial<LinkInsert>;
export type LinkListInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  name?: string;
  url?: string;
  description?: string;
  status?: string[];
};
export type LinkVisibility = "PUBLIC_ONLY" | "ALL";
export type LinkRecord = {
  id: string;
  url: string;
  name: string;
  logo: string;
  description: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export interface LinkRepository {
  create(input: LinkInsert): Promise<LinkRecord>;
  update(input: LinkUpdate): Promise<LinkRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: LinkListInput, visibility: LinkVisibility): Promise<{ list: LinkRecord[]; total: number }>;
}
