import type { CommentStatus } from "@/packages/domain/content/comment";
import type { PostType } from "@/packages/domain/content/post";
import type { UserLevel } from "@/packages/domain/identity/user";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";

export interface SettingRecord {
  id: string;
  siteName: MultiLang;
  siteSubName: MultiLang;
  siteSignature: MultiLang;
  siteCopyright: MultiLang;
  siteRecordNo: string | null;
  siteRecordUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export type SettingUpdate = Partial<Omit<SettingRecord, "createdAt" | "updatedAt">> & { id: string };
export interface StatisticsType {
  postType: { item: PostType; count: number }[];
  userType: { item: UserLevel; count: number }[];
  userPost: { item: string; count: number }[];
  commentStatus: { item: CommentStatus; count: number }[];
}
export interface SettingRepository {
  get(): Promise<SettingRecord>;
  update(input: SettingUpdate): Promise<SettingRecord | undefined>;
  statistics(): Promise<StatisticsType>;
}
