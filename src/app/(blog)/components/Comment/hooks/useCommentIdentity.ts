"use client";

import { useEffect, useState } from "react";
import type { CommentInsertInput } from "@/packages/trpc/api/modules/comment/schemas/comment.insert.schema";

export type CommentIdentity = Pick<
  CommentInsertInput,
  "author" | "site" | "email"
>;

const COMMENT_IDENTITY_KEY = "user";

export function useCommentIdentity() {
  const [identity, setIdentity] = useState<CommentIdentity>();

  useEffect(() => {
    const stored = localStorage.getItem(COMMENT_IDENTITY_KEY);
    if (stored) setIdentity(JSON.parse(stored));
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
