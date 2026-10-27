import type { CommentListItem } from "@/features/comment/types/comment.read-model";
import type { SettingRecord } from "@/features/setting/types/setting.record";

export type NotificationComment = Omit<CommentListItem, "custom">;

export type NotificationSetting = Pick<SettingRecord, "siteName">;
