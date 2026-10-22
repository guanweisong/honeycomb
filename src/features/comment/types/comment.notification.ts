import type { CommentRecord, CommentRelatedRecord } from "./comment.read-model";
import type { MultiLang } from "@/lib/i18n/multi-lang";

export type NotificationComment = CommentRecord & {
  post: CommentRelatedRecord | null;
  page: CommentRelatedRecord | null;
};

export type NotificationSetting = {
  siteName: MultiLang | null;
};
