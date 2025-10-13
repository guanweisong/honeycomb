import type { BaseEntity } from "@/types/BaseEntity";
import { MultiLang } from "@/types/MulitLang";
import type { CommentStatus } from "./CommentStatus";

/**
 * 评论实体接口。
 * 继承自 `BaseEntity`，包含了评论的详细信息。
 */
export interface CommentEntity extends BaseEntity {
  /**
   * 评论的唯一标识符。
   */
  id: string;
  /**
   * 评论所属文章的 ID。
   */
  postId?: string;
  /**
   * 评论所属文章的详细信息。
   */
  post?: {
    id: string;
    title: MultiLang;
  };
  /**
   * 评论所属页面的 ID。
   */
  pageId?: string;
  /**
   * 评论所属页面的详细信息。
   */
  page?: {
    id: string;
    title: MultiLang;
  };
  /**
   * 评论所属自定义内容的 ID。
   */
  customId: string;
  /**
   * 评论所属自定义内容的详细信息。
   */
  custom?: {
    id: string;
    title: MultiLang;
  };
  /**
   * 评论作者。
   */
  author: string;
  /**
   * 评论作者的邮箱。
   */
  email: string;
  /**
   * 评论者的 IP 地址。
   */
  ip: string;
  /**
   * 评论内容。
   */
  content: string;
  /**
   * 评论状态，例如待审核、已发布等。
   */
  status: CommentStatus;
  /**
   * 评论者的用户代理信息。
   */
  userAgent: string;
  /**
   * 父评论的 ID，用于表示评论的层级关系。
   */
  parentId: string;
}
