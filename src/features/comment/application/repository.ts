import type { MenuType } from "@/packages/domain/navigation/menu";
import type { PaginationInput } from "@/packages/application/pagination";
import type { CommentStatus } from "@/packages/domain/content/comment";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
import type { PostStatus } from "@/packages/domain/content/post-status";
import type { PageStatus } from "@/packages/domain/content/page";
import type { EnableStatus } from "@/packages/domain/shared/enable-status";
import type {
  CommentUpdate,
  PublicCommentInput as PublicCommentWriteInput,
} from "./write-schema";
export type { CommentUpdate } from "./write-schema";
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
export type PublicCommentInput = PublicCommentWriteInput;
export interface CommentCommandRepository {
  findStatus(id: string): Promise<CommentStatus | null>;
  update(input: CommentUpdate): Promise<CommentRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  /** 仅在已校验的目标状态及父评论归属仍一致时原子插入。 */
  createIfTargetMatches(
    metadata: CommentRequestMetadata,
    input: PublicCommentInput,
    expectedTarget: CommentTargetState,
  ): Promise<CommentRecord | null>;
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
export interface CommentQueryRepository {
  list(
    input: CommentListInput,
  ): Promise<{ list: CommentListItem[]; total: number }>;
  listPublicByRef(
    input: CommentRefInput,
  ): Promise<{ list: PublicCommentNode[]; total: number }>;
}
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
export interface CommentTargetRepository {
  findTarget(
    target: CommentTargetReference,
  ): Promise<CommentTargetState | null>;
  findParentTarget(parentId: string): Promise<CommentTargetReference | null>;
}
export type NotificationComment = CommentRecord & {
  post: CommentRelatedRecord | null;
  page: CommentRelatedRecord | null;
};
export type NotificationSetting = {
  siteName: { zh?: string | null; en?: string | null } | null;
};
export interface CommentNotificationRepository {
  getComment(id: string): Promise<NotificationComment | undefined>;
  getSetting(): Promise<NotificationSetting | undefined>;
}
