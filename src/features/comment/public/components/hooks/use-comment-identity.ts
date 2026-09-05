"use client";

import { useEffect, useState } from "react";
import type { CommentInsertInput } from "@/features/comment/schemas/comment.insert.schema";
import { CommentInsertBaseSchema } from "@/features/comment/schemas/comment.insert.schema";

export type CommentIdentity = Pick<
  CommentInsertInput,
  "author" | "site" | "email"
>;

const COMMENT_IDENTITY_KEY = "user";
const identitySchema = CommentInsertBaseSchema.pick({
  author: true,
  email: true,
  site: true,
});

export function useCommentIdentity() {
  const [identity, setIdentity] = useState<CommentIdentity>();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMMENT_IDENTITY_KEY);
      if (!stored) return;
      const data: unknown = JSON.parse(stored);
      const parsed = identitySchema.safeParse(data);
      if (parsed.success) setIdentity(parsed.data);
    } catch {
      // 损坏或不可访问的浏览器存储不应阻断匿名评论。
    }
  }, []);

  const persistIdentity = (value: CommentIdentity) => {
    localStorage.setItem(COMMENT_IDENTITY_KEY, JSON.stringify(value));
    setIdentity(value);
  };

  const clearIdentity = () => {
    localStorage.removeItem(COMMENT_IDENTITY_KEY);
    setIdentity(undefined);
  };

  return { identity, persistIdentity, clearIdentity };
}
/**
 * 评论身份 Hook，负责在浏览器端读取和持久化评论者身份。
 */
