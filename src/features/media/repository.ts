export interface MediaInsert {
  name: string;
  size: number;
  type: string;
  key: string;
  width?: number | null;
  height?: number | null;
  color?: string | null;
}

/** 媒体读模型，明确脱离数据库表结构。 */
export interface MediaRecord {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  color: string | null;
  height: number | null;
  width: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type MediaListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & {
  page?: number; limit?: number; sortField?: string; sortOrder?: string;
};

export interface MediaRepository {
  create(input: MediaInsert): Promise<MediaRecord>;
  list(input: MediaListInput): Promise<{ list: MediaRecord[]; total: number }>;
  destroy(ids: string[]): Promise<{ success: true }>;
}
