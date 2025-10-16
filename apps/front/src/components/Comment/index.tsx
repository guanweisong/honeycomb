import React from "react";
import CommentClient from "@/components/Comment/client";
import { MenuType } from "@honeycomb/db/src/types";
import { serverClient } from "@honeycomb/trpc/server";

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
}

/**
 * 评论组件。
 * 作为服务器组件，负责获取评论数据，并将其传递给客户端组件 `CommentClient` 进行渲染和交互。
 * @param {CommentProps} props - 组件属性。
 * @returns {JSX.Element} 评论客户端组件。
 */
const Comment = (props: CommentProps) => {
  const { id, type } = props;
  /**
   * 评论查询的 Promise。
   * 用于从服务器获取评论数据。
   */
  const queryCommentPromise = serverClient.comment.listByRef({ id, type });

  return <CommentClient {...props} queryCommentPromise={queryCommentPromise} />;
};

export default Comment;
