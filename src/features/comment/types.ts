import type { PublicCommentSchema, CommentUpdateSchema } from "./schema";
import type { z } from "zod";
import type { CommentInsertSchema } from "./schemas/comment.insert.schema";
import type { MenuType } from "@/features/menu/menu-types";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { CommentStatus } from "@/features/comment/comment-status";
import type { MultiLang } from "@/lib/i18n/multi-lang";
import type { PostStatus } from "@/features/post/post-status";
import type { PageStatus } from "@/features/page/page-status";
import type { EnableStatus } from "@/lib/validation/enable-status";
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
export interface PublicCommentNode {
  id: string;
  author: string;
  content: string;
  site: string | null;
  parentId: string | null;
  status: CommentStatus | null;
  createdAt: string | null;
  avatar: string;
  children?: PublicCommentNode[];
}
export interface CommentRequestMetadata {
  ip: string | null;
  userAgent: string | null;
}
export type CommentListInput = PaginationInput & {
  content?: string;
  status?: string[];
  email?: string;
  ip?: string;
  author?: string;
};
export type CommentRefInput = { id: string; type: `${MenuType}` };
export type CommentTarget = Partial<{
  postId: string | null;
  pageId: string | null;
  customId: string | null;
}>;
export type CommentTargetReference = {
  type: "post" | "page" | "custom";
  id: string;
};
export type CommentTargetState =
  | { type: "page"; status: PageStatus }
  | {
      type: "post";
      status: PostStatus;
      commentStatus: EnableStatus;
    };
export type NotificationComment = CommentRecord & {
  post: CommentRelatedRecord | null;
  page: CommentRelatedRecord | null;
};
export type NotificationSetting = {
  siteName: MultiLang | null;
};

export type PublicCommentInput = z.output<typeof PublicCommentSchema>;
export type CommentUpdate = z.output<typeof CommentUpdateSchema>;
export type CommentInsertInput = z.output<typeof CommentInsertSchema>;
