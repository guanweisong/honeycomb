/* eslint-disable @typescript-eslint/no-explicit-any -- 查询和通知读模型包含动态关联字段。 */
export type CommentUpdate = { id: string } & Record<string, any>;
export interface PublicCommentInput { author: string; content: string; email: string; site?: string | null; parentId?: string | null; postId?: string | null; pageId?: string | null; customId?: string | null }
export interface CommentCommandRepository { update(input: CommentUpdate): Promise<any>; destroy(ids: string[]): Promise<{ success: true }>; create(headers: Headers, input: PublicCommentInput): Promise<any> }
export type CommentListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & { page?: number; limit?: number; sortField?: string; sortOrder?: string };
export type CommentRefInput = { id: string; type: "CATEGORY" | "PAGE" | "CUSTOM" };
export interface CommentQueryRepository { list(input: CommentListInput): Promise<{ list: any[]; total: number }>; listPublicByRef(input: CommentRefInput): Promise<{ list: any[]; total: number }> }
export type CommentTarget = Partial<{ postId: string | null; pageId: string | null; customId: string | null }>;
export interface CommentTargetRepository { assertPublic(target: CommentTarget): Promise<void>; assertParent(parentId: string, target: CommentTarget): Promise<void> }
export type NotificationComment = any;
export type NotificationSetting = { siteName: { zh?: string | null; en?: string | null } | null };
export interface CommentNotificationRepository {
  getComment(id: string): Promise<NotificationComment | undefined>;
  getSetting(): Promise<NotificationSetting | undefined>;
}
