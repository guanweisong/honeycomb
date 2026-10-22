import type { CommentStatus } from "./comment.status";
import type { MultiLang } from "@/lib/i18n/multi-lang";

export interface CommentRecord {
  id: string;
  author: string;
  content: string;
  site: string | null;
  email: string;
  parentId: string | null;
  postId: string | null;
  pageId: string | null;
  customId: string | null;
  status: CommentStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
  userAgent: string | null;
  ip: string | null;
}

export interface CommentRelatedRecord {
  id: string;
  title?: MultiLang | null;
}

export interface CommentListItem extends CommentRecord {
  post: CommentRelatedRecord | null;
  page: CommentRelatedRecord | null;
  custom: CommentRelatedRecord | null;
}

/** 后台演示列表的显式安全投影，不含评论者隐私及内部关联标识。 */
export type CommentPreviewListItem = Pick<
  CommentListItem,
  | "id"
  | "author"
  | "content"
  | "site"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "post"
  | "page"
  | "custom"
>;

export type PublicCommentNode = Pick<
  CommentRecord,
  "id" | "author" | "content" | "site" | "parentId" | "status" | "createdAt"
> & {
  avatar: string;
  children?: PublicCommentNode[];
};
