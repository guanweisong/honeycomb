import type { CommentStatus } from "@/features/comment/comment-status";
import type { PostType } from "@/features/post/post-type";
import type { UserLevel } from "@/features/user/user";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import type { SettingPatch } from "./schema";

export interface SettingRecord {
  id: string;
  siteName: MultiLang | null;
  siteSubName: MultiLang | null;
  siteSignature: MultiLang | null;
  siteCopyright: MultiLang | null;
  siteRecordNo: string | null;
  siteRecordUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export type SettingUpdate = SettingPatch;
export type SettingViewModel = SettingRecord | undefined;
export interface StatisticsType {
  postType: { item: PostType; count: number }[];
  userType: { item: UserLevel; count: number }[];
  userPost: { item: string; count: number }[];
  commentStatus: { item: CommentStatus; count: number }[];
}
