import React from "react";
import CommentClient from "./CommentClient";
import { MenuType } from "@/packages/domain/navigation/menu";
import type { getPublicComments } from "@/app/lib/server/public-queries";

/**
 * 评论组件的属性接口。
 */
export interface CommentProps {
  /**
   * 评论关联的实体 ID（文章、页面或自定义）。
   */
  id: string;
  /**
   * 评论关联的实体类型。
   */
  type: MenuType;
  /** 由详情页创建并与评论计数共享的请求级查询。 */
  queryCommentPromise: ReturnType<typeof getPublicComments>;
}

/**
 * 评论组件。
 * 作为服务器组件，负责获取评论数据，并将其传递给客户端组件 `CommentClient` 进行渲染和交互。
 * @param {CommentProps} props - 组件属性。
 * @returns {JSX.Element} 评论客户端组件。
 */
const Comment = (props: CommentProps) => <CommentClient {...props} />;

export default Comment;
