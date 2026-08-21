"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { CommentListQuerySchema } from "@/features/comment/schemas/comment.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";

export type CommentListQueryInput = z.input<typeof CommentListQuerySchema>;

export function useCommentQuery() {
  const [searchParams, setSearchParams] = useState<CommentListQueryInput>({});
  const query = trpc.comment.index.useQuery(searchParams, {
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    setSearchParams,
  };
}
/**
 * 评论管理查询 Hook，负责分页查询参数和评论列表请求。
 */
