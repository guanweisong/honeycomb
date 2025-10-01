import React from "react";
import CommentClient from "@/components/Comment/client";
import { MenuType } from "@honeycomb/db";
import { serverClient } from "@honeycomb/trpc/server";

export interface CommentProps {
  id: string;
  type: MenuType;
}

const Comment = (props: CommentProps) => {
  const { id, type } = props;
  const queryCommentPromise = serverClient.comment.listByRef({ id, type });

  return <CommentClient {...props} queryCommentPromise={queryCommentPromise} />;
};

export default Comment;
