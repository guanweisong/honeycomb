import React from "react";
import CommentServer from "@/services/comment";
import CommentClient from "@/components/Comment/client";
import { MenuType } from "@/types/menu/MenuType";

export interface CommentProps {
  id: string;
  type: MenuType;
}

const Comment = (props: CommentProps) => {
  const { id, type } = props;
  const queryCommentPromise = CommentServer.index(id, type);

  return <CommentClient {...props} queryCommentPromise={queryCommentPromise} />;
};

export default Comment;
