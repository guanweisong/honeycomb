import type { CommentStatus } from "@/packages/domain/content/comment";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
export interface CommentRecord {
  id: string; author: string; content: string; site: string | null; email: string;
  parentId: string | null; postId: string | null; pageId: string | null; customId: string | null;
  status: CommentStatus | string | null; createdAt: string | null; updatedAt: string | null;
  userAgent: string | null; ip: string | null;
}
export interface CommentRelatedRecord { id: string; title?: MultiLang | null }
export interface CommentListItem extends CommentRecord { post: CommentRelatedRecord | null; page: CommentRelatedRecord | null; custom: CommentRelatedRecord | null }
export interface PublicCommentNode { id: string; author: string; content: string; site: string | null; parentId: string | null; status: CommentStatus | string | null; createdAt: string | null; avatar: string; children?: PublicCommentNode[] }
export type CommentUpdate = { id: string } & Partial<Pick<CommentRecord, "author" | "content" | "site" | "email" | "parentId" | "postId" | "pageId" | "customId" | "status">>;
export interface PublicCommentInput { author: string; content: string; email: string; site?: string | null; parentId?: string | null; postId?: string | null; pageId?: string | null; customId?: string | null }
export interface CommentCommandRepository { update(input: CommentUpdate): Promise<CommentRecord>; destroy(ids: string[]): Promise<{ success: true }>; create(headers: Headers, input: PublicCommentInput): Promise<CommentRecord> }
export type CommentListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & { page?: number; limit?: number; sortField?: string; sortOrder?: string };
export type CommentRefInput = { id: string; type: "CATEGORY" | "PAGE" | "CUSTOM" };
export interface CommentQueryRepository { list(input: CommentListInput): Promise<{ list: CommentListItem[]; total: number }>; listPublicByRef(input: CommentRefInput): Promise<{ list: PublicCommentNode[]; total: number }> }
export type CommentTarget = Partial<{ postId: string | null; pageId: string | null; customId: string | null }>;
export interface CommentTargetRepository { assertPublic(target: CommentTarget): Promise<void>; assertParent(parentId: string, target: CommentTarget): Promise<void> }
export type NotificationComment = CommentRecord & { post: CommentRelatedRecord | null; page: CommentRelatedRecord | null };
export type NotificationSetting = { siteName: { zh?: string | null; en?: string | null } | null };
export interface CommentNotificationRepository {
  getComment(id: string): Promise<NotificationComment | undefined>;
  getSetting(): Promise<NotificationSetting | undefined>;
}
