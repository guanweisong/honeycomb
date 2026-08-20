/* eslint-disable @typescript-eslint/no-explicit-any -- tRPC schema 约束动态链接字段。 */
export type LinkInsert = Record<string, any>;
export type LinkUpdate = { id: string } & Partial<Record<string, any>>;
export type LinkListInput = Record<string, any> & { page?: number; limit?: number; sortField?: string; sortOrder?: string; name?: string; description?: string; status?: any };
export type LinkVisibility = "PUBLIC_ONLY" | "ALL";
export type LinkRecord = Record<string, any> & { id: string };
export interface LinkRepository {
  create(input: LinkInsert): Promise<LinkRecord>;
  update(input: LinkUpdate): Promise<LinkRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: LinkListInput, visibility: LinkVisibility): Promise<{ list: LinkRecord[]; total: number }>;
}
